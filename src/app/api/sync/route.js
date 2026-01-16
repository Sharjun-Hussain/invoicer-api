import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Invoice from '@/models/Invoice';
import Client from '@/models/Client';
import Item from '@/models/Item';
import User from '@/models/User';
import { verifyJwt } from '@/lib/auth';
import { updateSheetData, findSpreadsheet } from '@/lib/googleSheets';

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

        const { invoices, clients, items } = await req.json();
        const userEmail = decoded.email;
        let count = 0;

        // Invoices
        if (Array.isArray(invoices) && invoices.length > 0) {
            const operations = invoices.map(inv => ({
                updateOne: {
                    filter: { id: inv.id, userEmail },
                    update: { $set: { ...inv, userEmail } },
                    upsert: true
                }
            }));
            await Invoice.bulkWrite(operations);
            count += operations.length;
        }

        // Clients
        if (Array.isArray(clients) && clients.length > 0) {
            const operations = clients.map(c => ({
                updateOne: {
                    filter: { id: c.id, userEmail },
                    update: { $set: { ...c, userEmail } },
                    upsert: true
                }
            }));
            await Client.bulkWrite(operations);
            count += operations.length;
        }

        // Items
        if (Array.isArray(items) && items.length > 0) {
            const operations = items.map(i => ({
                updateOne: {
                    filter: { id: i.id, userEmail },
                    update: { $set: { ...i, userEmail } },
                    upsert: true
                }
            }));
            await Item.bulkWrite(operations);
            count += operations.length;

        }

        // Sync to Google Sheets
        const user = await User.findOne({ email: userEmail });
        if (user && user.googleAccessToken) {
            // Fetch all data to sync to sheet (Source of Truth: MongoDB)
            const allInvoices = await Invoice.find({ userEmail });
            const allClients = await Client.find({ userEmail });
            const allItems = await Item.find({ userEmail });

            let spreadsheetId = user.googleSpreadsheetId;
            // If no sheet ID stored, try to find it
            if (!spreadsheetId) {
                spreadsheetId = await findSpreadsheet(user.googleAccessToken);
                if (spreadsheetId) {
                    user.googleSpreadsheetId = spreadsheetId;
                    await user.save();
                }
            }

            if (spreadsheetId) {
                await updateSheetData(user.googleAccessToken, spreadsheetId, {
                    invoices: allInvoices,
                    clients: allClients,
                    items: allItems
                });
            }
        }

        return NextResponse.json({ success: true, message: 'Sync successful', count });
    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json({ success: false, message: 'Sync failed' }, { status: 500 });
    }
}
