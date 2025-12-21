import { NextResponse } from "next/server";
import crypto from "crypto";
import connectToDatabase from "../../../lib/db";
import User from "../../../models/User";

export async function POST(req) {
    try {
        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json(
                { message: "All fields are required" },
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

        const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

        if (user.emailVerificationOTP !== otpHash) {
            return NextResponse.json({ message: "Invalid verification code" }, { status: 400 });
        }
        if (user.emailVerificationOTPExpire < Date.now()) {
            return NextResponse.json({ message: "Verification code has expired" }, { status: 400 });
        }

        user.isEmailVerified = true;
        user.emailVerificationOTP = undefined;
        user.emailVerificationOTPExpire = undefined;

        await user.save();

        return NextResponse.json({
            success: true,
            message: "Email verified successfully",
            user: {
                id: user._id,
                email: user.email,
                isEmailVerified: user.isEmailVerified
            }
        });

    } catch (error) {
        console.error("Verification Error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 }
        );
    }
}
