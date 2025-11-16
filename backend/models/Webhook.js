// backend/models/Webhook.js
import mongoose from "mongoose";

const webhookSchema = new mongoose.Schema(
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
    url: {
      type: String,
      required: true,
    },
    events: [
      {
        type: String,
        enum: [
          "ad.created",
          "ad.updated",
          "ad.deleted",
          "ad.approved",
          "ad.rejected",
          "order.created",
          "order.updated",
          "order.approved",
          "order.rejected",
          "order.completed",
          "user.created",
          "user.updated",
          "message.sent",
          "payment.received",
        ],
      },
    ],
    secret: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    headers: {
      type: Map,
      of: String,
    },
    retryPolicy: {
      maxRetries: { type: Number, default: 3 },
      retryDelay: { type: Number, default: 60000 }, // 1 minute
    },
    lastTriggered: {
      type: Date,
    },
    stats: {
      totalCalls: { type: Number, default: 0 },
      successfulCalls: { type: Number, default: 0 },
      failedCalls: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

webhookSchema.index({ user: 1, isActive: 1 });
webhookSchema.index({ events: 1 });

export default mongoose.model("Webhook", webhookSchema);
