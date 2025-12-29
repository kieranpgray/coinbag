# Requirements for Autonomous Migration Execution

To execute migrations autonomously, I need the following information:

## Option 1: Using Supabase CLI (Recommended)

### Required Information:
1. **Supabase Project Reference ID**
   - Location: Supabase Dashboard → Project Settings → General → Reference ID
   - Format: `abcdefghijklmnop` (alphanumeric string)
   - Example: `abcdefghijklmnop`

### How It Works:
- Links your local project to production Supabase
- Uses `supabase db push` to apply migrations
- Provides better error handling and rollback capabilities

### Command:
```bash
# I'll run this after you provide the project reference ID
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

---

## Option 2: Using Direct PostgreSQL Connection

### Required Information:
1. **Database Connection String**
   - Location: Supabase Dashboard → Project Settings → Database → Connection String
   - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`
   - ⚠️ **WARNING**: Contains password - handle securely

### How It Works:
- Connects directly to PostgreSQL database
- Executes SQL migrations via psql or node-postgres
- More direct but requires database password

---

## Option 3: Using Supabase Management API

### Required Information:
1. **Supabase Project URL**
   - Format: `https://[PROJECT_REF].supabase.co`
   - Example: `https://abcdefghijklmnop.supabase.co`

2. **Supabase Service Role Key**
   - Location: Supabase Dashboard → Project Settings → API → service_role key
   - ⚠️ **WARNING**: This is a SECRET key with full database access
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Never commit this to git!**

### How It Works:
- Uses Supabase REST API to execute SQL
- Requires creating a custom RPC function or using direct SQL execution
- More complex but doesn't require CLI

---

## What Went Wrong with Migration 2?

To help debug the issue with migration 2 (`create_categories_table.sql`), please provide:

1. **Error Message**: Copy the exact error message from Supabase SQL Editor
2. **Error Code**: If shown (e.g., `42P01`, `23505`, etc.)
3. **Line Number**: Which line in the migration failed (if shown)
4. **Current State**: 
   - Did the `categories` table get created?
   - Did the `category_id` column get added to `subscriptions`?
   - Any partial changes visible?

### Common Issues with Migration 2:

**Issue 1: Function Already Exists**
- Error: `function update_updated_at_column() already exists`
- Solution: Migration is idempotent - this is safe to ignore, or we can add `CREATE OR REPLACE`

**Issue 2: Column Already Exists**
- Error: `column "category_id" of relation "subscriptions" already exists`
- Solution: Migration uses `ADD COLUMN IF NOT EXISTS` - should be safe, but may indicate partial run

**Issue 3: Foreign Key Constraint**
- Error: `foreign key constraint "subscriptions_category_id_fkey" cannot be created`
- Solution: May need to drop existing constraint first

**Issue 4: Policy Already Exists**
- Error: `policy "Users can view their own categories" already exists`
- Solution: Migration should use `CREATE POLICY IF NOT EXISTS` or `DROP POLICY IF EXISTS` first

---

## Recommended Approach

**For Production**: Use **Option 1 (Supabase CLI)** because:
- ✅ Safer - CLI handles transactions and rollbacks
- ✅ Better error messages
- ✅ Can verify before applying
- ✅ Tracks migration state
- ✅ No need to expose database password

**What I Need**:
1. Your Supabase project reference ID
2. Confirmation that you want me to proceed
3. The error message from migration 2 (if you want me to fix it first)

---

## Quick Start

Once you provide the project reference ID, I can:

1. Link to your production Supabase project
2. Check current migration state
3. Run remaining migrations (2-12) in order
4. Verify each migration succeeds
5. Report any errors with detailed diagnostics

**Provide**: Your Supabase project reference ID and I'll proceed!

