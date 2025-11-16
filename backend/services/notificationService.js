// backend/services/notificationService.js
import Notification from '../models/Notification.js';
import logger from '../utils/logger.js';
import { io } from '../server.js';

class NotificationService {
  async create(data) {
    try {
      const notification = await Notification.create(data);

      // Emit real-time notification via Socket.IO
      if (io) {
        io.to(data.user.toString()).emit('newNotification', notification);
      }

      logger.info(`Notification created for user: ${data.user}`);
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  async createBulk(notifications) {
    try {
      const created = await Notification.insertMany(notifications);

      // Emit notifications to all affected users
      if (io) {
        notifications.forEach((notif) => {
          io.to(notif.user.toString()).emit('newNotification', notif);
        });
      }

      logger.info(`Created ${created.length} bulk notifications`);
      return created;
    } catch (error) {
      logger.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  async getUserNotifications(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;

    try {
      const query = { user: userId };
      if (unreadOnly) {
        query.isRead = false;
      }

      const skip = (page - 1) * limit;

      const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Notification.countDocuments(query),
        Notification.countDocuments({ user: userId, isRead: false }),
      ]);

      return {
        notifications,
        total,
        unreadCount,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );

      if (notification && io) {
        io.to(userId.toString()).emit('notificationRead', notification);
      }

      return notification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { user: userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      if (io) {
        io.to(userId.toString()).emit('allNotificationsRead');
      }

      logger.info(`Marked ${result.modifiedCount} notifications as read for user: ${userId}`);
      return result;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        user: userId,
      });

      return notification;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Notification type helpers
  async notifyNewOrder(order, exporterUser) {
    return await this.create({
      user: exporterUser._id,
      type: 'order',
      title: 'New Order Request',
      message: `You have a new order request for ${order.ad.title}`,
      link: `/orders/${order._id}`,
      metadata: {
        orderId: order._id,
        adId: order.ad,
      },
    });
  }

  async notifyOrderStatusChange(order, manufacturerUser, status) {
    const statusMessages = {
      'Approved': 'Your order has been approved!',
      'Rejected': 'Your order has been rejected.',
      'Completed': 'Your order has been completed!',
    };

    return await this.create({
      user: manufacturerUser._id,
      type: 'order',
      title: `Order ${status}`,
      message: statusMessages[status] || `Order status updated to ${status}`,
      link: `/orders/${order._id}`,
      metadata: {
        orderId: order._id,
        status,
      },
    });
  }

  async notifyAdStatusChange(ad, user, status) {
    const statusMessages = {
      'approved': 'Your ad has been approved and is now live!',
      'rejected': 'Your ad has been rejected. Please review and resubmit.',
    };

    return await this.create({
      user: user._id,
      type: 'ad',
      title: `Ad ${status}`,
      message: statusMessages[status] || `Ad status updated to ${status}`,
      link: `/ads/${ad._id}`,
      metadata: {
        adId: ad._id,
        status,
      },
    });
  }

  async notifyNewMessage(chat, sender, receiver) {
    return await this.create({
      user: receiver._id,
      type: 'message',
      title: 'New Message',
      message: `You have a new message from ${sender.companyName || sender.name}`,
      link: `/chats/${chat._id}`,
      metadata: {
        chatId: chat._id,
        senderId: sender._id,
      },
    });
  }

  async notifyReview(ad, reviewer, adOwner) {
    return await this.create({
      user: adOwner._id,
      type: 'review',
      title: 'New Review',
      message: `${reviewer.companyName || reviewer.name} reviewed your ad: ${ad.title}`,
      link: `/ads/${ad._id}`,
      metadata: {
        adId: ad._id,
        reviewerId: reviewer._id,
      },
    });
  }
}

export default new NotificationService();
