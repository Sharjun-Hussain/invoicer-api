import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Plan from "../../../../../models/Plan";
import connectToDatabase from "../../../../../lib/db";

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

export async function PUT(req, { params }) {
    if (!checkAdmin(req)) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();

    try {
        await connectToDatabase();
        const updatedPlan = await Plan.findOneAndUpdate(
            { id: id },
            { $set: body },
            { new: true }
        );

        if (!updatedPlan) {
            return NextResponse.json({ message: "Plan not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, plan: updatedPlan });
    } catch (error) {
        console.error("Error updating plan:", error);
        return NextResponse.json({ message: "Error updating plan" }, { status: 500 });
    }
}
