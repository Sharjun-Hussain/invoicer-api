import { NextResponse } from "next/server";
import connectToDatabase from "../../../../lib/db";
import User from "../../../../models/User";
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
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        const plans = await Plan.find();
        const planMap = plans.reduce((acc, plan) => {
            acc[plan.id] = plan.price;
            return acc;
        }, {});

        const enrichedUsers = users.map(user => {
            const planPrice = planMap[user.subscription?.planId] || 0;
            const startDate = new Date(user.subscription?.startDate || user.createdAt);
            const now = new Date();
            const monthsPaying = Math.max(1, (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()));
            const revenueGenerated = planPrice * monthsPaying;

            return {
                ...user.toObject(),
                revenueGenerated,
                monthsPaying,
                totalInvoices: user.usage?.invoiceCount || 0
            };
        });

        return NextResponse.json(enrichedUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ message: "Error fetching users" }, { status: 500 });
    }
}
