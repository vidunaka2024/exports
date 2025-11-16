// backend/models/AuditLog.js
import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
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
        'CREATE',
        'UPDATE',
        'DELETE',
        'LOGIN',
        'LOGOUT',
        'APPROVE',
        'REJECT',
        'EXPORT',
        'IMPORT',
        'BULK_DELETE',
        'BULK_UPDATE',
      ],
      index: true,
    },
    resource: {
      type: String,
      required: true,
      enum: ['User', 'Ad', 'Order', 'Chat', 'Message', 'Notification'],
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE'],
      default: 'SUCCESS',
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// TTL index - automatically delete logs older than 90 days
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

export default mongoose.model("AuditLog", auditLogSchema);
