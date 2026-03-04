/**
 * TDD-focused tests for workspace collaboration config and rollout stages.
 * Note: import.meta.env is replaced at build time; stage/percentage tests
 * require VITE_WORKSPACE_COLLAB_* env vars to be set in test environment.
 */

import { describe, it, expect } from 'vitest';
import {
  getWorkspaceCollaborationRolloutStage,
  isWorkspaceCollaborationEnabledForUser,
} from '../workspaceCollaborationConfig';

describe('workspaceCollaborationConfig', () => {
  describe('getWorkspaceCollaborationRolloutStage', () => {
    it('returns a valid stage (off | internal | percentage | full)', () => {
      const stage = getWorkspaceCollaborationRolloutStage();
      expect(['off', 'internal', 'percentage', 'full']).toContain(stage);
    });
  });

  describe('isWorkspaceCollaborationEnabledForUser', () => {
    it('returns false when userId is undefined', () => {
      expect(isWorkspaceCollaborationEnabledForUser(undefined)).toBe(false);
    });

    it('returns false when userId is empty string', () => {
      expect(isWorkspaceCollaborationEnabledForUser('')).toBe(false);
    });

    it('returns consistent result for same userId (deterministic)', () => {
      const result1 = isWorkspaceCollaborationEnabledForUser('user_abc');
      const result2 = isWorkspaceCollaborationEnabledForUser('user_abc');
      expect(result1).toBe(result2);
    });
  });
});
