// backend/services/webhookService.js
import axios from 'axios';
import crypto from 'crypto';
import Webhook from '../models/Webhook.js';
import WebhookLog from '../models/WebhookLog.js';
import logger from '../utils/logger.js';

class WebhookService {
  // Trigger webhook
  async trigger(event, payload) {
    try {
      // Find all active webhooks subscribed to this event
      const webhooks = await Webhook.find({
        events: event,
        isActive: true,
      });

      logger.info(`Triggering ${webhooks.length} webhooks for event: ${event}`);

      // Trigger webhooks in parallel
      const promises = webhooks.map((webhook) =>
        this.sendWebhook(webhook, event, payload)
      );

      await Promise.allSettled(promises);
    } catch (error) {
      logger.error('Error triggering webhooks:', error);
    }
  }

  // Send webhook to endpoint
  async sendWebhook(webhook, event, payload, attempt = 1) {
    const startTime = Date.now();
    const webhookLog = await WebhookLog.create({
      webhook: webhook._id,
      event,
      payload,
      status: 'pending',
      attempts: attempt,
    });

    try {
      // Generate signature
      const signature = this.generateSignature(payload, webhook.secret);

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
        'X-Webhook-ID': webhook._id.toString(),
        'X-Webhook-Attempt': attempt,
        ...Object.fromEntries(webhook.headers || new Map()),
      };

      // Send webhook
      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: 30000, // 30 seconds
      });

      // Update log
      webhookLog.status = 'success';
      webhookLog.response = {
        statusCode: response.status,
        body: JSON.stringify(response.data),
        headers: response.headers,
      };
      webhookLog.duration = Date.now() - startTime;
      await webhookLog.save();

      // Update webhook stats
      webhook.stats.totalCalls += 1;
      webhook.stats.successfulCalls += 1;
      webhook.lastTriggered = new Date();
      await webhook.save();

      logger.info(`Webhook sent successfully: ${webhook._id} for event ${event}`);
    } catch (error) {
      webhookLog.status = 'failed';
      webhookLog.error = error.message;
      webhookLog.duration = Date.now() - startTime;

      if (error.response) {
        webhookLog.response = {
          statusCode: error.response.status,
          body: JSON.stringify(error.response.data),
          headers: error.response.headers,
        };
      }

      await webhookLog.save();

      // Update webhook stats
      webhook.stats.totalCalls += 1;
      webhook.stats.failedCalls += 1;
      await webhook.save();

      // Retry if needed
      if (attempt < webhook.retryPolicy.maxRetries) {
        webhookLog.status = 'retrying';
        await webhookLog.save();

        logger.warn(
          `Webhook failed, retrying (${attempt}/${webhook.retryPolicy.maxRetries}): ${webhook._id}`
        );

        // Schedule retry with delay
        setTimeout(() => {
          this.sendWebhook(webhook, event, payload, attempt + 1);
        }, webhook.retryPolicy.retryDelay);
      } else {
        logger.error(`Webhook failed after ${attempt} attempts: ${webhook._id}`);
      }
    }
  }

  // Generate HMAC signature
  generateSignature(payload, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  // Verify webhook signature (for incoming webhooks)
  verifySignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // Create webhook
  async create(userId, webhookData) {
    try {
      const secret = crypto.randomBytes(32).toString('hex');

      const webhook = await Webhook.create({
        user: userId,
        ...webhookData,
        secret,
      });

      logger.info(`Webhook created: ${webhook._id} for user ${userId}`);
      return webhook;
    } catch (error) {
      logger.error('Error creating webhook:', error);
      throw error;
    }
  }

  // Get webhook logs
  async getLogs(webhookId, options = {}) {
    const { page = 1, limit = 20, status } = options;

    const query = { webhook: webhookId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      WebhookLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WebhookLog.countDocuments(query),
    ]);

    return {
      logs,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Test webhook
  async test(webhookId) {
    try {
      const webhook = await Webhook.findById(webhookId);

      if (!webhook) {
        throw new Error('Webhook not found');
      }

      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook',
        },
      };

      await this.sendWebhook(webhook, 'test', testPayload);

      return { success: true };
    } catch (error) {
      logger.error('Error testing webhook:', error);
      throw error;
    }
  }
}

export default new WebhookService();
