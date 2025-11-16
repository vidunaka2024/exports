// backend/models/Analytics.js
import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
      required: true,
      index: true,
    },
    metrics: {
      totalUsers: { type: Number, default: 0 },
      newUsers: { type: Number, default: 0 },
      activeUsers: { type: Number, default: 0 },
      totalAds: { type: Number, default: 0 },
      newAds: { type: Number, default: 0 },
      approvedAds: { type: Number, default: 0 },
      rejectedAds: { type: Number, default: 0 },
      pendingAds: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      newOrders: { type: Number, default: 0 },
      approvedOrders: { type: Number, default: 0 },
      rejectedOrders: { type: Number, default: 0 },
      pendingOrders: { type: Number, default: 0 },
      totalMessages: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
    },
    breakdown: {
      adsByCategory: {
        type: Map,
        of: Number,
      },
      adsByLocation: {
        type: Map,
        of: Number,
      },
      usersByRole: {
        type: Map,
        of: Number,
      },
      ordersByStatus: {
        type: Map,
        of: Number,
      },
    },
    topPerformers: {
      topExporters: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          adsCount: Number,
          ordersCount: Number,
        },
      ],
      topManufacturers: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          ordersCount: Number,
        },
      ],
      topCategories: [
        {
          category: String,
          count: Number,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying analytics
analyticsSchema.index({ date: -1, type: 1 });

export default mongoose.model("Analytics", analyticsSchema);
