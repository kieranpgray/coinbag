#!/usr/bin/env node
/**
 * Check Production Migration Status
 *
 * Uses anon key to verify which migrations have been applied in production.
 * Safe to run - only reads table existence, doesn't modify anything.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Production environment variables (should be set)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Tables to check (from all migrations)
const TABLES_TO_CHECK = [
  'subscriptions', // Original table (will be renamed to expenses)
  'categories',
  'user_preferences',
  'assets',
  'liabilities',
  'accounts',
  'income',
  'goals',
  'transactions',
  'statement_imports',
  'expenses', // Renamed from subscriptions
];

async function checkTableExists(supabase: SupabaseClient, tableName: string): Promise<boolean> {
  try {
    // Try to query the table - if it exists and RLS blocks it, that's success
    const { error } = await supabase.from(tableName).select('id').limit(0);

    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return false; // Table definitely doesn't exist
      } else if (error.message.includes('permission') || error.message.includes('policy') || error.message.includes('RLS')) {
        return true; // Table exists, RLS is blocking (expected)
      }
    }
    return true; // Table exists and accessible
  } catch {
    return false;
  }
}

async function checkStorageBucket(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) return false;
    return buckets?.some(bucket => bucket.name === 'statements') || false;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔍 Production Migration Status Check');
  console.log('=====================================\n');

  if (!SUPABASE_URL) {
    console.error('❌ VITE_SUPABASE_URL environment variable is required');
    console.error('   This should be set for production');
    process.exit(1);
  }

  if (!SUPABASE_ANON_KEY) {
    console.error('❌ VITE_SUPABASE_ANON_KEY environment variable is required');
    console.error('   This should be set for production');
    process.exit(1);
  }

  console.log(`📍 Production URL: ${SUPABASE_URL}`);
  console.log(`🔑 Anon Key: ${SUPABASE_ANON_KEY.substring(0, 30)}...\n`);

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Test basic connection
  console.log('🔍 Testing connection...');
  try {
    // Try a simple query
    const { error } = await supabase.from('assets').select('id').limit(0);
    if (error && !error.message.includes('permission') && !error.message.includes('policy')) {
      console.error('❌ Connection failed:', error.message);
      process.exit(1);
    }
    console.log('✅ Connected to production database\n');
  } catch (error) {
    console.error('❌ Failed to connect:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Check all tables
  console.log('📋 Checking required tables...\n');

  const results = [];
  for (const tableName of TABLES_TO_CHECK) {
    const exists = await checkTableExists(supabase, tableName);
    results.push({ table: tableName, exists });

    if (exists) {
      console.log(`✅ ${tableName}`);
    } else {
      console.log(`❌ ${tableName} - MISSING`);
    }
  }

  // Check storage bucket
  console.log('\n📋 Checking storage bucket...');
  const bucketExists = await checkStorageBucket(supabase);
  if (bucketExists) {
    console.log('✅ statements bucket');
  } else {
    console.log('❌ statements bucket - MISSING');
  }

  // Summary
  const missingTables = results.filter(r => !r.exists).map(r => r.table);
  const existingTables = results.filter(r => r.exists).map(r => r.table);

  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Status Summary');
  console.log('='.repeat(50));

  if (missingTables.length === 0 && bucketExists) {
    console.log('🎉 ALL MIGRATIONS APPLIED!');
    console.log('✅ All required tables exist');
    console.log('✅ Storage bucket exists');
    console.log('\n🚀 Production is ready for deployment!');
  } else {
    console.log(`✅ Tables present: ${existingTables.length}/${TABLES_TO_CHECK.length}`);
    console.log(`❌ Tables missing: ${missingTables.length}`);

    if (missingTables.length > 0) {
      console.log('\n📝 Missing tables:');
      missingTables.forEach(table => console.log(`   - ${table}`));
    }

    if (!bucketExists) {
      console.log('\n📝 Missing storage:');
      console.log('   - statements bucket');
    }

    console.log('\n⚠️  Production requires migrations to be applied first.');
    console.log('   Run: npx tsx scripts/validate-and-run-migrations.ts');
    console.log('   (Requires SUPABASE_SERVICE_ROLE_KEY environment variable)');

    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
