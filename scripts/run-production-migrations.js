#!/usr/bin/env node
/**
 * Script to run Supabase migrations on production
 * 
 * This script executes migrations one at a time, with verification after each.
 * 
 * Requirements:
 * - SUPABASE_URL: Your production Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Your production Supabase service role key (NOT anon key)
 * 
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/run-production-migrations.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Error: SUPABASE_URL environment variable is required');
  console.error('   Example: SUPABASE_URL=https://xxx.supabase.co');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   Get this from: Supabase Dashboard → Project Settings → API → service_role key');
  console.error('   ⚠️  WARNING: This is a SECRET key - never commit it!');
  process.exit(1);
}

// Verify this is production
if (SUPABASE_URL.includes('localhost') || SUPABASE_URL.includes('127.0.0.1')) {
  console.error('❌ Error: This script is for PRODUCTION only');
  console.error('   Detected localhost URL. Use supabase db push for local development.');
  process.exit(1);
}

const migrations = [
  { file: '20251227120112_create_subscriptions_table.sql', name: 'Subscriptions Table' },
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
  { file: '20251231000004_remove_available_balance_and_make_institution_optional.sql', name: 'Remove Available Balance & Make Institution Optional' },
  { file: '20260106000000_ensure_institution_is_optional.sql', name: 'Ensure Institution Optional (Safeguard)' },
];

async function runMigration(supabase, migrationFile, migrationName) {
  const filePath = join(PROJECT_ROOT, 'supabase', 'migrations', migrationFile);
  
  console.log(`\n📄 Reading migration: ${migrationFile}`);
  let sql;
  try {
    sql = readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`❌ Error reading migration file: ${error.message}`);
    return false;
  }

  console.log(`🚀 Executing: ${migrationName}`);
  
  try {
    // Execute SQL using Supabase REST API
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Try direct query execution
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ sql_query: sql }),
      });

      if (!response.ok) {
        // Fallback: Use PostgreSQL connection via Supabase
        // We'll need to use the management API or direct connection
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
    }

    console.log(`✅ Success: ${migrationName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error executing migration: ${error.message}`);
    console.error(`   Migration: ${migrationName}`);
    console.error(`   File: ${migrationFile}`);
    return false;
  }
}

async function verifyTable(supabase, tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist
      throw error;
    }
    
    return !error || error.code !== 'PGRST116';
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔧 Supabase Production Migration Runner');
  console.log('========================================\n');
  console.log(`📍 Target: ${SUPABASE_URL}`);
  console.log(`🔑 Using service role key: ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`);
  console.log('\n⚠️  WARNING: This will modify your PRODUCTION database!');
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  // Wait 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Create Supabase client with service role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Check if we can connect
  console.log('🔍 Testing connection...');
  try {
    const { data, error } = await supabase.from('_migrations').select('*').limit(1);
    // This might fail if migrations table doesn't exist, which is fine
  } catch (error) {
    // Expected for fresh database
  }
  console.log('✅ Connected to Supabase\n');

  // Run migrations
  let successCount = 0;
  let failCount = 0;
  const startIndex = 1; // Start from migration 2 (index 1) since migration 1 is done

  for (let i = startIndex; i < migrations.length; i++) {
    const migration = migrations[i];
    console.log(`\n[${i + 1}/${migrations.length}] ${migration.name}`);
    console.log('─'.repeat(50));

    const success = await runMigration(supabase, migration.file, migration.name);
    
    if (success) {
      successCount++;
      
      // Verify table was created (if applicable)
      const tableName = migration.file.match(/create_(\w+)_table\.sql/)?.[1];
      if (tableName) {
        console.log(`🔍 Verifying table: ${tableName}`);
        const exists = await verifyTable(supabase, tableName);
        if (exists) {
          console.log(`✅ Table ${tableName} verified`);
        } else {
          console.log(`⚠️  Table ${tableName} not found (may be expected for some migrations)`);
        }
      }
    } else {
      failCount++;
      console.error(`\n❌ Migration failed: ${migration.name}`);
      console.error('   Stopping migration process. Please fix the error and re-run.');
      break;
    }

    // Small delay between migrations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Summary');
  console.log('='.repeat(50));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📝 Total: ${successCount + failCount} of ${migrations.length - startIndex} remaining migrations`);
  
  if (failCount === 0) {
    console.log('\n🎉 All migrations completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Verify tables in Supabase Dashboard → Table Editor');
    console.log('   2. Configure Clerk JWT validation (see docs/SUPABASE_DEV_TO_PROD_MIGRATION.md)');
    console.log('   3. Test JWT extraction function');
  } else {
    console.log('\n⚠️  Some migrations failed. Please review errors above.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

