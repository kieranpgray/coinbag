# Prereq A — Asset & Liability Type Data Layer Findings

**Date:** 2026-04-06  
**Branch:** chore/remove-supabase-temp-files

---

## 1. Architecture Verdict

**STORED AS STRINGS — both assets and liabilities.**

Type values are stored directly as human-readable strings in the database. There is zero separation between stored key and display label — the `value` in every form `<SearchableSelect>` option IS the string written to the `type` column. Renaming any type label requires:
1. A Postgres migration to update the `CHECK` constraint  
2. A `UPDATE` data migration for existing rows  
3. Updates to all Zod schemas (contracts layer)  
4. Updates to all form option lists and tab filters

A display-layer-only transform is NOT sufficient to hide old stored values from users — the stored strings flow directly through the API response, through Zod validation, and into the UI as-is.

---

## 2. Evidence Per File

**`src/features/assets/components/AssetForm.tsx`**  
The `<SearchableSelect>` type field uses `value` and `label` set to identical strings (e.g., `{ value: 'Real Estate', label: 'Real Estate' }`). The local Zod schema's `type` field is `z.enum(['Real Estate', 'Other Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Stock', 'RSU'])`, confirming the enum members are the stored strings. Business logic (`if data.type === 'Real Estate'`) is written against these raw strings throughout the file.

**`src/features/wealth/components/AssetsSection.tsx`**  
The `assetCategories` array used to drive tab filters is `{ value: 'Real Estate', label: 'Real Estate' }` — again value = label. The filter itself is `asset.type === category` (direct equality against the stored string), so renaming a stored value without a data migration would break all existing filtered views.

**`src/features/liabilities/components/LiabilityForm.tsx`**  
The `<SearchableSelect>` options are `{ value: 'Loans', label: 'Loans' }`, `{ value: 'Credit Cards', label: 'Credit Cards' }`, `{ value: 'Other', label: 'Other' }`. Local Zod schema: `z.enum(['Loans', 'Credit Cards', 'Other'])`. The `isLoan` and `isLoanOrCreditCard` branch guards use these raw strings.

**`src/contracts/assets.ts`**  
`assetTypeSchema = z.enum(['Real Estate', 'Other Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Stock', 'RSU'])`. Used in all three exported schemas (`assetCreateSchema`, `assetUpdateSchema`, `assetEntitySchema`). This is the API contract — any rename must update this enum.

**`src/contracts/liabilities.ts`**  
`liabilityTypeSchema = z.enum(['Loans', 'Credit Cards', 'Other'])`. Used in `liabilityCreateSchema`, `liabilityUpdateSchema`, and `liabilityEntitySchema`. Same pattern — the enum IS the stored value.

**`supabase/migrations/20251228110046_create_assets_table.sql`**  
Original `assets.type` column: `CHECK (type IN ('Real Estate', 'Investments', 'Vehicles', 'Crypto', 'Other'))`. Confirms plain-text stored strings enforced by a Postgres `CHECK` constraint.

**`supabase/migrations/20251228130000_create_liabilities_table.sql`**  
`liabilities.type` column: `CHECK (type IN ('Loans', 'Credit Cards', 'Other'))`. Same pattern. This constraint is still in effect for liabilities (no subsequent migration changes it).

**`supabase/migrations/20260216120002_rename_investments_remove_other.sql`**  
Demonstrates the required migration pattern: drops the old `CHECK` constraint, adds a new one with updated values (`NOT VALID`), runs `UPDATE assets SET type = 'Other Investments' WHERE type IN ('Other', 'Investments')`, then validates the constraint. This is the exact playbook needed for any future rename.

---

## 3. Specific Values Stored/Transmitted

### Assets — current stored values (enforced by CHECK constraint)
```
'Real Estate'
'Other Investments'
'Vehicles'
'Crypto'
'Cash'
'Superannuation'
'Stock'
'RSU'
```

### Liabilities — current stored values (enforced by CHECK constraint)
```
'Loans'
'Credit Cards'
'Other'
```

---

## 4. Migration Risk

### W1c — Asset type renames (Stock→Shares, Real Estate→Property, etc.)

| Current stored value | Spec label | Risk |
|---|---|---|
| `Stock` | `Shares` | **High** — stored string must change |
| `Real Estate` | `Property` | **High** — stored string + `address`-field logic keyed on this value |
| `Superannuation` | `Super` | **High** — stored string must change |
| `Vehicles` | `Vehicle` | **High** — stored string must change |
| `RSU` | `RSUs` | **High** — stored string must change |
| `Other Investments` | `Other asset` | **High** — stored string must change |
| `Crypto`, `Cash` | unchanged | None |

> **Note on `Real Estate`:** the `AssetForm.tsx` has hard-coded `if (data.type === 'Real Estate')` branches that drive address-required validation and the submit handler. These must also be updated when the stored value changes.

### W3.2 — Liability type expansion (3 categories → 7 granular types)

| Current stored value | Spec target values | Risk |
|---|---|---|
| `Credit Cards` | `Credit card` | **High** — 1:1 rename, data migration required |
| `Loans` | `Home loan` / `Personal loan` / `Car loan` / `HECS` / `HELP debt` | **Very High** — ambiguous split; cannot determine correct new type from old data alone |
| `Other` | `Other liability` | **High** — rename, data migration required |

The liability expansion is more dangerous than asset renames because `Loans` maps to multiple new types — there is no automated way to determine whether an existing `Loans` row is a home loan vs. personal loan vs. car loan. A best-effort migration (e.g., `Loans → Personal loan`) would mislabel some records.

---

## 5. Recommendation

### W1c — Asset type renames

**Approach: Full migration (same pattern as `rename_investments_remove_other`)**

1. **Migration file** — drop old `assets_type_check`, add new one with renamed values, `UPDATE` existing rows, validate:
   ```sql
   -- Drop old constraint
   ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_type_check;
   -- Add new constraint (NOT VALID until data is migrated)
   ALTER TABLE assets ADD CONSTRAINT assets_type_check
     CHECK (type IN ('Property', 'Other asset', 'Vehicle', 'Crypto', 'Cash', 'Super', 'Shares', 'RSUs'))
     NOT VALID;
   -- Migrate existing rows
   ALTER TABLE assets DISABLE ROW LEVEL SECURITY;
   UPDATE assets SET type = 'Shares'     WHERE type = 'Stock';
   UPDATE assets SET type = 'Property'   WHERE type = 'Real Estate';
   UPDATE assets SET type = 'Super'      WHERE type = 'Superannuation';
   UPDATE assets SET type = 'Vehicle'    WHERE type = 'Vehicles';
   UPDATE assets SET type = 'RSUs'       WHERE type = 'RSU';
   UPDATE assets SET type = 'Other asset' WHERE type = 'Other Investments';
   ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
   -- Validate constraint
   ALTER TABLE assets VALIDATE CONSTRAINT assets_type_check;
   ```

2. **`src/contracts/assets.ts`** — update `assetTypeSchema` enum to new values.

3. **`src/features/assets/components/AssetForm.tsx`** — update: select option values, all `data.type === 'X'` branch guards (especially `'Real Estate'`, `'Stock'`, `'RSU'`, `'Superannuation'`), and the local schema enum.

4. **`src/features/wealth/components/AssetsSection.tsx`** — update `assetCategories` value/label pairs.

5. Any other file with hard-coded references to the old strings (search codebase for `'Real Estate'`, `'Superannuation'`, `'Vehicles'`, `'Stock'`, `'RSU'`, `'Other Investments'`).

### W3.2 — Liability type expansion

**Approach: Migration + user-facing notice (cannot automate split of `Loans`)**

1. **Migration file** — update CHECK constraint to the 7 new values:
   ```sql
   ALTER TABLE liabilities DROP CONSTRAINT IF EXISTS liabilities_type_check;
   ALTER TABLE liabilities ADD CONSTRAINT liabilities_type_check
     CHECK (type IN ('Home loan', 'Personal loan', 'Car loan', 'Credit card', 'HECS', 'HELP debt', 'Other liability'))
     NOT VALID;
   ALTER TABLE liabilities DISABLE ROW LEVEL SECURITY;
   -- Best-effort renames (unambiguous)
   UPDATE liabilities SET type = 'Credit card'    WHERE type = 'Credit Cards';
   UPDATE liabilities SET type = 'Other liability' WHERE type = 'Other';
   -- Ambiguous: map Loans to 'Personal loan' as a safe default
   UPDATE liabilities SET type = 'Personal loan'  WHERE type = 'Loans';
   ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;
   ALTER TABLE liabilities VALIDATE CONSTRAINT liabilities_type_check;
   ```

2. **Product decision required:** Existing `Loans` records will be defaulted to `Personal loan`. Consider surfacing a one-time prompt on the liabilities page for users with existing loan records to reclassify them. This is a UX decision, not a technical blocker.

3. **`src/contracts/liabilities.ts`** — update `liabilityTypeSchema` enum.

4. **`src/features/liabilities/components/LiabilityForm.tsx`** — update select options and all `isLoan`/`isLoanOrCreditCard` branch guards.

---

## Summary Table

| Dimension | Assets (W1c) | Liabilities (W3.2) |
|---|---|---|
| Architecture | Stored as human-readable strings | Stored as human-readable strings |
| DB constraint | `CHECK` on `assets.type` | `CHECK` on `liabilities.type` |
| Key≠Label separation | None | None |
| Display-layer-only transform safe? | No | No |
| Migration required? | Yes — all 6 renames | Yes — 3 renames + ambiguous split |
| Data loss risk | Low (deterministic renames) | Medium (`Loans` → ambiguous, needs default) |
| Rollback path | Reverse UPDATE + constraint swap | Reverse UPDATE (Loans recovery lossy) |
