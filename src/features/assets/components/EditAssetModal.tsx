import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AssetForm } from './AssetForm';
import { AssetChangeLog } from './AssetChangeLog';
import type { Asset } from '@/types/domain';

interface EditAssetModalProps {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Asset>) => void;
  onDeleteRequested: () => void;
  isLoading?: boolean;
}

export function EditAssetModal({
  asset,
  open,
  onOpenChange,
  onSubmit,
  onDeleteRequested,
  isLoading,
}: EditAssetModalProps) {
  const handleSubmit = (data: Omit<Asset, 'id' | 'change1D' | 'change1W'>) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Asset</DialogTitle>
          <DialogDescription>Update asset information.</DialogDescription>
        </DialogHeader>
        <AssetForm
          asset={asset}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          onDelete={onDeleteRequested}
          isLoading={isLoading}
        />
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-body font-semibold mb-3">Change History</h3>
          <AssetChangeLog assetId={asset.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

