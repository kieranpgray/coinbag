import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { LiabilityCategoryGroup } from './LiabilityCategoryGroup';
import type { Liability } from '@/types/domain';

interface LiabilityPortfolioSectionProps {
  totalLiabilities: number;
  liabilities: Liability[];
  onCreate: () => void;
  onEdit: (liability: Liability) => void;
  onDelete: (liability: Liability) => void;
}

/**
 * Liability categories in display order
 */
const LIABILITY_CATEGORIES: Array<Liability['type']> = [
  'Home loan',
  'Personal loan',
  'Car loan',
  'Credit card',
  'HECS / HELP debt',
  'Other liability',
];

/**
 * Portfolio section component for liabilities
 * Groups liabilities by category and displays them in a responsive grid layout
 */
export function LiabilityPortfolioSection({
  totalLiabilities,
  liabilities,
  onCreate,
  onEdit,
  onDelete,
}: LiabilityPortfolioSectionProps) {
  const { t } = useTranslation('pages');

  // Group liabilities by category
  const liabilitiesByCategory = useMemo(() => {
    const grouped: Record<string, Liability[]> = {};
    liabilities.forEach((liability) => {
      (grouped[liability.type] ??= []).push(liability);
    });
    return grouped;
  }, [liabilities]);

  // Get categories that have liabilities, in display order
  const categoriesWithLiabilities = useMemo(() => {
    return LIABILITY_CATEGORIES.filter((category) => {
      const categoryLiabilities = liabilitiesByCategory[category];
      return categoryLiabilities && categoryLiabilities.length > 0;
    });
  }, [liabilitiesByCategory]);

  return (
    <section className="space-y-6" aria-label={`${t('whatYouOwe')} section`}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-foreground text-h2-sm sm:text-h2-md lg:text-h2-lg font-medium">
              {t('whatYouOwe')}
            </h2>
          </div>
          <div className="mt-2 inline-block rounded-[var(--rl)] border border-border bg-card px-6 py-5 metric-tile">
            <div className="metric-label">Total liabilities</div>
            <div className="metric-value tabular-nums">{formatCurrency(totalLiabilities)}</div>
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-3">
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={onCreate}
            aria-label="Add a liability"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add a liability
          </Button>
        </div>
      </div>

      {/* Category groups in responsive grid */}
      {categoriesWithLiabilities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-4">
              <p className="text-muted-foreground text-balance max-w-lg mx-auto">
                {t('emptyStates.holdingsNoLiabilities.body')}
              </p>
              <Button onClick={onCreate} size="sm" aria-label={t('emptyStates.holdingsNoLiabilities.ctaAriaLabel')}>
                <Plus className="h-4 w-4 mr-2" />
                {t('emptyStates.holdingsNoLiabilities.cta')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {categoriesWithLiabilities.map((category) => (
            <LiabilityCategoryGroup
              key={category}
              categoryName={category}
              liabilities={liabilitiesByCategory[category] || []}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
