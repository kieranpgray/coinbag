import { formatCurrency } from '@/lib/utils';
import { LiabilityPortfolioRow } from './LiabilityPortfolioRow';
import {
  CreditCard,
  Home,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import type { Liability } from '@/types/domain';

interface LiabilityCategoryGroupProps {
  categoryName: string;
  liabilities: Liability[];
  onEdit: (liability: Liability) => void;
  onDelete: (liability: Liability) => void;
}

/**
 * Icon mapping for liability categories
 */
const LIABILITY_CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Credit Cards': CreditCard,
  'Loans': Home,
  'Other': FileText,
};

/**
 * Category group component for liabilities
 * Displays a section header with red accent, list of liabilities, and category total
 */
export function LiabilityCategoryGroup({
  categoryName,
  liabilities,
  onEdit,
  onDelete: _onDelete,
}: LiabilityCategoryGroupProps) {
  const categoryTotal = liabilities.reduce((sum, liability) => sum + liability.balance, 0);

  if (liabilities.length === 0) {
    return null; // Don't render empty categories
  }

  const CategoryIcon = LIABILITY_CATEGORY_ICONS[categoryName] || FileText;

  return (
    <div className="mb-6 last:mb-0">
      {/* Section header with icon */}
      <div className="flex items-center gap-2 mb-2">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <CategoryIcon className="h-5 w-5 text-primary dark:text-iconAccent" aria-hidden="true" />
        </div>
        <h3 className="text-h3 font-semibold text-foreground">{categoryName}</h3>
      </div>

      {/* Liability rows */}
      <div className="mt-1 border border-border rounded-lg bg-surface shadow-sm overflow-hidden">
        {liabilities.map((liability) => (
          <LiabilityPortfolioRow key={liability.id} liability={liability} onClick={onEdit} />
        ))}

        {/* Category total row */}
        <div className="flex items-center justify-end py-3 px-4 border-t-2 border-border bg-muted/50">
          <span className="text-body-lg font-bold text-foreground">
            {formatCurrency(categoryTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
