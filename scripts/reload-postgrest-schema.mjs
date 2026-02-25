#!/usr/bin/env node
/**
 * Reload PostgREST schema cache after migrations.
 * Run: DATABASE_URL="postgresql://..." node scripts/reload-postgrest-schema.mjs
 * Or from Supabase Dashboard: SQL Editor → run: NOTIFY pgrst, 'reload schema';
 */
import pg from 'pg';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('Set DATABASE_URL (e.g. from Supabase Dashboard → Settings → Database → Connection string)');
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl });
try {
  await client.connect();
  await client.query("NOTIFY pgrst, 'reload schema'");
  await client.query('SELECT pg_notification_queue_usage()');
  console.log('PostgREST schema cache reload triggered. Wait a few seconds, then refresh the app.');
} catch (err) {
  console.error('Failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
