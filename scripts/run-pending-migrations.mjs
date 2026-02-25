#!/usr/bin/env node
/**
 * Run pending Supabase migrations (20260216*) via direct Postgres.
 * Requires: SUPABASE_DB_PASSWORD in .env or env.
 * Uses: VITE_SUPABASE_URL (from .env) for project ref; SUPABASE_POOLER_HOST for host.
 */
import { config } from 'dotenv';
import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

config({ path: join(PROJECT_ROOT, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const projectRef = process.env.PROJECT_REF || (supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]) || 'tislabgxitwtcqfwrpik';
const password = process.env.SUPABASE_DB_PASSWORD;
const poolerHost = process.env.SUPABASE_POOLER_HOST || 'aws-1-ap-south-1.pooler.supabase.com';

if (!password) {
  console.error('❌ SUPABASE_DB_PASSWORD is required. Add it to .env or export it.');
  process.exit(1);
}

// Asset-fields migrations (and history tables if missing). Edit list as needed.
const migrations = [
  '20260208161317_create_asset_value_history.sql',
  '20260208161318_create_liability_balance_history.sql',
  '20260208161319_add_history_triggers.sql',
  '20260216120000_add_asset_value_as_at_date.sql',
  '20260216120001_add_assets_address_property_grant_price.sql',
  '20260216120002_rename_investments_remove_other.sql',
];

// Use pooler (direct db.*.supabase.co often not resolvable from local)
const client = new pg.Client({
  host: poolerHost,
  port: 6543,
  database: 'postgres',
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log('Running pending migrations via Postgres...');
  console.log('Project:', projectRef);
  await client.connect();
  for (const file of migrations) {
    const path = join(PROJECT_ROOT, 'supabase', 'migrations', file);
    try {
      const sql = readFileSync(path, 'utf-8');
      await client.query(sql);
      console.log('Applied:', file);
    } catch (e) {
      console.error('Failed:', file, e.message);
      await client.end();
      process.exit(1);
    }
  }
  await client.end();
  console.log('Done.');
}

main();
