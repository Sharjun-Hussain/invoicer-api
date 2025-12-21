import { NextResponse } from "next/server";
import crypto from "crypto";
import connectToDatabase from "../../../lib/db";
import User from "../../../models/User";

export async function POST(req) {
    try {
        const { email, otp, type } = await req.json(); // type: 'email' or 'mobile'

        if (!email || !otp || !type) {
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

        if (type === 'email') {
            if (user.emailVerificationOTP !== otpHash) {
                return NextResponse.json({ message: "Invalid email verification code" }, { status: 400 });
            }
            if (user.emailVerificationOTPExpire < Date.now()) {
                return NextResponse.json({ message: "Email verification code has expired" }, { status: 400 });
            }
            user.isEmailVerified = true;
            user.emailVerificationOTP = undefined;
            user.emailVerificationOTPExpire = undefined;
        } else if (type === 'mobile') {
            if (user.mobileVerificationOTP !== otpHash) {
                return NextResponse.json({ message: "Invalid mobile verification code" }, { status: 400 });
            }
            if (user.mobileVerificationOTPExpire < Date.now()) {
                return NextResponse.json({ message: "Mobile verification code has expired" }, { status: 400 });
            }
            user.isMobileVerified = true;
            user.mobileVerificationOTP = undefined;
            user.mobileVerificationOTPExpire = undefined;
        } else {
            return NextResponse.json({ message: "Invalid verification type" }, { status: 400 });
        }

        await user.save();

        return NextResponse.json({
            success: true,
            message: `${type === 'email' ? 'Email' : 'Mobile'} verified successfully`,
            user: {
                id: user._id,
                email: user.email,
                isEmailVerified: user.isEmailVerified,
                isMobileVerified: user.isMobileVerified
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
