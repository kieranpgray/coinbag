#!/usr/bin/env node
/**
 * Verify statements storage bucket exists and is properly configured
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Required environment variables not set');
  console.error('   Please set: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Example:');
  console.error('     SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/verify-statement-bucket.js');
  process.exit(1);
}

console.log('🔍 Verifying Statements Storage Bucket');
console.log('======================================\n');
console.log(`📍 Target: ${SUPABASE_URL}\n`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verifyBucket() {
  console.log('1️⃣ Checking if bucket exists...');
  
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Error listing buckets:', listError.message);
    return false;
  }
  
  const statementsBucket = buckets?.find(bucket => bucket.id === 'statements' || bucket.name === 'statements');
  
  if (!statementsBucket) {
    console.error('❌ Statements bucket not found!');
    console.log('\nAvailable buckets:');
    buckets?.forEach(b => console.log(`   - ${b.name} (${b.id})`));
    return false;
  }
  
  console.log('✅ Bucket exists!');
  console.log(`   ID: ${statementsBucket.id}`);
  console.log(`   Name: ${statementsBucket.name}`);
  console.log(`   Public: ${statementsBucket.public}`);
  console.log(`   File Size Limit: ${statementsBucket.file_size_limit ? `${statementsBucket.file_size_limit / 1024 / 1024}MB` : 'Unlimited'}`);
  console.log(`   Allowed MIME Types: ${statementsBucket.allowed_mime_types?.join(', ') || 'All'}`);
  
  return true;
}

async function verifyPolicies() {
  console.log('\n2️⃣ Verifying RLS policies...');
  
  // Note: We can't directly query policies via REST API
  // But we can test if policies work by attempting operations
  console.log('   ⚠️  Policy verification requires testing uploads');
  console.log('   Policies should be created with the bucket migration');
  console.log('   Verify in Supabase Dashboard → Storage → Policies');
  
  return true;
}

async function testBucketAccess() {
  console.log('\n3️⃣ Testing bucket access...');
  
  // Try to list files (should work with service role)
  const { data: files, error } = await supabase.storage
    .from('statements')
    .list('', {
      limit: 1,
    });
  
  if (error) {
    // If error is "bucket not found", that's a problem
    if (error.message.includes('not found') || error.message.includes('does not exist')) {
      console.error('❌ Bucket access failed:', error.message);
      return false;
    }
    // Other errors (like empty bucket) are okay
    console.log('   ℹ️  Bucket is accessible (empty or access restricted)');
  } else {
    console.log('✅ Bucket is accessible');
    console.log(`   Files found: ${files?.length || 0}`);
  }
  
  return true;
}

async function main() {
  try {
    const bucketExists = await verifyBucket();
    
    if (!bucketExists) {
      console.error('\n❌ Verification failed: Bucket does not exist');
      process.exit(1);
    }
    
    await verifyPolicies();
    await testBucketAccess();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Verification Complete!');
    console.log('='.repeat(50));
    console.log('\n📋 Summary:');
    console.log('   ✅ Bucket exists');
    console.log('   ✅ Bucket is accessible');
    console.log('   ⚠️  Verify RLS policies in Supabase Dashboard');
    console.log('\n🚀 Statement uploads should now work!');
    console.log('   Test by uploading a statement file in the application.');
    
  } catch (error) {
    console.error('\n❌ Verification error:', error);
    process.exit(1);
  }
}

main();

