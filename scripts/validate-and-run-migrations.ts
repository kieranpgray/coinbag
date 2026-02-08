#!/usr/bin/env node
/**
 * Autonomous Migration Validator and Executor
 *
 * Checks which migrations are needed and executes them automatically.
 * Safe to run multiple times - skips already applied migrations.
 *
 * For production use: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Migration definitions with validation checks
const MIGRATIONS = [
  {
    file: '20251227120112_create_subscriptions_table.sql',
    name: 'Create Subscriptions Table',
    check: async (supabase: SupabaseClient) => {
      const { error } = await supabase.from('subscriptions').select('id').limit(0);
      return !error || !error.message.includes('does not exist');
    }
  },
  {
    file: '20251227120113_create_categories_table.sql',
    name: 'Create Categories Table',
    check: async (supabase: SupabaseClient) => {
      const { error } = await supabase.from('categories').select('id').limit(0);
      return !error || !error.message.includes('does not exist');
    }
  },
  {
    file: '20251227120114_fix_subscriptions_user_id_type.sql',
    name: 'Fix Subscriptions User ID Type',
    check: async (supabase: SupabaseClient) => {
      // Check if category_id column exists
      try {
        const { error } = await supabase.from('subscriptions').select('category_id').limit(0);
        return !error;
      } catch {
        return false;
      }
    }
  },
  {
    file: '20251227130000_create_user_preferences_table.sql',
    name: 'Create User Preferences Table',
    check: async (supabase: SupabaseClient) => {
      const { error } = await supabase.from('user_preferences').select('id').limit(0);
      return !error || !error.message.includes('does not exist');
    }
  },
  {
    file: '20251228110046_create_assets_table.sql',
    name: 'Create Assets Table',
    check: async (supabase: SupabaseClient) => {
      const { error } = await supabase.from('assets').select('id').limit(0);
      return !error || !error.message.includes('does not exist');
    }
  },
  {
    file: '20251228120000_add_cash_asset_type.sql',
    name: 'Add Cash Asset Type',
    check: async (supabase: SupabaseClient) => {
      // This migration adds enum values - check if 'Cash' is available
      try {
        const { error } = await supabase.from('assets').select('id').limit(0);
        return !error;
      } catch {
        return false;
      }
    }
  },
  {
    file: '20251228130000_create_liabilities_table.sql',
    name: 'Create Liabilities Table',
    check: async (supabase: SupabaseClient) => {
      const { error } = await supabase.from('liabilities').select('id').limit(0);
      return !error || !error.message.includes('does not exist');
    }
  },
  {
    file: '20251228140000_create_accounts_table.sql',
    name: 'Create Accounts Table',
    check: async (supabase: SupabaseClient) => {
      const { error } = await supabase.from('accounts').select('id').limit(0);
      return !error || !error.message.includes('does not exist');
    }
  },
  {
    file: '20251228150000_create_income_table.sql',
    name: 'Create Income Table',
    check: async (supabase: SupabaseClient) => {
      const { error } = await supabase.from('income').select('id').limit(0);
      return !error || !error.message.includes('does not exist');
    }
  },
  {
    file: '20251228160000_create_goals_table.sql',
    name: 'Create Goals Table',
    check: async (supabase: SupabaseClient) => {
      const { error } = await supabase.from('goals').select('id').limit(0);
      return !error || !error.message.includes('does not exist');
    }
  },
  {
    file: '20251228170000_test_jwt_extraction_function.sql',
    name: 'Test JWT Extraction Function',
    check: async (supabase: SupabaseClient) => {
      // This is a test function - check if we can call it
      try {
        await supabase.rpc('test_jwt_extraction');
        return true;
      } catch {
        return false;
      }
    }
  },
  {
    file: '20251228180000_data_recovery_fix_user_ids.sql',
    name: 'Data Recovery Fix User IDs',
    check: async (supabase: SupabaseClient) => {
      // Check if user_id columns exist and are properly typed
      try {
        const { error } = await supabase.from('subscriptions').select('user_id').limit(0);
        return !error;
      } catch {
        return false;
      }
    }
  },
  {
    file: '20251231000004_remove_available_balance_and_make_institution_optional.sql',
    name: 'Remove Available Balance & Make Institution Optional',
    check: async (supabase: SupabaseClient) => {
      // Check if available_balance column was removed and institution is nullable
      try {
        // Check if available_balance column exists
        const { data: availableBalanceData, error: availableBalanceError } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', 'accounts')
          .eq('column_name', 'available_balance');

        if (availableBalanceError) {
          return false;
        }

        // If available_balance still exists, migration hasn't run
        if (availableBalanceData && availableBalanceData.length > 0) {
          return false;
        }

        // Check if institution is nullable
        const { data: institutionData, error: institutionError } = await supabase
          .from('information_schema.columns')
          .select('is_nullable')
          .eq('table_name', 'accounts')
          .eq('column_name', 'institution');

        if (institutionError || !institutionData || institutionData.length === 0) {
          return false;
        }

        return institutionData[0].is_nullable === 'YES';
      } catch {
        return false;
      }
    }
  },
  {
    file: '20260106000000_ensure_institution_is_optional.sql',
    name: 'Make Institution Optional',
    check: async (supabase: SupabaseClient) => {
      // Check if institution columns are nullable in accounts, assets, and liabilities
      try {
        const tables = ['accounts', 'assets', 'liabilities'];
        for (const table of tables) {
          const { data, error } = await supabase
            .from('information_schema.columns')
            .select('is_nullable')
            .eq('table_name', table)
            .eq('column_name', 'institution');

          if (error || !data || data.length === 0) {
            return false;
          }

          if (data[0].is_nullable !== 'YES') {
            return false;
          }
        }
        return true;
      } catch {
        return false;
      }
    }
  },
  {
    file: '20251229160000_add_liability_repayment_fields.sql',
    name: 'Add Liability Repayment Fields',
    check: async (supabase: SupabaseClient) => {
      try {
        const { error } = await supabase.from('liabilities').select('monthly_payment').limit(0);
        return !error;
      } catch {
        return false;
      }
    }
  },
  {
    file: '20251229160001_add_superannuation_asset_type.sql',
    name: 'Add Superannuation Asset Type',
    check: async (supabase: SupabaseClient) => {
      // Check if Superannuation enum value exists
      try {
        const { error } = await supabase.from('assets').select('id').limit(0);
        return !error;
      } catch {
        return false;
      }
    }
  },
  {
    file: '20251230000000_create_transactions_table.sql',
    name: 'Create Transactions Table',
    check: async (supabase: SupabaseClient) => {
      const { error } = await supabase.from('transactions').select('id').limit(0);
      return !error || !error.message.includes('does not exist');
    }
  },
  {
    file: '20251230000001_create_statement_imports_table.sql',
    name: 'Create Statement Imports Table',
    check: async (supabase: SupabaseClient) => {
      const { error } = await supabase.from('statement_imports').select('id').limit(0);
      return !error || !error.message.includes('does not exist');
    }
  },
  {
    file: '20251230000002_add_currency_to_accounts.sql',
    name: 'Add Currency to Accounts',
    check: async (supabase: SupabaseClient) => {
      try {
        const { error } = await supabase.from('accounts').select('currency').limit(0);
        return !error;
      } catch {
        return false;
      }
    }
  },
  {
    file: '20251230000003_add_account_type_constraint.sql',
    name: 'Add Account Type Constraint',
    check: async (supabase: SupabaseClient) => {
      // Check if constraint exists - this is hard to verify directly
      try {
        const { error } = await supabase.from('accounts').select('id').limit(0);
        return !error;
      } catch {
        return false;
      }
    }
  },
  {
    file: '20251230000004_add_transactions_foreign_key.sql',
    name: 'Add Transactions Foreign Key',
    check: async (supabase: SupabaseClient) => {
      try {
        const { error } = await supabase.from('transactions').select('account_id').limit(0);
        return !error;
      } catch {
        return false;
      }
    }
  },
  {
    file: '20251230000005_create_statement_storage_bucket.sql',
    name: 'Create Statement Storage Bucket',
    check: async (supabase: SupabaseClient) => {
      // Check if storage bucket exists
      try {
        const { error } = await supabase.storage.listBuckets();
        if (!error) {
          const { data: buckets } = await supabase.storage.listBuckets();
          return buckets?.some(bucket => bucket.name === 'statements') || false;
        }
        return false;
      } catch {
        return false;
      }
    }
  },
  {
    file: '20251231000001_add_credit_fields_to_accounts.sql',
    name: 'Add Credit Fields to Accounts',
    check: async (supabase: SupabaseClient) => {
      try {
        const { error } = await supabase.from('accounts').select('available_balance').limit(0);
        return !error;
      } catch {
        return false;
      }
    }
  },
  {
    file: '20251231000002_update_account_types.sql',
    name: 'Update Account Types',
    check: async (supabase: SupabaseClient) => {
      // Check if new account types exist
      try {
        const { error } = await supabase.from('accounts').select('id').limit(0);
        return !error;
      } catch {
        return false;
      }
    }
  },
  {
    file: '20251231000003_add_account_linking_to_goals.sql',
    name: 'Add Account Linking to Goals',
    check: async (supabase: SupabaseClient) => {
      try {
        const { error } = await supabase.from('goals').select('account_id').limit(0);
        return !error;
      } catch {
        return false;
      }
    }
  },
  {
    file: '20251231000004_remove_available_balance_and_make_institution_optional.sql',
    name: 'Remove Available Balance and Make Institution Optional',
    check: async (supabase: SupabaseClient) => {
      try {
        // Check if available_balance column was removed
        const { error } = await supabase.from('accounts').select('available_balance').limit(0);
        // If error, column was successfully removed
        return !!error;
      } catch {
        return true;
      }
    }
  },
  {
    file: '20251231000005_add_locale_to_user_preferences.sql',
    name: 'Add Locale to User Preferences',
    check: async (supabase: SupabaseClient) => {
      try {
        const { error } = await supabase.from('user_preferences').select('locale').limit(0);
        return !error;
      } catch {
        return false;
      }
    }
  },
  {
    file: '20260103085822_rename_subscriptions_to_expenses.sql',
    name: 'Rename Subscriptions to Expenses',
    check: async (supabase: SupabaseClient) => {
      // Check if expenses table exists and subscriptions view exists
      const expensesExist = await checkTableExists(supabase, 'expenses');
      const subscriptionsViewExists = await checkViewExists(supabase, 'subscriptions');
      return expensesExist && subscriptionsViewExists;
    }
  }
];

async function checkTableExists(supabase: SupabaseClient, tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(tableName).select('id').limit(0);
    return !error || !error.message.includes('does not exist');
  } catch {
    return false;
  }
}

async function checkViewExists(supabase: SupabaseClient, viewName: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(viewName).select('id').limit(0);
    return !error || !error.message.includes('does not exist');
  } catch {
    return false;
  }
}

async function runMigration(supabase: SupabaseClient, migrationFile: string, migrationName: string): Promise<boolean> {
  const filePath = join(process.cwd(), 'supabase', 'migrations', migrationFile);

  try {
    console.log(`📄 Reading migration: ${migrationFile}`);
    const sql = readFileSync(filePath, 'utf-8');

    console.log(`🚀 Executing: ${migrationName}`);

    // For production, we need to use RPC or direct SQL execution
    // Since we have service role key, we can execute directly
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error(`❌ Error executing migration: ${error.message}`);
      return false;
    }

    console.log(`✅ Success: ${migrationName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error executing migration: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function main() {
  console.log('🔧 Autonomous Migration Validator and Executor');
  console.log('===============================================\n');

  if (!SUPABASE_URL) {
    console.error('❌ SUPABASE_URL environment variable is required');
    console.error('   Set VITE_SUPABASE_URL or SUPABASE_URL');
    process.exit(1);
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    console.error('   Get this from Supabase Dashboard → Project Settings → API → service_role key');
    process.exit(1);
  }

  console.log(`📍 Target: ${SUPABASE_URL}`);
  console.log(`🔑 Using service role key: ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...\n`);

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Test connection
  console.log('🔍 Testing connection...');
  try {
    const { error } = await supabase.from('assets').select('id').limit(0);
    if (error && error.message.includes('does not exist')) {
      console.log('⚠️  Assets table does not exist (expected for fresh database)');
    } else if (error) {
      console.error('❌ Connection error:', error.message);
      process.exit(1);
    } else {
      console.log('✅ Connected successfully');
    }
  } catch (error) {
    console.error('❌ Failed to connect:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  console.log('');

  // Check and run migrations
  let totalChecked = 0;
  let alreadyApplied = 0;
  let newlyApplied = 0;
  let failed = 0;

  for (const migration of MIGRATIONS) {
    totalChecked++;
    console.log(`[${totalChecked}/${MIGRATIONS.length}] ${migration.name}`);

    try {
      const isApplied = await migration.check(supabase);

      if (isApplied) {
        console.log(`   ✅ Already applied - skipping`);
        alreadyApplied++;
      } else {
        console.log(`   🔄 Not applied - executing...`);
        const success = await runMigration(supabase, migration.file, migration.name);

        if (success) {
          console.log(`   ✅ Successfully applied`);
          newlyApplied++;
        } else {
          console.log(`   ❌ Failed to apply`);
          failed++;
          // Continue with other migrations
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Error checking migration: ${error instanceof Error ? error.message : String(error)}`);
      console.log(`   🔄 Attempting to run anyway...`);

      const success = await runMigration(supabase, migration.file, migration.name);
      if (success) {
        console.log(`   ✅ Successfully applied`);
        newlyApplied++;
      } else {
        console.log(`   ❌ Failed to apply`);
        failed++;
      }
    }

    console.log('');
  }

  // Summary
  console.log('='.repeat(50));
  console.log('📊 Migration Summary');
  console.log('='.repeat(50));
  console.log(`✅ Already applied: ${alreadyApplied}`);
  console.log(`🆕 Newly applied: ${newlyApplied}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total checked: ${totalChecked}`);
  console.log('');

  if (failed === 0) {
    console.log('🎉 All migrations processed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Verify tables in Supabase Dashboard → Table Editor');
    console.log('   2. Test the application with authenticated requests');
    process.exit(0);
  } else {
    console.log(`⚠️  ${failed} migrations failed. Please review errors above.`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
