import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/constants/routes';
import type { AccountCashFlow } from '@/types/domain';
import { formatAmountByFrequency } from '../utils/frequencyNormalization';
import { ArrowRight } from 'lucide-react';

interface AccountBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountFlow: AccountCashFlow;
}

/**
 * Modal showing detailed expense breakdown by category for an account
 */
export function AccountBreakdownModal({ open, onOpenChange, accountFlow }: AccountBreakdownModalProps) {
  const navigate = useNavigate();

  const handleViewAll = () => {
    // Navigate to budget page
    // Note: Account filtering may need to be added to budget page in future
    navigate(ROUTES.app.budget);
    onOpenChange(false);
  };

  const total = accountFlow.expenseBreakdown.reduce((sum, cat) => sum + cat.monthlyAmount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{accountFlow.accountName} - Expense Breakdown</DialogTitle>
          <DialogDescription>
            Monthly expenses grouped by category
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {accountFlow.expenseBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses assigned to this account.</p>
            ) : (
              accountFlow.expenseBreakdown.map((breakdown) => (
                <div
                  key={breakdown.categoryId}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <span className="text-sm font-medium">{breakdown.categoryName}</span>
                  <span className="text-sm font-semibold">
                    {formatAmountByFrequency(breakdown.monthlyAmount, 'monthly')}
                  </span>
                </div>
              ))
            )}
          </div>
          {accountFlow.expenseBreakdown.length > 0 && (
            <div className="flex items-center justify-between border-t pt-2">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold">
                {formatAmountByFrequency(total, 'monthly')}
              </span>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={handleViewAll} className="gap-2">
              View All Expenses
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
