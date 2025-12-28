import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Income } from '@/types/domain';

interface IncomeCardProps {
  income: Income;
  onEdit: (income: Income) => void;
  onDelete: (income: Income) => void;
}

export function IncomeCard({ income, onEdit, onDelete }: IncomeCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{income.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{income.source}</p>
          </div>
          <div className="flex gap-2">
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="font-semibold">{formatCurrency(income.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Frequency</span>
            <span className="text-sm capitalize">{income.frequency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Next Payment</span>
            <span className="text-sm">{format(new Date(income.nextPaymentDate), 'MMM d, yyyy')}</span>
          </div>
          {income.notes && (
            <div className="pt-2 border-t">
              <span className="text-sm text-muted-foreground">{income.notes}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

