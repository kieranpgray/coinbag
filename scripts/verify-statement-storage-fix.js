#!/usr/bin/env node
/**
 * Verify Statement Storage RLS Policies Fix
 * 
 * This script verifies that:
 * 1. The statements bucket exists
 * 2. The RLS policies are correctly configured with split_part()
 * 3. The policies allow the correct path structure
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyBucket() {
  console.log('🔍 Checking if statements bucket exists...');
  
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('❌ Failed to list buckets:', error.message);
    return false;
  }
  
  const statementsBucket = buckets?.find(bucket => bucket.id === 'statements' || bucket.name === 'statements');
  
  if (!statementsBucket) {
    console.error('❌ Statements bucket not found!');
    console.log('   Available buckets:', buckets?.map(b => b.id).join(', ') || 'none');
    return false;
  }
  
  console.log('✅ Statements bucket exists');
  console.log(`   ID: ${statementsBucket.id}`);
  console.log(`   Name: ${statementsBucket.name}`);
  console.log(`   Public: ${statementsBucket.public}`);
  console.log(`   File Size Limit: ${statementsBucket.file_size_limit ? `${statementsBucket.file_size_limit / 1024 / 1024}MB` : 'Unlimited'}`);
  console.log(`   Allowed MIME Types: ${statementsBucket.allowed_mime_types?.join(', ') || 'All'}`);
  console.log('');
  
  return true;
}

async function verifyPolicies() {
  console.log('🔍 Checking RLS policies...');
  
  // Query policies directly from PostgreSQL
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        policyname,
        cmd,
        CASE 
          WHEN pg_get_expr(polqual, polrelid) LIKE '%split_part%' THEN '✅ Correct (split_part)'
          WHEN pg_get_expr(polqual, polrelid) LIKE '%storage.foldername%' THEN '❌ Wrong (storage.foldername)'
          WHEN pg_get_expr(polqual, polrelid) IS NULL THEN '⚠️ No USING clause'
          ELSE '⚠️ Unknown syntax'
        END as syntax_check,
        pg_get_expr(polqual, polrelid) as using_clause,
        pg_get_expr(polwithcheck, polrelid) as with_check_clause
      FROM pg_policies 
      WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname LIKE '%statement%'
      ORDER BY cmd;
    `
  });
  
  // If RPC doesn't work, try direct query (requires service role)
  if (error) {
    console.log('   Note: Cannot query policies directly via RPC');
    console.log('   Please verify in Supabase Dashboard → Storage → Policies');
    console.log('   Look for policies with names containing "statement"');
    console.log('   They should use: split_part(name, \'/\', 1)');
    console.log('');
    return null;
  }
  
  if (!data || data.length === 0) {
    console.error('❌ No statement storage policies found!');
    return false;
  }
  
  console.log(`✅ Found ${data.length} statement storage policies:`);
  console.log('');
  
  let allCorrect = true;
  for (const policy of data) {
    const status = policy.syntax_check.includes('✅') ? '✅' : '❌';
    console.log(`${status} ${policy.policyname} (${policy.cmd})`);
    console.log(`   Syntax: ${policy.syntax_check}`);
    if (policy.using_clause) {
      console.log(`   USING: ${policy.using_clause.substring(0, 100)}...`);
    }
    if (policy.with_check_clause) {
      console.log(`   WITH CHECK: ${policy.with_check_clause.substring(0, 100)}...`);
    }
    console.log('');
    
    if (!policy.syntax_check.includes('✅')) {
      allCorrect = false;
    }
  }
  
  return allCorrect;
}

async function main() {
  console.log('🔍 Verifying Statement Storage RLS Fix');
  console.log('=====================================\n');
  
  const bucketExists = await verifyBucket();
  if (!bucketExists) {
    console.error('\n❌ Bucket verification failed. Please create the bucket first.');
    console.error('   Run: supabase/migrations/20251230000005_create_statement_storage_bucket.sql');
    process.exit(1);
  }
  
  const policiesCorrect = await verifyPolicies();
  
  if (policiesCorrect === false) {
    console.error('\n❌ Policy verification failed. Please run the fix migration.');
    console.error('   Run: scripts/run-fix-statement-storage-rls.sh');
    process.exit(1);
  }
  
  if (policiesCorrect === null) {
    console.log('\n⚠️  Could not verify policies automatically.');
    console.log('   Please verify manually in Supabase Dashboard → Storage → Policies');
  } else {
    console.log('✅ All policies are correctly configured!\n');
  }
  
  console.log('📋 Next steps:');
  console.log('   1. Test file upload in the application');
  console.log('   2. Verify files are uploaded to: {userId}/{accountId}/{filename}');
  console.log('   3. Check that users can only access their own files\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});




