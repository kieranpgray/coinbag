import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AssetForm } from './AssetForm';
import type { Asset } from '@/types/domain';

interface CreateAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Asset, 'id' | 'change1D' | 'change1W'>) => void;
  isLoading?: boolean;
  defaultType?: Asset['type'];
}

export function CreateAssetModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  defaultType,
}: CreateAssetModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Asset</DialogTitle>
          <DialogDescription>Create a new asset to track in your portfolio.</DialogDescription>
        </DialogHeader>
        <AssetForm 
          onSubmit={onSubmit} 
          onCancel={() => onOpenChange(false)} 
          isLoading={isLoading} 
          defaultType={defaultType}
        />
      </DialogContent>
    </Dialog>
  );
}

