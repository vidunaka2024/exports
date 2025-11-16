// backend/models/SavedSearch.js
import mongoose from "mongoose";

const savedSearchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    resourceType: {
      type: String,
      enum: ["Ad", "Order", "User", "Task"],
      required: true,
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    sortBy: {
      field: String,
      order: { type: String, enum: ["asc", "desc"], default: "desc" },
    },
    isAlert: {
      type: Boolean,
      default: false,
    },
    alertFrequency: {
      type: String,
      enum: ["instant", "daily", "weekly"],
      default: "instant",
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    sharedWith: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lastExecuted: {
      type: Date,
    },
    executionCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

savedSearchSchema.index({ user: 1, resourceType: 1 });

export default mongoose.model("SavedSearch", savedSearchSchema);
