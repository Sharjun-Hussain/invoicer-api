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

        // 1. Basic Counts
        const totalUsers = await User.countDocuments({ role: 'user' });
        const activeSubscriptions = await User.countDocuments({
            role: 'user',
            'subscription.planId': { $ne: 'basic' },
            'subscription.status': 'active'
        });

        // 2. Usage Stats
        const users = await User.find({ role: 'user' });
        const totalInvoices = users.reduce((sum, user) => sum + (user.usage?.invoiceCount || 0), 0);

        // 3. Revenue Calculation
        const plans = await Plan.find();
        const planMap = plans.reduce((acc, plan) => {
            acc[plan.id] = plan.price;
            return acc;
        }, {});

        const totalRevenue = users.reduce((sum, user) => {
            const price = planMap[user.subscription?.planId] || 0;
            return sum + price;
        }, 0);

        // 4. Plan Breakdown
        const planBreakdown = plans.map(plan => ({
            name: plan.name,
            count: users.filter(u => u.subscription?.planId === plan.id).length,
            color: plan.id === 'basic' ? '#94a3b8' : plan.id === 'pro' ? '#6366f1' : '#8b5cf6'
        }));

        // 5. Growth Trend (Last 6 Months)
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthName = date.toLocaleString('default', { month: 'short' });

            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const count = await User.countDocuments({
                role: 'user',
                createdAt: { $lte: endOfMonth }
            });

            months.push({ name: monthName, users: count });
        }

        return NextResponse.json({
            success: true,
            stats: {
                totalUsers,
                activeSubscriptions,
                totalInvoices,
                totalRevenue,
                planBreakdown,
                growthTrend: months
            }
        });

    } catch (error) {
        console.error("Stats API Error:", error);
        return NextResponse.json({ message: "Error calculating stats" }, { status: 500 });
    }
}
