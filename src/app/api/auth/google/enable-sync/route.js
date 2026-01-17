import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifyJwt } from '@/lib/auth';
import { findOrCreateSpreadsheet, getSheetData } from '@/lib/googleSheets';

export async function POST(req) {
    try {
        await connectToDatabase();

        // Auth check
        const authHeader = req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);
        if (!decoded) return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });

        const { accessToken, refreshToken, email } = await req.json();
        const userEmail = decoded.email;

        // Update User with Google Tokens
        await User.findOneAndUpdate(
            { email: userEmail },
            {
                googleAccessToken: accessToken,
                googleRefreshToken: refreshToken,
                googleEmail: email,
                'settings.cloudSyncEnabled': true
            }
        );

        // Fetch from Google Sheets (create sheet if doesn't exist)
        const spreadsheetId = await findOrCreateSpreadsheet(accessToken);
        let data = { invoices: [], clients: [], items: [] };

        if (spreadsheetId) {
            data = await getSheetData(accessToken, spreadsheetId);
        }

        return NextResponse.json({
            success: true,
            invoices: data.invoices,
            clients: data.clients,
            items: data.items
        });

    } catch (error) {
        console.error('Enable sync error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
