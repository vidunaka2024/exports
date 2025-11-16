// backend/services/taskService.js
import Task from '../models/Task.js';
import notificationService from './notificationService.js';
import logger from '../utils/logger.js';

class TaskService {
  // Create task
  async create(taskData, createdBy) {
    try {
      const task = await Task.create({
        ...taskData,
        assignedBy: createdBy,
      });

      // Notify assigned user
      if (task.assignedTo) {
        await notificationService.create({
          user: task.assignedTo,
          type: 'task',
          title: 'New Task Assigned',
          message: `You have been assigned a new task: ${task.title}`,
          link: `/tasks/${task._id}`,
          metadata: { taskId: task._id },
        });
      }

      logger.info(`Task created: ${task._id}`);
      return task;
    } catch (error) {
      logger.error('Error creating task:', error);
      throw error;
    }
  }

  // Update task status
  async updateStatus(taskId, status, userId) {
    try {
      const task = await Task.findById(taskId);

      if (!task) {
        throw new Error('Task not found');
      }

      task.status = status;

      if (status === 'completed') {
        task.completedAt = new Date();
      }

      await task.save();

      // Notify task creator
      if (task.assignedBy.toString() !== userId.toString()) {
        await notificationService.create({
          user: task.assignedBy,
          type: 'task',
          title: 'Task Status Updated',
          message: `Task "${task.title}" status changed to ${status}`,
          link: `/tasks/${task._id}`,
          metadata: { taskId: task._id, status },
        });
      }

      logger.info(`Task status updated: ${taskId} to ${status}`);
      return task;
    } catch (error) {
      logger.error('Error updating task status:', error);
      throw error;
    }
  }

  // Add comment to task
  async addComment(taskId, userId, text) {
    try {
      const task = await Task.findById(taskId);

      if (!task) {
        throw new Error('Task not found');
      }

      task.comments.push({
        user: userId,
        text,
      });

      await task.save();

      // Notify watchers
      const watchers = [task.assignedBy, task.assignedTo, ...task.watchers];
      const uniqueWatchers = [...new Set(watchers.map((w) => w.toString()))];

      for (const watcherId of uniqueWatchers) {
        if (watcherId !== userId.toString()) {
          await notificationService.create({
            user: watcherId,
            type: 'task',
            title: 'New Task Comment',
            message: `New comment on task: ${task.title}`,
            link: `/tasks/${task._id}`,
            metadata: { taskId: task._id },
          });
        }
      }

      logger.info(`Comment added to task: ${taskId}`);
      return task;
    } catch (error) {
      logger.error('Error adding task comment:', error);
      throw error;
    }
  }

  // Get user tasks
  async getUserTasks(userId, options = {}) {
    const { status, priority, page = 1, limit = 20 } = options;

    const query = {
      $or: [{ assignedTo: userId }, { assignedBy: userId }],
    };

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .sort({ dueDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', 'name email companyName')
        .populate('assignedBy', 'name email companyName')
        .lean(),
      Task.countDocuments(query),
    ]);

    return {
      tasks,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get overdue tasks
  async getOverdueTasks() {
    try {
      const tasks = await Task.find({
        dueDate: { $lt: new Date() },
        status: { $nin: ['completed', 'cancelled'] },
      })
        .populate('assignedTo', 'name email')
        .populate('assignedBy', 'name email')
        .lean();

      return tasks;
    } catch (error) {
      logger.error('Error getting overdue tasks:', error);
      throw error;
    }
  }

  // Send reminders for due tasks
  async sendReminders() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const nextDay = new Date(tomorrow);
      nextDay.setDate(nextDay.getDate() + 1);

      const dueTasks = await Task.find({
        dueDate: { $gte: tomorrow, $lt: nextDay },
        status: { $nin: ['completed', 'cancelled'] },
      })
        .populate('assignedTo', 'name email')
        .lean();

      for (const task of dueTasks) {
        if (task.assignedTo) {
          await notificationService.create({
            user: task.assignedTo._id,
            type: 'task',
            title: 'Task Due Soon',
            message: `Task "${task.title}" is due tomorrow`,
            link: `/tasks/${task._id}`,
            metadata: { taskId: task._id },
          });
        }
      }

      logger.info(`Sent ${dueTasks.length} task reminders`);
      return { count: dueTasks.length };
    } catch (error) {
      logger.error('Error sending task reminders:', error);
      throw error;
    }
  }
}

export default new TaskService();
