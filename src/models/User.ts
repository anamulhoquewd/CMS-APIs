import { Schema, model, Document } from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";
import z from "zod";

// 🔹 Zod Schema for User Validation
const userSchemaZod = z.object({
  name: z.string().min(3).max(50),
  email: z.string().email(),
  phone: z
    .string()
    .regex(
      /^01\d{9}$/,
      "Phone number must start with 01 and be exactly 11 digits"
    ),
  password: z.string(),
  address: z.string().max(100).optional(),
  NID: z.string().refine((val) => /^\d{10}$|^\d{17}$/.test(val), {
    message: "NID must be either 10 or 17 digits",
  }),
  role: z.enum(["admin", "manager", "super_admin"]),
  avatar: z.string().optional(),
  refreshTokens: z.array(z.string()).optional(),
  resetPasswordToken: z.string().nullish(),
  resetPasswordExpireDate: z.date().nullish(),
  active: z.boolean().default(true),
});

// 🔹 Mongoose Document
export interface IUserDoc extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
  NID: string;
  role: "admin" | "manager" | "super_admin";
  avatar?: string;
  refreshTokens?: string[];
  resetPasswordToken?: string | null;
  resetPasswordExpireDate?: Date | null;
  active: boolean;
  matchPassword: (pass: string) => Promise<boolean>;
  generateResetPasswordToken: (expMinutes?: number) => string;
}

// 🔹 Mongoose user Schema
const userSchema = new Schema<IUserDoc>(
  {
    name: { type: String, required: true, minlength: 3, maxlength: 50 },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 8 },
    address: { type: String, maxlength: 100 },
    NID: { type: String, required: true, unique: true },
    role: {
      type: String,
      required: true,
      enum: ["admin", "manager", "super_admin"],
    },
    avatar: { type: String },
    active: { type: Boolean, default: true, required: true },
    refreshTokens: { type: [String], default: [] },
    resetPasswordToken: { type: String },
    resetPasswordExpireDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

// 🔹 Method to generate and hash reset token
userSchema.methods.generateResetPasswordToken = function (expMinutes = 30) {
  let resetToken = crypto.randomBytes(32).toString("hex");

  // Hash the token and save it in the database
  resetToken = this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set token expiration
  this.resetPasswordExpireDate = Date.now() + expMinutes * 60 * 1000; // default 30 minutes

  return resetToken;
};

// 🔹 Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword: string) {
  return bcrypt.compare(enteredPassword, this.password);
};

// 🔹 Hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    // If password is not modified, skip hashing
    next();
  }

  if (!this.password) {
    return next(new Error("Password is required"));
  }

  // Use bcrypt to hash the password
  const salt = await bcrypt.genSalt(10); // Adjust salt rounds as needed
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔹 Middleware: Validate with Zod before saving
userSchema.pre("save", function (next) {
  const validation = this.isNew
    ? userSchemaZod.safeParse(this.toObject())
    : userSchemaZod.partial().safeParse(this.toObject());

  if (!validation.success) {
    return next(new Error(validation.error.issues[0].message));
  }
  next();
});

// 🔹 Mongoose user model
const User = model("User", userSchema);

export default User;
