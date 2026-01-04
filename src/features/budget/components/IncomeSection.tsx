import { useState, useEffect, useRef } from 'react';
import { TrendingUp, Plus, DollarSign, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import type { Income } from '@/types/domain';
import { convertToFrequency, getFrequencyLabelForDisplay, normalizeToFrequency, type Frequency, FREQUENCY_OPTIONS } from '../utils/frequencyConversion';
import { IncomeList } from '@/features/income/components/IncomeList';

interface IncomeSectionProps {
  totalIncome: number; // monthly equivalent
  incomeSources: Income[];
  onCreate: () => void;
  onEdit: (income: Income) => void;
  onDelete: (income: Income) => void;
  parentFrequency?: Frequency;
  onFrequencyChange?: (frequency: Frequency) => void;
  viewMode?: 'list' | 'cards';
}

/**
 * Income section component
 * Displays total monthly income and income sources in a card grid
 */
export function IncomeSection({
  totalIncome,
  incomeSources,
  onCreate,
  onEdit,
  onDelete,
  parentFrequency,
  onFrequencyChange,
  viewMode = 'cards',
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <h1 className="text-neutral-600 text-xl sm:text-2xl font-semibold">Income</h1>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold">
              {formatCurrency(displayIncome)}
            </span>
            <span className="text-neutral-500">per {getFrequencyLabelForDisplay(displayFrequency)}</span>
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
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
            onClick={onCreate}
            aria-label="Add income source"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Income
          </Button>
        </div>
      </div>

      {/* Income Sources */}
      {incomeSources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-4">
              <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto">
                <DollarSign className="h-8 w-8 text-neutral-400" />
              </div>
              <p className="text-muted-foreground">
                No income sources found. Add your first income source to track your earnings.
              </p>
              <Button onClick={onCreate} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Income Source
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        <IncomeList
          incomes={incomeSources}
          onEdit={onEdit}
          onDelete={onDelete}
          onCreate={onCreate}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {incomeSources.map((source) => (
            <Card
              key={source.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{source.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{source.source}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(source)}
                      aria-label={`Edit ${source.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(source)}
                      aria-label={`Delete ${source.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span className="font-semibold">
                      {formatCurrency(convertToFrequency(source.amount, normalizeToFrequency(source.frequency), displayFrequency))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Frequency</span>
                    <span className="text-sm capitalize">{getFrequencyLabelForDisplay(displayFrequency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Next Payment</span>
                    <span className="text-sm">{format(new Date(source.nextPaymentDate), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

