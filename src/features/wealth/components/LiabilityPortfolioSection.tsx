import { useMemo } from 'react';
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
const LIABILITY_CATEGORIES: Array<Liability['type']> = ['Credit Cards', 'Loans', 'Other'];

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
    <section className="space-y-6" aria-label="Liabilities section">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-foreground text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold">
              Liabilities
            </h2>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">{formatCurrency(totalLiabilities)}</span>
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-3">
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={onCreate}
            aria-label="Add liability"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Liability
          </Button>
        </div>
      </div>

      {/* Category groups in responsive grid */}
      {categoriesWithLiabilities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                No liabilities found. Add your first liability to track debts and payments.
              </p>
              <Button onClick={onCreate} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Liability
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
