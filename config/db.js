import { Pool } from 'pg';
// Load environment variables if not already loaded
import 'dotenv/config';

// Build database configuration
let dbConfig = {};

// Check if DATABASE_URL exists and is valid (not containing placeholders)
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('<DEV_HOST>')) {
    // Cloud database with connection string
    dbConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Neon/Vercel Postgres
    };
} else {
    // Local database with individual parameters
    dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'smart_inventory',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    };
}

const pool = new Pool({
    ...dbConfig,
    max: 10,                          // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,         // Close idle clients after 30s
    connectionTimeoutMillis: 10000,   // Wait up to 10s for connection (increased for Neon)
    keepAlive: true,                  // Enable TCP keep-alive
    keepAliveInitialDelayMillis: 10000 // Start keep-alive after 10s
});

console.log('Database configuration:', {
    connectionString: process.env.DATABASE_URL ? '***REDACTED***' : undefined,
    host: dbConfig.host,
    database: dbConfig.database,
    user: dbConfig.user
});

pool.on('error', (err) => {
    console.error('💥 Unexpected database error:', err.message);
});

const query = (text, params) => pool.query(text, params);

export default { query, pool };