import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKonamiCode } from '../useKonamiCode';

describe('useKonamiCode', () => {
  let mockKeyDown: ((event: KeyboardEvent) => void) | null = null;

  beforeEach(() => {
    // Mock addEventListener to capture the handler
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = vi.fn((event: string, handler: EventListener) => {
      if (event === 'keydown') {
        mockKeyDown = handler as (event: KeyboardEvent) => void;
      }
      return originalAddEventListener.call(window, event, handler);
    });

    const originalRemoveEventListener = window.removeEventListener;
    window.removeEventListener = vi.fn((event: string, handler: EventListener) => {
      if (event === 'keydown') {
        mockKeyDown = null;
      }
      return originalRemoveEventListener.call(window, event, handler);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const simulateKeyPress = (key: string) => {
    if (mockKeyDown) {
      act(() => {
        mockKeyDown!(new KeyboardEvent('keydown', { key }));
      });
    }
  };

  it('returns false initially', () => {
    const { result } = renderHook(() => useKonamiCode());
    expect(result.current).toBe(false);
  });

  it('detects complete Konami code sequence', () => {
    const { result } = renderHook(() => useKonamiCode());

    // Enter full sequence: ↑↑↓↓←→←→EnterSpace
    simulateKeyPress('ArrowUp');
    simulateKeyPress('ArrowUp');
    simulateKeyPress('ArrowDown');
    simulateKeyPress('ArrowDown');
    simulateKeyPress('ArrowLeft');
    simulateKeyPress('ArrowRight');
    simulateKeyPress('ArrowLeft');
    simulateKeyPress('ArrowRight');
    simulateKeyPress('Enter');
    simulateKeyPress(' ');

    expect(result.current).toBe(true);
  });

  it('resets sequence on wrong key', () => {
    const { result } = renderHook(() => useKonamiCode());

    // Start sequence correctly
    simulateKeyPress('ArrowUp');
    simulateKeyPress('ArrowUp');
    // Wrong key
    simulateKeyPress('a');

    // Should reset, so continuing won't complete
    simulateKeyPress('ArrowDown');
    simulateKeyPress('ArrowDown');
    simulateKeyPress('ArrowLeft');
    simulateKeyPress('ArrowRight');
    simulateKeyPress('ArrowLeft');
    simulateKeyPress('ArrowRight');
    simulateKeyPress('Enter');
    simulateKeyPress(' ');

    expect(result.current).toBe(false);
  });

  it('resets sequence after timeout', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useKonamiCode());

    // Start sequence
    simulateKeyPress('ArrowUp');
    simulateKeyPress('ArrowUp');

    // Wait longer than timeout (3 seconds)
    act(() => {
      vi.advanceTimersByTime(3100);
    });

    // Continue sequence - should have reset
    simulateKeyPress('ArrowDown');
    simulateKeyPress('ArrowDown');
    simulateKeyPress('ArrowLeft');
    simulateKeyPress('ArrowRight');
    simulateKeyPress('ArrowLeft');
    simulateKeyPress('ArrowRight');
    simulateKeyPress('Enter');
    simulateKeyPress(' ');

    expect(result.current).toBe(false);

    vi.useRealTimers();
  });

  it('allows re-activation after completion', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useKonamiCode());

    // Complete sequence once
    simulateKeyPress('ArrowUp');
    simulateKeyPress('ArrowUp');
    simulateKeyPress('ArrowDown');
    simulateKeyPress('ArrowDown');
    simulateKeyPress('ArrowLeft');
    simulateKeyPress('ArrowRight');
    simulateKeyPress('ArrowLeft');
    simulateKeyPress('ArrowRight');
    simulateKeyPress('Enter');
    simulateKeyPress(' ');

    expect(result.current).toBe(true);

    // Wait for reset (100ms timeout in useEffect)
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should be able to activate again
    simulateKeyPress('ArrowUp');
    simulateKeyPress('ArrowUp');
    simulateKeyPress('ArrowDown');
    simulateKeyPress('ArrowDown');
    simulateKeyPress('ArrowLeft');
    simulateKeyPress('ArrowRight');
    simulateKeyPress('ArrowLeft');
    simulateKeyPress('ArrowRight');
    simulateKeyPress('Enter');
    simulateKeyPress(' ');

    expect(result.current).toBe(true);

    vi.useRealTimers();
  });
});

