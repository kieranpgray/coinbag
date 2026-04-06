import { ConfirmDestructiveDialog } from '@/components/shared/ConfirmDestructiveDialog';
import type { Account } from '@/types/domain';

interface DeleteAccountDialogProps {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteAccountDialog({
  account,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: DeleteAccountDialogProps) {
  if (!account) return null;

  return (
    <ConfirmDestructiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Remove this account?"
      body={`This will remove ${account.accountName} and all associated data. This can't be undone.`}
      confirmLabel="Remove account"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}
