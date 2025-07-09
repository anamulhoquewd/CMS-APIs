import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { IUserDoc } from "@/interface/user";

// User Schema
const userSchema = new Schema<IUserDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 8 },
    address: { type: String },
    NID: { type: String, required: true, unique: true },
    role: {
      type: String,
      required: true,
      enum: ["admin", "manager", "super_admin"],
    },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    isDelete: { type: Boolean, default: false },

    refreshTokens: { type: [String], default: [] },
    passwordResetToken: { type: String },
    passwordResetExpireDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Method to generate and hash reset token
userSchema.methods.generatePasswordResetToken = function (expMinutes = 30) {
  let resetToken = crypto.randomBytes(32).toString("hex");

  // Hash the token and save it in the database
  resetToken = this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set token expiration
  this.passwordResetExpireDate = Date.now() + expMinutes * 60 * 1000; // default 30 minutes

  return resetToken;
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword: string) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Hash password
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

// User model
const User = model("User", userSchema);

export default User;
