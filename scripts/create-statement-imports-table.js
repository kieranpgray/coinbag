#!/usr/bin/env node
/**
 * Create statement_imports table directly using Supabase service role key
 * This runs the migration SQL to create the table
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tislabgxitwtcqfwrpik.supabase.co';

console.log('🔧 Create Statement Imports Table');
console.log('=================================\n');
console.log(`📍 Target: ${SUPABASE_URL}\n`);

const migrationFile = join(PROJECT_ROOT, 'supabase', 'migrations', '20251230000001_create_statement_imports_table.sql');

if (!migrationFile) {
  console.error('❌ Migration file not found');
  process.exit(1);
}

const sql = readFileSync(migrationFile, 'utf-8');

console.log('📋 SQL Migration to Execute:\n');
console.log('='.repeat(60));
console.log(sql);
console.log('='.repeat(60));
console.log('\n💡 To execute this migration:');
console.log('   1. Go to: https://supabase.com/dashboard/project/tislabgxitwtcqfwrpik/sql/new');
console.log('   2. Copy and paste the SQL above');
console.log('   3. Execute it\n');
console.log('   Or use psql:');
console.log('   psql "postgresql://postgres.tislabgxitwtcqfwrpik:tfq1azv-zdr%40UJE1uxp@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" -f supabase/migrations/20251230000001_create_statement_imports_table.sql\n');




