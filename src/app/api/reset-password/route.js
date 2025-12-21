import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { verifyJwt } from "@/lib/auth";

export async function POST(req) {
  try {
    const { token, resetToken, password } = await req.json();

    // Accept either 'token' (web flow) or 'resetToken' (mobile OTP flow)
    const authToken = token || resetToken;

    if (!authToken || !password) {
      return NextResponse.json({
        success: false,
        message: "Invalid payload"
      }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json({
        success: false,
        message: "Password must be at least 6 characters"
      }, { status: 400 });
    }

    await connectToDatabase();

    let user;

    // Check if this is a JWT token from OTP verification (mobile flow)
    if (resetToken) {
      const decoded = verifyJwt(resetToken);

      if (!decoded || decoded.purpose !== 'password-reset') {
        return NextResponse.json({
          success: false,
          message: "Invalid or expired reset token"
        }, { status: 400 });
      }

      // Find user and verify OTP hasn't expired yet
      user = await User.findOne({
        _id: decoded.userId,
        resetPasswordOTPExpire: { $gt: Date.now() },
      });

      if (!user) {
        return NextResponse.json({
          success: false,
          message: "Reset session expired. Please request a new code"
        }, { status: 400 });
      }

    } else {
      // Web flow - validate token hash
      const resetTokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      // Find user with valid, non-expired token
      user = await User.findOne({
        resetPasswordToken: resetTokenHash,
        resetPasswordExpire: { $gt: Date.now() },
      });

      if (!user) {
        return NextResponse.json({
          success: false,
          message: "Invalid or expired token"
        }, { status: 400 });
      }
    }

    // Hash New Password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Clear ALL reset-related fields for security
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpire = undefined;
    user.resetPasswordAttempts = 0;
    user.resetPasswordLastAttempt = undefined;

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password updated successfully"
    }, { status: 200 });

  } catch (error) {
    console.error('Reset Password Error:', error);
    return NextResponse.json({
      success: false,
      message: "Internal Server Error"
    }, { status: 500 });
  }
}