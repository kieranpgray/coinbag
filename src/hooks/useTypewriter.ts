import { useState, useEffect, useCallback } from 'react';

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

    const timeout = setTimeout(() => {
      if (isTyping) {
        if (currentCharIndex < currentPhrase.length) {
          // Continue typing
          setDisplayText(currentPhrase.slice(0, currentCharIndex + 1));
          setCurrentCharIndex(prev => prev + 1);
        } else {
          // Finished typing current phrase, pause then start deleting
          setIsTyping(false);
          setIsDeleting(true);
          setTimeout(() => {
            setIsDeleting(true);
          }, pauseAfterComplete);
        }
      } else if (isDeleting) {
        if (currentCharIndex > 0) {
          // Continue deleting
          setDisplayText(currentPhrase.slice(0, currentCharIndex - 1));
          setCurrentCharIndex(prev => prev - 1);
        } else {
          // Finished deleting, move to next phrase or loop
          setIsDeleting(false);
          setTimeout(() => {
            const nextPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
            if (!loop && nextPhraseIndex === 0) {
              // End of loop, reset to first phrase
              resetAnimation();
            } else {
              setCurrentPhraseIndex(nextPhraseIndex);
              setIsTyping(true);
            }
          }, pauseBeforeNext);
        }
      }
    }, isTyping ? typeSpeed : deleteSpeed);

    return () => clearTimeout(timeout);
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
