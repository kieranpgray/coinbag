import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import type { Expense } from '@/types/domain';
import { convertToFrequency, getFrequencyLabelForDisplay, normalizeToFrequency, type Frequency } from '../utils/frequencyConversion';

interface ExpenseItemProps {
  expense: Expense;
  categoryName: string;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  isHighlight?: boolean;
  displayFrequency?: Frequency;
}

/**
 * Individual expense item component
 * Displays expense information with edit/delete actions
 */
export function ExpenseItem({
  expense,
  categoryName,
  onEdit,
  onDelete,
  isHighlight = false,
  displayFrequency,
}: ExpenseItemProps) {
  const nextDueDate = format(new Date(expense.nextDueDate), 'MMM dd, yyyy');
  
  // Convert amount to display frequency if provided, otherwise use original
  const displayAmount = displayFrequency
    ? convertToFrequency(expense.amount, normalizeToFrequency(expense.frequency), displayFrequency)
    : expense.amount;
  const displayFreqLabel = displayFrequency
    ? getFrequencyLabelForDisplay(displayFrequency)
    : expense.frequency.toLowerCase();
  
  return (
    <div
      className={`group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
        isHighlight
          ? 'border-orange-200 bg-orange-50/50'
          : 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm'
      }`}
      onClick={() => onEdit(expense)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(expense);
        }
      }}
      aria-label={`Edit ${expense.name}`}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Icon */}
        <div
          className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isHighlight ? 'bg-orange-100' : 'bg-neutral-100'
          }`}
        >
          <span className="text-lg">💳</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-neutral-900 mb-0.5 truncate">{expense.name}</h4>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>{categoryName}</span>
            <span>•</span>
            <span>Due {nextDueDate}</span>
          </div>
        </div>
      </div>

      {/* Amount and Actions */}
      <div className="flex items-center gap-4 ml-4">
        <div className="text-right">
          <div className="text-neutral-900">{formatCurrency(displayAmount)}</div>
          <div className="text-xs text-neutral-500">/ {displayFreqLabel}</div>
        </div>

        {/* Action buttons - shown on hover (desktop) */}
        <div
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 md:flex hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onEdit(expense)}
            aria-label={`Edit ${expense.name}`}
          >
            <Pencil className="h-3.5 w-3.5 text-neutral-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onDelete(expense)}
            aria-label={`Delete ${expense.name}`}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>

        {/* Mobile: actions always visible */}
        <div
          className="flex items-center gap-1 md:hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onEdit(expense)}
            aria-label={`Edit ${expense.name}`}
          >
            <Pencil className="h-3.5 w-3.5 text-neutral-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onDelete(expense)}
            aria-label={`Delete ${expense.name}`}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  );
}

