// backend/services/smsService.js
import twilio from 'twilio';
import logger from '../utils/logger.js';

class SMSService {
  constructor() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.from = process.env.TWILIO_PHONE_NUMBER;
      this.enabled = true;
    } else {
      logger.warn('Twilio credentials not configured, SMS service disabled');
      this.enabled = false;
    }
  }

  async send(to, message) {
    if (!this.enabled) {
      logger.warn('SMS service not enabled');
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.from,
        to,
      });

      logger.info(`SMS sent to ${to}: ${result.sid}`);
      return { success: true, sid: result.sid };
    } catch (error) {
      logger.error('Error sending SMS:', error);
      return { success: false, error: error.message };
    }
  }

  // Send 2FA verification code
  async send2FACode(phone, code) {
    const message = `Your ExportHaven verification code is: ${code}. Valid for 10 minutes.`;
    return await this.send(phone, message);
  }

  // Send order notification
  async sendOrderNotification(phone, orderNumber, status) {
    const message = `Order #${orderNumber} status updated: ${status}. Visit ExportHaven to view details.`;
    return await this.send(phone, message);
  }

  // Send alert
  async sendAlert(phone, alertMessage) {
    const message = `ExportHaven Alert: ${alertMessage}`;
    return await this.send(phone, message);
  }

  // Send reminder
  async sendReminder(phone, reminderText) {
    const message = `Reminder: ${reminderText}`;
    return await this.send(phone, message);
  }

  // Send bulk SMS
  async sendBulk(recipients, message) {
    if (!this.enabled) {
      logger.warn('SMS service not enabled');
      return { success: false, error: 'SMS service not configured' };
    }

    const results = [];

    for (const phone of recipients) {
      const result = await this.send(phone, message);
      results.push({ phone, ...result });

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.length - successful;

    logger.info(`Bulk SMS sent: ${successful} successful, ${failed} failed`);

    return {
      success: true,
      total: results.length,
      successful,
      failed,
      results,
    };
  }

  // Verify phone number
  async verifyPhone(phone, code) {
    if (!this.enabled) {
      return { verified: false };
    }

    try {
      const verification = await this.client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({ to: phone, code });

      return {
        verified: verification.status === 'approved',
        status: verification.status,
      };
    } catch (error) {
      logger.error('Error verifying phone:', error);
      return { verified: false, error: error.message };
    }
  }
}

export default new SMSService();
