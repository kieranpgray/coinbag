import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExpenseForm } from './ExpenseForm';
import { useExpenseMutations } from '../hooks';
import type { Expense } from '@/types/domain';

interface EditExpenseModalProps {
  expense: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the modal is closed after a successful save. Use to skip revert logic in parent. */
  onCloseAfterSave?: () => void;
}

export function EditExpenseModal({ expense, open, onOpenChange, onCloseAfterSave }: EditExpenseModalProps) {
  const { update: updateMutation } = useExpenseMutations();

  const handleSubmit = async (data: Omit<Expense, 'id'>) => {
    try {
      await updateMutation.mutateAsync({ id: expense.id, data });
      // If we reach here, the mutation was successful
      onCloseAfterSave?.();
      onOpenChange(false);
      // TODO: Show success toast notification
      console.log('Expense updated successfully');
    } catch (error) {
      // TODO: Show error toast notification
      console.error('Failed to update expense:', error);
      throw error; // Re-throw to let form handle it
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
          <DialogDescription>
            Update the details of your expense.
          </DialogDescription>
        </DialogHeader>
        <ExpenseForm
          defaultValues={expense}
          onSubmit={handleSubmit}
          isSubmitting={updateMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}





