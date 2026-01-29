import { NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import tursoDb from '@/lib/tursoDb';

export async function GET(req) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        const decoded = verifyJwt(token);

        if (!decoded) {
            return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });
        }

        const userId = decoded.userId;
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const status = searchParams.get('status');
        const format = searchParams.get('format') || 'csv';

        // Fetch all invoices for user from Turso
        let invoices = await tursoDb.getInvoices(userId);

        // Filter in memory
        if (startDate && endDate) {
            invoices = invoices.filter(inv => inv.date >= startDate && inv.date <= endDate);
        }

        if (status && status !== 'all') {
            invoices = invoices.filter(inv => inv.status === status);
        }

        if (format === 'csv') {
            const header = ['Invoice Number', 'Date', 'Client Name', 'Status', 'Grand Total', 'Tax Amount'];
            const rows = invoices.map(inv => [
                inv.invoiceNumber,
                inv.date,
                inv.billTo?.name || '',
                inv.status,
                inv.grandTotal,
                inv.taxAmount
            ]);

            const csvContent = [
                header.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            return new NextResponse(csvContent, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="invoices_export.csv"`
                }
            });
        }

        return NextResponse.json({ success: false, message: 'Unsupported format' }, { status: 400 });
    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({ success: false, message: 'Export failed' }, { status: 500 });
    }
}
