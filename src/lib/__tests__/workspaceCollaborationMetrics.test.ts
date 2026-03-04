/**
 * Workspace collaboration metrics tests.
 * Verifies event emission and custom event dispatch for analytics wiring.
 */

import { describe, it, expect } from 'vitest';
import {
  trackInviteAcceptance,
  trackMultiMemberWorkspace,
  trackSwitcherUsage,
  trackPermissionFailure,
} from '../workspaceCollaborationMetrics';

describe('workspaceCollaborationMetrics', () => {
  it('trackInviteAcceptance dispatches custom event', () => {
    const events: CustomEvent[] = [];
    const handler = (e: Event) => events.push(e as CustomEvent);
    window.addEventListener('wellthy:workspace-metric', handler);

    trackInviteAcceptance('ws-123', 'edit');

    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({
      name: 'invite_acceptance',
      workspaceId: 'ws-123',
      role: 'edit',
    });
    window.removeEventListener('wellthy:workspace-metric', handler);
  });

  it('trackSwitcherUsage does not dispatch when from and to are same', () => {
    const events: CustomEvent[] = [];
    const handler = (e: Event) => events.push(e as CustomEvent);
    window.addEventListener('wellthy:workspace-metric', handler);

    trackSwitcherUsage('ws-1', 'ws-1');

    expect(events).toHaveLength(0);
    window.removeEventListener('wellthy:workspace-metric', handler);
  });

  it('trackSwitcherUsage dispatches when from and to differ', () => {
    const events: CustomEvent[] = [];
    const handler = (e: Event) => events.push(e as CustomEvent);
    window.addEventListener('wellthy:workspace-metric', handler);

    trackSwitcherUsage('ws-1', 'ws-2');

    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({
      name: 'switcher_usage',
      fromWorkspaceId: 'ws-1',
      toWorkspaceId: 'ws-2',
    });
    window.removeEventListener('wellthy:workspace-metric', handler);
  });

  it('trackMultiMemberWorkspace does not dispatch when memberCount < 2', () => {
    const events: CustomEvent[] = [];
    const handler = (e: Event) => events.push(e as CustomEvent);
    window.addEventListener('wellthy:workspace-metric', handler);

    trackMultiMemberWorkspace('ws-1', 1);

    expect(events).toHaveLength(0);
    window.removeEventListener('wellthy:workspace-metric', handler);
  });

  it('trackPermissionFailure dispatches custom event', () => {
    const events: CustomEvent[] = [];
    const handler = (e: Event) => events.push(e as CustomEvent);
    window.addEventListener('wellthy:workspace-metric', handler);

    trackPermissionFailure('ws-1', 'update_member', 'read');

    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({
      name: 'permission_failure',
      workspaceId: 'ws-1',
      action: 'update_member',
      role: 'read',
    });
    window.removeEventListener('wellthy:workspace-metric', handler);
  });
});
