import { NextResponse } from "next/server";
import { uploadToR2 } from "../../../../lib/r2";
import connectToDatabase from "../../../../lib/db";
import User from "../../../../models/User";
import { getUserIdFromToken } from "../../../../lib/auth";

export async function POST(req) {
    try {
        const userId = await getUserIdFromToken(req);
        if (!userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("logo");

        if (!file) {
            return NextResponse.json({ message: "No file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `logos/${userId}-${Date.now()}-${file.name}`;
        const contentType = file.type;

        // Upload to R2
        const logoUrl = await uploadToR2(buffer, fileName, contentType);

        // Update database
        await connectToDatabase();
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // Merge companySettings
        const companySettings = user.companySettings || {};
        user.companySettings = { ...companySettings, logo: logoUrl };
        await user.save();

        return NextResponse.json({
            success: true,
            logoUrl
        });

    } catch (error) {
        console.error("Logo Upload API Error:", error);
        return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
    }
}
