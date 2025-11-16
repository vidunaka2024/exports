// backend/controllers/analyticsController.js
import analyticsService from '../services/analyticsService.js';
import exportService from '../services/exportService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import cache from '../utils/cache.js';

// Get analytics by type and date range
export const getAnalytics = asyncHandler(async (req, res) => {
  const { type, startDate, endDate } = req.query;

  if (!type || !startDate || !endDate) {
    return res.status(400).json({
      message: 'Type, startDate, and endDate are required',
    });
  }

  const analytics = await analyticsService.getAnalytics(
    type,
    new Date(startDate),
    new Date(endDate)
  );

  res.json(analytics);
});

// Generate daily analytics
export const generateDailyAnalytics = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();

  const analytics = await analyticsService.generateDailyAnalytics(targetDate);

  // Clear cache for analytics
  await cache.delPattern('analytics:*');

  res.json({
    message: 'Analytics generated successfully',
    analytics,
  });
});

// Get revenue analytics
export const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      message: 'startDate and endDate are required',
    });
  }

  const analytics = await analyticsService.getRevenueAnalytics(
    new Date(startDate),
    new Date(endDate)
  );

  res.json(analytics);
});

// Get user growth analytics
export const getUserGrowthAnalytics = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const analytics = await analyticsService.getUserGrowthAnalytics(
    parseInt(days)
  );

  res.json(analytics);
});

// Export analytics to PDF/CSV/Excel
export const exportAnalyticsReport = asyncHandler(async (req, res) => {
  const { type, startDate, endDate, format = 'pdf' } = req.query;

  if (!type || !startDate || !endDate) {
    return res.status(400).json({
      message: 'Type, startDate, and endDate are required',
    });
  }

  const analytics = await analyticsService.getAnalytics(
    type,
    new Date(startDate),
    new Date(endDate)
  );

  // Prepare data for export
  const exportData = analytics.map((a) => ({
    Date: new Date(a.date).toLocaleDateString(),
    'Total Users': a.metrics.totalUsers,
    'New Users': a.metrics.newUsers,
    'Total Ads': a.metrics.totalAds,
    'New Ads': a.metrics.newAds,
    'Total Orders': a.metrics.totalOrders,
    'New Orders': a.metrics.newOrders,
  }));

  let fileBuffer;
  let contentType;
  let filename;

  if (format === 'csv') {
    fileBuffer = await exportService.exportToCSV(
      exportData,
      Object.keys(exportData[0])
    );
    contentType = 'text/csv';
    filename = `analytics-${type}-${Date.now()}.csv`;
  } else if (format === 'excel') {
    fileBuffer = await exportService.exportToExcel(exportData, {
      sheetName: 'Analytics',
      columns: Object.keys(exportData[0]).map((key) => ({
        header: key,
        key,
        width: 15,
      })),
    });
    contentType =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    filename = `analytics-${type}-${Date.now()}.xlsx`;
  } else {
    fileBuffer = await exportService.exportToPDF(exportData, {
      title: `Analytics Report - ${type}`,
      metadata: {
        'Report Type': type,
        'Date Range': `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
        'Generated On': new Date().toLocaleString(),
      },
      table: {
        headers: Object.keys(exportData[0]),
        rows: exportData,
      },
    });
    contentType = 'application/pdf';
    filename = `analytics-${type}-${Date.now()}.pdf`;
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(fileBuffer);
});
