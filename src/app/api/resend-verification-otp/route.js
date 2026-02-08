import { NextResponse } from "next/server";
import crypto from "crypto";
import connectToDatabase from "../../../lib/db";
import User from "../../../models/User";
import { sendAccountVerificationOTP } from "../../../lib/emailService";

export async function POST(req) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json(
                { message: "Email is required" },
                { status: 400 }
            );
        }

        await connectToDatabase();
        const user = await User.findOne({ email });

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        if (user.isEmailVerified) {
            return NextResponse.json({ message: "Email is already verified" }, { status: 400 });
        }

        // Rate Limiting: Max 3 requests per hour
        const oneHourAgo = new Date(Date.now() - 3600000);
        if (user.emailVerificationLastAttempt && user.emailVerificationLastAttempt > oneHourAgo) {
            if (user.emailVerificationAttempts >= 3) {
                const lockedUntil = new Date(user.emailVerificationLastAttempt.getTime() + 3600000);
                return NextResponse.json({
                    message: `Too many requests. Please try again after ${lockedUntil.toLocaleTimeString()}.`,
                    success: false,
                    lockedUntil: lockedUntil.toISOString()
                }, { status: 429 });
            }
        } else {
            // Reset attempts counter after 1 hour or if it's the first attempt in a while
            user.emailVerificationAttempts = 0;
        }

        // Increment attempts
        user.emailVerificationAttempts = (user.emailVerificationAttempts || 0) + 1;
        user.emailVerificationLastAttempt = new Date();

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

        user.emailVerificationOTP = otpHash;
        user.emailVerificationOTPExpire = Date.now() + 3600000; // 1 hour
        await user.save();

        await sendAccountVerificationOTP(email, otp);

        return NextResponse.json({
            success: true,
            message: "A new verification code has been sent to your email."
        });

    } catch (error) {
        console.error("Resend OTP Error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 }
        );
    }
}
