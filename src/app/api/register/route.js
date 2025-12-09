import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connectToDatabase from "../../../lib/db";
import User from "../../../models/User";
import Plan from "../../../models/Plan"; // Import Plan model

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
        { message: "User already exists" },
        { status: 409 }
      );
    }

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create User
    // Note: The User Schema defaults (planId: 'basic', invoiceCount: 0) 
    // will automatically handle the subscription fields.
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // 5. Fetch Default Plan Details ('basic')
    // We need this to send the limits back to the frontend immediately
    const planDetails = await Plan.findOne({ id: 'basic' });
    
    // Fallback defaults in case 'basic' plan is not in DB yet
    const limits = planDetails?.limits || { 
      invoices: 50, 
      teamMembers: 1, 
      exportPDF: true, 
      customTemplates: false 
    };

    // 6. Generate JWT Token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 7. Return Response with Full Subscription Data
    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          
          // Populate the subscription object immediately
          subscription: {
            plan: 'basic',
            status: 'active',
            startDate: user.createdAt,
            
            // Usage starts at 0
            invoicesLimit: limits.invoices, 
            invoicesUsed: 0, 

            // Features for the UI
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