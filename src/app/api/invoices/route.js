import { NextResponse } from 'next/server';
import User from '@/models/User';
import { verifyJwt } from '@/lib/auth';
import { getSheetData, findOrCreateSpreadsheet } from '@/lib/googleSheets';

export async function GET(req) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);
        if (!decoded) return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });

        const userEmail = decoded.email;

        // Fetch user to get Google tokens
        const user = await User.findOne({ email: userEmail }).select('+googleAccessToken');

        if (!user || !user.googleAccessToken || !user.settings?.cloudSyncEnabled) {
            return NextResponse.json({ success: true, invoices: [] });
        }

        // Get spreadsheet ID (create if doesn't exist)
        let spreadsheetId = user.googleSpreadsheetId;
        if (!spreadsheetId) {
            spreadsheetId = await findOrCreateSpreadsheet(user.googleAccessToken);
            if (spreadsheetId) {
                user.googleSpreadsheetId = spreadsheetId;
                await user.save();
            }
        }

        if (!spreadsheetId) {
            return NextResponse.json({ success: true, invoices: [] });
        }

        // Fetch directly from Google Sheets (NO MongoDB)
        const sheetData = await getSheetData(user.googleAccessToken, spreadsheetId);

        return NextResponse.json({ success: true, invoices: sheetData.invoices || [] });
    } catch (error) {
        console.error('Get invoices error:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch invoices' }, { status: 500 });
    }
}
