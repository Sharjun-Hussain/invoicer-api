import { createClient } from '@libsql/client';

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
    console.warn('Turso credentials not configured. Cloud sync will be disabled.');
}

let tursoClient = null;

/**
 * Get or create Turso client instance
 */
export function getTursoClient() {
    if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
        throw new Error('Turso database not configured');
    }

    if (!tursoClient) {
        tursoClient = createClient({
            url: TURSO_DATABASE_URL,
            authToken: TURSO_AUTH_TOKEN,
        });
    }

    return tursoClient;
}

/**
 * Initialize database schema
 * Creates all necessary tables if they don't exist
 */
export async function initializeSchema() {
    const client = getTursoClient();

    const schema = `
    -- Users table (sync with MongoDB User model)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    -- Invoices table
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      client_name TEXT,
      total REAL,
      status TEXT,
      data TEXT, -- JSON blob for full invoice data
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      deleted INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Clients table
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      data TEXT, -- JSON blob for full client data
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      deleted INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Items table
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL,
      description TEXT,
      data TEXT, -- JSON blob for full item data
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      deleted INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Sync metadata table
    CREATE TABLE IF NOT EXISTS sync_metadata (
      user_id TEXT PRIMARY KEY,
      last_sync_timestamp INTEGER,
      device_id TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
    CREATE INDEX IF NOT EXISTS idx_invoices_deleted ON invoices(deleted);
    CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);
    CREATE INDEX IF NOT EXISTS idx_clients_deleted ON clients(deleted);
    CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id);
    CREATE INDEX IF NOT EXISTS idx_items_deleted ON items(deleted);
  `;

    // Execute schema creation
    const statements = schema.split(';').filter(s => s.trim());

    for (const statement of statements) {
        if (statement.trim()) {
            await client.execute(statement);
        }
    }

    console.log('Turso schema initialized successfully');
}

/**
 * Ensure user exists in Turso database
 */
export async function ensureUser(userId, email) {
    const client = getTursoClient();

    try {
        await client.execute({
            sql: 'INSERT OR IGNORE INTO users (id, email) VALUES (?, ?)',
            args: [userId, email]
        });
    } catch (error) {
        console.error('Error ensuring user exists:', error);
        throw error;
    }
}

/**
 * Robustly parse amount from string, handling commas and currency symbols
 */
function parseAmount(amt) {
    if (amt === null || amt === undefined) return 0;
    if (typeof amt === 'number') return amt;
    // Remove everything except digits, decimal point, and minus sign
    const cleanAmt = amt.toString().replace(/[^\d.-]/g, '');
    return parseFloat(cleanAmt) || 0;
}

/**
 * Sync invoices to Turso
 */
export async function syncInvoices(userId, invoices) {
    const client = getTursoClient();
    const now = Math.floor(Date.now() / 1000);

    try {
        // Use transaction for batch insert/update
        const batch = invoices.map(invoice => ({
            sql: `
        INSERT INTO invoices (id, user_id, date, client_name, total, status, data, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          date = excluded.date,
          client_name = excluded.client_name,
          total = excluded.total,
          status = excluded.status,
          data = excluded.data,
          updated_at = excluded.updated_at
      `,
            args: [
                invoice.id,
                userId,
                invoice.date || '',
                invoice.clientName || invoice.billTo?.name || '',
                invoice.total || parseAmount(invoice.grandTotal),
                invoice.status || '',
                JSON.stringify(invoice),
                now
            ]
        }));

        await client.batch(batch, 'write');
        return true;
    } catch (error) {
        console.error('Error syncing invoices:', error);
        throw error;
    }
}

/**
 * Sync clients to Turso
 */
export async function syncClients(userId, clients) {
    const client = getTursoClient();
    const now = Math.floor(Date.now() / 1000);

    try {
        const batch = clients.map(clientData => ({
            sql: `
        INSERT INTO clients (id, user_id, name, email, phone, data, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          email = excluded.email,
          phone = excluded.phone,
          data = excluded.data,
          updated_at = excluded.updated_at
      `,
            args: [
                clientData.id,
                userId,
                clientData.name || '',
                clientData.email || '',
                clientData.phone || '',
                JSON.stringify(clientData),
                now
            ]
        }));

        await client.batch(batch, 'write');
        return true;
    } catch (error) {
        console.error('Error syncing clients:', error);
        throw error;
    }
}

/**
 * Sync items to Turso
 */
export async function syncItems(userId, items) {
    const client = getTursoClient();
    const now = Math.floor(Date.now() / 1000);

    try {
        const batch = items.map(item => ({
            sql: `
        INSERT INTO items (id, user_id, name, price, description, data, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          price = excluded.price,
          description = excluded.description,
          data = excluded.data,
          updated_at = excluded.updated_at
      `,
            args: [
                item.id,
                userId,
                item.name || '',
                item.price || 0,
                item.description || '',
                JSON.stringify(item),
                now
            ]
        }));

        await client.batch(batch, 'write');
        return true;
    } catch (error) {
        console.error('Error syncing items:', error);
        throw error;
    }
}

/**
 * Get all invoices for a user
 */
export async function getInvoices(userId) {
    const client = getTursoClient();

    try {
        const result = await client.execute({
            sql: 'SELECT data FROM invoices WHERE user_id = ? AND deleted = 0 ORDER BY date DESC',
            args: [userId]
        });

        return result.rows.map(row => JSON.parse(row.data));
    } catch (error) {
        console.error('Error getting invoices:', error);
        throw error;
    }
}

/**
 * Get all clients for a user
 */
export async function getClients(userId) {
    const client = getTursoClient();

    try {
        const result = await client.execute({
            sql: 'SELECT data FROM clients WHERE user_id = ? AND deleted = 0 ORDER BY name ASC',
            args: [userId]
        });

        return result.rows.map(row => JSON.parse(row.data));
    } catch (error) {
        console.error('Error getting clients:', error);
        throw error;
    }
}

/**
 * Get all items for a user
 */
export async function getItems(userId) {
    const client = getTursoClient();

    try {
        const result = await client.execute({
            sql: 'SELECT data FROM items WHERE user_id = ? AND deleted = 0 ORDER BY name ASC',
            args: [userId]
        });

        return result.rows.map(row => JSON.parse(row.data));
    } catch (error) {
        console.error('Error getting items:', error);
        throw error;
    }
}

/**
 * Update sync metadata
 */
export async function updateSyncMetadata(userId, deviceId) {
    const client = getTursoClient();
    const now = Math.floor(Date.now() / 1000);

    try {
        await client.execute({
            sql: `
        INSERT INTO sync_metadata (user_id, last_sync_timestamp, device_id)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          last_sync_timestamp = excluded.last_sync_timestamp,
          device_id = excluded.device_id
      `,
            args: [userId, now, deviceId]
        });
    } catch (error) {
        console.error('Error updating sync metadata:', error);
        throw error;
    }
}

/**
 * Perform full sync - upload local data and download remote data
 */
export async function performFullSync(userId, email, localData) {
    const client = getTursoClient();

    try {
        // Ensure user exists
        await ensureUser(userId, email);

        // Sync local data to Turso
        if (localData.invoices && localData.invoices.length > 0) {
            await syncInvoices(userId, localData.invoices);
        }
        if (localData.clients && localData.clients.length > 0) {
            await syncClients(userId, localData.clients);
        }
        if (localData.items && localData.items.length > 0) {
            await syncItems(userId, localData.items);
        }

        // Get latest data from Turso
        const [invoices, clients, items] = await Promise.all([
            getInvoices(userId),
            getClients(userId),
            getItems(userId)
        ]);

        // Update sync metadata
        await updateSyncMetadata(userId, 'backend');

        return {
            success: true,
            invoices,
            clients,
            items
        };
    } catch (error) {
        console.error('Full sync error:', error);
        throw error;
    }
}

/**
 * Soft delete client
 */
export async function deleteClient(userId, clientId) {
    const client = getTursoClient();
    const now = Math.floor(Date.now() / 1000);

    try {
        await client.execute({
            sql: 'UPDATE clients SET deleted = 1, updated_at = ? WHERE id = ? AND user_id = ?',
            args: [now, clientId, userId]
        });
        return true;
    } catch (error) {
        console.error('Error deleting client:', error);
        throw error;
    }
}

/**
 * Soft delete item
 */
export async function deleteItem(userId, itemId) {
    const client = getTursoClient();
    const now = Math.floor(Date.now() / 1000);

    try {
        await client.execute({
            sql: 'UPDATE items SET deleted = 1, updated_at = ? WHERE id = ? AND user_id = ?',
            args: [now, itemId, userId]
        });
        return true;
    } catch (error) {
        console.error('Error deleting item:', error);
        throw error;
    }
}

/**
 * Soft delete invoice
 */
export async function deleteInvoice(userId, invoiceId) {
    const client = getTursoClient();
    const now = Math.floor(Date.now() / 1000);

    try {
        await client.execute({
            sql: 'UPDATE invoices SET deleted = 1, updated_at = ? WHERE id = ? AND user_id = ?',
            args: [now, invoiceId, userId]
        });
        return true;
    } catch (error) {
        console.error('Error deleting invoice:', error);
        throw error;
    }
}

export default {
    getTursoClient,
    initializeSchema,
    ensureUser,
    syncInvoices,
    syncClients,
    syncItems,
    getInvoices,
    getClients,
    getItems,
    updateSyncMetadata,
    performFullSync,
    deleteClient,
    deleteItem,
    deleteInvoice
};
