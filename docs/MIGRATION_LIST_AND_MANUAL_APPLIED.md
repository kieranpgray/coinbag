# Migration list vs manually applied migrations

## Why the list can look wrong

`supabase migration list` shows:

- **Local** = migration files in `supabase/migrations/`
- **Remote** = rows in the remote database table `supabase_migrations.schema_migrations`

That table is **only** updated when migrations are applied via the CLI (`supabase db push` / `supabase migration up`). If you ran migration SQL manually (e.g. by pasting into the Supabase SQL Editor), the schema changes are on the database but **no row is inserted** for that migration. So the list shows those migrations as "pending" (empty Remote) even though the schema is already applied.

So: **empty Remote does not necessarily mean "not applied"** — it means "not recorded as applied by the CLI."

## What to do

### Option A: Sync history (you’re sure the DB has the migrations)

If the remote database already has all the schema from those migrations (e.g. you applied them manually or via a combined script like `production-workspace-migration.sql`), you can **mark** them as applied so the list and future `db push` are correct:

1. From repo root, with the project linked and `SUPABASE_DB_PASSWORD` set:
   ```bash
   ./scripts/repair-migration-history.sh
   ```
2. Re-run:
   ```bash
   supabase migration list -p "$SUPABASE_DB_PASSWORD"
   ```
   You should see Local and Remote filled for every migration.

**Only do this if the remote DB really has all those migrations.** If you mark as applied a migration that was never run, `db push` will never run it and your schema will be missing that change.

### Option B: Apply only what’s missing

If you’re not sure which migrations were applied manually:

1. Don’t run the repair script.
2. Run `supabase db push -p "$SUPABASE_DB_PASSWORD"`. The CLI will try to run every "pending" migration in order.
3. Migrations that were already applied manually will often fail with "already exists" (table, policy, etc.). You can then run `supabase migration repair <version> --status applied -p "$SUPABASE_DB_PASSWORD"` for each such version so the CLI stops trying to re-apply it, and re-run `db push` until only genuinely new migrations run.

### One migration at a time

To mark a single migration as applied (e.g. after you run its SQL manually):

```bash
supabase migration repair 20260304120000 --status applied -p "$SUPABASE_DB_PASSWORD"
```

Use the 14-digit version from the filename (e.g. `20260304120000_fix_workspace_memberships_rls_recursion.sql` → `20260304120000`).

## References

- [Supabase: migration repair](https://supabase.com/docs/reference/cli/supabase-migration-repair) — `--status applied` inserts a row so the migration is treated as applied without running the SQL.
