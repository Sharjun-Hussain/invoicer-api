import { NextResponse } from "next/server";
import crypto from "crypto";
import connectToDatabase from "../../../lib/db";
import User from "../../../models/User";
import { sendAccountVerificationOTP } from "../../../lib/emailService";

export async function POST(req) {
    try {
        const { email, type } = await req.json(); // type: 'email' or 'mobile'

        if (!email || !type) {
            return NextResponse.json(
                { message: "Email and type are required" },
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

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

        if (type === 'email') {
            if (user.isEmailVerified) {
                return NextResponse.json({ message: "Email is already verified" }, { status: 400 });
            }
            user.emailVerificationOTP = otpHash;
            user.emailVerificationOTPExpire = Date.now() + 3600000; // 1 hour
            await sendAccountVerificationOTP(email, otp);
        } else if (type === 'mobile') {
            if (user.isMobileVerified) {
                return NextResponse.json({ message: "Mobile number is already verified" }, { status: 400 });
            }
            user.mobileVerificationOTP = otpHash;
            user.mobileVerificationOTPExpire = Date.now() + 3600000; // 1 hour
            console.log(`[MOCK SMS] Resending OTP ${otp} to ${user.mobile}`);
        } else {
            return NextResponse.json({ message: "Invalid verification type" }, { status: 400 });
        }

        await user.save();

        return NextResponse.json({
            success: true,
            message: `A new verification code has been sent to your ${type === 'email' ? 'email' : 'mobile number'}.`
        });

    } catch (error) {
        console.error("Resend OTP Error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 }
        );
    }
}
