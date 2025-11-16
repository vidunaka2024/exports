// backend/services/recommendationService.js
import Ad from '../models/Ad.js';
import Order from '../models/Order.js';
import logger from '../utils/logger.js';

class RecommendationService {
  // Get recommended ads for a user based on their activity
  async getRecommendedAds(userId, userRole, options = {}) {
    try {
      const { limit = 10, category, location } = options;

      // Get user's order history to understand preferences
      const userOrders = await Order.find({
        [userRole === 'manufacturer' ? 'manufacturer' : 'exporter']: userId,
      })
        .populate('ad')
        .lean();

      // Extract categories and locations from user's orders
      const preferredCategories = [
        ...new Set(
          userOrders
            .map((o) => o.ad?.category)
            .filter(Boolean)
        ),
      ];

      const preferredLocations = [
        ...new Set(
          userOrders
            .map((o) => o.ad?.location)
            .filter(Boolean)
        ),
      ];

      // Build recommendation query
      const query = {
        status: 'approved',
        user: { $ne: userId }, // Exclude user's own ads
      };

      // Add type filter based on user role
      if (userRole === 'manufacturer') {
        query.type = 'exporter';
      } else if (userRole === 'exporter') {
        query.type = 'manufacturer';
      }

      if (category) {
        query.category = category;
      }

      if (location) {
        query.location = location;
      }

      // Fetch ads with scoring
      const recommendations = await Ad.aggregate([
        { $match: query },
        {
          $addFields: {
            relevanceScore: {
              $add: [
                // Category match score
                {
                  $cond: [
                    { $in: ['$category', preferredCategories] },
                    50,
                    0,
                  ],
                },
                // Location match score
                {
                  $cond: [
                    { $in: ['$location', preferredLocations] },
                    30,
                    0,
                  ],
                },
                // Recency score (newer ads get higher scores)
                {
                  $divide: [
                    {
                      $subtract: [
                        new Date(),
                        { $toDate: '$createdAt' },
                      ],
                    },
                    -86400000, // Convert ms to days and invert
                  ],
                },
                // Review count score
                {
                  $multiply: [{ $size: { $ifNull: ['$reviews', []] } }, 2],
                },
              ],
            },
          },
        },
        { $sort: { relevanceScore: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            category: 1,
            images: 1,
            location: 1,
            minPrice: 1,
            maxPrice: 1,
            unit: 1,
            type: 1,
            relevanceScore: 1,
            'userDetails.companyName': 1,
            'userDetails.name': 1,
            reviewsCount: { $size: { $ifNull: ['$reviews', []] } },
            createdAt: 1,
          },
        },
      ]);

      logger.info(`Generated ${recommendations.length} recommendations for user ${userId}`);
      return recommendations;
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      throw error;
    }
  }

  // Get similar ads based on category and attributes
  async getSimilarAds(adId, limit = 5) {
    try {
      const ad = await Ad.findById(adId).lean();
      if (!ad) {
        throw new Error('Ad not found');
      }

      const similarAds = await Ad.find({
        _id: { $ne: adId },
        status: 'approved',
        $or: [
          { category: ad.category },
          { location: ad.location },
          { type: ad.type },
        ],
      })
        .limit(limit)
        .populate('user', 'companyName name')
        .lean();

      return similarAds;
    } catch (error) {
      logger.error('Error finding similar ads:', error);
      throw error;
    }
  }

  // Get trending ads based on recent activity
  async getTrendingAds(limit = 10) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const trendingAds = await Ad.aggregate([
        {
          $match: {
            status: 'approved',
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $lookup: {
            from: 'orders',
            localField: '_id',
            foreignField: 'ad',
            as: 'orders',
          },
        },
        {
          $addFields: {
            trendingScore: {
              $add: [
                { $size: '$orders' }, // Order count
                { $multiply: [{ $size: { $ifNull: ['$reviews', []] } }, 2] }, // Review count * 2
                // Recency bonus
                {
                  $divide: [
                    {
                      $subtract: [
                        new Date(),
                        { $toDate: '$createdAt' },
                      ],
                    },
                    -86400000,
                  ],
                },
              ],
            },
          },
        },
        { $sort: { trendingScore: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            category: 1,
            images: 1,
            location: 1,
            minPrice: 1,
            maxPrice: 1,
            unit: 1,
            type: 1,
            trendingScore: 1,
            ordersCount: { $size: '$orders' },
            reviewsCount: { $size: { $ifNull: ['$reviews', []] } },
            'userDetails.companyName': 1,
            'userDetails.name': 1,
            createdAt: 1,
          },
        },
      ]);

      logger.info(`Found ${trendingAds.length} trending ads`);
      return trendingAds;
    } catch (error) {
      logger.error('Error finding trending ads:', error);
      throw error;
    }
  }

  // Get recommended users to connect with
  async getRecommendedUsers(userId, userRole, limit = 10) {
    try {
      // For manufacturers, recommend exporters and vice versa
      const targetRole = userRole === 'manufacturer' ? 'exporter' : 'manufacturer';

      // Get user's order history to understand their network
      const existingConnections = await Order.find({
        [userRole === 'manufacturer' ? 'manufacturer' : 'exporter']: userId,
      })
        .distinct(userRole === 'manufacturer' ? 'exporter' : 'manufacturer');

      // Find users with active ads, excluding existing connections
      const recommendedUsers = await Ad.aggregate([
        {
          $match: {
            type: targetRole,
            status: 'approved',
            user: { $nin: [userId, ...existingConnections] },
          },
        },
        {
          $group: {
            _id: '$user',
            adsCount: { $sum: 1 },
            categories: { $addToSet: '$category' },
          },
        },
        { $sort: { adsCount: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
        { $unwind: '$userDetails' },
        {
          $project: {
            _id: '$userDetails._id',
            name: '$userDetails.name',
            companyName: '$userDetails.companyName',
            email: '$userDetails.email',
            phone: '$userDetails.phone',
            role: '$userDetails.role',
            profilePhoto: '$userDetails.profilePhoto',
            adsCount: 1,
            categories: 1,
          },
        },
      ]);

      logger.info(`Found ${recommendedUsers.length} recommended users for user ${userId}`);
      return recommendedUsers;
    } catch (error) {
      logger.error('Error finding recommended users:', error);
      throw error;
    }
  }
}

export default new RecommendationService();
