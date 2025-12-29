#!/usr/bin/env node
/**
 * Execute Supabase migrations using Supabase REST API
 * Creates a helper function to execute SQL, then runs migrations
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://auvtsvmtfrbpvgyvfqlx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_DB_PASSWORD) {
  console.error('❌ Error: Either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_DB_PASSWORD is required');
  console.error('');
  console.error('Option 1: Service Role Key (Recommended)');
  console.error('  Get from: Supabase Dashboard → Project Settings → API → service_role key');
  console.error('  Run: export SUPABASE_SERVICE_ROLE_KEY="your-key-here"');
  console.error('');
  console.error('Option 2: Database Password');
  console.error('  Get from: Supabase Dashboard → Project Settings → Database');
  console.error('  Run: export SUPABASE_DB_PASSWORD="your-password-here"');
  process.exit(1);
}

const migrations = [
  { file: '20251227120113_create_categories_table.sql', name: 'Categories Table' },
  { file: '20251227120114_fix_subscriptions_user_id_type.sql', name: 'Fix Subscriptions User ID Type' },
  { file: '20251227130000_create_user_preferences_table.sql', name: 'User Preferences Table' },
  { file: '20251228110046_create_assets_table.sql', name: 'Assets Table' },
  { file: '20251228120000_add_cash_asset_type.sql', name: 'Add Cash Asset Type' },
  { file: '20251228130000_create_liabilities_table.sql', name: 'Liabilities Table' },
  { file: '20251228140000_create_accounts_table.sql', name: 'Accounts Table' },
  { file: '20251228150000_create_income_table.sql', name: 'Income Table' },
  { file: '20251228160000_create_goals_table.sql', name: 'Goals Table' },
  { file: '20251228170000_test_jwt_extraction_function.sql', name: 'JWT Extraction Test Function' },
  { file: '20251228180000_data_recovery_fix_user_ids.sql', name: 'Data Recovery Fix' },
];

async function executeSQLViaAPI(supabase, sql) {
  // Supabase doesn't allow direct SQL execution via REST API for security
  // We need to use the Management API or create a helper function
  // For now, let's try using the Supabase JS client's RPC method
  
  // Actually, we can't execute arbitrary SQL via Supabase REST API
  // We need to either:
  // 1. Use direct PostgreSQL connection (requires password)
  // 2. Use Supabase Management API (requires access token)
  // 3. Create helper functions for each migration type
  
  // Let's try using fetch to the Management API
  // But Management API requires different authentication
  
  throw new Error('Direct SQL execution via Supabase REST API is not supported. Use PostgreSQL connection or Supabase CLI.');
}

async function runMigration(supabase, migrationFile, migrationName, migrationNum) {
  const filePath = join(PROJECT_ROOT, 'supabase', 'migrations', migrationFile);
  
  console.log(`\n[${migrationNum}/11] ${migrationName}`);
  console.log('─'.repeat(60));
  console.log(`📄 Reading: ${migrationFile}`);
  
  let sql;
  try {
    sql = readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`❌ Error reading migration file: ${error.message}`);
    return false;
  }

  console.log(`🚀 Executing SQL (${sql.length} characters)...`);
  
  try {
    await executeSQLViaAPI(supabase, sql);
    console.log(`✅ Success: ${migrationName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔧 Supabase Migration Runner (REST API)');
  console.log('========================================\n');
  console.log(`📍 URL: ${SUPABASE_URL}`);
  
  if (SUPABASE_SERVICE_ROLE_KEY) {
    console.log(`🔑 Using service role key`);
  } else {
    console.log(`🔑 Using database password`);
  }
  console.log('');

  // Note: Supabase REST API doesn't support arbitrary SQL execution
  // We need to use direct PostgreSQL connection or Supabase CLI
  console.log('⚠️  Supabase REST API does not support direct SQL execution.');
  console.log('   Please use one of the following methods:');
  console.log('');
  console.log('   1. Use Supabase Dashboard SQL Editor (manual)');
  console.log('   2. Use PostgreSQL connection (requires password)');
  console.log('   3. Use Supabase CLI (requires access token)');
  console.log('');
  console.log('See docs/MIGRATION_EXECUTION_STATUS.md for details.');
  
  process.exit(1);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

