import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('pages');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const liabilityCategories: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'Home loan', label: 'Home loan' },
    { value: 'Personal loan', label: 'Personal loan' },
    { value: 'Car loan', label: 'Car loan' },
    { value: 'Credit card', label: 'Credit card' },
    { value: 'HECS / HELP debt', label: 'HECS / HELP debt' },
    { value: 'Other liability', label: 'Other liability' },
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
    <section className="space-y-6" aria-label={`${t('whatYouOwe')} section`}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-foreground text-h2-sm sm:text-h2-md lg:text-h2-lg font-medium">{t('whatYouOwe')}</h2>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-medium">
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
            aria-label="Add a liability"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add a liability
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
                    {category.value === 'all' || liabilities.length === 0 ? (
                      <>
                        <p className="text-muted-foreground text-balance max-w-lg mx-auto">
                          {t('emptyStates.holdingsNoLiabilities.body')}
                        </p>
                        <Button
                          onClick={onCreate}
                          size="sm"
                          aria-label={t('emptyStates.holdingsNoLiabilities.ctaAriaLabel')}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t('emptyStates.holdingsNoLiabilities.cta')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-muted-foreground text-balance max-w-lg mx-auto">
                          {t('emptyStates.holdingsLiabilityTabEmpty', { category: category.label })}
                        </p>
                        <Button
                          onClick={onCreate}
                          size="sm"
                          aria-label={t('emptyStates.holdingsNoLiabilities.ctaAriaLabel')}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t('emptyStates.holdingsNoLiabilities.cta')}
                        </Button>
                      </>
                    )}
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

