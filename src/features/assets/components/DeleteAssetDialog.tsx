import { ConfirmDestructiveDialog } from '@/components/shared/ConfirmDestructiveDialog';
import type { Asset } from '@/types/domain';

interface DeleteAssetDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteAssetDialog({
  asset,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: DeleteAssetDialogProps) {
  if (!asset) return null;

  return (
    <ConfirmDestructiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Remove this asset?"
      body={`This will remove ${asset.name} from your Holdings and net worth. This can't be undone.`}
      confirmLabel="Remove asset"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}
