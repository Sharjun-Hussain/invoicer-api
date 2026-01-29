import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import tursoDb from '@/lib/tursoDb';

export async function GET(req) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);

        if (!decoded) {
            return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });
        }

        const userId = decoded.userId;
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const status = searchParams.get('status');

        // Fetch all invoices for user from Turso
        let invoices = await tursoDb.getInvoices(userId);

        // Filter in memory
        if (startDate && endDate) {
            invoices = invoices.filter(inv => inv.date >= startDate && inv.date <= endDate);
        }

        if (status && status !== 'all') {
            invoices = invoices.filter(inv => inv.status === status);
        }

        // Calculate Stats
        const totalRevenue = invoices
            .filter(inv => inv.status === 'Paid')
            .reduce((sum, inv) => sum + (parseFloat(inv.grandTotal) || 0), 0);

        const pendingAmount = invoices
            .filter(inv => inv.status === 'Pending')
            .reduce((sum, inv) => sum + (parseFloat(inv.grandTotal) || 0), 0);

        const overdueAmount = invoices
            .filter(inv => inv.status === 'Overdue')
            .reduce((sum, inv) => sum + (parseFloat(inv.grandTotal) || 0), 0);

        return NextResponse.json({
            success: true,
            stats: {
                totalRevenue,
                pendingAmount,
                overdueAmount,
                count: invoices.length
            },
            invoices // Return filtered invoices for the list/charts
        });
    } catch (error) {
        console.error('Reports error:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch reports' }, { status: 500 });
    }
}
