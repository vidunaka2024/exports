// backend/models/Invoice.js
import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: [
      {
        description: String,
        quantity: Number,
        unitPrice: Number,
        taxRate: { type: Number, default: 0 },
        total: Number,
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "USD",
    },
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue", "cancelled", "refunded"],
      default: "draft",
      index: true,
    },
    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    paidDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "credit_card", "paypal", "stripe", "cash"],
    },
    paymentDetails: {
      transactionId: String,
      reference: String,
      notes: String,
    },
    notes: {
      type: String,
    },
    terms: {
      type: String,
    },
    pdfUrl: {
      type: String,
    },
    reminders: [
      {
        sentAt: Date,
        type: { type: String, enum: ["email", "sms"] },
        status: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound indexes
invoiceSchema.index({ seller: 1, status: 1 });
invoiceSchema.index({ buyer: 1, status: 1 });
invoiceSchema.index({ dueDate: 1, status: 1 });

// Auto-increment invoice number
invoiceSchema.pre("save", async function (next) {
  if (!this.invoiceNumber) {
    const count = await this.constructor.countDocuments();
    this.invoiceNumber = `INV-${new Date().getFullYear()}-${String(
      count + 1
    ).padStart(6, "0")}`;
  }
  next();
});

export default mongoose.model("Invoice", invoiceSchema);
