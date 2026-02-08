import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import tursoDb from '@/lib/tursoDb';

export async function POST(req, { params }) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);
        if (!decoded) return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });

        const userId = decoded.userId;
        const { id } = await params;

        await tursoDb.restoreInvoice(userId, id);

        return NextResponse.json({ success: true, message: 'Invoice restored' });
    } catch (error) {
        console.error('Restore invoice error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to restore invoice',
            error: error.message
        }, { status: 500 });
    }
}
