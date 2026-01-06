import { useState, useEffect, useCallback, useRef } from 'react';

export interface TypewriterOptions {
  phrases: readonly string[];
  typeSpeed?: number;
  deleteSpeed?: number;
  pauseBeforeNext?: number;
  pauseAfterComplete?: number;
  loop?: boolean;
  cursor?: boolean;
}

export interface TypewriterResult {
  displayText: string;
  isTyping: boolean;
  isDeleting: boolean;
  showCursor: boolean;
}

/**
 * Custom hook for typewriter animation effect
 * Respects prefers-reduced-motion accessibility setting
 */
export function useTypewriter(options: TypewriterOptions): TypewriterResult {
  const {
    phrases,
    typeSpeed = 56,
    deleteSpeed = 28,
    pauseBeforeNext = 300,
    pauseAfterComplete = 1200,
    loop = true,
    cursor = true,
  } = options;

  const [displayText, setDisplayText] = useState('');
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(cursor);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const currentPhrase = phrases[currentPhraseIndex] || '';

  const resetAnimation = useCallback(() => {
    setDisplayText('');
    setCurrentPhraseIndex(0);
    setCurrentCharIndex(0);
    setIsTyping(true);
    setIsDeleting(false);
  }, []);

  useEffect(() => {
    // If user prefers reduced motion, show static first phrase
    if (prefersReducedMotion) {
      setDisplayText(phrases[0] || '');
      setIsTyping(false);
      setIsDeleting(false);
      setShowCursor(false);
      return;
    }

    // Handle paused state between typing and deleting
    if (!isTyping && !isDeleting && currentCharIndex === currentPhrase.length) {
      // We've finished typing, wait for pauseAfterComplete before starting deletion
      pauseTimeoutRef.current = setTimeout(() => {
        setIsDeleting(true);
        pauseTimeoutRef.current = null;
      }, pauseAfterComplete);
      return () => {
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current);
          pauseTimeoutRef.current = null;
        }
      };
    }

    // Handle paused state between deleting and typing next phrase
    if (!isTyping && !isDeleting && currentCharIndex === 0) {
      // We've finished deleting, wait for pauseBeforeNext before starting next phrase
      pauseTimeoutRef.current = setTimeout(() => {
        const nextPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
        if (!loop && nextPhraseIndex === 0) {
          // End of loop, reset to first phrase
          resetAnimation();
        } else {
          setCurrentPhraseIndex(nextPhraseIndex);
          setIsTyping(true);
        }
        pauseTimeoutRef.current = null;
      }, pauseBeforeNext);
      return () => {
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current);
          pauseTimeoutRef.current = null;
        }
      };
    }

    // Run animation for typing or deleting
    const timeout = setTimeout(() => {
      if (isTyping) {
        if (currentCharIndex < currentPhrase.length) {
          // Continue typing
          setDisplayText(currentPhrase.slice(0, currentCharIndex + 1));
          setCurrentCharIndex(prev => prev + 1);
        } else {
          // Finished typing - transition to paused state
          setIsTyping(false);
        }
      } else if (isDeleting) {
        if (currentCharIndex > 0) {
          // Continue deleting
          setDisplayText(currentPhrase.slice(0, currentCharIndex - 1));
          setCurrentCharIndex(prev => prev - 1);
        } else {
          // Finished deleting - transition to paused state
          setIsDeleting(false);
        }
      }
    }, isTyping ? typeSpeed : deleteSpeed);

    return () => {
      clearTimeout(timeout);
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
    };
  }, [
    currentPhrase,
    currentCharIndex,
    currentPhraseIndex,
    isTyping,
    isDeleting,
    typeSpeed,
    deleteSpeed,
    pauseBeforeNext,
    pauseAfterComplete,
    loop,
    phrases,
    prefersReducedMotion,
    resetAnimation,
  ]);

  return {
    displayText,
    isTyping,
    isDeleting,
    showCursor,
  };
}
