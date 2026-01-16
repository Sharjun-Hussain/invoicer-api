import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Invoice from '@/models/Invoice';
import Client from '@/models/Client';
import Item from '@/models/Item';
import { verifyJwt } from '@/lib/auth';
import { findOrCreateSpreadsheet, getSheetData } from '@/lib/googleSheets';

export async function POST(req) {
    try {
        await connectToDatabase();

        // Auth check
        const authHeader = req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);
        if (!decoded) return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });

        const { accessToken, refreshToken, email } = await req.json();
        const userEmail = decoded.email;

        // Update User with Google Tokens
        await User.findOneAndUpdate(
            { email: userEmail },
            {
                googleAccessToken: accessToken,
                googleRefreshToken: refreshToken,
                googleEmail: email,
                'settings.cloudSyncEnabled': true
            }
        );

        // Fetch from Google Sheets (create sheet if doesn't exist)
        const spreadsheetId = await findOrCreateSpreadsheet(accessToken);
        let data = { invoices: [], clients: [], items: [] };

        if (spreadsheetId) {
            data = await getSheetData(accessToken, spreadsheetId);

            // Store in DB
            if (data.invoices.length > 0) {
                const invoiceOps = data.invoices.map(inv => ({
                    updateOne: {
                        filter: { id: inv.id, userEmail },
                        update: { $set: { ...inv, userEmail } },
                        upsert: true
                    }
                }));
                await Invoice.bulkWrite(invoiceOps);
            }

            if (data.clients.length > 0) {
                const clientOps = data.clients.map(c => ({
                    updateOne: {
                        filter: { id: c.id, userEmail },
                        update: { $set: { ...c, userEmail } },
                        upsert: true
                    }
                }));
                await Client.bulkWrite(clientOps);
            }

            if (data.items.length > 0) {
                const itemOps = data.items.map(i => ({
                    updateOne: {
                        filter: { id: i.id, userEmail },
                        update: { $set: { ...i, userEmail } },
                        upsert: true
                    }
                }));
                await Item.bulkWrite(itemOps);
            }
        }

        return NextResponse.json({
            success: true,
            invoices: data.invoices,
            clients: data.clients,
            items: data.items
        });

    } catch (error) {
        console.error('Enable sync error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
