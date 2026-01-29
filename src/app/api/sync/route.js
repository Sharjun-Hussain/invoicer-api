import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifyJwt } from '@/lib/auth';
import { performFullSync } from '@/lib/tursoDb';

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

        // Get user
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
        }

        // Check if Turso sync is enabled
        if (!user.settings?.tursoSyncEnabled) {
            return NextResponse.json({ success: false, message: 'Cloud sync not enabled' }, { status: 400 });
        }

        // Perform full sync with Turso
        const syncResult = await performFullSync(
            user._id.toString(),
            userEmail,
            {
                invoices: invoices || [],
                clients: clients || [],
                items: items || []
            }
        );

        // Update user's last sync time
        user.lastSyncTime = new Date();
        await user.save();

        return NextResponse.json({
            success: true,
            message: 'Sync successful',
            invoices: syncResult.invoices,
            clients: syncResult.clients,
            items: syncResult.items,
            count: (invoices?.length || 0) + (clients?.length || 0) + (items?.length || 0)
        });
    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Sync failed'
        }, { status: 500 });
    }
}
