import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import { LiabilityCard } from '@/features/liabilities/components/LiabilityCard';
import { LiabilityPortfolioSection } from './LiabilityPortfolioSection';
import type { Liability } from '@/types/domain';

interface LiabilitiesSectionProps {
  totalLiabilities: number;
  liabilities: Liability[];
  onCreate: () => void;
  onEdit: (liability: Liability) => void;
  onDelete: (liability: Liability) => void;
  viewMode?: 'list' | 'cards';
}

/**
 * Liabilities section component
 * Displays total liabilities and liability sources with category filtering and view toggle
 * Supports both portfolio view (list mode) and card view (cards mode)
 */
export function LiabilitiesSection({
  totalLiabilities,
  liabilities,
  onCreate,
  onEdit,
  onDelete,
  viewMode = 'cards',
}: LiabilitiesSectionProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const liabilityCategories: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'Loans', label: 'Loans' },
    { value: 'Credit Cards', label: 'Credit Cards' },
    { value: 'Other', label: 'Other' },
  ];

  const getLiabilitiesForCategory = (category: string) => {
    if (category === 'all') {
      return liabilities;
    }
    return liabilities.filter((liability) => liability.type === category);
  };

  // Portfolio view: render grouped portfolio section
  if (viewMode === 'list') {
    return (
      <LiabilityPortfolioSection
        totalLiabilities={totalLiabilities}
        liabilities={liabilities}
        onCreate={onCreate}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  // Cards view: render existing tabbed card interface
  return (
    <section className="space-y-6" aria-label="Liabilities section">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-foreground text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold">Liabilities</h2>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">
              {formatCurrency(totalLiabilities)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-3">
          <Button
            size="sm"
            variant="outline"
            className="border-border"
            onClick={onCreate}
            aria-label="Add liability"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Liability
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-full">
        <TabsList className="w-full justify-start">
          {liabilityCategories.map((category) => (
            <TabsTrigger key={category.value} value={category.value}>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {liabilityCategories.map((category) => (
          <TabsContent key={category.value} value={category.value} className="mt-6">
            {getLiabilitiesForCategory(category.value).length === 0 ? (
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getLiabilitiesForCategory(category.value).map((liability) => (
                  <LiabilityCard
                    key={liability.id}
                    liability={liability}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

