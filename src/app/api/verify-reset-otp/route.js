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

        // Hash the incoming OTP to match what's in the DB
        const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

        // Find user with valid, non-expired OTP
        const user = await User.findOne({
            email,
            resetPasswordOTP: otpHash,
            resetPasswordOTPExpire: { $gt: Date.now() },
        });

        if (!user) {
            return NextResponse.json({
                success: false,
                message: "Invalid or expired OTP"
            }, { status: 400 });
        }

        // Generate a short-lived token for password reset
        // This token will be used in the next step to actually reset the password
        const resetToken = signJwt({
            userId: user._id,
            purpose: 'password-reset'
        });

        // Clear OTP attempts on successful verification
        user.resetPasswordAttempts = 0;
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
