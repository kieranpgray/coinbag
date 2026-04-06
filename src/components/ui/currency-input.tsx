import * as React from 'react';
import { cn } from '@/lib/utils';
import { formatNumber, parseFormattedNumber } from '@/lib/utils';
import { DEFAULT_LOCALE } from '@/lib/localeRegistry';

/**
 * CurrencyInput component for formatted currency input with comma separators
 *
 * Features:
 * - Displays values with comma-separated thousands (e.g., "1,000,000.00")
 * - Parses user input back to numbers, handling commas and currency symbols
 * - Supports clearOnFocus behavior like the Input component
 * - Controlled component with value/onChange pattern
 *
 * @example
 * <CurrencyInput
 *   value={assetValue}
 *   onChange={setAssetValue}
 *   placeholder="0.00"
 *   decimalPlaces={2}
 * />
 */
export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Current numeric value */
  value: number | undefined;
  /** Callback when value changes */
  onChange: (value: number | undefined) => void;
  /** Number of decimal places to display (defaults to 2) */
  decimalPlaces?: number;
  /** Locale for formatting (defaults to DEFAULT_LOCALE) */
  locale?: string;
  /** Clear value when focused if it matches clearValue */
  clearOnFocus?: boolean;
  /** Value to clear on focus (works with clearOnFocus) */
  clearValue?: string | number;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({
    className,
    value,
    onChange,
    decimalPlaces = 2,
    locale = DEFAULT_LOCALE,
    clearOnFocus,
    clearValue,
    onFocus,
    onBlur,
    'aria-invalid': ariaInvalid,
    ...props
  }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('');
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasCleared, setHasCleared] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    // Update display value when value prop changes and not focused
    React.useEffect(() => {
      if (!isFocused && value !== undefined && !isNaN(value)) {
        const formatted = formatNumber(value, locale, {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        });
        setDisplayValue(formatted);
      } else if (!isFocused && (value === undefined || isNaN(value))) {
        setDisplayValue('');
      }
    }, [value, isFocused, decimalPlaces, locale]);

    const handleFocus = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);

      // Clear-on-focus logic: only clear on first focus if value matches clearValue
      if (clearOnFocus && !hasCleared && clearValue !== undefined) {
        const currentValue = value;
        const shouldClear =
          currentValue === clearValue ||
          currentValue === Number(clearValue) ||
          (typeof clearValue === 'number' && Number(currentValue) === clearValue);

        if (shouldClear) {
          setDisplayValue('');
          onChange(undefined);
          setHasCleared(true);
        }
      }

      onFocus?.(e);
    }, [clearOnFocus, clearValue, hasCleared, value, onChange, onFocus]);

    const handleBlur = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);

      // Parse and validate the current display value
      const parsed = parseFormattedNumber(displayValue, locale);

      // Update the value and re-format for display
      if (parsed !== undefined && !isNaN(parsed)) {
        onChange(parsed);
        const formatted = formatNumber(parsed, locale, {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        });
        setDisplayValue(formatted);
      } else if (displayValue.trim() === '') {
        onChange(undefined);
        setDisplayValue('');
      } else {
        // Invalid input - revert to current value
        if (value !== undefined && !isNaN(value)) {
          const formatted = formatNumber(value, locale, {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
          });
          setDisplayValue(formatted);
        } else {
          setDisplayValue('');
        }
      }

      onBlur?.(e);
    }, [displayValue, locale, decimalPlaces, onChange, value, onBlur]);

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setDisplayValue(e.target.value);
      // Don't call onChange here - we parse on blur
    }, []);

    const hasError =
      ariaInvalid === true ||
      ariaInvalid === 'true' ||
      className?.includes('border-destructive');

    return (
      <input
        {...props}
        ref={inputRef}
        type="text"
        aria-invalid={ariaInvalid}
        className={cn(
          'flex min-h-[42px] h-10 w-full rounded-[12px] border bg-background px-3 py-2 text-body text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          hasError
            ? 'border-[color:var(--danger)] shadow-[0_0_0_3px_rgba(192,57,43,0.1)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(192,57,43,0.15)] focus-visible:border-[color:var(--danger)]'
            : 'border-border hover:border-neutral-mid focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--focus-ring)] focus-visible:border-primary',
          className
        )}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        inputMode="decimal"
        autoComplete="off"
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };