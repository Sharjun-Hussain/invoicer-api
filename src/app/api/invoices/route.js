import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import tursoDb from '@/lib/tursoDb';

export async function GET(req) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);
        if (!decoded) return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });

        const userId = decoded.id; // Using ID from token instead of email lookup

        // Fetch from Turso
        const invoices = await tursoDb.getInvoices(userId);

        return NextResponse.json({ success: true, invoices });
    } catch (error) {
        console.error('Get invoices error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to fetch invoices',
            error: error.message
        }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);
        if (!decoded) return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });

        const userId = decoded.userId;
        const body = await req.json();

        // Ensure user exists in Turso
        await tursoDb.ensureUser(userId, decoded.email);

        // Handle single invoice or array
        const invoicesToSync = Array.isArray(body) ? body : [body];

        await tursoDb.syncInvoices(userId, invoicesToSync);

        return NextResponse.json({
            success: true,
            message: 'Invoices synced successfully',
            invoice: !Array.isArray(body) ? body : undefined
        });
    } catch (error) {
        console.error('Create invoice error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to create invoice',
            error: error.message
        }, { status: 500 });
    }
}
