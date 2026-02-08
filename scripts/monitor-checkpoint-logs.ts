#!/usr/bin/env tsx
/**
 * Monitor Supabase Edge Function logs for checkpoint data
 * 
 * This script continuously monitors edge function logs and extracts
 * checkpoint information to identify where transaction count drops.
 * 
 * Usage:
 *   tsx scripts/monitor-checkpoint-logs.ts [--function process-statement] [--watch]
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const FUNCTION_NAME = process.argv.find(arg => arg.startsWith('--function'))?.split('=')[1] || 'process-statement';
const WATCH_MODE = process.argv.includes('--watch');

interface CheckpointData {
  checkpoint: number;
  name: string;
  count: number | null;
  status: 'OK' | 'LOSS_DETECTED' | 'UNKNOWN';
  file: string;
  details: string[];
  timestamp?: string;
}

function parseCheckpointLogs(logOutput: string): CheckpointData[] {
  const checkpoints: CheckpointData[] = [];
  const lines = logOutput.split('\n');
  
  let currentCheckpoint: Partial<CheckpointData> | null = null;
  let checkpointLines: string[] = [];
  let inCheckpoint = false;
  
  for (const line of lines) {
    // Detect checkpoint start
    const checkpointMatch = line.match(/=== CHECKPOINT (\d+): (.+?) ===/);
    if (checkpointMatch) {
      // Save previous checkpoint
      if (currentCheckpoint && checkpointLines.length > 0) {
        checkpoints.push({
          checkpoint: currentCheckpoint.checkpoint!,
          name: currentCheckpoint.name!,
          count: currentCheckpoint.count || null,
          status: currentCheckpoint.status || 'UNKNOWN',
          file: currentCheckpoint.file || 'unknown',
          details: checkpointLines,
          timestamp: currentCheckpoint.timestamp
        });
      }
      
      // Start new checkpoint
      currentCheckpoint = {
        checkpoint: parseInt(checkpointMatch[1]),
        name: checkpointMatch[2],
        details: []
      };
      checkpointLines = [line];
      inCheckpoint = true;
      continue;
    }
    
    // Collect checkpoint details
    if (inCheckpoint && currentCheckpoint) {
      checkpointLines.push(line);
      
      // Extract file location
      const fileMatch = line.match(/File: (.+)/);
      if (fileMatch && !currentCheckpoint.file) {
        currentCheckpoint.file = fileMatch[1];
      }
      
      // Extract transaction count
      const countMatch = line.match(/(?:Transactions|Count|returned|inserted|extracted).*?(\d+)/i);
      if (countMatch && !currentCheckpoint.count) {
        currentCheckpoint.count = parseInt(countMatch[1]);
      }
      
      // Extract status
      if (line.includes('Status:')) {
        if (line.includes('✅')) {
          currentCheckpoint.status = 'OK';
        } else if (line.includes('❌')) {
          currentCheckpoint.status = 'LOSS_DETECTED';
        }
      }
      
      // Extract timestamp if available
      const timestampMatch = line.match(/\[(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\]/);
      if (timestampMatch && !currentCheckpoint.timestamp) {
        currentCheckpoint.timestamp = timestampMatch[1];
      }
    }
  }
  
  // Save last checkpoint
  if (currentCheckpoint && checkpointLines.length > 0) {
    checkpoints.push({
      checkpoint: currentCheckpoint.checkpoint!,
      name: currentCheckpoint.name!,
      count: currentCheckpoint.count || null,
      status: currentCheckpoint.status || 'UNKNOWN',
      file: currentCheckpoint.file || 'unknown',
      details: checkpointLines,
      timestamp: currentCheckpoint.timestamp
    });
  }
  
  return checkpoints;
}

function fetchLogs(): string {
  try {
    const output = execSync(
      `supabase functions logs ${FUNCTION_NAME} --limit 500`,
      { 
        encoding: 'utf-8',
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 30000
      }
    );
    return output;
  } catch (error: unknown) {
    throw new Error(`Failed to fetch logs: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function displayCheckpointReport(checkpoints: CheckpointData[]) {
  console.log('\n' + '='.repeat(70));
  console.log('CHECKPOINT AUDIT TRAIL');
  console.log('='.repeat(70) + '\n');
  
  if (checkpoints.length === 0) {
    console.log('⚠️  No checkpoint logs found.\n');
    console.log('Possible reasons:');
    console.log('  1. Edge function not deployed with checkpoint logging');
    console.log('  2. No statements processed recently');
    console.log('  3. Logs outside time range\n');
    return;
  }
  
  // Sort by checkpoint number
  checkpoints.sort((a, b) => a.checkpoint - b.checkpoint);
  
  // Create audit trail table
  console.log('| Checkpoint | Location | Count | Status |');
  console.log('|------------|----------|-------|--------|');
  
  checkpoints.forEach(cp => {
    const countStr = cp.count !== null ? cp.count.toString() : '?';
    const statusIcon = cp.status === 'OK' ? '✅' : cp.status === 'LOSS_DETECTED' ? '❌' : '⚠️';
    const fileShort = cp.file.split('/').pop() || cp.file;
    console.log(`| ${cp.checkpoint}. ${cp.name} | ${fileShort} | ${countStr} | ${statusIcon} |`);
  });
  
  console.log('');
  
  // Identify loss point
  const lossPoint = checkpoints.find(cp => cp.status === 'LOSS_DETECTED' || (cp.count !== null && cp.count < 40));
  if (lossPoint) {
    const previousCheckpoint = checkpoints.find(cp => cp.checkpoint === lossPoint.checkpoint - 1);
    
    console.log('🔍 LOSS DETECTED');
    console.log('─'.repeat(70));
    console.log(`Loss Point: Checkpoint ${lossPoint.checkpoint} (${lossPoint.name})`);
    console.log(`File: ${lossPoint.file}`);
    if (previousCheckpoint && previousCheckpoint.count !== null) {
      console.log(`Count dropped from ${previousCheckpoint.count} → ${lossPoint.count}`);
    }
    console.log('');
    
    console.log('Details:');
    lossPoint.details.slice(0, 10).forEach(line => {
      if (line.trim()) console.log(`  ${line}`);
    });
    console.log('');
  } else {
    console.log('✅ No loss detected in checkpoints found');
    console.log('   (All checkpoints show expected counts or no count data available)\n');
  }
}

function main() {
  console.log('=== Supabase Edge Function Log Monitor ===\n');
  console.log(`Function: ${FUNCTION_NAME}`);
  console.log(`Mode: ${WATCH_MODE ? 'Watching (continuous)' : 'One-time fetch'}\n`);
  
  if (WATCH_MODE) {
    console.log('Watching for new logs... (Press Ctrl+C to stop)\n');
    
    const interval = setInterval(() => {
      try {
        const logs = fetchLogs();
        const checkpoints = parseCheckpointLogs(logs);
        
        if (checkpoints.length > 0) {
          console.log(`\n[${new Date().toLocaleTimeString()}] Found ${checkpoints.length} checkpoints`);
          displayCheckpointReport(checkpoints);
        }
      } catch (error: unknown) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 5000); // Check every 5 seconds
    
    // Handle cleanup
    process.on('SIGINT', () => {
      clearInterval(interval);
      console.log('\n\nMonitoring stopped.');
      process.exit(0);
    });
  } else {
    try {
      console.log('Fetching logs...');
      const logs = fetchLogs();
      const checkpoints = parseCheckpointLogs(logs);
      
      displayCheckpointReport(checkpoints);
      
      // Also save to file for reference
      const outputFile = `checkpoint-logs-${Date.now()}.json`;
      writeFileSync(
        outputFile,
        JSON.stringify(checkpoints, null, 2)
      );
      console.log(`\n✅ Full checkpoint data saved to: ${outputFile}`);
      
    } catch (error: unknown) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      console.error('\nTroubleshooting:');
      console.error('1. Ensure Supabase CLI is installed and authenticated');
      console.error('2. Run: supabase login');
      console.error('3. Ensure project is linked: supabase link --project-ref <ref>');
      console.error('4. Check function exists: supabase functions list');
      process.exit(1);
    }
  }
}

main();


