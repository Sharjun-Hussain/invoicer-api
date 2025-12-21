import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    email: {
      type: String,
      unique: true,
      required: [true, "Email is required"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false, // Don't return password by default
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    resetPasswordOTP: String,
    resetPasswordOTPExpire: Date,
    resetPasswordAttempts: { type: Number, default: 0 },
    resetPasswordLastAttempt: Date,
    subscription: {
      planId: { type: String, default: 'basic' }, // References Plan.id
      status: { type: String, default: 'active' },
      startDate: { type: Date, default: Date.now },
      endDate: { type: Date }, // null for lifetime
    },
    usage: {
      invoiceCount: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now } // To know when to reset to 0
    }
  },
  { timestamps: true }
);

// Prevent overwriting the model if it already exists (Next.js hot reload fix)
const User = models.User || model("User", UserSchema);

export default User;