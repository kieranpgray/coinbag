/**
 * Konami Code Hook
 * 
 * Detects the Konami code sequence: ↑↑↓↓←→←→BA
 * Web-friendly version: ↑↑↓↓←→←→EnterSpace
 */

import { useEffect, useState, useCallback } from 'react';

// Konami code sequence for web: ArrowUp, ArrowUp, ArrowDown, ArrowDown, ArrowLeft, ArrowRight, ArrowLeft, ArrowRight, Enter, Space
const KONAMI_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'Enter',
  ' ',
];

const SEQUENCE_TIMEOUT_MS = 3000; // Reset sequence after 3 seconds of inactivity

export function useKonamiCode(): boolean {
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [isActivated, setIsActivated] = useState(false);
  const [lastKeyTime, setLastKeyTime] = useState<number | null>(null);

  const resetSequence = useCallback(() => {
    setSequenceIndex(0);
    setLastKeyTime(null);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const now = Date.now();

      // Reset if too much time has passed since last key
      if (lastKeyTime !== null && now - lastKeyTime > SEQUENCE_TIMEOUT_MS) {
        resetSequence();
        return;
      }

      const expectedKey = KONAMI_SEQUENCE[sequenceIndex];
      const pressedKey = event.key;

      if (pressedKey === expectedKey) {
        const newIndex = sequenceIndex + 1;
        setSequenceIndex(newIndex);
        setLastKeyTime(now);

        // Check if sequence is complete
        if (newIndex === KONAMI_SEQUENCE.length) {
          setIsActivated(true);
          resetSequence();
        }
      } else {
        // Wrong key, reset sequence
        resetSequence();
      }
    },
    [sequenceIndex, lastKeyTime, resetSequence]
  );

  useEffect(() => {
    // Don't attach listener if already activated (prevents re-triggering)
    if (isActivated) {
      return;
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, isActivated]);

  // Reset activation after it's been triggered (allows re-activation)
  useEffect(() => {
    if (isActivated) {
      const timer = setTimeout(() => {
        setIsActivated(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isActivated]);

  return isActivated;
}

