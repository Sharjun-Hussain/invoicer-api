import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Invoice from '@/models/Invoice';
import { verifyJwt } from '@/lib/auth';

export async function POST(req) {
    try {
        await connectToDatabase();

        // Basic Auth Check (You might want to use middleware)
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);

        if (!decoded) {
            return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });
        }

        const { invoices } = await req.json();

        if (!Array.isArray(invoices)) {
            return NextResponse.json({ success: false, message: 'Invalid data format' }, { status: 400 });
        }

        const userEmail = decoded.email;

        // Bulk Write (Upsert)
        const operations = invoices.map(inv => ({
            updateOne: {
                filter: { id: inv.id, userEmail },
                update: { $set: { ...inv, userEmail } },
                upsert: true
            }
        }));

        if (operations.length > 0) {
            await Invoice.bulkWrite(operations);
        }

        return NextResponse.json({ success: true, message: 'Sync successful', count: operations.length });
    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json({ success: false, message: 'Sync failed' }, { status: 500 });
    }
}
