import { toast } from 'sonner';
import { ConfirmDestructiveDialog } from '@/components/shared/ConfirmDestructiveDialog';
import { useExpenseMutations } from '../hooks';
import type { Expense } from '@/types/domain';

interface DeleteExpenseDialogProps {
  expense: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteExpenseDialog({ expense, open, onOpenChange }: DeleteExpenseDialogProps) {
  const { delete: deleteMutation } = useExpenseMutations();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(expense.id);
      toast.success('Expense removed.');
      onOpenChange(false);
    } catch {
      toast.error("Couldn't save your changes. Try again.");
    }
  };

  return (
    <ConfirmDestructiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Remove this expense?"
      body={`This will remove ${expense.name} from your Recurring and Allocate plan.`}
      confirmLabel="Remove expense"
      onConfirm={handleDelete}
      isLoading={deleteMutation.isPending}
    />
  );
}
