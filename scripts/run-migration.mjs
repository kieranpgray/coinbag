#!/usr/bin/env node
/**
 * Run a migration file. Usage: DATABASE_URL="..." node scripts/run-migration.mjs <path>
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = process.argv[2];
if (!migrationPath) {
  console.error('Usage: DATABASE_URL="..." node scripts/run-migration.mjs <migration-file>');
  process.exit(1);
}
const fullPath = path.isAbsolute(migrationPath) ? migrationPath : path.join(process.cwd(), migrationPath);
if (!fs.existsSync(fullPath)) {
  console.error('File not found:', fullPath);
  process.exit(1);
}
const sql = fs.readFileSync(fullPath, 'utf8');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query(sql);
  console.log('Applied:', path.basename(fullPath));
} catch (err) {
  console.error('Failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
