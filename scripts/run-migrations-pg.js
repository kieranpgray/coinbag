#!/usr/bin/env node
/**
 * Execute Supabase migrations using direct PostgreSQL connection
 * 
 * Requirements:
 * - SUPABASE_DB_PASSWORD: Database password from Supabase Dashboard
 * - PROJECT_REF: Supabase project reference (default: auvtsvmtfrbpvgyvfqlx)
 * 
 * Usage:
 *   SUPABASE_DB_PASSWORD=xxx node scripts/run-migrations-pg.js
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const PROJECT_REF = process.env.PROJECT_REF || 'auvtsvmtfrbpvgyvfqlx';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!DB_PASSWORD) {
  console.error('❌ Error: SUPABASE_DB_PASSWORD environment variable is required');
  console.error('');
  console.error('To get your database password:');
  console.error('  1. Go to Supabase Dashboard → Project Settings → Database');
  console.error('  2. Copy the database password (or reset it)');
  console.error('  3. Run: export SUPABASE_DB_PASSWORD="your-password-here"');
  console.error('');
  console.error('Then run this script again.');
  process.exit(1);
}

// Try connection pooling port first (more reliable)
const DB_CONFIG = {
  host: `db.${PROJECT_REF}.supabase.co`,
  port: 6543, // Connection pooling port (more reliable than direct 5432)
  database: 'postgres',
  user: 'postgres',
  password: DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false, // Supabase uses self-signed certificates
  },
};

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

async function runMigration(client, migrationFile, migrationName, migrationNum) {
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
    await client.query(sql);
    console.log(`✅ Success: ${migrationName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error executing migration:`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    if (error.position) {
      console.error(`   Position: ${error.position}`);
    }
    console.error(`\n   Migration: ${migrationName}`);
    console.error(`   File: ${migrationFile}`);
    return false;
  }
}

async function verifyTable(client, tableName) {
  try {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [tableName]);
    return result.rows[0].exists;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔧 Supabase Production Migration Runner (PostgreSQL)');
  console.log('====================================================\n');
  console.log(`📍 Project: ${PROJECT_REF}`);
  console.log(`🔗 Host: ${DB_CONFIG.host}`);
  console.log(`📊 Database: ${DB_CONFIG.database}`);
  console.log('');

  const client = new Client(DB_CONFIG);

  try {
    console.log('🔍 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Run migrations
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      const migrationNum = i + 2; // Start from 2 since migration 1 is done

      const success = await runMigration(client, migration.file, migration.name, migrationNum);

      if (success) {
        successCount++;

        // Verify table was created (if applicable)
        const tableName = migration.file.match(/create_(\w+)_table\.sql/)?.[1];
        if (tableName) {
          const exists = await verifyTable(client, tableName);
          if (exists) {
            console.log(`   ✅ Verified table: ${tableName}`);
          }
        }
      } else {
        failCount++;
        console.error(`\n❌ Migration failed. Stopping execution.`);
        break;
      }

      // Small delay between migrations
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📝 Total: ${successCount + failCount} of ${migrations.length} migrations`);

    if (failCount === 0) {
      console.log('\n🎉 All migrations completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('   1. Verify tables in Supabase Dashboard → Table Editor');
      console.log('   2. Configure Clerk JWT validation');
      console.log('   3. Test JWT extraction function');
    } else {
      console.log('\n⚠️  Some migrations failed. Please review errors above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    if (error.code === '28P01') {
      console.error('   Authentication failed. Check your database password.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused. Check your project reference and network.');
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Disconnected from database');
  }
}

main().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});

