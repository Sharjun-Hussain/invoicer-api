import { NextResponse } from "next/server";
import connectToDatabase from "../../../lib/db";
import User from "../../../models/User";
import bcrypt from "bcryptjs";

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

    // 2. Find User (Explicitly select password hash)
    // We must use .select("+password") because your User model likely hides it by default
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // 3. Verify the Password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      // Return 401 Unauthorized if password is wrong
      return NextResponse.json(
        { success: false, message: "Incorrect password" },
        { status: 401 }
      );
    }

    // 4. Success Response
    return NextResponse.json(
      { success: true, message: "Password verified" },
      { status: 200 }
    );

  } catch (error) {
    console.error("Verify Password Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}