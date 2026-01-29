import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { getClients, syncClients, ensureUser } from '@/lib/tursoDb';

export async function GET(req) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);
        if (!decoded) return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });

        if (!decoded) return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });

        const userId = decoded.userId; // Use userId from token

        const clients = await getClients(userId);

        return NextResponse.json({ success: true, clients });
    } catch (error) {
        console.error('Get clients error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to fetch clients',
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

        if (!decoded) return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });

        const userId = decoded.userId;
        const clientData = await req.json();

        // Ensure user exists in Turso
        await ensureUser(userId, decoded.email);

        // Sync (Upsert) the client
        // Wrap in array because syncClients expects an array
        await syncClients(userId, [clientData]);

        return NextResponse.json({ success: true, client: clientData });
    } catch (error) {
        console.error('Create client error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to create client',
            error: error.message
        }, { status: 500 });
    }
}
