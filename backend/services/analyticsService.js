// backend/services/analyticsService.js
import Analytics from '../models/Analytics.js';
import User from '../models/User.js';
import Ad from '../models/Ad.js';
import Order from '../models/Order.js';
import Message from '../models/Message.js';
import logger from '../utils/logger.js';

class AnalyticsService {
  async generateDailyAnalytics(date = new Date()) {
    try {
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const [
        totalUsers,
        newUsers,
        totalAds,
        newAds,
        adsBreakdown,
        totalOrders,
        newOrders,
        ordersBreakdown,
        totalMessages,
        topExporters,
        topManufacturers,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),
        Ad.countDocuments(),
        Ad.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),
        this.getAdsBreakdown(),
        Order.countDocuments(),
        Order.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),
        this.getOrdersBreakdown(),
        Message.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),
        this.getTopExporters(),
        this.getTopManufacturers(),
      ]);

      const analytics = await Analytics.findOneAndUpdate(
        { date: startOfDay, type: 'DAILY' },
        {
          date: startOfDay,
          type: 'DAILY',
          metrics: {
            totalUsers,
            newUsers,
            totalAds,
            newAds,
            approvedAds: adsBreakdown.approved || 0,
            rejectedAds: adsBreakdown.rejected || 0,
            pendingAds: adsBreakdown.pending || 0,
            totalOrders,
            newOrders,
            approvedOrders: ordersBreakdown.Approved || 0,
            rejectedOrders: ordersBreakdown.Rejected || 0,
            pendingOrders: ordersBreakdown.Pending || 0,
            totalMessages,
          },
          breakdown: {
            adsByCategory: await this.getAdsByCategory(),
            adsByLocation: await this.getAdsByLocation(),
            usersByRole: await this.getUsersByRole(),
            ordersByStatus: new Map(Object.entries(ordersBreakdown)),
          },
          topPerformers: {
            topExporters,
            topManufacturers,
            topCategories: await this.getTopCategories(),
          },
        },
        { upsert: true, new: true }
      );

      logger.info(`Generated daily analytics for ${startOfDay.toISOString()}`);
      return analytics;
    } catch (error) {
      logger.error('Error generating daily analytics:', error);
      throw error;
    }
  }

  async getAdsBreakdown() {
    const breakdown = await Ad.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(breakdown.map(b => [b._id, b.count]));
  }

  async getOrdersBreakdown() {
    const breakdown = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(breakdown.map(b => [b._id, b.count]));
  }

  async getAdsByCategory() {
    const result = await Ad.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return new Map(result.map(r => [r._id, r.count]));
  }

  async getAdsByLocation() {
    const result = await Ad.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);
    return new Map(result.map(r => [r._id, r.count]));
  }

  async getUsersByRole() {
    const result = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    return new Map(result.map(r => [r._id, r.count]));
  }

  async getTopExporters(limit = 10) {
    const result = await Ad.aggregate([
      { $match: { type: 'exporter', status: 'approved' } },
      {
        $group: {
          _id: '$user',
          adsCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'exporter',
          as: 'orders',
        },
      },
      {
        $addFields: {
          ordersCount: { $size: '$orders' },
        },
      },
      { $sort: { adsCount: -1, ordersCount: -1 } },
      { $limit: limit },
      {
        $project: {
          user: '$_id',
          adsCount: 1,
          ordersCount: 1,
          _id: 0,
        },
      },
    ]);
    return result;
  }

  async getTopManufacturers(limit = 10) {
    const result = await Order.aggregate([
      {
        $group: {
          _id: '$manufacturer',
          ordersCount: { $sum: 1 },
        },
      },
      { $sort: { ordersCount: -1 } },
      { $limit: limit },
      {
        $project: {
          user: '$_id',
          ordersCount: 1,
          _id: 0,
        },
      },
    ]);
    return result;
  }

  async getTopCategories(limit = 10) {
    const result = await Ad.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $project: {
          category: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]);
    return result;
  }

  async getAnalytics(type, startDate, endDate) {
    try {
      const analytics = await Analytics.find({
        type,
        date: { $gte: startDate, $lte: endDate },
      })
        .sort({ date: 1 })
        .lean();

      return analytics;
    } catch (error) {
      logger.error('Error fetching analytics:', error);
      throw error;
    }
  }

  async getRevenueAnalytics(startDate, endDate) {
    try {
      // Implement revenue analytics based on your business model
      const result = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'Approved',
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            totalOrders: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]);

      return result;
    } catch (error) {
      logger.error('Error fetching revenue analytics:', error);
      throw error;
    }
  }

  async getUserGrowthAnalytics(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]);

      return result;
    } catch (error) {
      logger.error('Error fetching user growth analytics:', error);
      throw error;
    }
  }
}

export default new AnalyticsService();
