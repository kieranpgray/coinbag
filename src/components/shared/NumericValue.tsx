import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface NumericValueProps {
  value: number | string;
  size?: 'primary' | 'secondary' | 'tertiary';
  emphasis?: 'bold' | 'semibold' | 'normal';
  responsive?: boolean;
  className?: string;
  children?: ReactNode; // For PrivacyWrapper compatibility
}

/**
 * NumericValue component for consistent numeric display across the app
 * 
 * Size variants:
 * - primary: text-data-lg (28.8px) - page-level totals
 * - secondary: text-xl (20px) - card values
 * - tertiary: text-lg (18px) - breakdown values
 * 
 * @example
 * <NumericValue value={totalAssets} size="primary" />
 * <NumericValue value={cardValue} size="secondary" />
 */
export function NumericValue({
  value,
  size = 'secondary',
  emphasis = 'bold',
  responsive = false,
  className,
  children,
}: NumericValueProps) {
  const sizeClasses = {
    primary: responsive
      ? 'text-data-lg-sm sm:text-data-lg-md lg:text-data-lg-lg'
      : 'text-data-lg',
    secondary: 'text-xl',
    tertiary: 'text-lg',
  };

  const emphasisClasses = {
    bold: 'font-bold',
    semibold: 'font-semibold',
    normal: 'font-normal',
  };

  return (
    <span
      className={cn(
        sizeClasses[size],
        emphasisClasses[emphasis],
        'text-foreground',
        className
      )}
    >
      {children || value}
    </span>
  );
}

