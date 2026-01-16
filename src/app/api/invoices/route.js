import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Invoice from '@/models/Invoice';
import { verifyJwt } from '@/lib/auth';

export async function GET(req) {
    try {
        await connectToDatabase();

        const authHeader = req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);
        if (!decoded) return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });

        const invoices = await Invoice.find({ userEmail: decoded.email });

        return NextResponse.json({ success: true, invoices });
    } catch (error) {
        console.error('Get invoices error:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch invoices' }, { status: 500 });
    }
}
