import { describe, it, expect } from 'vitest';
import {
  getLatestMigrationVersion,
  formatMigrationVersion,
  extractSupabaseProjectId,
} from '../migrationVersion';

describe('migrationVersion', () => {
  describe('getLatestMigrationVersion', () => {
    it('returns a valid migration version', () => {
      const version = getLatestMigrationVersion();
      expect(version).toBeTruthy();
      expect(version).not.toBe('unknown');
      expect(version.length).toBe(14); // YYYYMMDDHHMMSS format
    });
  });

  describe('formatMigrationVersion', () => {
    it('formats valid migration version correctly', () => {
      const formatted = formatMigrationVersion('20251228180000');
      expect(formatted).toBe('2025-12-28 18:00:00');
    });

    it('returns "unknown" for unknown version', () => {
      const formatted = formatMigrationVersion('unknown');
      expect(formatted).toBe('unknown');
    });

    it('returns original string for invalid format', () => {
      const formatted = formatMigrationVersion('invalid');
      expect(formatted).toBe('invalid');
    });

    it('handles short strings', () => {
      const formatted = formatMigrationVersion('123');
      expect(formatted).toBe('123');
    });
  });

  describe('extractSupabaseProjectId', () => {
    it('extracts project ID from valid Supabase URL', () => {
      const projectId = extractSupabaseProjectId('https://abc123xyz.supabase.co');
      expect(projectId).toBe('abc123xyz');
    });

    it('returns "unknown" for undefined URL', () => {
      const projectId = extractSupabaseProjectId(undefined);
      expect(projectId).toBe('unknown');
    });

    it('returns "unknown" for invalid URL format', () => {
      const projectId = extractSupabaseProjectId('https://example.com');
      expect(projectId).toBe('unknown');
    });

    it('handles URLs with paths', () => {
      const projectId = extractSupabaseProjectId('https://abc123xyz.supabase.co/rest/v1');
      expect(projectId).toBe('abc123xyz');
    });
  });
});

