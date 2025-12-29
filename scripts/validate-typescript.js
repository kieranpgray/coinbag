#!/usr/bin/env node
/**
 * TypeScript validation script
 * 
 * Runs TypeScript compiler in check mode and provides actionable error summaries.
 * Used in CI/CD, pre-commit hooks, and local development.
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔍 Running TypeScript type check...\n');

try {
  // Run TypeScript compiler in check mode
  execSync('tsc --noEmit', {
    cwd: projectRoot,
    stdio: 'inherit',
    encoding: 'utf-8',
  });
  
  console.log('\n✅ TypeScript type check passed!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ TypeScript type check failed!');
  console.error('\n📋 Next steps:');
  console.error('   1. Review the errors above');
  console.error('   2. Fix TypeScript errors in the listed files');
  console.error('   3. Run "pnpm type-check" again to verify');
  console.error('   4. See docs/TYPESCRIPT_PATTERNS.md for common patterns');
  console.error('');
  process.exit(1);
}

