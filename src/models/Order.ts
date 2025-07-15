import { IOrderDoc, IOrderItem } from "@/interface/order";
import { Schema, model } from "mongoose";

// Order Itme Schema
const orderItemSchema = new Schema<IOrderItem>(
  {
    type: {
      type: String,
      enum: ["lunch", "dinner"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
    price: {
      type: Number,
      required: true,
      min: [0, "Price must be >= 0"],
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, "Subtotal must be >= 0"],
    },
  },
  { _id: false }
);

// Order  Schema
const orderSchema = new Schema<IOrderDoc>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    createdBy: {
      type: String,
      enum: ["customer", "manager", "super_admin", "admin"],
      required: true,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [
        (val: IOrderItem[]) => val.length > 0,
        "At least one order item is required",
      ],
    },
    total: {
      type: Number,
      required: true,
      min: [0, "Total must be >= 0"],
    },
    date: {
      type: Date,
      required: true,
    },
    note: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Order model
const Order = model<IOrderDoc>("Order", orderSchema);

export default Order;
