import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifyJwt } from '@/lib/auth';
import { updateSheetData, findOrCreateSpreadsheet, getSheetData } from '@/lib/googleSheets';

export async function POST(req) {
    try {
        await connectToDatabase();

        // Basic Auth Check
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);

        if (!decoded) {
            return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });
        }

        const { invoices, clients, items } = await req.json();
        const userEmail = decoded.email;
        let responseData = { success: true, message: 'Sync successful' };

        // Get user and Google tokens
        const user = await User.findOne({ email: userEmail }).select('+googleAccessToken');
        if (!user || !user.googleAccessToken || !user.settings?.cloudSyncEnabled) {
            return NextResponse.json({ success: false, message: 'Cloud sync not enabled' }, { status: 400 });
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
            return NextResponse.json({ success: false, message: 'No spreadsheet found' }, { status: 404 });
        }

        // Write directly to Google Sheets (NO MongoDB)
        await updateSheetData(user.googleAccessToken, spreadsheetId, {
            invoices: invoices || [],
            clients: clients || [],
            items: items || []
        });

        // Fetch latest data from Google Sheets to return
        const sheetData = await getSheetData(user.googleAccessToken, spreadsheetId);

        responseData.invoices = sheetData.invoices || [];
        responseData.clients = sheetData.clients || [];
        responseData.items = sheetData.items || [];
        responseData.count = (invoices?.length || 0) + (clients?.length || 0) + (items?.length || 0);

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json({ success: false, message: 'Sync failed' }, { status: 500 });
    }
}
