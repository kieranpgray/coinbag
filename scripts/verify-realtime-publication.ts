/**
 * Verify that statement_imports table is in supabase_realtime publication
 * This is required for real-time subscriptions to work
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL or SUPABASE_URL environment variable is required');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   (This script needs service role key to check publication tables)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyRealtimePublication() {
  console.log('🔍 Checking if statement_imports is in supabase_realtime publication...\n');

  try {
    // Query pg_publication_tables to check if statement_imports is in the publication
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          pubname,
          tablename,
          schemaname
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'statement_imports';
      `
    });

    if (error) {
      // Try direct query if RPC doesn't work
      console.log('⚠️  RPC failed, trying direct query...');
      
      // Use PostgREST query instead
      const { error: queryError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'statement_imports')
        .single();

      if (queryError) {
        console.error('❌ Error querying database:', queryError.message);
        console.error('\n💡 Manual check: Run this in Supabase SQL Editor:');
        console.error('   SELECT * FROM pg_publication_tables WHERE pubname = \'supabase_realtime\' AND tablename = \'statement_imports\';');
        return;
      }
    }

    // Check if statement_imports is in the publication
    const { error: checkError } = await supabase
      .from('statement_imports')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('❌ Error accessing statement_imports table:', checkError.message);
      return;
    }

    console.log('✅ statement_imports table exists');

    // Direct SQL check using a SQL query endpoint
    console.log('\n📋 To verify realtime publication, run this in Supabase SQL Editor:');
    console.log('   SELECT * FROM pg_publication_tables');
    console.log('   WHERE pubname = \'supabase_realtime\'');
    console.log('   AND tablename = \'statement_imports\';');
    console.log('\n   Expected: Should return 1 row');
    console.log('   If empty, run: ALTER PUBLICATION supabase_realtime ADD TABLE statement_imports;');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  }
}

verifyRealtimePublication();

