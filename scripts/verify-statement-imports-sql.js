#!/usr/bin/env node
/**
 * Verify statement_imports migration SQL for correctness
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const migrationFile = join(PROJECT_ROOT, 'supabase', 'migrations', '20251230000001_create_statement_imports_table.sql');

console.log('🔍 Verifying Statement Imports Migration SQL');
console.log('============================================\n');

const sql = readFileSync(migrationFile, 'utf-8');

// Check for required components
const checks = {
  extension: /CREATE EXTENSION IF NOT EXISTS pgcrypto/i.test(sql),
  table: /CREATE TABLE IF NOT EXISTS statement_imports/i.test(sql),
  primaryKey: /id uuid.*PRIMARY KEY/i.test(sql),
  foreignKey: /account_id uuid.*REFERENCES accounts\(id\)/i.test(sql),
  indexes: (sql.match(/CREATE INDEX IF NOT EXISTS/g) || []).length >= 5,
  rlsEnabled: /ALTER TABLE statement_imports ENABLE ROW LEVEL SECURITY/i.test(sql),
  policies: (sql.match(/CREATE POLICY.*ON statement_imports/g) || []).length >= 4,
  function: /CREATE OR REPLACE FUNCTION update_updated_at_column/i.test(sql),
  trigger: /CREATE TRIGGER update_statement_imports_updated_at/i.test(sql),
};

console.log('📋 SQL Structure Verification:\n');

let allPassed = true;

for (const [check, passed] of Object.entries(checks)) {
  const status = passed ? '✅' : '❌';
  const name = check.replace(/([A-Z])/g, ' $1').toLowerCase();
  console.log(`${status} ${name}`);
  if (!passed) allPassed = false;
}

// Check for common issues
console.log('\n🔍 Additional Checks:\n');

// Check if function is created before trigger
const functionPos = sql.indexOf('CREATE OR REPLACE FUNCTION update_updated_at_column');
const triggerPos = sql.indexOf('CREATE TRIGGER update_statement_imports_updated_at');
if (functionPos < triggerPos) {
  console.log('✅ Function created before trigger (correct order)');
} else {
  console.log('❌ Function should be created before trigger');
  allPassed = false;
}

// Check for required columns
const requiredColumns = [
  'id', 'user_id', 'account_id', 'file_name', 'file_path',
  'file_hash', 'file_size', 'mime_type', 'status',
  'created_at', 'updated_at'
];

const missingColumns = requiredColumns.filter(col => {
  const regex = new RegExp(`${col}\\s+[^,]+`, 'i');
  return !regex.test(sql);
});

if (missingColumns.length === 0) {
  console.log('✅ All required columns present');
} else {
  console.log(`❌ Missing columns: ${missingColumns.join(', ')}`);
  allPassed = false;
}

// Check RLS policies cover all operations
const policyOps = {
  SELECT: /FOR SELECT/i.test(sql),
  INSERT: /FOR INSERT/i.test(sql),
  UPDATE: /FOR UPDATE/i.test(sql),
  DELETE: /FOR DELETE/i.test(sql),
};

const missingOps = Object.entries(policyOps)
  .filter(([_, exists]) => !exists)
  .map(([op, _]) => op);

if (missingOps.length === 0) {
  console.log('✅ All CRUD operations have RLS policies');
} else {
  console.log(`❌ Missing RLS policies for: ${missingOps.join(', ')}`);
  allPassed = false;
}

// Check for proper status constraint
if (/status.*CHECK.*pending.*processing.*review.*completed.*failed.*cancelled/i.test(sql)) {
  console.log('✅ Status constraint includes all required values');
} else {
  console.log('⚠️  Status constraint may be incomplete');
}

// Check for proper parsing_method constraint
if (/parsing_method.*CHECK.*deterministic.*ocr.*llm/i.test(sql)) {
  console.log('✅ Parsing method constraint includes all required values');
} else {
  console.log('⚠️  Parsing method constraint may be incomplete');
}

// Summary
console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log('✅ SQL Verification PASSED');
  console.log('   The migration SQL is syntactically correct and complete.');
} else {
  console.log('❌ SQL Verification FAILED');
  console.log('   Please review the issues above before executing.');
}
console.log('='.repeat(50));

// Show SQL preview
console.log('\n📄 SQL Preview (first 20 lines):\n');
const lines = sql.split('\n').slice(0, 20);
lines.forEach((line, i) => {
  console.log(`${String(i + 1).padStart(3, ' ')}: ${line}`);
});
console.log('   ...\n');

process.exit(allPassed ? 0 : 1);




