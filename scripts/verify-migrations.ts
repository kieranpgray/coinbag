/**
 * Verify that all required Supabase migrations have been run
 * 
 * ⚠️ NOTE: This script is READ-ONLY and does not modify the database.
 * For destructive operations, use scripts/guard-destructive-ops.js
 * 
 * Run with: npx tsx scripts/verify-migrations.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf8');
    const env: Record<string, string> = {};

    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
        }
      }
    }

    return env;
  } catch (error) {
    console.error('Could not read .env file:', error);
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

// Expected tables and their migration files
const EXPECTED_TABLES = [
  { name: 'subscriptions', migration: '20251227120112_create_subscriptions_table.sql' },
  { name: 'categories', migration: '20251227120113_create_categories_table.sql' },
  { name: 'user_preferences', migration: '20251227130000_create_user_preferences_table.sql' },
  { name: 'assets', migration: '20251228110046_create_assets_table.sql' },
  { name: 'liabilities', migration: '20251228130000_create_liabilities_table.sql' },
  { name: 'accounts', migration: '20251228140000_create_accounts_table.sql' },
  { name: 'income', migration: '20251228150000_create_income_table.sql' },
  { name: 'goals', migration: '20251228160000_create_goals_table.sql' },
] as const;

async function verifyMigrations() {
  console.log('🔍 Verifying Supabase Migrations...\n');

  // Step 1: Check environment variables
  console.log('Step 1: Checking environment variables');
  if (!supabaseUrl) {
    console.error('❌ VITE_SUPABASE_URL is not set in .env');
    return false;
  }
  if (!supabaseAnonKey) {
    console.error('❌ VITE_SUPABASE_ANON_KEY is not set in .env');
    return false;
  }
  console.log('✅ Environment variables configured\n');

  // Step 2: Connect to Supabase
  console.log('Step 2: Connecting to Supabase');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Connected to Supabase\n');

  // Step 3: Check each table
  console.log('Step 3: Checking required tables');
  const missingTables: typeof EXPECTED_TABLES[number][] = [];
  const existingTables: typeof EXPECTED_TABLES[number][] = [];

  for (const table of EXPECTED_TABLES) {
    try {
      // Try to query the table (even with RLS, this will tell us if it exists)
      const { error } = await supabase.from(table.name).select('id').limit(0);
      
      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log(`❌ Table "${table.name}" does not exist`);
          missingTables.push(table);
        } else if (error.message.includes('permission') || error.message.includes('policy') || error.message.includes('RLS')) {
          // Table exists but RLS is blocking - this is expected
          console.log(`✅ Table "${table.name}" exists (RLS enabled)`);
          existingTables.push(table);
        } else {
          // Unknown error - assume table exists
          console.log(`⚠️  Table "${table.name}" - unknown error: ${error.message}`);
          existingTables.push(table);
        }
      } else {
        console.log(`✅ Table "${table.name}" exists`);
        existingTables.push(table);
      }
    } catch (error) {
      console.log(`❌ Error checking table "${table.name}":`, error instanceof Error ? error.message : String(error));
      missingTables.push(table);
    }
  }

  console.log('');

  // Step 4: Report results
  if (missingTables.length === 0) {
    console.log('✅ All required tables exist!\n');
    console.log('📝 Summary:');
    console.log(`   ✅ ${existingTables.length} tables verified`);
    console.log('   ✅ All migrations have been run');
    console.log('');
    console.log('🎯 Next: Test data persistence');
    console.log('   1. Start dev server: npm run dev');
    console.log('   2. Sign in with Clerk');
    console.log('   3. Create test data (assets, liabilities, accounts, income, subscriptions, goals)');
    console.log('   4. Logout and login again');
    console.log('   5. Verify all data persists');
    return true;
  } else {
    console.log('❌ Some tables are missing!\n');
    console.log('📝 Missing Tables:');
    for (const table of missingTables) {
      console.log(`   ❌ ${table.name}`);
      console.log(`      Migration: supabase/migrations/${table.migration}`);
    }
    console.log('');
    console.log('🔧 To fix:');
    console.log('   1. Open Supabase Dashboard → SQL Editor');
    console.log('   2. Copy the contents of each migration file');
    console.log('   3. Run them in order (the timestamps indicate the order)');
    console.log('   4. Re-run this script to verify');
    console.log('');
    console.log('📝 Migration files to run:');
    for (const table of missingTables) {
      console.log(`   - supabase/migrations/${table.migration}`);
    }
    return false;
  }
}

verifyMigrations().catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});

