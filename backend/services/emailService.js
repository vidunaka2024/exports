// backend/services/emailService.js
import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async send({ to, subject, html, text }) {
    try {
      const mailOptions = {
        from: `"ExportHaven" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  // Email Templates
  welcomeEmail(user) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ExportHaven!</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.name},</h2>
              <p>Thank you for joining ExportHaven! We're excited to have you as part of our community.</p>
              <p>As a ${user.role}, you now have access to:</p>
              <ul>
                <li>Connect with verified exporters and manufacturers</li>
                <li>Post and browse product listings</li>
                <li>Manage orders and communications</li>
                <li>Access analytics and insights</li>
              </ul>
              <a href="${process.env.CLIENT_URL}/dashboard" class="button">Get Started</a>
              <p>If you have any questions, feel free to reach out to our support team.</p>
              <p>Best regards,<br>The ExportHaven Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ExportHaven. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.send({
      to: user.email,
      subject: 'Welcome to ExportHaven!',
      html,
      text: `Welcome to ExportHaven, ${user.name}!`,
    });
  }

  orderNotificationEmail(order, user, type) {
    const subjects = {
      new: 'New Order Request Received',
      approved: 'Your Order Has Been Approved',
      rejected: 'Order Status Update',
      completed: 'Order Completed',
    };

    const messages = {
      new: `You have received a new order request for ${order.ad?.title || 'your product'}.`,
      approved: `Great news! Your order for ${order.ad?.title || 'the product'} has been approved.`,
      rejected: `Your order for ${order.ad?.title || 'the product'} has been updated.`,
      completed: `Your order for ${order.ad?.title || 'the product'} has been completed.`,
    };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order ${type === 'new' ? 'Request' : 'Update'}</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.name},</h2>
              <p>${messages[type]}</p>
              <div class="order-details">
                <h3>Order Details:</h3>
                <p><strong>Order ID:</strong> ${order._id}</p>
                <p><strong>Quantity:</strong> ${order.quantity}</p>
                <p><strong>Status:</strong> ${order.status}</p>
              </div>
              <a href="${process.env.CLIENT_URL}/orders/${order._id}" class="button">View Order</a>
              <p>Best regards,<br>The ExportHaven Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.send({
      to: user.email,
      subject: subjects[type],
      html,
      text: messages[type],
    });
  }

  adStatusEmail(ad, user, status) {
    const subjects = {
      approved: 'Your Ad Has Been Approved',
      rejected: 'Ad Review Update',
    };

    const messages = {
      approved: `Congratulations! Your ad "${ad.title}" has been approved and is now live.`,
      rejected: `Your ad "${ad.title}" requires some updates before it can be published.`,
    };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .ad-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Ad Status Update</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.name},</h2>
              <p>${messages[status]}</p>
              <div class="ad-details">
                <h3>Ad Details:</h3>
                <p><strong>Title:</strong> ${ad.title}</p>
                <p><strong>Category:</strong> ${ad.category}</p>
                <p><strong>Status:</strong> ${status}</p>
              </div>
              <a href="${process.env.CLIENT_URL}/ads/${ad._id}" class="button">View Ad</a>
              <p>Best regards,<br>The ExportHaven Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.send({
      to: user.email,
      subject: subjects[status],
      html,
      text: messages[status],
    });
  }

  passwordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.name},</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <div class="warning">
                <strong>⚠️ Security Note:</strong>
                <p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
              </div>
              <p>Best regards,<br>The ExportHaven Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.send({
      to: user.email,
      subject: 'Password Reset Request',
      html,
      text: `Reset your password: ${resetUrl}`,
    });
  }
}

export default new EmailService();
