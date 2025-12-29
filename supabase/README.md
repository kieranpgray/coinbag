# Supabase Database Migrations

This directory contains SQL migrations for the Coinbag application's Supabase database.

## ⚠️ Production Safety Warning

**CRITICAL**: Destructive database operations (reset, seed, truncate, drop) are **BLOCKED** in production environments.

- **Production is always protected**: No destructive operations allowed, regardless of flags
- **Development requires explicit opt-in**: Set `ALLOW_DESTRUCTIVE_DB_OPS=true` for local dev
- **Use guard utilities**: Always use `scripts/guard-destructive-ops.js` or `scripts/safe-db-ops.js` for database operations

See [Safe Deployment Rules](../../README.md#safe-deployment-rules) in the main README for details.

## Prerequisites

Before running migrations, ensure you have:

1. **Supabase CLI installed**: `npm install -g supabase`
2. **Supabase project initialized**: Run `supabase init` in the project root
3. **Environment configured**: Set up your Supabase project URL and keys

## Migration Files

### `20251227120112_create_subscriptions_table.sql`

Creates the initial `subscriptions` table with:

- **Table Structure**:
  - `id`: UUID primary key (auto-generated)
  - `user_id`: Clerk user ID for ownership
  - `name`: Subscription display name
  - `amount`: Subscription amount (decimal)
  - `frequency`: Billing frequency (weekly/fortnightly/monthly/yearly)
  - `charge_date`: Original charge date
  - `next_due_date`: Next billing date
  - `category`: Subscription category
  - `notes`: Optional notes
  - `created_at`/`updated_at`: Timestamps

- **Security**:
  - Row Level Security (RLS) enabled
  - Policies ensure users only access their own data
  - `auth.uid()` used for user identification

- **Performance**:
  - Indexes on `user_id`, `next_due_date`, `category`, `frequency`
  - Automatic `updated_at` timestamp updates

## Running Migrations

### Local Development

```bash
# Initialize Supabase locally (if not already done)
supabase init

# Start local Supabase services
supabase start

# Apply migrations to local database
supabase db push
```

### Production

**⚠️ WARNING**: Production migrations should be applied manually via Supabase Dashboard SQL Editor, not via CLI.

```bash
# Link to your remote Supabase project (for verification only)
supabase link --project-ref your-project-ref

# ⚠️ DO NOT run 'supabase db push' in production
# Instead, apply migrations manually:
# 1. Open Supabase Dashboard → SQL Editor
# 2. Copy migration SQL from files in this directory
# 3. Run migrations one at a time, in order
# 4. Verify each migration succeeds before proceeding
```

**Safe Production Migration Process**:
1. Review migration SQL files in this directory
2. Test migrations in a staging environment first
3. Apply migrations manually via Supabase Dashboard
4. Verify data integrity after each migration
5. Never use `supabase db reset` or `supabase db push` in production

## Rollback

If you need to rollback the subscriptions migration:

```sql
-- Connect to your Supabase database and run:
SELECT rollback_subscriptions_migration();
```

This will:
- Drop the trigger and function
- Remove all RLS policies
- Disable RLS
- Drop indexes
- Drop the table

## Manual Application

If you prefer to apply migrations manually:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the migration SQL
4. Execute the migration

## Testing Migrations

### Local Testing

**⚠️ WARNING**: These commands will destroy local data. Only use in development!

```bash
# Reset local database (requires ALLOW_DESTRUCTIVE_DB_OPS=true)
ALLOW_DESTRUCTIVE_DB_OPS=true supabase db reset

# Reapply all migrations
supabase db push

# Check migration status
supabase db diff
```

**Or use the safe wrapper**:
```bash
# Safe wrapper checks environment and permissions
node scripts/safe-db-ops.js "supabase db reset"
```

### Verification

After applying migrations, verify:

1. **Table exists**: `SELECT * FROM subscriptions LIMIT 1;`
2. **RLS enabled**: Check table settings in Supabase dashboard
3. **Policies work**: Try inserting data with different user contexts
4. **Indexes created**: Check query performance on indexed columns

## Development Workflow

1. **Create migration**: Add new `.sql` file with timestamp prefix
2. **Test locally**: Apply to local Supabase instance
3. **Verify functionality**: Test with application code
4. **Apply to production**: Push to production database
5. **Update documentation**: Document any new schema changes

## Troubleshooting

### Common Issues

1. **"extension pgcrypto does not exist"**:
   - Ensure you're using Supabase (pgcrypto is pre-installed)
   - For local PostgreSQL, run: `CREATE EXTENSION pgcrypto;`

2. **RLS blocking queries**:
   - Check that `auth.uid()` is properly set
   - Verify JWT configuration in Supabase dashboard

3. **Migration conflicts**:
   - Check migration status: `supabase migration list`
   - Reset if needed: `supabase db reset`

### Debug Commands

```bash
# Check migration status
supabase migration list

# View database diff
supabase db diff

# Reset local database (requires ALLOW_DESTRUCTIVE_DB_OPS=true)
ALLOW_DESTRUCTIVE_DB_OPS=true supabase db reset
# Or use safe wrapper:
node scripts/safe-db-ops.js "supabase db reset"
```

## Safe Deployment Rules

1. **Never run destructive commands in production**
   - `supabase db reset` - ❌ BLOCKED in production
   - `supabase db push` - ⚠️ Use manual migration instead
   - Any SQL with `DROP`, `TRUNCATE`, `DELETE` - ❌ Review carefully

2. **Use guard utilities for all database operations**
   ```bash
   node scripts/guard-destructive-ops.js "operation description"
   # Or use wrapper:
   node scripts/safe-db-ops.js "your-command"
   ```

3. **Environment variable protection**
   - `ALLOW_DESTRUCTIVE_DB_OPS=true` - Required for dev operations
   - Still blocked in production even with this flag set
   - `NODE_ENV=production` or `APP_ENV=prod` - Always blocks destructive ops

4. **CI/CD validation**
   - CI checks automatically scan for destructive operations
   - Run `./scripts/ci-check-destructive-ops.sh` before deploying

## Schema Evolution

### Future Migrations

When adding new features, create additional migration files:

1. **File naming**: `YYYYMMDDHHMMSS_description.sql`
2. **Idempotent**: Use `IF NOT EXISTS` where appropriate
3. **Rollback**: Include rollback functions
4. **Testing**: Test both application and rollback

### Schema Changes

- **Adding columns**: Use `ALTER TABLE ADD COLUMN`
- **Modifying constraints**: Use `ALTER TABLE ALTER COLUMN`
- **New tables**: Follow same RLS pattern
- **Indexes**: Add for frequently queried columns

## Security Notes

- All tables should have RLS enabled
- Policies should scope data to `auth.uid()`
- Avoid client-side user_id parameters
- Regularly audit RLS policies
- Use Supabase's built-in security features
