import { ConfirmDestructiveDialog } from '@/components/shared/ConfirmDestructiveDialog';
import type { Liability } from '@/types/domain';

interface DeleteLiabilityDialogProps {
  liability: Liability | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteLiabilityDialog({
  liability,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: DeleteLiabilityDialogProps) {
  if (!liability) return null;

  return (
    <ConfirmDestructiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Remove this liability?"
      body={`This will remove ${liability.name} from your Holdings and net worth. This can't be undone.`}
      confirmLabel="Remove liability"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}
