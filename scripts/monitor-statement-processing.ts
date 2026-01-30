#!/usr/bin/env tsx
/**
 * Monitor statement processing and extract checkpoint data
 * 
 * This script:
 * 1. Monitors the database for new statement imports
 * 2. Extracts correlation IDs
 * 3. Provides instructions for filtering logs
 * 4. Can also query transactions to verify counts
 * 
 * Usage:
 *   tsx scripts/monitor-statement-processing.ts [--watch]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tislabgxitwtcqfwrpik.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY not found in environment variables');
  console.error('Please set it in .env.local or .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface StatementImport {
  id: string;
  file_name: string;
  status: string;
  total_transactions?: number;
  imported_transactions?: number;
  correlation_id?: string;
  created_at: string;
  updated_at: string;
}

async function getLatestStatementImport(): Promise<StatementImport | null> {
  const { data, error } = await supabase
    .from('statement_imports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching statement import:', error.message);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}

async function getTransactionCount(statementImportId: string): Promise<number> {
  const { count, error } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('statement_import_id', statementImportId);

  if (error) {
    console.error('Error counting transactions:', error.message);
    return 0;
  }

  return count || 0;
}

async function monitorProcessing() {
  console.log('=== Statement Processing Monitor ===\n');
  console.log('Watching for new statement imports...\n');
  console.log('Press Ctrl+C to stop\n');

  let lastImportId: string | null = null;

  const checkInterval = setInterval(async () => {
    try {
      const latest = await getLatestStatementImport();
      
      if (!latest) {
        return;
      }

      // Check if this is a new import
      if (latest.id !== lastImportId) {
        lastImportId = latest.id;
        
        console.log('📄 New Statement Import Detected');
        console.log('─'.repeat(60));
        console.log(`ID: ${latest.id}`);
        console.log(`File: ${latest.file_name}`);
        console.log(`Status: ${latest.status}`);
        console.log(`Correlation ID: ${latest.correlation_id || 'N/A'}`);
        console.log(`Created: ${latest.created_at}`);
        console.log('');

        // Wait a bit for processing to start
        if (latest.status === 'pending' || latest.status === 'processing') {
          console.log('⏳ Waiting for processing to complete...\n');
          
          // Check status periodically
          const statusCheck = setInterval(async () => {
            const updated = await getLatestStatementImport();
            if (updated && updated.id === latest.id) {
              if (updated.status === 'completed' || updated.status === 'failed') {
                clearInterval(statusCheck);
                
                console.log('✅ Processing Complete');
                console.log('─'.repeat(60));
                console.log(`Status: ${updated.status}`);
                console.log(`Total Transactions: ${updated.total_transactions || 'N/A'}`);
                console.log(`Imported Transactions: ${updated.imported_transactions || 'N/A'}`);
                
                // Get actual transaction count from database
                const actualCount = await getTransactionCount(latest.id);
                console.log(`Database Transaction Count: ${actualCount}`);
                console.log('');

                // Provide checkpoint analysis
                console.log('📊 Checkpoint Analysis');
                console.log('─'.repeat(60));
                console.log(`Expected: 43 transactions`);
                console.log(`Database Count: ${actualCount} transactions`);
                
                if (actualCount === 6) {
                  console.log('\n❌ LOSS CONFIRMED: Only 6 transactions in database');
                  console.log('\nTo find where the loss occurred:');
                  console.log('1. Go to Supabase Dashboard → Edge Functions → process-statement → Logs');
                  if (latest.correlation_id) {
                    console.log(`2. Filter by correlation ID: ${latest.correlation_id}`);
                  }
                  console.log('3. Search for "CHECKPOINT" keyword');
                  console.log('4. Look for the first checkpoint showing count < 43');
                } else if (actualCount >= 40) {
                  console.log('\n✅ Count looks good! All transactions may be present.');
                } else {
                  console.log(`\n⚠️  Unexpected count: ${actualCount} (expected 43)`);
                }
                
                console.log('\n');
              }
            }
          }, 2000); // Check every 2 seconds
        }
      }
    } catch (error: any) {
      console.error('Error monitoring:', error.message);
    }
  }, 3000); // Check every 3 seconds

  // Handle cleanup
  process.on('SIGINT', () => {
    clearInterval(checkInterval);
    console.log('\n\nMonitoring stopped.');
    process.exit(0);
  });
}

// Run once or in watch mode
const watchMode = process.argv.includes('--watch');

if (watchMode) {
  monitorProcessing();
} else {
  // One-time check
  (async () => {
    const latest = await getLatestStatementImport();
    if (latest) {
      console.log('=== Latest Statement Import ===\n');
      console.log(`ID: ${latest.id}`);
      console.log(`File: ${latest.file_name}`);
      console.log(`Status: ${latest.status}`);
      console.log(`Correlation ID: ${latest.correlation_id || 'N/A'}`);
      console.log(`Total Transactions: ${latest.total_transactions || 'N/A'}`);
      console.log(`Imported Transactions: ${latest.imported_transactions || 'N/A'}`);
      
      const actualCount = await getTransactionCount(latest.id);
      console.log(`Database Transaction Count: ${actualCount}`);
      console.log('');
      
      if (latest.correlation_id) {
        console.log('To view logs:');
        console.log(`1. Go to: https://supabase.com/dashboard/project/tislabgxitwtcqfwrpik/functions/process-statement/logs`);
        console.log(`2. Filter by correlation ID: ${latest.correlation_id}`);
        console.log(`3. Search for "CHECKPOINT"`);
      }
    } else {
      console.log('No statement imports found.');
    }
  })();
}

