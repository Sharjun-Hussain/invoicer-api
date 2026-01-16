import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifyJwt } from '@/lib/auth';

export async function GET(req) {
    try {
        await connectToDatabase();

        const authHeader = req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);
        if (!decoded) return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });

        const user = await User.findOne({ email: decoded.email });
        if (!user) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });

        return NextResponse.json({
            success: true,
            settings: {
                company: user.companySettings || {},
                invoice: user.invoiceSettings || {},
                sessionTimeout: user.settings?.sessionTimeout
            }
        });
    } catch (error) {
        console.error('Get settings error:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        await connectToDatabase();

        const authHeader = req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);
        if (!decoded) return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });

        const { settings } = await req.json();

        const update = {};
        if (settings.company) update.companySettings = settings.company;
        if (settings.invoice) update.invoiceSettings = settings.invoice;
        if (settings.sessionTimeout) update['settings.sessionTimeout'] = settings.sessionTimeout;

        await User.findOneAndUpdate(
            { email: decoded.email },
            { $set: update }
        );

        return NextResponse.json({ success: true, message: 'Settings updated' });
    } catch (error) {
        console.error('Update settings error:', error);
        return NextResponse.json({ success: false, message: 'Failed to update settings' }, { status: 500 });
    }
}
