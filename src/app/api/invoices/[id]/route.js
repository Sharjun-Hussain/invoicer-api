import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import tursoDb from '@/lib/tursoDb';

export async function PUT(req, { params }) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);
        if (!decoded) return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });

        const userId = decoded.userId;
        const { id } = params;
        const body = await req.json();

        // Ensure ID matches
        if (body.id && body.id !== id) {
            return NextResponse.json({ success: false, message: 'ID mismatch' }, { status: 400 });
        }

        const invoiceData = { ...body, id };

        await tursoDb.syncInvoices(userId, [invoiceData]);

        return NextResponse.json({ success: true, message: 'Invoice updated', invoice: invoiceData });
    } catch (error) {
        console.error('Update invoice error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to update invoice',
            error: error.message
        }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);
        if (!decoded) return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });

        const userId = decoded.userId;
        const { id } = params;

        await tursoDb.deleteInvoice(userId, id);

        return NextResponse.json({ success: true, message: 'Invoice deleted' });
    } catch (error) {
        console.error('Delete invoice error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to delete invoice',
            error: error.message
        }, { status: 500 });
    }
}
