/**
 * Migration verification tests - validates migration SQL structure.
 * Run full verification with: psql $DATABASE_URL -f scripts/check-workspace-migration.sql
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_DIR = join(
  process.cwd(),
  'supabase',
  'migrations'
);

describe('Migration verification (structure)', () => {
  describe('workspaces schema migration', () => {
    it('contains workspace_role enum', () => {
      const content = readFileSync(
        join(MIGRATIONS_DIR, '20260226000000_create_workspaces_schema.sql'),
        'utf-8'
      );
      expect(content).toContain("CREATE TYPE workspace_role");
      expect(content).toContain("'admin'");
      expect(content).toContain("'edit'");
      expect(content).toContain("'read'");
    });

    it('contains workspaces table with RLS', () => {
      const content = readFileSync(
        join(MIGRATIONS_DIR, '20260226000000_create_workspaces_schema.sql'),
        'utf-8'
      );
      expect(content).toContain('CREATE TABLE IF NOT EXISTS workspaces');
      expect(content).toContain('ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY');
    });

    it('contains workspace_memberships unique constraint (workspace_id, user_id)', () => {
      const content = readFileSync(
        join(MIGRATIONS_DIR, '20260226000000_create_workspaces_schema.sql'),
        'utf-8'
      );
      expect(content).toContain('UNIQUE (workspace_id, user_id)');
    });

    it('contains workspace_invitations partial unique for pending', () => {
      const content = readFileSync(
        join(MIGRATIONS_DIR, '20260226000000_create_workspaces_schema.sql'),
        'utf-8'
      );
      expect(content).toContain('idx_workspace_invitations_pending_unique');
      expect(content).toContain('WHERE accepted_at IS NULL');
    });
  });

  describe('accept_workspace_invitation function', () => {
    it('exists in migration and is SECURITY DEFINER', () => {
      const content = readFileSync(
        join(MIGRATIONS_DIR, '20260226180000_workspace_invite_accept_function.sql'),
        'utf-8'
      );
      expect(content).toContain('accept_workspace_invitation');
      expect(content).toContain('SECURITY DEFINER');
    });
  });

  describe('check-workspace-migration.sql script', () => {
    it('exists and asserts workspace tables', () => {
      const content = readFileSync(
        join(process.cwd(), 'scripts', 'check-workspace-migration.sql'),
        'utf-8'
      );
      expect(content).toContain('workspaces');
      expect(content).toContain('workspace_memberships');
      expect(content).toContain('workspace_invitations');
      expect(content).toContain('RAISE EXCEPTION');
    });
  });
});
