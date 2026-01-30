import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { logger } from '@/lib/logger';
import { ExpenseForm } from './ExpenseForm';
import { useExpenseMutations } from '../hooks';
import type { Expense } from '@/types/domain';

interface CreateExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategoryId?: string;
}

export function CreateExpenseModal({ open, onOpenChange, defaultCategoryId }: CreateExpenseModalProps) {
  const { create: createMutation } = useExpenseMutations();

  const handleSubmit = async (data: Omit<Expense, 'id'>) => {
    try {
      await createMutation.mutateAsync(data);
      // If we reach here, the mutation was successful
      onOpenChange(false);
      // Note: Toast notifications are deferred - form validation and mutation errors
      // are handled by react-hook-form and React Query error states
      if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
        logger.debug('EXPENSE:CREATE', 'Expense created successfully');
      }
    } catch (error) {
      // Error is handled by react-hook-form and React Query
      // Toast notifications can be added in the future if needed
      if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
        logger.error('EXPENSE:CREATE', 'Failed to create expense', { error });
      }
      throw error; // Re-throw to let form handle it
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>
            Track recurring expenses like subscriptions, bills, savings, repayments, living costs, or lifestyle expenses.
          </DialogDescription>
        </DialogHeader>
        <ExpenseForm
          defaultValues={defaultCategoryId ? { categoryId: defaultCategoryId } : undefined}
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}





