import { ReactNode } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { formatCurrency } from '@/lib/utils';

interface PrivacyWrapperProps {
  value: number;
  children?: ReactNode;
}

/**
 * Component that conditionally hides sensitive financial information
 * based on privacy mode setting
 */
export function PrivacyWrapper({ value, children }: PrivacyWrapperProps) {
  const { privacyMode } = useTheme();

  if (privacyMode) {
    return <span className="select-none">••••</span>;
  }

  return <>{children || formatCurrency(value)}</>;
}

