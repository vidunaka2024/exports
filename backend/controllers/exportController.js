// backend/controllers/exportController.js
import User from '../models/User.js';
import Ad from '../models/Ad.js';
import Order from '../models/Order.js';
import exportService from '../services/exportService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import AuditLog from '../models/AuditLog.js';

// Export users
export const exportUsers = asyncHandler(async (req, res) => {
  const { format = 'csv', role, page, limit } = req.query;

  const query = {};
  if (role) query.role = role;

  let users;
  if (page && limit) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
  } else {
    users = await User.find(query).select('-password').lean();
  }

  const fileBuffer = await exportService.exportUsersReport(users, format);

  // Create audit log
  await AuditLog.create({
    user: req.user.id,
    action: 'EXPORT',
    resource: 'User',
    details: {
      format,
      count: users.length,
      filters: query,
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS',
  });

  const contentTypes = {
    csv: 'text/csv',
    excel:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pdf: 'application/pdf',
  };

  const extensions = {
    csv: 'csv',
    excel: 'xlsx',
    pdf: 'pdf',
  };

  res.setHeader('Content-Type', contentTypes[format]);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="users-${Date.now()}.${extensions[format]}"`
  );
  res.send(fileBuffer);
});

// Export ads
export const exportAds = asyncHandler(async (req, res) => {
  const { format = 'csv', type, status, category, page, limit } = req.query;

  const query = {};
  if (type) query.type = type;
  if (status) query.status = status;
  if (category) query.category = category;

  let ads;
  if (page && limit) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    ads = await Ad.find(query).skip(skip).limit(parseInt(limit)).lean();
  } else {
    ads = await Ad.find(query).lean();
  }

  const fileBuffer = await exportService.exportAdsReport(ads, format);

  await AuditLog.create({
    user: req.user.id,
    action: 'EXPORT',
    resource: 'Ad',
    details: {
      format,
      count: ads.length,
      filters: query,
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS',
  });

  const contentTypes = {
    csv: 'text/csv',
    excel:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pdf: 'application/pdf',
  };

  const extensions = {
    csv: 'csv',
    excel: 'xlsx',
    pdf: 'pdf',
  };

  res.setHeader('Content-Type', contentTypes[format]);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="ads-${Date.now()}.${extensions[format]}"`
  );
  res.send(fileBuffer);
});

// Export orders
export const exportOrders = asyncHandler(async (req, res) => {
  const { format = 'csv', status, page, limit } = req.query;

  const query = {};
  if (status) query.status = status;

  let orders;
  if (page && limit) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    orders = await Order.find(query)
      .populate('ad', 'title')
      .populate('exporter', 'companyName')
      .populate('manufacturer', 'companyName')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
  } else {
    orders = await Order.find(query)
      .populate('ad', 'title')
      .populate('exporter', 'companyName')
      .populate('manufacturer', 'companyName')
      .lean();
  }

  const fileBuffer = await exportService.exportOrdersReport(orders, format);

  await AuditLog.create({
    user: req.user.id,
    action: 'EXPORT',
    resource: 'Order',
    details: {
      format,
      count: orders.length,
      filters: query,
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS',
  });

  const contentTypes = {
    csv: 'text/csv',
    excel:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pdf: 'application/pdf',
  };

  const extensions = {
    csv: 'csv',
    excel: 'xlsx',
    pdf: 'pdf',
  };

  res.setHeader('Content-Type', contentTypes[format]);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="orders-${Date.now()}.${extensions[format]}"`
  );
  res.send(fileBuffer);
});
