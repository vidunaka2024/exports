// backend/models/Favorite.js
import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      enum: ["Ad", "Order", "User", "Task"],
      required: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    collection: {
      type: String,
      default: "default",
    },
    tags: [String],
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
favoriteSchema.index({ user: 1, resourceType: 1 });
favoriteSchema.index({ user: 1, resourceType: 1, resourceId: 1 }, { unique: true });
favoriteSchema.index({ user: 1, collection: 1 });

export default mongoose.model("Favorite", favoriteSchema);
