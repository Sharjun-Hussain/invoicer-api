import { NextResponse } from "next/server";
import connectToDatabase from "../../../../lib/db";
import User from "../../../../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { message: "Email and Password are required" },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const user = await User.findOne({ email }).select("+password");

        if (!user) {
            return NextResponse.json(
                { message: "Invalid credentials" },
                { status: 401 }
            );
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            return NextResponse.json(
                { message: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Check Role
        if (user.role !== 'admin') {
            return NextResponse.json(
                { message: "Access denied. Admins only." },
                { status: 403 }
            );
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email, role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return NextResponse.json(
            {
                success: true,
                message: "Admin Login successful",
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Admin Login Error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 }
        );
    }
}
