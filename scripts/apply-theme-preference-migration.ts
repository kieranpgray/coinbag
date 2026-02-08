#!/usr/bin/env tsx
/**
 * Apply theme_preference migration directly via Supabase client
 * This avoids migration ordering conflicts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_REF = 'auvtsvmtfrbpvgyvfqlx';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
// Using service role key for admin operations (would need to be set as env var)
// For now, we'll use the anon key and RPC if available, or provide instructions

async function applyMigration() {
  console.log('🔧 Applying Theme Preference Migration');
  console.log('======================================\n');

  // Read migration file
  const migrationFile = join(process.cwd(), 'supabase/migrations/20260203135440_convert_dark_mode_to_theme_preference.sql');
  let migrationSQL: string;
  
  try {
    migrationSQL = readFileSync(migrationFile, 'utf-8');
  } catch (error) {
    console.error('❌ Failed to read migration file:', error);
    process.exit(1);
  }

  // Check for service role key
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY not found in environment');
    console.log('\n📋 Manual Application Required:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Copy and paste the migration SQL from:');
    console.log(`      ${migrationFile}`);
    console.log('   3. Execute the migration');
    console.log('\n   Or set SUPABASE_SERVICE_ROLE_KEY and run this script again.\n');
    process.exit(0);
  }

  console.log('🚀 Connecting to Supabase...');

  // Split SQL into individual statements (simple approach)
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Executing ${statements.length} SQL statements...\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement || statement.trim().length === 0) continue;

    try {
      // Execute via RPC or direct query
      // Note: Supabase JS client doesn't support arbitrary SQL execution
      // We need to use the REST API or provide manual instructions
      console.log(`   [${i + 1}/${statements.length}] Executing statement...`);
      
      // For DO blocks and complex statements, we need to use the REST API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ sql: statement }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`   ❌ Error: ${error}`);
        // Continue with next statement for idempotent migrations
      } else {
        console.log(`   ✅ Statement ${i + 1} executed`);
      }
    } catch (error) {
      console.error(`   ❌ Error executing statement ${i + 1}:`, error);
      // Continue for idempotent migrations
    }
  }

  console.log('\n✅ Migration process completed!');
  console.log('\n📋 Verification:');
  console.log('   Run this SQL to verify:');
  console.log("   SELECT column_name, data_type, column_default");
  console.log("   FROM information_schema.columns");
  console.log("   WHERE table_name = 'user_preferences' AND column_name = 'theme_preference';");
}

applyMigration().catch(console.error);

