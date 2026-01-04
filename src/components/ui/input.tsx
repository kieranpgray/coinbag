import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Input component styled to match Atlassian Design System TextField.
 * 
 * Features:
 * - Clean borders and subtle focus states
 * - Optional clear-on-focus behavior for prefilled values
 * - Full backward compatibility with standard HTML input props
 * 
 * @example
 * // Basic usage
 * <Input type="text" placeholder="Enter name" />
 * 
 * @example
 * // With clear-on-focus for prefilled $0 values
 * <Input 
 *   type="number" 
 *   clearOnFocus 
 *   clearValue={0} 
 *   placeholder="0.00"
 *   {...register('amount', { valueAsNumber: true })}
 * />
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * If true, clears the input value when focused if it matches clearValue.
   * Useful for prefilled values like $0 that should disappear when user clicks into the field.
   * 
   * The clearing only happens on the first focus if the value matches clearValue.
   * After clearing, the field will be empty (not 0, not null) to allow user input.
   * 
   * @default false
   */
  clearOnFocus?: boolean;
  /**
   * The value to clear when clearOnFocus is true and the input is focused.
   * Can be a string or number (e.g., 0, "0", "0.00").
   * 
   * The component will check if the current value equals clearValue (with type coercion)
   * and clear it if they match.
   * 
   * @example
   * clearValue={0} // Clears when value is 0
   * clearValue="0.00" // Clears when value is "0.00"
   */
  clearValue?: string | number;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, clearOnFocus, clearValue, onFocus, onChange, value, ...props }, ref) => {
    const [hasCleared, setHasCleared] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    // Check for error state via aria-invalid or className (before spreading props)
    const hasError = props['aria-invalid'] === 'true' || className?.includes('border-destructive');

    const handleFocus = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        // Clear-on-focus logic: only clear on first focus if value matches clearValue
        if (clearOnFocus && !hasCleared && clearValue !== undefined) {
          const currentValue = value ?? '';
          const shouldClear =
            currentValue === clearValue ||
            currentValue === String(clearValue) ||
            (typeof clearValue === 'number' && Number(currentValue) === clearValue);

          if (shouldClear && onChange) {
            // Clear the value by setting it to empty string
            const syntheticEvent = {
              ...e,
              target: { ...e.target, value: '' },
              currentTarget: { ...e.currentTarget, value: '' },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
            setHasCleared(true);
          }
        }

        // Call original onFocus handler
        onFocus?.(e);
      },
      [clearOnFocus, clearValue, hasCleared, value, onChange, onFocus]
    );

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        // Reset hasCleared flag if user manually changes the value
        if (hasCleared && e.target.value !== '') {
          setHasCleared(false);
        }
        onChange?.(e);
      },
      [hasCleared, onChange]
    );

    // Reset hasCleared when value changes externally (e.g., form reset)
    React.useEffect(() => {
      if (value !== undefined && value !== '' && value !== clearValue) {
        setHasCleared(false);
      }
    }, [value, clearValue]);

    return (
      <input
        type={type}
        className={cn(
          // Design system styling: 12px border radius, clean borders, subtle focus states
          'flex h-10 w-full rounded-[12px] border bg-background px-3 py-2 text-sm text-foreground',
          // Border color: error state takes priority, then default
          hasError ? 'border-destructive' : 'border-border',
          'placeholder:text-muted-foreground',
          // Subtle hover state (not on error state)
          !hasError && 'hover:border-neutral-mid',
          // Subtle focus ring (not heavy)
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
          hasError 
            ? 'focus-visible:ring-destructive/20 focus-visible:border-destructive' 
            : 'focus-visible:ring-primary/20 focus-visible:border-primary',
          // Disabled state
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted disabled:hover:border-border',
          // File input styling
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className
        )}
        ref={inputRef}
        value={value}
        onFocus={handleFocus}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };

