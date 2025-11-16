// backend/models/Permission.js
import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    resource: {
      type: String,
      required: true,
      enum: ["User", "Ad", "Order", "Chat", "Message", "Analytics", "System"],
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "create",
        "read",
        "update",
        "delete",
        "approve",
        "reject",
        "export",
        "import",
        "manage",
      ],
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for resource and action
permissionSchema.index({ resource: 1, action: 1 });

export default mongoose.model("Permission", permissionSchema);
