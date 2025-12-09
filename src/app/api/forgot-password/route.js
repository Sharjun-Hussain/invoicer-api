import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import crypto from "crypto";

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email });
    if (!user) {
      // Security: Don't reveal if user exists or not. Return 200 regardless.
      return NextResponse.json({ message: "If email exists, reset link sent" }, { status: 200 });
    }

    // 1. Generate Reset Token
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // 2. Hash it before saving to DB (Security Best Practice)
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // 3. Save to User (Expires in 1 hour)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    await user.save();

    // 4. Create Reset URL
    // In production, use process.env.NEXT_PUBLIC_APP_URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${resetToken}`;

    // 5. Send Email (Replace this console.log with Nodemailer/Resend logic)
    console.log(`📧 MOCK EMAIL SENT TO ${email}`);
    console.log(`🔗 RESET LINK: ${resetUrl}`);

    return NextResponse.json({ message: "Reset link sent" }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}