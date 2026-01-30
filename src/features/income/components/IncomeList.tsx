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
import type { Income } from '@/types/domain';

interface IncomeListProps {
  incomes: Income[];
  accountMap?: Map<string, string>;
  onEdit: (income: Income) => void;
  onDelete: (income: Income) => void;
  onCreate: () => void;
}

export function IncomeList({ incomes, accountMap, onEdit, onDelete, onCreate }: IncomeListProps) {
  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Next Payment</TableHead>
            <TableHead>Paid To</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incomes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-muted-foreground">
                    No income sources found. Add your first income source to track your earnings.
                  </div>
                  <Button
                    onClick={onCreate}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Income Source
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            incomes.map((income) => (
              <TableRow key={income.id}>
                <TableCell className="font-medium">{income.name}</TableCell>
                <TableCell>{income.source}</TableCell>
                <TableCell className="text-right">{formatCurrency(income.amount)}</TableCell>
                <TableCell className="capitalize">{income.frequency}</TableCell>
                <TableCell>{income.nextPaymentDate ? format(new Date(income.nextPaymentDate), 'MMM d, yyyy') : '-'}</TableCell>
                <TableCell>{income.paidToAccountId ? (accountMap?.get(income.paidToAccountId) || 'Unknown Account') : '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(income)}
                      aria-label="Edit income"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(income)}
                      aria-label="Delete income"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

