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
 * - primary: text-display (28px) - hero KPIs, page-level totals
 * - secondary: text-balance (24px) - card-level values
 * - tertiary: text-body-lg (16px) - account-level, breakdown values
 *
 * @example
 * <NumericValue value={totalAssets} size="primary" responsive />
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
      ? 'text-display-sm sm:text-display-md lg:text-display-lg'
      : 'text-display',
    secondary: responsive
      ? 'text-balance-sm sm:text-balance-md lg:text-balance-lg'
      : 'text-balance',
    tertiary: 'text-body-lg',
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

