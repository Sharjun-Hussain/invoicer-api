import { NextResponse } from "next/server";
import connectToDatabase from "../../../lib/db";
import User from "../../../models/User";
import Plan from "../../../models/Plan"; // Import Plan model
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    // 1. Validate Input
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and Password are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 2. Find User
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 3. Verify Password
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 4. Fetch Plan Details
    // We need the plan details (limits) to send to the frontend
    // Default to 'basic' if for some reason the user has no planId
    const planId = user.subscription?.planId || 'basic';
    const planDetails = await Plan.findOne({ id: planId });

    // Fallback if plan database is empty (optional safety)
    const limits = planDetails?.limits || {
      invoices: 50,
      teamMembers: 1,
      exportPDF: true,
      customTemplates: false
    };

    // 5. Generate JWT Token
    const token = jwt.sign(
      { userId: user._id, email: user.email }, // Keeping your userId convention
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 6. Construct the Response
    return NextResponse.json(
      {
        success: true, // Standardize success flag
        message: "Login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          isEmailVerified: user.isEmailVerified,
          isMobileVerified: user.isMobileVerified,

          // Full Subscription Object
          subscription: {
            plan: planId,
            status: user.subscription?.status || 'active',
            startDate: user.subscription?.startDate,
            endDate: user.subscription?.endDate,

            // Usage & Limits
            invoicesLimit: limits.invoices, // e.g., 50
            invoicesUsed: user.usage?.invoiceCount || 0, // Current usage

            // Feature Flags for UI
            features: {
              customTemplates: limits.customTemplates,
              exportPDF: limits.exportPDF,
              emailInvoices: limits.emailInvoices,
              recurringInvoices: limits.recurringInvoices,
              multiCurrency: limits.multiCurrency,
              teamMembers: limits.teamMembers,
              cloudStorage: limits.cloudStorage
            }
          }
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}