// backend/controllers/bulkOperationsController.js
import Ad from '../models/Ad.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import AuditLog from '../models/AuditLog.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

// Bulk approve ads
export const bulkApproveAds = asyncHandler(async (req, res) => {
  const { adIds } = req.body;

  if (!adIds || !Array.isArray(adIds) || adIds.length === 0) {
    return res.status(400).json({ message: 'Ad IDs array is required' });
  }

  const result = await Ad.updateMany(
    { _id: { $in: adIds }, status: { $ne: 'approved' } },
    { status: 'approved' }
  );

  // Create audit log
  await AuditLog.create({
    user: req.user.id,
    action: 'BULK_UPDATE',
    resource: 'Ad',
    details: {
      operation: 'BULK_APPROVE',
      count: result.modifiedCount,
      adIds,
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS',
  });

  logger.info(`Bulk approved ${result.modifiedCount} ads by admin: ${req.user.id}`);

  res.json({
    message: `Successfully approved ${result.modifiedCount} ads`,
    modifiedCount: result.modifiedCount,
  });
});

// Bulk reject ads
export const bulkRejectAds = asyncHandler(async (req, res) => {
  const { adIds } = req.body;

  if (!adIds || !Array.isArray(adIds) || adIds.length === 0) {
    return res.status(400).json({ message: 'Ad IDs array is required' });
  }

  const result = await Ad.updateMany(
    { _id: { $in: adIds }, status: { $ne: 'rejected' } },
    { status: 'rejected' }
  );

  await AuditLog.create({
    user: req.user.id,
    action: 'BULK_UPDATE',
    resource: 'Ad',
    details: {
      operation: 'BULK_REJECT',
      count: result.modifiedCount,
      adIds,
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS',
  });

  logger.info(`Bulk rejected ${result.modifiedCount} ads by admin: ${req.user.id}`);

  res.json({
    message: `Successfully rejected ${result.modifiedCount} ads`,
    modifiedCount: result.modifiedCount,
  });
});

// Bulk delete ads
export const bulkDeleteAds = asyncHandler(async (req, res) => {
  const { adIds } = req.body;

  if (!adIds || !Array.isArray(adIds) || adIds.length === 0) {
    return res.status(400).json({ message: 'Ad IDs array is required' });
  }

  const result = await Ad.deleteMany({ _id: { $in: adIds } });

  await AuditLog.create({
    user: req.user.id,
    action: 'BULK_DELETE',
    resource: 'Ad',
    details: {
      operation: 'BULK_DELETE',
      count: result.deletedCount,
      adIds,
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS',
  });

  logger.info(`Bulk deleted ${result.deletedCount} ads by admin: ${req.user.id}`);

  res.json({
    message: `Successfully deleted ${result.deletedCount} ads`,
    deletedCount: result.deletedCount,
  });
});

// Bulk delete users
export const bulkDeleteUsers = asyncHandler(async (req, res) => {
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: 'User IDs array is required' });
  }

  // Prevent self-deletion
  if (userIds.includes(req.user.id)) {
    return res.status(400).json({ message: 'Cannot delete your own account' });
  }

  const result = await User.deleteMany({ _id: { $in: userIds } });

  await AuditLog.create({
    user: req.user.id,
    action: 'BULK_DELETE',
    resource: 'User',
    details: {
      operation: 'BULK_DELETE',
      count: result.deletedCount,
      userIds,
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS',
  });

  logger.info(`Bulk deleted ${result.deletedCount} users by admin: ${req.user.id}`);

  res.json({
    message: `Successfully deleted ${result.deletedCount} users`,
    deletedCount: result.deletedCount,
  });
});

// Bulk update order status
export const bulkUpdateOrderStatus = asyncHandler(async (req, res) => {
  const { orderIds, status } = req.body;

  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({ message: 'Order IDs array is required' });
  }

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  const validStatuses = ['Pending', 'Approved', 'Rejected', 'Completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
    });
  }

  const result = await Order.updateMany(
    { _id: { $in: orderIds } },
    { status }
  );

  await AuditLog.create({
    user: req.user.id,
    action: 'BULK_UPDATE',
    resource: 'Order',
    details: {
      operation: 'BULK_UPDATE_STATUS',
      count: result.modifiedCount,
      orderIds,
      newStatus: status,
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS',
  });

  logger.info(`Bulk updated ${result.modifiedCount} orders to ${status} by admin: ${req.user.id}`);

  res.json({
    message: `Successfully updated ${result.modifiedCount} orders to ${status}`,
    modifiedCount: result.modifiedCount,
  });
});

// Get bulk operation history (audit logs)
export const getBulkOperationHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, action, resource } = req.query;

  const query = {
    action: { $in: ['BULK_UPDATE', 'BULK_DELETE'] },
  };

  if (action) {
    query.action = action;
  }

  if (resource) {
    query.resource = resource;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name email role')
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  res.json({
    logs,
    total,
    currentPage: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
  });
});
