import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function fix() {
    try {
        console.log('Fixing database...');

        // Find bad users
        const badUsers = await client.execute("SELECT id FROM users WHERE id = email");
        const ids = badUsers.rows.map(r => r.id);

        if (ids.length === 0) {
            console.log('No bad users found.');
            return;
        }

        console.log('Found bad user IDs:', ids);

        for (const id of ids) {
            console.log(`Cleaning up data for ${id}...`);
            await client.execute({ sql: "DELETE FROM clients WHERE user_id = ?", args: [id] });
            await client.execute({ sql: "DELETE FROM items WHERE user_id = ?", args: [id] });
            await client.execute({ sql: "DELETE FROM invoices WHERE user_id = ?", args: [id] });
            await client.execute({ sql: "DELETE FROM users WHERE id = ?", args: [id] });
        }

        console.log('Cleanup complete.');

    } catch (e) {
        console.error(e);
    }
}

fix();
