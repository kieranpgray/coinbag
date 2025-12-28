#!/usr/bin/env node
/**
 * Safe Database Operations Wrapper
 * 
 * Wrapper script that ensures destructive database operations are guarded.
 * 
 * Usage:
 *   node scripts/safe-db-ops.js "supabase db push"
 *   node scripts/safe-db-ops.js "supabase db reset"
 */

import { guardDestructiveOps } from './guard-destructive-ops.js';
import { execSync } from 'child_process';

const command = process.argv.slice(2).join(' ');

if (!command) {
  console.error('❌ Error: No command provided');
  console.error('');
  console.error('Usage:');
  console.error('  node scripts/safe-db-ops.js "your-command-here"');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/safe-db-ops.js "supabase db push"');
  process.exit(1);
}

// Check for destructive operation keywords
const destructiveKeywords = ['reset', 'seed', 'truncate', 'drop', 'delete', 'clear'];
const isDestructive = destructiveKeywords.some(keyword => 
  command.toLowerCase().includes(keyword.toLowerCase())
);

if (isDestructive) {
  guardDestructiveOps(`Running: ${command}`);
}

// Execute the command
try {
  console.log(`Executing: ${command}`);
  execSync(command, { stdio: 'inherit' });
} catch (error) {
  process.exit(error.status || 1);
}

