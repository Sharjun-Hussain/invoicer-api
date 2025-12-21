import { NextResponse } from "next/server";
import connectToDatabase from "../../../../lib/db";
import Plan from "../../../../models/Plan";
import jwt from "jsonwebtoken";

const checkAdmin = (req) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.role === 'admin';
    } catch (e) {
        return false;
    }
};

export async function GET(req) {
    if (!checkAdmin(req)) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        await connectToDatabase();
        const plans = await Plan.find();
        return NextResponse.json(plans);
    } catch (error) {
        return NextResponse.json({ message: "Error fetching plans" }, { status: 500 });
    }
}
