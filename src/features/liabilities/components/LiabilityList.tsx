import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Pencil, Trash2, Plus } from 'lucide-react';
import type { Liability } from '@/types/domain';

interface LiabilityListProps {
  liabilities: Liability[];
  onEdit: (liability: Liability) => void;
  onDelete: (liability: Liability) => void;
  onCreate: () => void;
}

export function LiabilityList({ liabilities, onEdit, onDelete, onCreate }: LiabilityListProps) {
  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="text-right">Interest Rate</TableHead>
            <TableHead className="text-right">Monthly Payment</TableHead>
            <TableHead>Institution</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {liabilities.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-muted-foreground">
                    No liabilities found. Add your first liability to track debts and payments.
                  </div>
                  <Button
                    onClick={onCreate}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Liability
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            liabilities.map((liability) => (
              <TableRow key={liability.id}>
                <TableCell className="font-medium">{liability.name}</TableCell>
                <TableCell>{liability.type}</TableCell>
                <TableCell className="text-right">{formatCurrency(liability.balance)}</TableCell>
                <TableCell className="text-right">
                  {liability.interestRate !== undefined ? `${liability.interestRate}%` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {liability.monthlyPayment !== undefined
                    ? formatCurrency(liability.monthlyPayment)
                    : '-'}
                </TableCell>
                <TableCell>{liability.institution || '-'}</TableCell>
                <TableCell>{liability.dueDate ? formatDate(liability.dueDate) : '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(liability)}
                      aria-label="Edit liability"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(liability)}
                      aria-label="Delete liability"
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

