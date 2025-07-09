import { Document } from "mongoose";

interface IUserDoc extends Document {
  _id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  address?: string;
  NID: string;
  role: "admin" | "manager" | "super_admin";
  avatar?: string;
  refreshTokens?: string[];
  passwordResetToken?: string | null;
  passwordResetExpireDate?: Date | null;
  isActive: boolean;
  isDelete: boolean;
  matchPassword: (pass: string) => Promise<boolean>;
  generatepasswordResetToken: (expMinutes?: number) => string;
}

export { IUserDoc };
