// backend/models/UserPreferences.js
import mongoose from "mongoose";

const userPreferencesSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    notifications: {
      email: {
        orderUpdates: { type: Boolean, default: true },
        adUpdates: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false },
        weeklyDigest: { type: Boolean, default: true },
      },
      sms: {
        orderUpdates: { type: Boolean, default: false },
        urgentAlerts: { type: Boolean, default: true },
      },
      push: {
        orderUpdates: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
        taskReminders: { type: Boolean, default: true },
      },
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ["public", "connections", "private"],
        default: "public",
      },
      showEmail: { type: Boolean, default: false },
      showPhone: { type: Boolean, default: true },
      allowMessages: { type: Boolean, default: true },
      showActivity: { type: Boolean, default: true },
    },
    display: {
      theme: {
        type: String,
        enum: ["light", "dark", "auto"],
        default: "light",
      },
      language: {
        type: String,
        default: "en",
      },
      timezone: {
        type: String,
        default: "UTC",
      },
      dateFormat: {
        type: String,
        default: "MM/DD/YYYY",
      },
      currency: {
        type: String,
        default: "USD",
      },
    },
    dashboard: {
      layout: {
        type: String,
        enum: ["grid", "list", "compact"],
        default: "grid",
      },
      widgets: [
        {
          type: String,
          position: Number,
          size: String,
          config: mongoose.Schema.Types.Mixed,
        },
      ],
    },
    search: {
      defaultFilters: mongoose.Schema.Types.Mixed,
      resultsPerPage: { type: Number, default: 20 },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("UserPreferences", userPreferencesSchema);
