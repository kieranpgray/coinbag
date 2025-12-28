#!/usr/bin/env node
/**
 * Guard Utility for Destructive Database Operations
 * 
 * Prevents destructive database operations (reset, seed, truncate, drop) from
 * running against production environments.
 * 
 * Usage:
 *   const { guardDestructiveOps } = require('./guard-destructive-ops.js');
 *   guardDestructiveOps('operation description');
 * 
 * Or as a standalone script:
 *   node scripts/guard-destructive-ops.js "operation description"
 */

const NODE_ENV = process.env.NODE_ENV;
const APP_ENV = process.env.APP_ENV;
const ALLOW_DESTRUCTIVE_DB_OPS = process.env.ALLOW_DESTRUCTIVE_DB_OPS;

/**
 * Check if current environment is production
 */
function isProduction() {
  return NODE_ENV === 'production' || APP_ENV === 'prod';
}

/**
 * Guard against destructive operations in production
 * @param {string} operationDescription - Description of the operation being performed
 * @throws Error if operation is blocked
 */
function guardDestructiveOps(operationDescription = 'destructive database operation') {
  // Always block in production, regardless of ALLOW_DESTRUCTIVE_DB_OPS
  if (isProduction()) {
    console.error('');
    console.error('❌ BLOCKED: Destructive database operations are not allowed in production');
    console.error('');
    console.error(`   Operation: ${operationDescription}`);
    console.error(`   NODE_ENV: ${NODE_ENV || 'not set'}`);
    console.error(`   APP_ENV: ${APP_ENV || 'not set'}`);
    console.error('');
    console.error('   Production environments are protected from destructive operations.');
    console.error('   This includes: reset, seed, truncate, drop, and similar operations.');
    console.error('');
    process.exit(1);
  }

  // Require explicit opt-in for non-production environments
  if (ALLOW_DESTRUCTIVE_DB_OPS !== 'true') {
    console.error('');
    console.error('❌ BLOCKED: Destructive database operations require explicit permission');
    console.error('');
    console.error(`   Operation: ${operationDescription}`);
    console.error(`   ALLOW_DESTRUCTIVE_DB_OPS: ${ALLOW_DESTRUCTIVE_DB_OPS || 'not set (defaults to false)'}`);
    console.error('');
    console.error('   To allow this operation, set:');
    console.error('     ALLOW_DESTRUCTIVE_DB_OPS=true');
    console.error('');
    console.error('   Example:');
    console.error(`     ALLOW_DESTRUCTIVE_DB_OPS=true node your-script.js`);
    console.error('');
    console.error('   ⚠️  WARNING: Only use this flag in development/test environments!');
    console.error('');
    process.exit(1);
  }

  // Operation is allowed
  console.log(`✅ Allowed: ${operationDescription}`);
  console.log(`   Environment: ${NODE_ENV || 'development'}`);
  console.log(`   ALLOW_DESTRUCTIVE_DB_OPS: ${ALLOW_DESTRUCTIVE_DB_OPS}`);
}

// If run as standalone script (when executed directly via node)
// In ES modules, we check if this file's URL matches the executed script
const currentFile = import.meta.url.replace('file://', '');
const executedFile = process.argv[1];

if (currentFile === executedFile || executedFile?.includes('guard-destructive-ops.js')) {
  const operationDescription = process.argv[2] || 'destructive database operation';
  guardDestructiveOps(operationDescription);
}

export { guardDestructiveOps, isProduction };

