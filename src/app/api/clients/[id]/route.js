import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { syncClients, deleteClient, ensureUser } from '@/lib/tursoDb';

export async function PUT(req, { params }) {
    try {
        const { id } = params;
        const authHeader = req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);
        if (!decoded) return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });

        const userId = decoded.id || decoded.email;
        const clientData = await req.json();

        // Ensure ID matches
        if (clientData.id && String(clientData.id) !== id) {
            return NextResponse.json({ success: false, message: 'ID mismatch' }, { status: 400 });
        }
        clientData.id = id;

        await ensureUser(userId, decoded.email);
        await syncClients(userId, [clientData]);

        return NextResponse.json({ success: true, client: clientData });
    } catch (error) {
        console.error('Update client error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to update client',
            error: error.message
        }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { id } = params;
        const authHeader = req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);
        if (!decoded) return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });

        const userId = decoded.id || decoded.email;

        await ensureUser(userId, decoded.email);
        await deleteClient(userId, id);

        return NextResponse.json({ success: true, message: 'Client deleted' });
    } catch (error) {
        console.error('Delete client error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to delete client',
            error: error.message
        }, { status: 500 });
    }
}
