/**
 * Turso Statistics Service
 * Provides analytics and reporting for invoices, clients, and items
 * Leverages extracted fields for fast queries while keeping JSON flexibility
 */

import { getTursoClient } from './tursoDb.js';

/**
 * Get user statistics overview
 */
export async function getUserStats(userId) {
    const client = getTursoClient();

    try {
        // Get total revenue
        const revenueResult = await client.execute({
            sql: `SELECT 
              SUM(total) as total_revenue,
              COUNT(*) as total_invoices
            FROM invoices 
            WHERE user_id = ? AND deleted = 0`,
            args: [userId]
        });

        // Get unpaid invoices
        const unpaidResult = await client.execute({
            sql: `SELECT 
              SUM(total) as unpaid_total,
              COUNT(*) as unpaid_count
            FROM invoices 
            WHERE user_id = ? AND status = 'unpaid' AND deleted = 0`,
            args: [userId]
        });

        // Get client count
        const clientResult = await client.execute({
            sql: `SELECT COUNT(*) as client_count 
            FROM clients 
            WHERE user_id = ? AND deleted = 0`,
            args: [userId]
        });

        // Get item count
        const itemResult = await client.execute({
            sql: `SELECT COUNT(*) as item_count 
            FROM items 
            WHERE user_id = ? AND deleted = 0`,
            args: [userId]
        });

        return {
            revenue: {
                total: revenueResult.rows[0]?.total_revenue || 0,
                invoiceCount: revenueResult.rows[0]?.total_invoices || 0
            },
            unpaid: {
                total: unpaidResult.rows[0]?.unpaid_total || 0,
                count: unpaidResult.rows[0]?.unpaid_count || 0
            },
            clients: clientResult.rows[0]?.client_count || 0,
            items: itemResult.rows[0]?.item_count || 0
        };
    } catch (error) {
        console.error('Error getting user stats:', error);
        throw error;
    }
}

/**
 * Get revenue by month
 */
export async function getMonthlyRevenue(userId, months = 12) {
    const client = getTursoClient();

    try {
        const result = await client.execute({
            sql: `SELECT 
              strftime('%Y-%m', date) as month,
              SUM(total) as revenue,
              COUNT(*) as invoice_count
            FROM invoices 
            WHERE user_id = ? AND deleted = 0
            GROUP BY month
            ORDER BY month DESC
            LIMIT ?`,
            args: [userId, months]
        });

        return result.rows.map(row => ({
            month: row.month,
            revenue: row.revenue || 0,
            invoiceCount: row.invoice_count || 0
        }));
    } catch (error) {
        console.error('Error getting monthly revenue:', error);
        throw error;
    }
}

/**
 * Get revenue by client
 */
export async function getRevenueByClient(userId, limit = 10) {
    const client = getTursoClient();

    try {
        const result = await client.execute({
            sql: `SELECT 
              client_name,
              SUM(total) as total_revenue,
              COUNT(*) as invoice_count,
              MAX(date) as last_invoice_date
            FROM invoices 
            WHERE user_id = ? AND deleted = 0
            GROUP BY client_name
            ORDER BY total_revenue DESC
            LIMIT ?`,
            args: [userId, limit]
        });

        return result.rows.map(row => ({
            clientName: row.client_name,
            totalRevenue: row.total_revenue || 0,
            invoiceCount: row.invoice_count || 0,
            lastInvoiceDate: row.last_invoice_date
        }));
    } catch (error) {
        console.error('Error getting revenue by client:', error);
        throw error;
    }
}

/**
 * Get revenue by status
 */
export async function getRevenueByStatus(userId) {
    const client = getTursoClient();

    try {
        const result = await client.execute({
            sql: `SELECT 
              status,
              SUM(total) as total,
              COUNT(*) as count
            FROM invoices 
            WHERE user_id = ? AND deleted = 0
            GROUP BY status`,
            args: [userId]
        });

        return result.rows.map(row => ({
            status: row.status,
            total: row.total || 0,
            count: row.count || 0
        }));
    } catch (error) {
        console.error('Error getting revenue by status:', error);
        throw error;
    }
}

/**
 * Get recent invoices with full details
 */
export async function getRecentInvoices(userId, limit = 10) {
    const client = getTursoClient();

    try {
        const result = await client.execute({
            sql: `SELECT data 
            FROM invoices 
            WHERE user_id = ? AND deleted = 0
            ORDER BY date DESC 
            LIMIT ?`,
            args: [userId, limit]
        });

        return result.rows.map(row => JSON.parse(row.data));
    } catch (error) {
        console.error('Error getting recent invoices:', error);
        throw error;
    }
}

/**
 * Get invoices by date range
 */
export async function getInvoicesByDateRange(userId, startDate, endDate) {
    const client = getTursoClient();

    try {
        const result = await client.execute({
            sql: `SELECT 
              data,
              total,
              status,
              date
            FROM invoices 
            WHERE user_id = ? 
              AND date >= ? 
              AND date <= ? 
              AND deleted = 0
            ORDER BY date DESC`,
            args: [userId, startDate, endDate]
        });

        return result.rows.map(row => ({
            ...JSON.parse(row.data),
            _extracted: {
                total: row.total,
                status: row.status,
                date: row.date
            }
        }));
    } catch (error) {
        console.error('Error getting invoices by date range:', error);
        throw error;
    }
}

/**
 * Search invoices
 */
export async function searchInvoices(userId, searchTerm) {
    const client = getTursoClient();

    try {
        const result = await client.execute({
            sql: `SELECT data 
            FROM invoices 
            WHERE user_id = ? 
              AND deleted = 0
              AND (
                client_name LIKE ? 
                OR id LIKE ?
                OR data LIKE ?
              )
            ORDER BY date DESC
            LIMIT 50`,
            args: [userId, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
        });

        return result.rows.map(row => JSON.parse(row.data));
    } catch (error) {
        console.error('Error searching invoices:', error);
        throw error;
    }
}

/**
 * Update invoice (updates both JSON and extracted fields)
 */
export async function updateInvoice(userId, invoiceId, updates) {
    const client = getTursoClient();

    try {
        // Get current invoice
        const current = await client.execute({
            sql: 'SELECT data FROM invoices WHERE id = ? AND user_id = ?',
            args: [invoiceId, userId]
        });

        if (!current.rows || current.rows.length === 0) {
            throw new Error('Invoice not found');
        }

        const invoiceData = JSON.parse(current.rows[0].data);

        // Merge updates
        const updated = { ...invoiceData, ...updates };

        // Update both JSON and extracted fields
        await client.execute({
            sql: `UPDATE invoices 
            SET data = ?,
                total = ?,
                status = ?,
                client_name = ?,
                date = ?,
                updated_at = unixepoch()
            WHERE id = ? AND user_id = ?`,
            args: [
                JSON.stringify(updated),
                updated.total || invoiceData.total,
                updated.status || invoiceData.status,
                updated.clientName || invoiceData.clientName,
                updated.date || invoiceData.date,
                invoiceId,
                userId
            ]
        });

        return updated;
    } catch (error) {
        console.error('Error updating invoice:', error);
        throw error;
    }
}

/**
 * Get top selling items (from invoice line items in JSON)
 */
export async function getTopSellingItems(userId, limit = 10) {
    const client = getTursoClient();

    try {
        // Get all invoices and parse line items
        const result = await client.execute({
            sql: `SELECT data FROM invoices WHERE user_id = ? AND deleted = 0`,
            args: [userId]
        });

        // Aggregate items from all invoices
        const itemStats = {};

        result.rows.forEach(row => {
            const invoice = JSON.parse(row.data);
            if (invoice.items && Array.isArray(invoice.items)) {
                invoice.items.forEach(item => {
                    const key = item.name || item.description;
                    if (!itemStats[key]) {
                        itemStats[key] = {
                            name: key,
                            quantity: 0,
                            revenue: 0,
                            count: 0
                        };
                    }
                    itemStats[key].quantity += item.quantity || 0;
                    itemStats[key].revenue += (item.quantity || 0) * (item.price || 0);
                    itemStats[key].count += 1;
                });
            }
        });

        // Sort by revenue and return top items
        return Object.values(itemStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, limit);
    } catch (error) {
        console.error('Error getting top selling items:', error);
        throw error;
    }
}

export default {
    getUserStats,
    getMonthlyRevenue,
    getRevenueByClient,
    getRevenueByStatus,
    getRecentInvoices,
    getInvoicesByDateRange,
    searchInvoices,
    updateInvoice,
    getTopSellingItems
};
