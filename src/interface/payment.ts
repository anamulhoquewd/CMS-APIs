import { Document, Types } from "mongoose";

interface IPaymentDoc extends Document {
  customerId: Types.ObjectId;
  amount: number;
  paymentDate: Date;
  method: "cash" | "bkash" | "nagad" | "card";
  note?: string;
  orders?: Types.ObjectId[];
  receivedBy: Types.ObjectId;
}

export { IPaymentDoc };
