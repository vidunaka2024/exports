// backend/services/exportService.js
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';
import logger from '../utils/logger.js';

class ExportService {
  // Export data to CSV
  async exportToCSV(data, fields) {
    try {
      const parser = new Parser({ fields });
      const csv = parser.parse(data);
      return csv;
    } catch (error) {
      logger.error('Error exporting to CSV:', error);
      throw error;
    }
  }

  // Export data to Excel
  async exportToExcel(data, options = {}) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(options.sheetName || 'Data');

      // Add headers
      if (options.columns) {
        worksheet.columns = options.columns;
      }

      // Add rows
      worksheet.addRows(data);

      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '667eea' },
      };

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      });

      return await workbook.xlsx.writeBuffer();
    } catch (error) {
      logger.error('Error exporting to Excel:', error);
      throw error;
    }
  }

  // Export data to PDF
  async exportToPDF(data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add header
        doc
          .fontSize(20)
          .fillColor('#667eea')
          .text(options.title || 'Export Report', { align: 'center' });

        doc.moveDown();

        // Add metadata
        if (options.metadata) {
          doc.fontSize(10).fillColor('gray');
          Object.entries(options.metadata).forEach(([key, value]) => {
            doc.text(`${key}: ${value}`);
          });
          doc.moveDown();
        }

        doc.fillColor('black');

        // Add table
        if (options.table) {
          const { headers, rows } = options.table;

          // Table header
          let y = doc.y;
          let x = 50;
          const columnWidth = (doc.page.width - 100) / headers.length;

          doc.fontSize(10).font('Helvetica-Bold');
          headers.forEach((header, i) => {
            doc.text(header, x + i * columnWidth, y, {
              width: columnWidth,
              align: 'left',
            });
          });

          doc.moveDown();

          // Table rows
          doc.font('Helvetica');
          rows.forEach((row) => {
            y = doc.y;
            headers.forEach((header, i) => {
              doc.text(row[header] || '', x + i * columnWidth, y, {
                width: columnWidth,
                align: 'left',
              });
            });
            doc.moveDown(0.5);
          });
        }

        // Add footer
        const bottomMargin = 50;
        doc
          .fontSize(8)
          .fillColor('gray')
          .text(
            `Generated on ${new Date().toLocaleString()}`,
            50,
            doc.page.height - bottomMargin,
            { align: 'center' }
          );

        doc.end();
      } catch (error) {
        logger.error('Error exporting to PDF:', error);
        reject(error);
      }
    });
  }

  // Export users report
  async exportUsersReport(users, format = 'csv') {
    const data = users.map((user) => ({
      Name: user.name,
      Email: user.email,
      Role: user.role,
      Company: user.companyName,
      Phone: user.phone,
      'Registered On': new Date(user.createdAt).toLocaleDateString(),
    }));

    if (format === 'csv') {
      return this.exportToCSV(data, Object.keys(data[0]));
    } else if (format === 'excel') {
      return this.exportToExcel(data, {
        sheetName: 'Users',
        columns: Object.keys(data[0]).map((key) => ({
          header: key,
          key,
          width: 20,
        })),
      });
    } else if (format === 'pdf') {
      return this.exportToPDF(data, {
        title: 'Users Report',
        metadata: {
          'Total Users': users.length,
          'Generated On': new Date().toLocaleString(),
        },
        table: {
          headers: Object.keys(data[0]),
          rows: data,
        },
      });
    }
  }

  // Export ads report
  async exportAdsReport(ads, format = 'csv') {
    const data = ads.map((ad) => ({
      Title: ad.title,
      Category: ad.category,
      Type: ad.type,
      Status: ad.status,
      Location: ad.location,
      'Min Price': ad.minPrice,
      'Max Price': ad.maxPrice,
      'Created On': new Date(ad.createdAt).toLocaleDateString(),
    }));

    if (format === 'csv') {
      return this.exportToCSV(data, Object.keys(data[0]));
    } else if (format === 'excel') {
      return this.exportToExcel(data, {
        sheetName: 'Ads',
        columns: Object.keys(data[0]).map((key) => ({
          header: key,
          key,
          width: 20,
        })),
      });
    } else if (format === 'pdf') {
      return this.exportToPDF(data, {
        title: 'Ads Report',
        metadata: {
          'Total Ads': ads.length,
          'Generated On': new Date().toLocaleString(),
        },
        table: {
          headers: Object.keys(data[0]),
          rows: data,
        },
      });
    }
  }

  // Export orders report
  async exportOrdersReport(orders, format = 'csv') {
    const data = orders.map((order) => ({
      'Order ID': order._id,
      'Ad Title': order.ad?.title || 'N/A',
      Quantity: order.quantity,
      Status: order.status,
      Exporter: order.exporter?.companyName || 'N/A',
      Manufacturer: order.manufacturer?.companyName || 'N/A',
      'Created On': new Date(order.createdAt).toLocaleDateString(),
    }));

    if (format === 'csv') {
      return this.exportToCSV(data, Object.keys(data[0]));
    } else if (format === 'excel') {
      return this.exportToExcel(data, {
        sheetName: 'Orders',
        columns: Object.keys(data[0]).map((key) => ({
          header: key,
          key,
          width: 20,
        })),
      });
    } else if (format === 'pdf') {
      return this.exportToPDF(data, {
        title: 'Orders Report',
        metadata: {
          'Total Orders': orders.length,
          'Generated On': new Date().toLocaleString(),
        },
        table: {
          headers: Object.keys(data[0]),
          rows: data,
        },
      });
    }
  }
}

export default new ExportService();
