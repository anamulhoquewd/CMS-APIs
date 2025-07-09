import { Types, Document } from "mongoose";

interface IOrderItem {
  type: "lunch" | "dinner";
  quantity: number;
  price: number;
  subtotal: number; // price × quantity
}

interface IOrderDoc extends Document {
  customerId: Types.ObjectId;
  createdBy: "customer" | "manager";
  createdById: Types.ObjectId; // manager ID or customer ID

  items: IOrderItem[];
  total: number; // sum of item subtotals

  date: Date;
  note?: string;
}

export { IOrderDoc, IOrderItem };
