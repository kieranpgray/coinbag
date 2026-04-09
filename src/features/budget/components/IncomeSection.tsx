import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import type { Income } from '@/types/domain';
import { convertToFrequency, getFrequencyLabelForDisplay, type Frequency } from '../utils/frequencyConversion';
import { IncomeList } from '@/features/income/components/IncomeList';

interface IncomeSectionProps {
  totalIncome: number; // monthly equivalent
  incomeSources: Income[];
  accountMap?: Map<string, string>;
  onCreate: () => void;
  onEdit: (income: Income) => void;
  onDelete: (income: Income) => void;
  frequency: Frequency;
}

/**
 * Income section component
 * Total-first, list only. No card view; inline editing in IncomeList.
 * Frequency is controlled at page level — no local selector.
 */
export function IncomeSection({
  totalIncome,
  incomeSources,
  accountMap,
  onCreate,
  onEdit,
  onDelete,
  frequency,
}: IncomeSectionProps) {
  const { t } = useTranslation('pages');

  const displayIncome = convertToFrequency(totalIncome, 'monthly', frequency);

  return (
    <section className="space-y-6" aria-label="Income section">
      {/* Header: total-first, no icon. Add Income = secondary */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-foreground text-h2-sm sm:text-h2-md lg:text-h2-lg font-medium mb-1">Income</h2>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
            <span className="text-balance font-medium text-foreground">
              {formatCurrency(displayIncome)}
            </span>
            <span className="text-muted-foreground text-body-sm">
              per {getFrequencyLabelForDisplay(frequency)}
              {incomeSources.length > 0 && ` · ${incomeSources.length} ${incomeSources.length === 1 ? 'source' : 'sources'}`}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            onClick={onCreate}
            aria-label="Add income source"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Income
          </Button>
        </div>
      </div>

      {/* Income sources: list only (inline edit in IncomeList) */}
      {incomeSources.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/20 py-10 px-4 text-center">
          <p className="text-muted-foreground text-body-sm mb-4 text-balance max-w-md mx-auto">
            {t('emptyStates.budgetNoIncome.body')}
          </p>
          <Button onClick={onCreate} size="sm" variant="outline" aria-label={t('emptyStates.budgetNoIncome.cta')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('emptyStates.budgetNoIncome.cta')}
          </Button>
        </div>
      ) : (
        <IncomeList
          incomes={incomeSources}
          accountMap={accountMap}
          onEdit={onEdit}
          onDelete={onDelete}
          onCreate={onCreate}
        />
      )}
    </section>
  );
}
