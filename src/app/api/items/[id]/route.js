import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { syncItems, deleteItem, ensureUser } from '@/lib/tursoDb';

export async function PUT(req, { params }) {
    try {
        const { id } = params;
        const authHeader = req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);
        if (!decoded) return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });

        const userId = decoded.userId;
        const itemData = await req.json();

        if (itemData.id && String(itemData.id) !== id) {
            return NextResponse.json({ success: false, message: 'ID mismatch' }, { status: 400 });
        }
        itemData.id = id;

        await ensureUser(userId, decoded.email);
        await syncItems(userId, [itemData]);

        return NextResponse.json({ success: true, item: itemData });
    } catch (error) {
        console.error('Update item error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to update item',
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

        const userId = decoded.userId;

        await ensureUser(userId, decoded.email);
        await deleteItem(userId, id);

        return NextResponse.json({ success: true, message: 'Item deleted' });
    } catch (error) {
        console.error('Delete item error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to delete item',
            error: error.message
        }, { status: 500 });
    }
}
