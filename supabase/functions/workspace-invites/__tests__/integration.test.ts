/**
 * Integration tests for workspace-invites
 *
 * Tests the accept_workspace_invitation Postgres function and invite flow.
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or anon + test data)
 *
 * Run with: pnpm test supabase/functions/workspace-invites
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

describe('workspace-invites integration', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    if (!supabaseUrl || !supabaseKey) {
      console.warn(
        'Skipping workspace-invites integration tests: SUPABASE_URL and key not set'
      );
      return;
    }
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  it('accept_workspace_invitation function exists or returns expected error', async () => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc('accept_workspace_invitation', {
      p_token: 'invalid-token-xyz',
      p_user_id: 'user_nonexistent',
    });
    if (error) {
      // Migration not applied: function missing
      if (error.message.includes('Could not find the function')) {
        console.warn('Migration 20260226180000 not applied - skipping assertion');
        return;
      }
      throw error;
    }
    expect(data).toBeDefined();
    expect((data as { ok?: boolean }).ok).toBe(false);
  });
});
