import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifyJwt } from '@/lib/auth';
import {
    getUserStats,
    getMonthlyRevenue,
    getRevenueByClient,
    getRevenueByStatus,
    getTopSellingItems
} from '@/lib/tursoStats';

export async function GET(req) {
    try {
        await connectToDatabase();

        // Auth check
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

        // Check if Turso sync is enabled
        if (!user.settings?.tursoSyncEnabled) {
            return NextResponse.json({
                success: false,
                message: 'Turso sync not enabled. Please enable cloud sync first.'
            }, { status: 400 });
        }

        const userId = user._id.toString();

        // Get query parameters
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'overview';
        const months = parseInt(searchParams.get('months') || '12');
        const limit = parseInt(searchParams.get('limit') || '10');

        let data;

        switch (type) {
            case 'overview':
                data = await getUserStats(userId);
                break;

            case 'monthly':
                data = await getMonthlyRevenue(userId, months);
                break;

            case 'clients':
                data = await getRevenueByClient(userId, limit);
                break;

            case 'status':
                data = await getRevenueByStatus(userId);
                break;

            case 'top-items':
                data = await getTopSellingItems(userId, limit);
                break;

            default:
                return NextResponse.json({
                    success: false,
                    message: 'Invalid stats type'
                }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            type,
            data
        });
    } catch (error) {
        console.error('Stats error:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Failed to get statistics'
        }, { status: 500 });
    }
}
