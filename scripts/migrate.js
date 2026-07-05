// @ts-check
/**
 * Flyway-style migration runner for Supabase / PostgreSQL.
 *
 * - Reads numbered .sql files from src/infrastructure/supabase/migrations/
 * - Tracks applied migrations in a `schema_migrations` table
 * - Each migration runs inside a transaction; a failure rolls back only that file
 * - Safe to run on every deploy: already-applied migrations are skipped
 *
 * Required env var: SUPABASE_DB_URL
 *   Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
 *   Find it in: Supabase Dashboard → Project Settings → Database → Connection string → URI (Session mode)
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const MIGRATIONS_DIR = path.resolve(__dirname, '../src/infrastructure/supabase/migrations');

async function main() {
    const connectionString = process.env.SUPABASE_DB_URL;
    if (!connectionString) {
        console.error('ERROR: SUPABASE_DB_URL is not set in .env.local');
        console.error(
            '  Find it in: Supabase Dashboard → Project Settings → Database → Connection string → URI (Session mode)'
        );
        process.exit(1);
    }

    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();
    console.log('Connected to database.');

    try {
        // Bootstrap the tracking table (idempotent)
        await client.query(`
      create table if not exists schema_migrations (
        version     text primary key,
        applied_at  timestamptz not null default now()
      )
    `);

        // Load already-applied versions
        const { rows } = await client.query('select version from schema_migrations');
        const applied = new Set(rows.map((r) => r.version));

        // Discover migration files sorted by name
        const files = fs
            .readdirSync(MIGRATIONS_DIR)
            .filter((f) => f.endsWith('.sql'))
            .sort();

        if (files.length === 0) {
            console.log('No migration files found in', MIGRATIONS_DIR);
            return;
        }

        let ranCount = 0;

        for (const file of files) {
            const version = file.replace('.sql', '');

            if (applied.has(version)) {
                console.log(`  [skip]  ${file}`);
                continue;
            }

            const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

            console.log(`  [run ]  ${file}`);
            await client.query('begin');
            try {
                await client.query(sql);
                await client.query('insert into schema_migrations (version) values ($1)', [version]);
                await client.query('commit');
                ranCount++;
            } catch (err) {
                await client.query('rollback');
                console.error(`\nFAILED: ${file}`);
                console.error(err instanceof Error ? err.message : err);
                process.exit(1);
            }
        }

        if (ranCount === 0) {
            console.log('Database is up to date. No migrations to run.');
        } else {
            console.log(`\nApplied ${ranCount} migration(s) successfully.`);
        }
    } finally {
        await client.end();
    }
}

main().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
