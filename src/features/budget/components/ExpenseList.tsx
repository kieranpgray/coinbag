import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import type { Expense } from '@/types/domain';
import { convertToFrequency, getFrequencyLabelForDisplay, normalizeToFrequency, type Frequency } from '../utils/frequencyConversion';

interface ExpenseListProps {
  expenses: Expense[];
  categoryMap: Map<string, string>;
  uncategorisedId?: string;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onCreate: () => void;
  displayFrequency?: Frequency;
}

/**
 * Expense list component
 * Displays expenses in a table format matching Wealth page list view pattern
 */
export function ExpenseList({
  expenses,
  categoryMap,
  uncategorisedId,
  onEdit,
  onDelete,
  onCreate,
  displayFrequency,
}: ExpenseListProps) {
  const getCategoryName = (categoryId: string) => {
    return categoryMap.get(categoryId) || (uncategorisedId === categoryId ? 'Uncategorised' : 'Unknown');
  };

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Next Due Date</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-muted-foreground">
                    No expenses found. Add your first expense to start tracking your spending.
                  </div>
                  <Button
                    onClick={onCreate}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Expense
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            expenses.map((expense) => {
              const displayAmount = displayFrequency
                ? convertToFrequency(expense.amount, normalizeToFrequency(expense.frequency), displayFrequency)
                : expense.amount;
              const displayFreqLabel = displayFrequency
                ? getFrequencyLabelForDisplay(displayFrequency)
                : expense.frequency.toLowerCase();
              
              return (
                <TableRow
                  key={expense.id}
                  className="cursor-pointer hover:bg-muted/50"
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
                  <TableCell className="font-medium">{expense.name}</TableCell>
                  <TableCell>{getCategoryName(expense.categoryId)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(displayAmount)}</TableCell>
                  <TableCell className="capitalize">{displayFreqLabel}</TableCell>
                  <TableCell>{format(new Date(expense.nextDueDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{expense.notes || '-'}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(expense)}
                        aria-label={`Edit ${expense.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(expense)}
                        aria-label={`Delete ${expense.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

