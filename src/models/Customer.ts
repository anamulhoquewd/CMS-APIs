import { Schema, model } from "mongoose";
import { ICustomerDoc, IItemShedule } from "@/interface/customer";
import crypto from "crypto";
import bcrypt from "bcrypt";

// Schedule Item Schema
const scheduleItemSchema = new Schema<IItemShedule>(
  {
    date: { type: String, required: true },
    lunch: { type: Boolean },
    dinner: { type: Boolean },
    lunchQuantity: {
      type: Number,
      required: function (this: any): boolean {
        return this.lunch === true;
      },
      min: 0,
    },
    dinnerQuantity: {
      type: Number,
      required: function (this: any): boolean {
        return this.dinner === true;
      },
      min: 0,
    },
  },
  { _id: false }
);

// Customer Schema
const customerSchema = new Schema<ICustomerDoc>(
  {
    name: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{11}$/,
    },
    email: { type: String, unique: true, sparse: true },
    password: { type: String, required: true, minlength: 8 },
    address: { type: String, required: true },

    role: { type: String, enum: ["customer"], default: "customer" },

    avatar: { type: String },

    price: { type: Number, min: 0 },
    quantity: { type: Number, min: 0 },

    lunchPrice: { type: Number, min: 0 },
    dinnerPrice: { type: Number, min: 0 },

    lunchQuantity: { type: Number, min: 0 },
    dinnerQuantity: { type: Number, min: 0 },

    schedule: {
      type: [scheduleItemSchema],
      validate: {
        validator: function (v: any[]) {
          return v.length <= 7;
        },
        message: "Schedule cannot have more than 7 items",
      },
    },

    paymentStatus: {
      type: String,
      enum: ["paid", "partially_paid", "unpaid"],
      default: "paid",
      required: true,
    },
    paymentFrequency: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
    },

    refreshTokens: { type: [String], default: [] },
    passwordResetToken: { type: String },
    passwordResetExpireDate: { type: Date },

    isActive: { type: Boolean, default: true },
    isDelete: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Generate Password reset token
customerSchema.methods.generatePasswordResetToken = function (expMinutes = 30) {
  let token = crypto.randomBytes(32).toString("hex");

  // Hash the token and save it in the database
  token = this.passwordResetToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // Set token expiration
  this.passwordResetExpireDate = Date.now() + expMinutes * 60 * 1000; // default 30 minutes

  return token;
};

// Check: is password match?
customerSchema.methods.matchPassword = async function (inputPassword: string) {
  return bcrypt.compare(inputPassword, this.password);
};

// Hash password
customerSchema.pre("save", async function (next) {
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

// Customer Model
const Customer = model<ICustomerDoc>("Customer", customerSchema);

export default Customer;
