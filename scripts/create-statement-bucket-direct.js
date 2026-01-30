#!/usr/bin/env node
/**
 * Create statements storage bucket directly using Supabase service role key
 * This bypasses migration conflicts by executing just the bucket creation SQL
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Dev project configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tislabgxitwtcqfwrpik.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpc2xhYmd4aXR3dGNxZndycGlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgxNDg4OCwiZXhwIjoyMDgyMzkwODg4fQ.A2zMZJe64TitBka8fV0d2mef3qtVdc_OI5s0TlASzQI';

console.log('🔧 Creating Statements Storage Bucket');
console.log('=====================================\n');
console.log(`📍 Target: ${SUPABASE_URL}\n`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkBucketExists() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error('❌ Error checking buckets:', error.message);
      return false;
    }
    return buckets?.some(bucket => bucket.id === 'statements' || bucket.name === 'statements') || false;
  } catch (error) {
    console.error('❌ Error checking buckets:', error);
    return false;
  }
}

async function createBucketViaRPC() {
  // Supabase doesn't expose direct SQL execution via REST API
  // We need to use the Management API or direct PostgreSQL connection
  // For now, let's try using the REST API to insert into storage.buckets
  
  console.log('📋 Attempting to create bucket via REST API...\n');
  
  // Try to insert bucket directly (this might work with service role)
  // Note: This requires direct database access which service role provides
  // But storage.buckets might not be accessible via REST API
  
  // Alternative: Use Supabase Dashboard SQL Editor or psql
  console.log('⚠️  Direct bucket creation via REST API is not supported.');
  console.log('   Storage buckets must be created via SQL.\n');
  console.log('📋 Please run the following SQL in Supabase Dashboard → SQL Editor:\n');
  
  const migrationFile = join(PROJECT_ROOT, 'supabase', 'migrations', '20251230000005_create_statement_storage_bucket.sql');
  const sql = readFileSync(migrationFile, 'utf-8');
  
  console.log('```sql');
  console.log(sql);
  console.log('```\n');
  
  return false;
}

async function main() {
  // Check if bucket already exists
  console.log('🔍 Checking if bucket exists...');
  const exists = await checkBucketExists();
  
  if (exists) {
    console.log('✅ Statements bucket already exists!\n');
    console.log('📋 Verifying RLS policies...');
    
    // Check policies (we can't easily verify this via REST API)
    console.log('   Policies should be created with the bucket.');
    console.log('   Verify in Supabase Dashboard → Storage → Policies\n');
    return;
  }
  
  console.log('❌ Bucket does not exist. Creating...\n');
  
  // Try to create via RPC (will show SQL if not possible)
  const created = await createBucketViaRPC();
  
  if (!created) {
    console.log('💡 To create the bucket:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/tislabgxitwtcqfwrpik/sql/new');
    console.log('   2. Copy the SQL above');
    console.log('   3. Execute it\n');
    console.log('   Or use psql:');
    console.log('   psql "postgresql://postgres.tislabgxitwtcqfwrpik:tfq1azv-zdr@UJE1uxp@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" -f supabase/migrations/20251230000005_create_statement_storage_bucket.sql\n');
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

