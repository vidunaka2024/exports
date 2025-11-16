// backend/models/Task.js
import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    relatedTo: {
      resourceType: {
        type: String,
        enum: ["Ad", "Order", "User", "Lead", "Contract"],
      },
      resourceId: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "review", "completed", "cancelled"],
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    dueDate: {
      type: Date,
      index: true,
    },
    completedAt: {
      type: Date,
    },
    estimatedHours: {
      type: Number,
    },
    actualHours: {
      type: Number,
    },
    tags: [String],
    attachments: [
      {
        filename: String,
        url: String,
        size: Number,
        mimeType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    watchers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    dependencies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound indexes
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedBy: 1, createdAt: -1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ priority: 1, status: 1 });

export default mongoose.model("Task", taskSchema);
