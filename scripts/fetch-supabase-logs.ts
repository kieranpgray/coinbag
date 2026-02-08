#!/usr/bin/env tsx
/**
 * Fetch Supabase Edge Function logs using Management API
 * 
 * This script uses the Supabase Management API to fetch edge function logs
 * and extract checkpoint information.
 * 
 * Prerequisites:
 * 1. Supabase access token (get from: supabase login)
 * 2. Project reference ID (already linked: tislabgxitwtcqfwrpik)
 * 
 * Usage:
 *   tsx scripts/fetch-supabase-logs.ts [--function process-statement]
 */

import { readFileSync, existsSync } from 'fs';

const FUNCTION_NAME = process.argv.find(arg => arg.startsWith('--function'))?.split('=')[1] || 'process-statement';
const PROJECT_REF = 'tislabgxitwtcqfwrpik'; // coinbag-dev project

console.log('=== Fetching Supabase Edge Function Logs ===\n');
console.log(`Function: ${FUNCTION_NAME}`);
console.log(`Project: ${PROJECT_REF}\n`);

// Get access token from Supabase CLI
function getAccessToken(): string | null {
  try {
    // Try to get token from Supabase CLI config
    const configPath = `${process.env.HOME}/.supabase/access-token`;
    if (existsSync(configPath)) {
      return readFileSync(configPath, 'utf-8').trim();
    }
    
    // Try to get from environment
    if (process.env.SUPABASE_ACCESS_TOKEN) {
      return process.env.SUPABASE_ACCESS_TOKEN;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function fetchLogsViaAPI() {
  const accessToken = getAccessToken();
  
  if (!accessToken) {
    console.error('❌ No Supabase access token found.');
    console.error('\nTo get an access token:');
    console.error('1. Run: supabase login');
    console.error('2. Or set SUPABASE_ACCESS_TOKEN environment variable');
    console.error('3. Or manually get token from: https://supabase.com/dashboard/account/tokens');
    process.exit(1);
  }

  try {
    console.log('Fetching logs from Supabase Management API...\n');
    
    // Use Supabase Management API to fetch logs
    // Note: This requires the access token
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${FUNCTION_NAME}/logs`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    const logs = await response.json();
    return logs;
  } catch (error: unknown) {
    throw new Error(`Failed to fetch logs: ${error instanceof Error ? error.message : String(error)}`);
  }
}

interface LogEntry {
  message?: string;
  log?: string;
  timestamp?: string;
}

function parseCheckpointLogs(logs: LogEntry[]): Array<{ checkpoint: string; data: LogEntry }> {
  const checkpoints: Array<{ checkpoint: string; data: LogEntry }> = [];
  
  for (const log of logs) {
    const message = log.message || log.log || '';
    
    if (message.includes('=== CHECKPOINT')) {
      const match = message.match(/=== CHECKPOINT (\d+): (.+?) ===/);
      if (match) {
        checkpoints.push({
          checkpoint: `Checkpoint ${match[1]}: ${match[2]}`,
          data: log
        });
      }
    }
  }
  
  return checkpoints;
}

async function main() {
  try {
    const logs = await fetchLogsViaAPI();
    
    if (!Array.isArray(logs) || logs.length === 0) {
      console.log('⚠️  No logs found or logs are not in expected format.');
      console.log('\nTrying alternative method: Supabase Dashboard access...\n');
      console.log('Since CLI logs command is not available, please:');
      console.log('1. Go to: https://supabase.com/dashboard/project/tislabgxitwtcqfwrpik/functions/process-statement/logs');
      console.log('2. Filter logs for "CHECKPOINT" keyword');
      console.log('3. Copy the checkpoint logs');
      console.log('\nOr use the browser console to see checkpoints 6-7 in real-time.');
      return;
    }
    
    const checkpoints = parseCheckpointLogs(logs);
    
    console.log(`✅ Found ${checkpoints.length} checkpoint logs\n`);
    
    if (checkpoints.length > 0) {
      console.log('=== CHECKPOINT LOGS ===\n');
      checkpoints.forEach((cp, index) => {
        console.log(`${index + 1}. ${cp.checkpoint}`);
        console.log(`   Timestamp: ${cp.data.timestamp || 'N/A'}`);
        console.log(`   Message: ${cp.data.message || cp.data.log || 'N/A'}`);
        console.log('');
      });
    }
    
  } catch (error: unknown) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    console.error('\nAlternative: Access logs via Supabase Dashboard');
    console.error('URL: https://supabase.com/dashboard/project/tislabgxitwtcqfwrpik/functions/process-statement/logs');
    process.exit(1);
  }
}

main();


