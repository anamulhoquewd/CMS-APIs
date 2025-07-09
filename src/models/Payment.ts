import { IPaymentDoc } from "@/interface/payment";
import mongoose, { Schema, model } from "mongoose";

// Payment Schema
const paymentSchema = new Schema<IPaymentDoc>(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount must be non-negative"],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    method: {
      type: String,
      enum: ["cash", "bkash", "nagad", "card"],
      required: true,
    },
    note: {
      type: String,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Payment = model<IPaymentDoc>("Payment", paymentSchema);

export default Payment;
