import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectToDatabase from "../../../lib/db";
import User from "../../../models/User";
import Plan from "../../../models/Plan";

export async function GET(req) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return NextResponse.json({ message: "Invalid token" }, { status: 401 });
        }

        await connectToDatabase();
        const user = await User.findById(decoded.userId);

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        const planId = user.subscription?.planId || 'basic';
        const planDetails = await Plan.findOne({ id: planId });

        const limits = planDetails?.limits || {
            invoices: 50,
            clients: 20,
            items: 50,
            teamMembers: 1,
            exportPDF: true,
            customTemplates: false
        };

        return NextResponse.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isEmailVerified: user.isEmailVerified,
                subscription: {
                    plan: planId,
                    status: user.subscription?.status || 'active',
                    startDate: user.subscription?.startDate,
                    endDate: user.subscription?.endDate,

                    invoicesLimit: limits.invoices,
                    invoicesUsed: user.usage?.invoiceCount || 0,
                    clientsLimit: limits.clients,
                    clientsUsed: user.usage?.clientCount || 0,
                    itemsLimit: limits.items,
                    itemsUsed: user.usage?.itemCount || 0,

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
            }
        });
    } catch (error) {
        console.error("Me API Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
