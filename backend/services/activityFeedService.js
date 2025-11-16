// backend/services/activityFeedService.js
import ActivityFeed from '../models/ActivityFeed.js';
import logger from '../utils/logger.js';

class ActivityFeedService {
  // Create activity
  async create(activityData) {
    try {
      const activity = await ActivityFeed.create(activityData);
      logger.info(`Activity created: ${activity._id}`);
      return activity;
    } catch (error) {
      logger.error('Error creating activity:', error);
      throw error;
    }
  }

  // Get user feed
  async getUserFeed(userId, options = {}) {
    const { page = 1, limit = 20, visibility } = options;

    const query = {
      $or: [{ user: userId }, { visibility: 'public' }],
    };

    if (visibility) {
      query.visibility = visibility;
    }

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      ActivityFeed.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name companyName profilePhoto')
        .populate('comments.user', 'name profilePhoto')
        .lean(),
      ActivityFeed.countDocuments(query),
    ]);

    return {
      activities,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Add comment to activity
  async addComment(activityId, userId, text) {
    try {
      const activity = await ActivityFeed.findById(activityId);

      if (!activity) {
        throw new Error('Activity not found');
      }

      activity.comments.push({
        user: userId,
        text,
      });

      await activity.save();

      logger.info(`Comment added to activity: ${activityId}`);
      return activity;
    } catch (error) {
      logger.error('Error adding comment to activity:', error);
      throw error;
    }
  }

  // Like activity
  async like(activityId, userId) {
    try {
      const activity = await ActivityFeed.findById(activityId);

      if (!activity) {
        throw new Error('Activity not found');
      }

      if (!activity.likes.includes(userId)) {
        activity.likes.push(userId);
        await activity.save();
      }

      logger.info(`Activity liked: ${activityId} by user ${userId}`);
      return activity;
    } catch (error) {
      logger.error('Error liking activity:', error);
      throw error;
    }
  }

  // Unlike activity
  async unlike(activityId, userId) {
    try {
      const activity = await ActivityFeed.findById(activityId);

      if (!activity) {
        throw new Error('Activity not found');
      }

      activity.likes = activity.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
      await activity.save();

      logger.info(`Activity unliked: ${activityId} by user ${userId}`);
      return activity;
    } catch (error) {
      logger.error('Error unliking activity:', error);
      throw error;
    }
  }

  // Log user action as activity
  async logAction(userId, action, resourceType, resourceId, description, metadata = {}) {
    return await this.create({
      user: userId,
      action,
      resourceType,
      resourceId,
      description,
      metadata,
      visibility: 'public',
    });
  }
}

export default new ActivityFeedService();
