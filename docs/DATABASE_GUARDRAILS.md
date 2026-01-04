# Database Destructive Operations Guardrails

## Overview

Hard guardrails have been implemented to prevent accidental destructive database operations (reset, seed, truncate, drop) from running against production environments.

## Implementation

### 1. Guard Utility

**File**: `scripts/guard-destructive-ops.js`

Core utility that blocks destructive operations based on:
- **Production Detection**: `NODE_ENV=production` or `APP_ENV=prod` → Always blocked
- **Explicit Opt-In**: `ALLOW_DESTRUCTIVE_DB_OPS=true` required for non-production operations
- **Production Override**: Production is always blocked, even with `ALLOW_DESTRUCTIVE_DB_OPS=true`

**Usage**:
```javascript
import { guardDestructiveOps } from './scripts/guard-destructive-ops.js';
guardDestructiveOps('database reset operation');
```

**Standalone**:
```bash
node scripts/guard-destructive-ops.js "operation description"
```

### 2. Safe Database Operations Wrapper

**File**: `scripts/safe-db-ops.js`

Wrapper script that automatically detects destructive operations and applies guards.

**Usage**:
```bash
# Non-destructive operations pass through
node scripts/safe-db-ops.js "supabase db diff"

# Destructive operations require guard check
node scripts/safe-db-ops.js "supabase db reset"
```

### 3. CI/CD Check Script

**File**: `scripts/ci-check-destructive-ops.sh`

Scans CI/CD workflows and package.json for destructive operations in production contexts.

**Usage**:
```bash
./scripts/ci-check-destructive-ops.sh
```

**What it checks**:
- GitHub Actions workflows (`.github/workflows/*.yml`)
- Package.json scripts with production-related names
- Detects: `reset`, `seed`, `truncate`, `drop`, `db reset`, `db push`

**Integration**:
Add to CI pipeline:
```yaml
- name: Check for destructive operations
  run: ./scripts/ci-check-destructive-ops.sh
```

## Environment Variables

### `ALLOW_DESTRUCTIVE_DB_OPS`

- **Default**: `false` (not set)
- **Required**: Must be explicitly set to `'true'` for destructive operations
- **Production**: Ignored in production (operations always blocked)

### `NODE_ENV`

- **Values**: `'production'` → Blocks all destructive operations
- **Other values**: Checked by guard utility

### `APP_ENV`

- **Values**: `'prod'` → Blocks all destructive operations
- **Other values**: Checked by guard utility

## Safety Rules

1. **Production Always Blocked**
   - No destructive operations allowed when `NODE_ENV=production` or `APP_ENV=prod`
   - Cannot be overridden, even with `ALLOW_DESTRUCTIVE_DB_OPS=true`

2. **Explicit Opt-In Required**
   - Must set `ALLOW_DESTRUCTIVE_DB_OPS=true` for development operations
   - Prevents accidental execution

3. **CI/CD Validation**
   - CI check script scans for destructive commands
   - Fails CI if destructive operations detected in production workflows

4. **Documentation**
   - All destructive commands documented with warnings
   - README includes safe deployment rules

## Examples

### ✅ Allowed (Development)

```bash
# With explicit flag
ALLOW_DESTRUCTIVE_DB_OPS=true supabase db reset

# Using safe wrapper
ALLOW_DESTRUCTIVE_DB_OPS=true node scripts/safe-db-ops.js "supabase db reset"
```

### ❌ Blocked (Production)

```bash
# Production always blocked
NODE_ENV=production ALLOW_DESTRUCTIVE_DB_OPS=true supabase db reset
# Error: Destructive operations not allowed in production
```

### ❌ Blocked (No Flag)

```bash
# Requires explicit opt-in
supabase db reset
# Error: ALLOW_DESTRUCTIVE_DB_OPS must be set to 'true'
```

## Integration with Existing Scripts

### Current Scripts

- `scripts/verify-migrations.ts` - READ-ONLY, no guard needed
- `scripts/diagnose-persistence.ts` - READ-ONLY, no guard needed
- `scripts/test-supabase-connection.ts` - READ-ONLY, no guard needed

### Future Scripts

When creating new scripts that perform destructive operations:

1. Import guard utility:
   ```javascript
   import { guardDestructiveOps } from './guard-destructive-ops.js';
   ```

2. Call guard before operation:
   ```javascript
   guardDestructiveOps('database seeding');
   // ... perform operation
   ```

3. Document in script comments:
   ```javascript
   /**
    * ⚠️ WARNING: This script performs destructive operations.
    * Requires ALLOW_DESTRUCTIVE_DB_OPS=true
    * Blocked in production environments.
    */
   ```

## Testing

Guard utility has been tested with:
- ✅ Blocks when `ALLOW_DESTRUCTIVE_DB_OPS` not set
- ✅ Allows when `ALLOW_DESTRUCTIVE_DB_OPS=true` (non-production)
- ✅ Blocks in production even with flag set
- ✅ CI check script scans workflows correctly

## Files Modified

1. `scripts/guard-destructive-ops.js` - Core guard utility (NEW)
2. `scripts/safe-db-ops.js` - Safe wrapper script (NEW)
3. `scripts/ci-check-destructive-ops.sh` - CI validation script (NEW)
4. `scripts/verify-migrations.ts` - Added documentation note
5. `supabase/README.md` - Added production safety warnings
6. `README.md` - Added "Safe Deployment Rules" section

## Next Steps

1. **Add to CI Pipeline**: Include `./scripts/ci-check-destructive-ops.sh` in deployment workflows
2. **Update Documentation**: Reference guardrails in any migration guides
3. **Team Training**: Ensure team knows about `ALLOW_DESTRUCTIVE_DB_OPS` flag
4. **Monitor**: Watch for any scripts that bypass guards


