import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
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
      toast.success('Expense added.');
      onOpenChange(false);
      if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
        logger.debug('EXPENSE:CREATE', 'Expense created successfully');
      }
    } catch (error) {
      toast.error("Couldn't save your changes. Try again.");
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
          <DialogTitle>Add an expense</DialogTitle>
          <DialogDescription>Track a recurring commitment in your plan.</DialogDescription>
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





