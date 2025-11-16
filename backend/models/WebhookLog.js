// backend/models/WebhookLog.js
import mongoose from "mongoose";

const webhookLogSchema = new mongoose.Schema(
  {
    webhook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Webhook",
      required: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
    },
    response: {
      statusCode: Number,
      body: String,
      headers: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "retrying"],
      default: "pending",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
    },
    duration: {
      type: Number, // milliseconds
    },
  },
  {
    timestamps: true,
  }
);

// TTL index - automatically delete logs older than 30 days
webhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

webhookLogSchema.index({ webhook: 1, createdAt: -1 });
webhookLogSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("WebhookLog", webhookLogSchema);
