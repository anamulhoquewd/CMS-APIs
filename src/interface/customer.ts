import { Document } from "mongoose";

interface IItemShedule {
  date: string;
  lunch: boolean;
  dinner: boolean;

  lunchQuantity?: number; // required if dinner = true
  dinnerQuantity?: number; // required if dinner = true
}

// Document Inderface
interface ICustomerDoc extends Document {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  password: string;
  address: string;
  avatar?: string;

  role: "customer";

  price?: number;
  quantity?: number;

  lunchPrice?: number;
  dinnerPrice?: number;

  lunchQuantity?: number;
  dinnerQuantity?: number;

  schedule?: IItemShedule[];

  paymentStatus: "paid" | "partially_paid" | "unpaid";
  paymentFrequency: "daily" | "weekly" | "monthly";

  refreshTokens?: string[];
  passwordResetToken?: string | null;
  passwordResetExpireDate?: Date | null;

  isActive: boolean;
  isDelete: boolean;

  matchPassword: (pass: string) => Promise<boolean>;
  generatepasswordResetToken: (expMinutes?: number) => string;
}

export { ICustomerDoc, IItemShedule };
