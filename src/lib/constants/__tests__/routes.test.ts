import { describe, expect, it } from 'vitest';
import { NAVIGATION_ITEMS, ROUTES } from '../routes';

describe('NAVIGATION_ITEMS', () => {
  it('does not include Activity in primary navigation', () => {
    expect(NAVIGATION_ITEMS.some((item) => item.name === 'Activity')).toBe(false);
    expect(NAVIGATION_ITEMS.some((item) => item.path === ROUTES.app.accounts)).toBe(false);
  });
});

describe('ROUTES.app.transfersEdit', () => {
  it('returns Allocate URL with edit query for Recurring CTAs', () => {
    expect(ROUTES.app.transfersEdit()).toBe('/app/transfers?edit=1');
  });
});
