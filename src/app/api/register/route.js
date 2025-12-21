import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import connectToDatabase from "../../../lib/db";
import User from "../../../models/User";
import Plan from "../../../models/Plan";
import { sendAccountVerificationOTP } from "../../../lib/emailService";

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();

    // 1. Validate Input
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: "Email already exists" },
        { status: 409 }
      );
    }

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Generate Email OTP
    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const emailOtpHash = crypto.createHash("sha256").update(emailOtp).digest("hex");

    // 5. Create User
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isEmailVerified: false,
      emailVerificationOTP: emailOtpHash,
      emailVerificationOTPExpire: Date.now() + 3600000, // 1 hour
    });

    // 6. Send Email OTP
    await sendAccountVerificationOTP(email, emailOtp);

    // 7. Fetch Default Plan Details ('basic')
    const planDetails = await Plan.findOne({ id: 'basic' });

    const limits = planDetails?.limits || {
      invoices: 50,
      clients: 20,
      items: 50,
      teamMembers: 1,
      exportPDF: true,
      customTemplates: false
    };

    // 8. Generate JWT Token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 9. Return Response
    return NextResponse.json(
      {
        success: true,
        message: "User registered. Please verify your email and mobile.",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isEmailVerified: user.isEmailVerified,

          subscription: {
            plan: 'basic',
            status: 'active',
            startDate: user.createdAt,
            invoicesLimit: limits.invoices,
            invoicesUsed: 0,
            clientsLimit: limits.clients,
            clientsUsed: 0,
            itemsLimit: limits.items,
            itemsUsed: 0,
            features: {
              customTemplates: limits.customTemplates,
              exportPDF: limits.exportPDF,
              emailInvoices: limits.emailInvoices || false,
              recurringInvoices: limits.recurringInvoices || false,
              multiCurrency: limits.multiCurrency || false,
              teamMembers: limits.teamMembers,
              cloudStorage: limits.cloudStorage || '500MB'
            }
          }
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}