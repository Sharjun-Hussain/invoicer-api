import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import crypto from "crypto";
import { sendPasswordResetEmail, sendPasswordResetOTP } from "@/lib/emailService";

export async function POST(req) {
  try {
    const { email, platform = 'web' } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    // Validate platform
    if (!['web', 'mobile'].includes(platform)) {
      return NextResponse.json({ message: "Invalid platform. Must be 'web' or 'mobile'" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email });

    // Security: Don't reveal if user exists or not. Return 200 regardless.
    if (!user) {
      return NextResponse.json({
        message: "If the email exists, a reset code will be sent",
        success: true
      }, { status: 200 });
    }

    // Rate Limiting: Max 3 requests per hour
    const oneHourAgo = Date.now() - 3600000;
    if (user.resetPasswordLastAttempt && user.resetPasswordLastAttempt > oneHourAgo) {
      if (user.resetPasswordAttempts >= 3) {
        return NextResponse.json({
          message: "Too many requests. Please try again later.",
          success: false
        }, { status: 429 });
      }
    } else {
      // Reset attempts counter after 1 hour
      user.resetPasswordAttempts = 0;
    }

    // Increment attempts
    user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
    user.resetPasswordLastAttempt = Date.now();

    if (platform === 'mobile') {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Hash OTP before saving (security best practice)
      const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

      // Save OTP (expires in 10 minutes)
      user.resetPasswordOTP = otpHash;
      user.resetPasswordOTPExpire = Date.now() + 600000; // 10 minutes

      // Reset OTP verification attempts and locks for new OTP
      user.otpVerificationAttempts = 0;
      user.otpVerificationLocked = false;
      user.otpVerificationLockedUntil = undefined;

      await user.save();

      // Send OTP email
      const emailResult = await sendPasswordResetOTP(email, otp);

      if (!emailResult.success) {
        console.error('Failed to send OTP email:', emailResult.error);
        return NextResponse.json({
          message: "Failed to send email. Please try again.",
          success: false
        }, { status: 500 });
      }

      return NextResponse.json({
        message: "Verification code sent to your email",
        success: true,
        platform: 'mobile'
      }, { status: 200 });

    } else {
      // Web platform - Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");

      // Hash it before saving to DB (Security Best Practice)
      const resetTokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      // Save to User (Expires in 1 hour)
      user.resetPasswordToken = resetTokenHash;
      user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
      await user.save();

      // Create Reset URL
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${resetToken}`;

      // Send Email
      const emailResult = await sendPasswordResetEmail(email, resetUrl);

      if (!emailResult.success) {
        console.error('Failed to send reset email:', emailResult.error);
        return NextResponse.json({
          message: "Failed to send email. Please try again.",
          success: false
        }, { status: 500 });
      }

      return NextResponse.json({
        message: "Password reset link sent to your email",
        success: true,
        platform: 'web'
      }, { status: 200 });
    }

  } catch (error) {
    console.error('Forgot Password Error:', error);
    return NextResponse.json({
      message: "Internal Server Error",
      success: false
    }, { status: 500 });
  }
}