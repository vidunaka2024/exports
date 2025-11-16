// backend/models/Role.js
import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission",
      },
    ],
    inheritsFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Method to get all permissions including inherited
roleSchema.methods.getAllPermissions = async function () {
  const permissions = [...this.permissions];

  if (this.inheritsFrom) {
    const parentRole = await this.model("Role")
      .findById(this.inheritsFrom)
      .populate("permissions");
    if (parentRole) {
      const parentPermissions = await parentRole.getAllPermissions();
      permissions.push(...parentPermissions);
    }
  }

  // Remove duplicates
  return [...new Set(permissions.map((p) => p.toString()))];
};

export default mongoose.model("Role", roleSchema);
