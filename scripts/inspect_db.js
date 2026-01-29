import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from invoice-api/.env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function inspect() {
    try {
        console.log('--- USERS ---');
        const users = await client.execute('SELECT * FROM users');
        console.table(users.rows);

        console.log('\n--- INVOICES (Count) ---');
        const invoices = await client.execute('SELECT COUNT(*) as count FROM invoices');
        console.log(invoices.rows[0]);

        console.log('\n--- CLIENTS (Count) ---');
        const clients = await client.execute('SELECT COUNT(*) as count FROM clients');
        console.log(clients.rows[0]);

        console.log('\n--- ITEMS (Count) ---');
        const items = await client.execute('SELECT COUNT(*) as count FROM items');
        console.log(items.rows[0]);

    } catch (e) {
        console.error(e);
    }
}

inspect();
