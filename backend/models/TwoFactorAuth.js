// backend/models/TwoFactorAuth.js
import mongoose from "mongoose";

const twoFactorAuthSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    secret: {
      type: String,
      required: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    method: {
      type: String,
      enum: ["totp", "sms", "email"],
      default: "totp",
    },
    backupCodes: [
      {
        code: String,
        used: { type: Boolean, default: false },
        usedAt: Date,
      },
    ],
    trustedDevices: [
      {
        deviceId: String,
        deviceName: String,
        userAgent: String,
        ipAddress: String,
        lastUsed: Date,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    lastVerified: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for trusted devices
twoFactorAuthSchema.index({ "trustedDevices.deviceId": 1 });

export default mongoose.model("TwoFactorAuth", twoFactorAuthSchema);
