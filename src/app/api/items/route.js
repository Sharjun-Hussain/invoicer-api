import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { getItems, syncItems, ensureUser } from '@/lib/tursoDb';

export async function GET(req) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);
        if (!decoded) return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });

        const userId = decoded.userId;

        const items = await getItems(userId);

        return NextResponse.json({ success: true, items });
    } catch (error) {
        console.error('Get items error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to fetch items',
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
        const itemData = await req.json();

        await ensureUser(userId, decoded.email);
        await syncItems(userId, [itemData]);

        return NextResponse.json({ success: true, item: itemData });
    } catch (error) {
        console.error('Create item error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to create item',
            error: error.message
        }, { status: 500 });
    }
}
