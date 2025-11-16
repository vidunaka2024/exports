// backend/services/invoiceService.js
import PDFDocument from 'pdfkit';
import Invoice from '../models/Invoice.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import emailService from './emailService.js';

class InvoiceService {
  // Create invoice from order
  async createFromOrder(orderId, userId) {
    try {
      const order = await Order.findById(orderId)
        .populate('ad')
        .populate('exporter')
        .populate('manufacturer');

      if (!order) {
        throw new Error('Order not found');
      }

      // Calculate amounts
      const quantity = order.quantity;
      const unitPrice = order.ad.minPrice || 0;
      const subtotal = quantity * unitPrice;
      const taxRate = 0.1; // 10% tax
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      // Create invoice
      const invoice = await Invoice.create({
        order: order._id,
        seller: order.exporter._id,
        buyer: order.manufacturer._id,
        items: [
          {
            description: order.ad.title,
            quantity,
            unitPrice,
            taxRate,
            total: quantity * unitPrice,
          },
        ],
        subtotal,
        taxAmount,
        totalAmount,
        currency: 'USD',
        status: 'draft',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        notes: `Invoice for order #${order._id}`,
      });

      logger.info(`Invoice created: ${invoice.invoiceNumber}`);
      return invoice;
    } catch (error) {
      logger.error('Error creating invoice:', error);
      throw error;
    }
  }

  // Generate PDF invoice
  async generatePDF(invoiceId) {
    return new Promise(async (resolve, reject) => {
      try {
        const invoice = await Invoice.findById(invoiceId)
          .populate('seller')
          .populate('buyer')
          .populate('order');

        if (!invoice) {
          throw new Error('Invoice not found');
        }

        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc
          .fontSize(20)
          .fillColor('#667eea')
          .text('INVOICE', { align: 'right' });

        doc.fontSize(10).fillColor('#888');
        doc.text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right' });
        doc.text(`Date: ${invoice.issueDate.toLocaleDateString()}`, {
          align: 'right',
        });
        doc.text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`, {
          align: 'right',
        });

        doc.moveDown(2);

        // From (Seller)
        doc.fontSize(12).fillColor('#000').text('From:', { underline: true });
        doc.fontSize(10);
        doc.text(invoice.seller.companyName);
        doc.text(invoice.seller.email);
        doc.text(invoice.seller.phone || '');

        doc.moveDown();

        // To (Buyer)
        doc.fontSize(12).fillColor('#000').text('To:', { underline: true });
        doc.fontSize(10);
        doc.text(invoice.buyer.companyName);
        doc.text(invoice.buyer.email);
        doc.text(invoice.buyer.phone || '');

        doc.moveDown(2);

        // Items table
        const tableTop = doc.y;
        const itemCodeX = 50;
        const descriptionX = 150;
        const quantityX = 300;
        const priceX = 370;
        const amountX = 450;

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('#', itemCodeX, tableTop);
        doc.text('Description', descriptionX, tableTop);
        doc.text('Qty', quantityX, tableTop);
        doc.text('Price', priceX, tableTop);
        doc.text('Amount', amountX, tableTop);

        doc
          .moveTo(50, tableTop + 15)
          .lineTo(550, tableTop + 15)
          .stroke();

        doc.font('Helvetica');

        let y = tableTop + 25;
        invoice.items.forEach((item, index) => {
          doc.text(index + 1, itemCodeX, y);
          doc.text(item.description, descriptionX, y, { width: 140 });
          doc.text(item.quantity, quantityX, y);
          doc.text(`$${item.unitPrice.toFixed(2)}`, priceX, y);
          doc.text(`$${item.total.toFixed(2)}`, amountX, y);
          y += 25;
        });

        doc.moveDown(2);

        // Totals
        const totalsX = 400;
        y = doc.y + 20;

        doc.text('Subtotal:', totalsX, y);
        doc.text(`$${invoice.subtotal.toFixed(2)}`, amountX, y);

        y += 20;
        doc.text('Tax:', totalsX, y);
        doc.text(`$${invoice.taxAmount.toFixed(2)}`, amountX, y);

        y += 20;
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Total:', totalsX, y);
        doc.text(`$${invoice.totalAmount.toFixed(2)}`, amountX, y);

        doc.fontSize(10).font('Helvetica');

        // Notes
        if (invoice.notes) {
          doc.moveDown(3);
          doc.text('Notes:', { underline: true });
          doc.text(invoice.notes);
        }

        // Terms
        if (invoice.terms) {
          doc.moveDown(2);
          doc.text('Terms & Conditions:', { underline: true });
          doc.text(invoice.terms);
        }

        // Footer
        doc
          .fontSize(8)
          .fillColor('gray')
          .text(
            'Thank you for your business!',
            50,
            doc.page.height - 50,
            { align: 'center' }
          );

        doc.end();
      } catch (error) {
        logger.error('Error generating invoice PDF:', error);
        reject(error);
      }
    });
  }

  // Send invoice via email
  async sendInvoice(invoiceId) {
    try {
      const invoice = await Invoice.findById(invoiceId)
        .populate('seller')
        .populate('buyer');

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Generate PDF
      const pdfBuffer = await this.generatePDF(invoiceId);

      // Send email with PDF attachment
      await emailService.send({
        to: invoice.buyer.email,
        subject: `Invoice ${invoice.invoiceNumber} from ${invoice.seller.companyName}`,
        html: `
          <h2>Invoice ${invoice.invoiceNumber}</h2>
          <p>Dear ${invoice.buyer.name},</p>
          <p>Please find attached invoice ${invoice.invoiceNumber} for the amount of $${invoice.totalAmount.toFixed(
          2
        )}.</p>
          <p><strong>Due Date:</strong> ${invoice.dueDate.toLocaleDateString()}</p>
          <p>Thank you for your business!</p>
          <p>Best regards,<br>${invoice.seller.companyName}</p>
        `,
        attachments: [
          {
            filename: `invoice-${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      // Update invoice status
      invoice.status = 'sent';
      await invoice.save();

      logger.info(`Invoice sent: ${invoice.invoiceNumber}`);
      return { success: true };
    } catch (error) {
      logger.error('Error sending invoice:', error);
      throw error;
    }
  }

  // Mark invoice as paid
  async markPaid(invoiceId, paymentDetails) {
    try {
      const invoice = await Invoice.findByIdAndUpdate(
        invoiceId,
        {
          status: 'paid',
          paidDate: new Date(),
          paymentMethod: paymentDetails.method,
          paymentDetails: {
            transactionId: paymentDetails.transactionId,
            reference: paymentDetails.reference,
            notes: paymentDetails.notes,
          },
        },
        { new: true }
      );

      logger.info(`Invoice marked as paid: ${invoice.invoiceNumber}`);
      return invoice;
    } catch (error) {
      logger.error('Error marking invoice as paid:', error);
      throw error;
    }
  }

  // Send reminder for overdue invoices
  async sendReminder(invoiceId) {
    try {
      const invoice = await Invoice.findById(invoiceId)
        .populate('seller')
        .populate('buyer');

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      await emailService.send({
        to: invoice.buyer.email,
        subject: `Reminder: Invoice ${invoice.invoiceNumber} - Payment Due`,
        html: `
          <h2>Payment Reminder</h2>
          <p>Dear ${invoice.buyer.name},</p>
          <p>This is a friendly reminder that invoice ${
            invoice.invoiceNumber
          } for $${invoice.totalAmount.toFixed(2)} is due.</p>
          <p><strong>Due Date:</strong> ${invoice.dueDate.toLocaleDateString()}</p>
          <p>Please process the payment at your earliest convenience.</p>
          <p>If you have already paid, please disregard this message.</p>
          <p>Best regards,<br>${invoice.seller.companyName}</p>
        `,
      });

      // Log reminder
      invoice.reminders.push({
        sentAt: new Date(),
        type: 'email',
        status: 'sent',
      });
      await invoice.save();

      logger.info(`Reminder sent for invoice: ${invoice.invoiceNumber}`);
      return { success: true };
    } catch (error) {
      logger.error('Error sending invoice reminder:', error);
      throw error;
    }
  }
}

export default new InvoiceService();
