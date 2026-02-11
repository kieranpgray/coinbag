import { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import type { Income } from '@/types/domain';
import { convertToFrequency, getFrequencyLabelForDisplay, type Frequency, FREQUENCY_OPTIONS } from '../utils/frequencyConversion';
import { IncomeList } from '@/features/income/components/IncomeList';

interface IncomeSectionProps {
  totalIncome: number; // monthly equivalent
  incomeSources: Income[];
  accountMap?: Map<string, string>;
  onCreate: () => void;
  onEdit: (income: Income) => void;
  onDelete: (income: Income) => void;
  parentFrequency?: Frequency;
  onFrequencyChange?: (frequency: Frequency) => void;
}

/**
 * Income section component
 * Total-first, list only. No card view; inline editing in IncomeList.
 */
export function IncomeSection({
  totalIncome,
  incomeSources,
  accountMap,
  onCreate,
  onEdit,
  onDelete,
  parentFrequency,
  onFrequencyChange,
}: IncomeSectionProps) {
  const [localFrequency, setLocalFrequency] = useState<Frequency | undefined>(parentFrequency);
  const hasManualOverride = useRef(false);

  // Update local frequency when parent frequency changes (if not manually overridden)
  useEffect(() => {
    if (parentFrequency !== undefined) {
      if (!hasManualOverride.current) {
        // Sync with parent if user hasn't manually overridden
        setLocalFrequency(parentFrequency);
      } else if (localFrequency === parentFrequency) {
        // If user's manual override matches parent, clear the override flag
        hasManualOverride.current = false;
      }
    }
  }, [parentFrequency, localFrequency]);

  const displayFrequency = localFrequency || parentFrequency || 'monthly';
  const displayIncome = convertToFrequency(totalIncome, 'monthly', displayFrequency);

  const handleFrequencyChange = (frequency: Frequency) => {
    setLocalFrequency(frequency);
    hasManualOverride.current = true; // Mark as manually overridden
    onFrequencyChange?.(frequency);
  };

  return (
    <section className="space-y-6" aria-label="Income section">
      {/* Header: total-first, no icon. Add Income = secondary */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-foreground text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold mb-1">Income</h2>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
            <span className="text-balance font-bold text-foreground">
              {formatCurrency(displayIncome)}
            </span>
            <span className="text-muted-foreground text-body-sm">
              per {getFrequencyLabelForDisplay(displayFrequency)}
              {incomeSources.length > 0 && ` · ${incomeSources.length} ${incomeSources.length === 1 ? 'source' : 'sources'}`}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={displayFrequency} onValueChange={(value) => handleFrequencyChange(value as Frequency)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <p className="text-muted-foreground text-body-sm mb-4">
            Add income so we can show your remaining budget.
          </p>
          <Button onClick={onCreate} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add income
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

