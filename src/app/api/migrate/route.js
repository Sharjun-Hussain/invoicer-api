import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifyJwt } from '@/lib/auth';
import { getSheetData } from '@/lib/googleSheets';
import { performFullSync, initializeSchema } from '@/lib/tursoDb';

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

        const userEmail = decoded.email;

        // Get user with Google tokens
        const user = await User.findOne({ email: userEmail }).select('+googleAccessToken');
        if (!user) {
            return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
        }

        // Check if user has Google Sheets data to migrate
        if (!user.googleAccessToken || !user.googleSpreadsheetId) {
            return NextResponse.json({
                success: false,
                message: 'No Google Sheets data found to migrate'
            }, { status: 400 });
        }

        // Initialize Turso schema if not already done
        try {
            await initializeSchema();
        } catch (error) {
            console.warn('Schema already initialized or error:', error);
        }

        // Fetch data from Google Sheets
        const sheetData = await getSheetData(user.googleAccessToken, user.googleSpreadsheetId);

        // Migrate data to Turso
        const syncResult = await performFullSync(
            user._id.toString(),
            userEmail,
            {
                invoices: sheetData.invoices || [],
                clients: sheetData.clients || [],
                items: sheetData.items || []
            }
        );

        // Update user settings
        user.settings.tursoSyncEnabled = true;
        user.settings.cloudSyncEnabled = false; // Disable Google Sheets sync
        user.lastSyncTime = new Date();
        await user.save();

        return NextResponse.json({
            success: true,
            message: 'Migration completed successfully',
            migrated: {
                invoices: syncResult.invoices.length,
                clients: syncResult.clients.length,
                items: syncResult.items.length
            }
        });
    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Migration failed'
        }, { status: 500 });
    }
}

// GET endpoint to check migration status
export async function GET(req) {
    try {
        await connectToDatabase();

        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);

        if (!decoded) {
            return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });
        }

        const user = await User.findOne({ email: decoded.email });
        if (!user) {
            return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            status: {
                hasTursoSync: user.settings?.tursoSyncEnabled || false,
                hasGoogleSheets: !!(user.googleAccessToken && user.googleSpreadsheetId),
                needsMigration: !!(user.googleAccessToken && user.googleSpreadsheetId && !user.settings?.tursoSyncEnabled),
                lastSyncTime: user.lastSyncTime
            }
        });
    } catch (error) {
        console.error('Migration status error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to check migration status'
        }, { status: 500 });
    }
}
