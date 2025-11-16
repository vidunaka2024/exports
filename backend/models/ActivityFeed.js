// backend/models/ActivityFeed.js
import mongoose from "mongoose";

const activityFeedSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "created_ad",
        "updated_ad",
        "deleted_ad",
        "created_order",
        "updated_order",
        "approved_order",
        "rejected_order",
        "sent_message",
        "added_review",
        "updated_profile",
        "created_task",
        "completed_task",
      ],
    },
    resourceType: {
      type: String,
      enum: ["Ad", "Order", "User", "Message", "Review", "Task"],
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    visibility: {
      type: String,
      enum: ["public", "followers", "private"],
      default: "public",
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
activityFeedSchema.index({ user: 1, createdAt: -1 });
activityFeedSchema.index({ action: 1, createdAt: -1 });
activityFeedSchema.index({ visibility: 1, createdAt: -1 });

// TTL index - automatically delete activities older than 90 days
activityFeedSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

export default mongoose.model("ActivityFeed", activityFeedSchema);
