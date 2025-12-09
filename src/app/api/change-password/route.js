import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connectToDatabase from "../../../lib/db";
import User from "../../../models/User";

export async function POST(req) {
  try {
    // 1. Get the Token from Headers
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "Unauthorized: No token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    // 2. Verify Token & Get User ID
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { message: "Unauthorized: Invalid token" },
        { status: 401 }
      );
    }

    // 3. Get Data from Body
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: "Both current and new passwords are required" },
        { status: 400 }
      );
    }

    // Optional: Add password strength validation here
    if (newPassword.length < 6) {
        return NextResponse.json(
            { message: "New password must be at least 6 characters" },
            { status: 400 }
        );
    }

    await connectToDatabase();

    // 4. Find User (Need +password to select the hidden hash)
    const user = await User.findById(decoded.userId).select("+password");

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // 5. Verify Current Password
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return NextResponse.json(
        { message: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // 6. Check if New Password is same as Old (Optional security best practice)
    if (currentPassword === newPassword) {
         return NextResponse.json(
        { message: "New password cannot be the same as the old password" },
        { status: 400 }
      );
    }

    // 7. Hash New Password & Update
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    user.password = hashedNewPassword;
    await user.save();

    return NextResponse.json(
      { success: true, message: "Password updated successfully" },
      { status: 200 }
    );

  } catch (error) {
    console.error("Change Password Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}