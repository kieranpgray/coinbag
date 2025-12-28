import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';
import type { Liability } from '@/types/domain';

interface LiabilityCardProps {
  liability: Liability;
  onEdit: (liability: Liability) => void;
  onDelete: (liability: Liability) => void;
}

export function LiabilityCard({ liability, onEdit, onDelete }: LiabilityCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{liability.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{liability.type}</p>
          </div>
          <div className="flex gap-2">
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Balance</span>
            <span className="font-semibold">{formatCurrency(liability.balance)}</span>
          </div>
          {liability.interestRate !== undefined && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Interest Rate</span>
              <span className="text-sm">{liability.interestRate}%</span>
            </div>
          )}
          {liability.monthlyPayment !== undefined && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Monthly Payment</span>
              <span className="text-sm">{formatCurrency(liability.monthlyPayment)}</span>
            </div>
          )}
          {liability.institution && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Institution</span>
              <span className="text-sm">{liability.institution}</span>
            </div>
          )}
          {liability.dueDate && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Due Date</span>
              <span className="text-sm">{formatDate(liability.dueDate)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

