import { useRef, useCallback } from 'react';

/**
 * Hook that debounces a callback function
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced version of the callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  // ReturnType<typeof setTimeout> works in browser and Node; NodeJS.Timeout requires @types/node
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  return debouncedCallback;
}
