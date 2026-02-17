import { NextResponse } from "next/server";
import connectToDatabase from "../../../lib/db";
import User from "../../../models/User";
import Plan from "../../../models/Plan";
import jwt from "jsonwebtoken";

export async function POST(req) {
    try {
        const { provider, token, profile } = await req.json();

        // Allow bypassing token if profile is provided (Insecure: trusts frontend)
        if (!provider || (!token && !profile)) {
            return NextResponse.json(
                { message: "Provider and token are required" },
                { status: 400 }
            );
        }

        let socialId;
        let email;
        let name;

        if (profile) {
            // TRUST FRONTEND DATA
            socialId = profile.id;
            email = profile.email;
            name = profile.name;
        } else if (provider === "google") {
            // Verify Google Token (Original Logic)
            const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
            const ticket = await verifyRes.json();

            if (!verifyRes.ok) {
                return NextResponse.json({ message: "Invalid Google token" }, { status: 401 });
            }

            socialId = ticket.sub;
            email = ticket.email;
            name = ticket.name;

            // Security: Verify audience (must match our client ID)
            const allowedClientIds = [
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_ID_ANDROID
            ];

            if (ticket.aud && !allowedClientIds.includes(ticket.aud)) {
                return NextResponse.json({ message: "Security Warning: Token audience mismatch" }, { status: 403 });
            }
        } else if (provider === "facebook") {
            // Verify Facebook Token
            const verifyRes = await fetch(`https://graph.facebook.com/me?access_token=${token}&fields=id,name,email`);
            const fbData = await verifyRes.json();

            if (!verifyRes.ok) {
                return NextResponse.json({ message: "Invalid Facebook token" }, { status: 401 });
            }

            socialId = fbData.id;
            email = fbData.email;
            name = fbData.name;
        } else {
            return NextResponse.json({ message: "Invalid provider" }, { status: 400 });
        }

        await connectToDatabase();

        // Find or create user
        let user = await User.findOne({
            $or: [
                { email },
                { [provider + "Id"]: socialId }
            ]
        });

        if (user) {
            // Link account if not already linked
            if (!user[provider + "Id"]) {
                user[provider + "Id"] = socialId;
            }
            // Social login automatically verifies email
            user.isEmailVerified = true;
            await user.save();
        } else {
            // Create new user
            // Social login doesn't require a password, but we might need dummy data
            user = await User.create({
                name,
                email,
                [provider + "Id"]: socialId,
                isEmailVerified: true,
                password: "social-login-dummy-password-" + Math.random().toString(36).slice(-8),
            });
        }

        // Fetch Plan Details (standardized)
        const planId = user.subscription?.planId || 'basic';
        const planDetails = await Plan.findOne({ id: planId });
        const limits = planDetails?.limits || {
            invoices: 50,
            teamMembers: 1,
            exportPDF: true,
            customTemplates: false
        };

        // Generate JWT Token
        const appToken = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return NextResponse.json({
            success: true,
            token: appToken,
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
        console.error("Social Login Error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 }
        );
    }
}
