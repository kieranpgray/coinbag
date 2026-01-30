#!/usr/bin/env tsx
/**
 * Fetch Supabase Edge Function logs automatically
 * 
 * This script fetches logs from the process-statement edge function
 * and filters for checkpoint logs to identify transaction loss points.
 * 
 * Usage:
 *   tsx scripts/fetch-edge-function-logs.ts [--function process-statement] [--minutes 10]
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const FUNCTION_NAME = process.argv.find(arg => arg.startsWith('--function'))?.split('=')[1] || 'process-statement';
const MINUTES_AGO = parseInt(process.argv.find(arg => arg.startsWith('--minutes'))?.split('=')[1] || '10');

console.log('=== Fetching Supabase Edge Function Logs ===\n');
console.log(`Function: ${FUNCTION_NAME}`);
console.log(`Time range: Last ${MINUTES_AGO} minutes\n`);

try {
  // Fetch logs using Supabase CLI
  console.log('Fetching logs from Supabase...');
  const logsOutput = execSync(
    `supabase functions logs ${FUNCTION_NAME} --limit 1000`,
    { 
      encoding: 'utf-8',
      cwd: process.cwd(),
      stdio: 'pipe'
    }
  );

  // Parse logs and filter for checkpoints
  const lines = logsOutput.split('\n');
  const checkpointLogs: Array<{ checkpoint: string; line: string; timestamp?: string }> = [];
  
  let currentCheckpoint: string | null = null;
  let checkpointBuffer: string[] = [];
  
  for (const line of lines) {
    // Look for checkpoint markers
    if (line.includes('=== CHECKPOINT')) {
      // Save previous checkpoint if exists
      if (currentCheckpoint && checkpointBuffer.length > 0) {
        checkpointLogs.push({
          checkpoint: currentCheckpoint,
          line: checkpointBuffer.join('\n')
        });
        checkpointBuffer = [];
      }
      
      // Extract checkpoint number and name
      const match = line.match(/=== CHECKPOINT (\d+): (.+?) ===/);
      if (match) {
        currentCheckpoint = `Checkpoint ${match[1]}: ${match[2]}`;
        checkpointBuffer = [line];
      }
    } else if (currentCheckpoint && line.trim()) {
      // Collect lines related to current checkpoint
      if (line.includes('File:') || 
          line.includes('Transactions') || 
          line.includes('Status:') ||
          line.includes('Sample') ||
          line.includes('Count:')) {
        checkpointBuffer.push(line);
      }
    }
  }
  
  // Save last checkpoint
  if (currentCheckpoint && checkpointBuffer.length > 0) {
    checkpointLogs.push({
      checkpoint: currentCheckpoint,
      line: checkpointBuffer.join('\n')
    });
  }

  // Display results
  console.log(`\n✅ Found ${checkpointLogs.length} checkpoint logs\n`);
  
  if (checkpointLogs.length === 0) {
    console.log('⚠️  No checkpoint logs found. This could mean:');
    console.log('   1. Edge function hasn\'t been deployed with checkpoint logging');
    console.log('   2. No statements have been processed recently');
    console.log('   3. Logs are outside the time range\n');
    console.log('Full log output (last 50 lines):');
    console.log(lines.slice(-50).join('\n'));
  } else {
    console.log('=== CHECKPOINT LOGS ===\n');
    checkpointLogs.forEach((log, index) => {
      console.log(`\n${index + 1}. ${log.checkpoint}`);
      console.log('─'.repeat(60));
      console.log(log.line);
      console.log('');
    });
    
    // Generate summary
    console.log('\n=== SUMMARY ===\n');
    const counts: Record<string, number> = {};
    checkpointLogs.forEach(log => {
      const match = log.line.match(/Transactions.*?(\d+)/);
      if (match) {
        counts[log.checkpoint] = parseInt(match[1]);
      }
    });
    
    console.log('Transaction counts by checkpoint:');
    Object.entries(counts).forEach(([checkpoint, count]) => {
      const status = count >= 40 ? '✅' : '❌';
      console.log(`  ${status} ${checkpoint}: ${count} transactions`);
    });
  }

} catch (error: any) {
  console.error('❌ Error fetching logs:', error.message);
  console.error('\nTroubleshooting:');
  console.error('1. Make sure Supabase CLI is installed: npm install -g supabase');
  console.error('2. Make sure you\'re logged in: supabase login');
  console.error('3. Make sure project is linked: supabase link --project-ref <your-project-ref>');
  console.error('4. Check that the edge function exists: supabase functions list');
  process.exit(1);
}


