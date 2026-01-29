// Test Turso connection
import 'dotenv/config';
import { getTursoClient, initializeSchema } from './src/lib/tursoDb.js';

async function testConnection() {
    try {
        console.log('Testing Turso connection...');
        console.log('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL ? 'Set' : 'Not set');
        console.log('TURSO_AUTH_TOKEN:', process.env.TURSO_AUTH_TOKEN ? 'Set' : 'Not set');

        if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
            console.error('❌ Turso credentials not configured in .env file');
            process.exit(1);
        }

        const client = getTursoClient();
        console.log('✅ Turso client created');

        // Initialize schema
        await initializeSchema();
        console.log('✅ Schema initialized');

        // Test query
        const result = await client.execute('SELECT 1 as test');
        console.log('✅ Test query successful:', result.rows[0]);

        console.log('\n🎉 Turso connection test passed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Turso connection test failed:', error.message);
        process.exit(1);
    }
}

testConnection();
