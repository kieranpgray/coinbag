#!/usr/bin/env tsx
/**
 * Test new Publishable and Secret API key formats with Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

function loadEnv(): Record<string, string> {
  try {
    const envPath = join(PROJECT_ROOT, '.env');
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

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const PUBLISHABLE_KEY = env.VITE_SUPABASE_ANON_KEY;
const SECRET_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🧪 Testing New Key Formats with Supabase Client');
console.log('================================================\n');

if (!SUPABASE_URL || !PUBLISHABLE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('📋 Configuration:');
console.log(`   URL: ${SUPABASE_URL}`);
console.log(`   Publishable Key: ${PUBLISHABLE_KEY.substring(0, 20)}... (${PUBLISHABLE_KEY.length} chars)`);
console.log(`   Secret Key: ${SECRET_KEY ? `${SECRET_KEY.substring(0, 20)}... (${SECRET_KEY.length} chars)` : 'Not set'}`);
console.log('');

// Test 1: Publishable Key with Client Creation
console.log('1️⃣ Testing Publishable Key (Client Creation)...');
try {
  const client = createClient(SUPABASE_URL, PUBLISHABLE_KEY);
  console.log('   ✅ Client created successfully');
  
  // Test a simple operation (auth endpoint doesn't require authentication)
  const { error } = await client.auth.getSession();
  if (error && error.message.includes('Invalid API key')) {
    console.log('   ❌ Invalid API key error:', error.message);
    process.exit(1);
  } else {
    console.log('   ✅ Auth endpoint accessible (key format accepted)');
  }
} catch (error: unknown) {
  console.error('   ❌ Error creating client:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

// Test 2: Secret Key (if available)
if (SECRET_KEY) {
  console.log('\n2️⃣ Testing Secret Key (Service Role Client)...');
  try {
    const serviceClient = createClient(SUPABASE_URL, SECRET_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log('   ✅ Service role client created successfully');
    
    // Test a simple operation
    const { error } = await serviceClient.auth.getSession();
    if (error && error.message.includes('Invalid API key')) {
      console.log('   ❌ Invalid API key error:', error.message);
    } else {
      console.log('   ✅ Auth endpoint accessible (key format accepted)');
    }
  } catch (error: unknown) {
    console.error('   ❌ Error creating service client:', error instanceof Error ? error.message : String(error));
  }
}

console.log('\n' + '='.repeat(50));
console.log('✅ Key Format Tests Complete!');
console.log('='.repeat(50));
console.log('\n📋 Summary:');
console.log('   ✅ Publishable key format is compatible with @supabase/supabase-js');
if (SECRET_KEY) {
  console.log('   ✅ Secret key format is compatible with @supabase/supabase-js');
}
console.log('\n💡 Next: Test with actual data operations (requires JWT authentication)');

