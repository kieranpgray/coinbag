import { describe, it, expect } from 'vitest';
import { canView, canEdit, canAdmin } from '../permissionHelpers';

describe('permissionHelpers', () => {
  describe('canView', () => {
    it('returns true for admin', () => {
      expect(canView('admin')).toBe(true);
    });
    it('returns true for edit', () => {
      expect(canView('edit')).toBe(true);
    });
    it('returns true for read', () => {
      expect(canView('read')).toBe(true);
    });
  });

  describe('canEdit', () => {
    it('returns true for admin', () => {
      expect(canEdit('admin')).toBe(true);
    });
    it('returns true for edit', () => {
      expect(canEdit('edit')).toBe(true);
    });
    it('returns false for read', () => {
      expect(canEdit('read')).toBe(false);
    });
  });

  describe('canAdmin', () => {
    it('returns true for admin', () => {
      expect(canAdmin('admin')).toBe(true);
    });
    it('returns false for edit', () => {
      expect(canAdmin('edit')).toBe(false);
    });
    it('returns false for read', () => {
      expect(canAdmin('read')).toBe(false);
    });
  });
});
