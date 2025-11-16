// backend/services/paymentService.js
import Stripe from 'stripe';
import Invoice from '../models/Invoice.js';
import logger from '../utils/logger.js';

class PaymentService {
  constructor() {
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      this.enabled = true;
    } else {
      logger.warn('Stripe not configured, payment service disabled');
      this.enabled = false;
    }
  }

  // Create payment intent
  async createPaymentIntent(invoiceId) {
    if (!this.enabled) {
      throw new Error('Payment service not configured');
    }

    try {
      const invoice = await Invoice.findById(invoiceId)
        .populate('seller')
        .populate('buyer');

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(invoice.totalAmount * 100), // Convert to cents
        currency: invoice.currency.toLowerCase(),
        metadata: {
          invoiceId: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          sellerId: invoice.seller._id.toString(),
          buyerId: invoice.buyer._id.toString(),
        },
        description: `Payment for invoice ${invoice.invoiceNumber}`,
      });

      logger.info(`Payment intent created: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      logger.error('Error creating payment intent:', error);
      throw error;
    }
  }

  // Confirm payment
  async confirmPayment(paymentIntentId) {
    if (!this.enabled) {
      throw new Error('Payment service not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId
      );

      logger.info(`Payment confirmed: ${paymentIntentId}`);
      return paymentIntent;
    } catch (error) {
      logger.error('Error confirming payment:', error);
      throw error;
    }
  }

  // Handle webhook from Stripe
  async handleWebhook(event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;

        case 'charge.refunded':
          await this.handleRefund(event.data.object);
          break;

        default:
          logger.info(`Unhandled Stripe event: ${event.type}`);
      }
    } catch (error) {
      logger.error('Error handling Stripe webhook:', error);
      throw error;
    }
  }

  // Handle successful payment
  async handlePaymentSuccess(paymentIntent) {
    try {
      const invoiceId = paymentIntent.metadata.invoiceId;

      const invoice = await Invoice.findByIdAndUpdate(
        invoiceId,
        {
          status: 'paid',
          paidDate: new Date(),
          paymentMethod: 'stripe',
          paymentDetails: {
            transactionId: paymentIntent.id,
            reference: paymentIntent.client_secret,
          },
        },
        { new: true }
      );

      logger.info(`Invoice marked as paid: ${invoice.invoiceNumber}`);

      // Send confirmation email
      // await emailService.sendPaymentConfirmation(invoice);
    } catch (error) {
      logger.error('Error handling payment success:', error);
    }
  }

  // Handle payment failure
  async handlePaymentFailure(paymentIntent) {
    try {
      const invoiceId = paymentIntent.metadata.invoiceId;

      logger.warn(`Payment failed for invoice: ${invoiceId}`);

      // Notify user about payment failure
      // await emailService.sendPaymentFailureNotification(invoiceId);
    } catch (error) {
      logger.error('Error handling payment failure:', error);
    }
  }

  // Handle refund
  async handleRefund(charge) {
    try {
      const paymentIntentId = charge.payment_intent;

      // Find invoice by payment intent ID
      const invoice = await Invoice.findOne({
        'paymentDetails.transactionId': paymentIntentId,
      });

      if (invoice) {
        invoice.status = 'refunded';
        await invoice.save();

        logger.info(`Invoice refunded: ${invoice.invoiceNumber}`);
      }
    } catch (error) {
      logger.error('Error handling refund:', error);
    }
  }

  // Create customer
  async createCustomer(user) {
    if (!this.enabled) {
      throw new Error('Payment service not configured');
    }

    try {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString(),
          companyName: user.companyName,
        },
      });

      logger.info(`Stripe customer created: ${customer.id}`);
      return customer;
    } catch (error) {
      logger.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  // Create subscription
  async createSubscription(customerId, priceId) {
    if (!this.enabled) {
      throw new Error('Payment service not configured');
    }

    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      logger.info(`Subscription created: ${subscription.id}`);
      return subscription;
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId) {
    if (!this.enabled) {
      throw new Error('Payment service not configured');
    }

    try {
      const subscription = await this.stripe.subscriptions.cancel(
        subscriptionId
      );

      logger.info(`Subscription cancelled: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  // Process refund
  async processRefund(paymentIntentId, amount = null) {
    if (!this.enabled) {
      throw new Error('Payment service not configured');
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Partial refund if amount specified
      });

      logger.info(`Refund processed: ${refund.id}`);
      return refund;
    } catch (error) {
      logger.error('Error processing refund:', error);
      throw error;
    }
  }
}

export default new PaymentService();
