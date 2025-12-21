import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import crypto from "crypto";
import { signJwt } from "@/lib/auth";

export async function POST(req) {
    try {
        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json({
                success: false,
                message: "Email and OTP are required"
            }, { status: 400 });
        }

        // Validate OTP format (6 digits)
        if (!/^\d{6}$/.test(otp)) {
            return NextResponse.json({
                success: false,
                message: "Invalid OTP format. Must be 6 digits"
            }, { status: 400 });
        }

        await connectToDatabase();

        // Find user by email first to check rate limiting
        let user = await User.findOne({ email });

        if (!user) {
            // Security: Don't reveal if user exists or not
            return NextResponse.json({
                success: false,
                message: "Invalid or expired OTP"
            }, { status: 400 });
        }

        // Check if user is temporarily locked due to too many failed attempts
        if (user.otpVerificationLocked && user.otpVerificationLockedUntil > Date.now()) {
            const minutesRemaining = Math.ceil((user.otpVerificationLockedUntil - Date.now()) / 60000);
            return NextResponse.json({
                success: false,
                message: `Too many failed attempts. Please try again in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''} or request a new OTP.`,
                lockedUntil: user.otpVerificationLockedUntil
            }, { status: 429 });
        }

        // Reset lock if time has passed
        if (user.otpVerificationLocked && user.otpVerificationLockedUntil <= Date.now()) {
            user.otpVerificationLocked = false;
            user.otpVerificationAttempts = 0;
            user.otpVerificationLockedUntil = undefined;
        }

        // Hash the incoming OTP to match what's in the DB
        const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

        // Verify OTP matches and hasn't expired
        const isValidOTP = user.resetPasswordOTP === otpHash &&
            user.resetPasswordOTPExpire > Date.now();

        if (!isValidOTP) {
            // Increment failed attempts
            user.otpVerificationAttempts = (user.otpVerificationAttempts || 0) + 1;

            // Lock account after 5 failed attempts (15 minutes)
            if (user.otpVerificationAttempts >= 5) {
                user.otpVerificationLocked = true;
                user.otpVerificationLockedUntil = Date.now() + 900000; // 15 minutes
                await user.save();

                return NextResponse.json({
                    success: false,
                    message: "Too many failed attempts. Your account has been temporarily locked for 15 minutes. Please request a new OTP or try again later.",
                    lockedUntil: user.otpVerificationLockedUntil
                }, { status: 429 });
            }

            await user.save();

            const attemptsRemaining = 5 - user.otpVerificationAttempts;
            return NextResponse.json({
                success: false,
                message: `Invalid or expired OTP. ${attemptsRemaining} attempt${attemptsRemaining > 1 ? 's' : ''} remaining.`,
                attemptsRemaining
            }, { status: 400 });
        }

        // Generate a short-lived token for password reset
        // This token will be used in the next step to actually reset the password
        const resetToken = signJwt({
            userId: user._id,
            purpose: 'password-reset'
        });

        // Clear ALL rate limiting counters on successful verification
        user.resetPasswordAttempts = 0;
        user.otpVerificationAttempts = 0;
        user.otpVerificationLocked = false;
        user.otpVerificationLockedUntil = undefined;
        await user.save();

        return NextResponse.json({
            success: true,
            message: "OTP verified successfully",
            resetToken // Mobile app will use this token to reset password
        }, { status: 200 });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        return NextResponse.json({
            success: false,
            message: "Internal Server Error"
        }, { status: 500 });
    }
}
