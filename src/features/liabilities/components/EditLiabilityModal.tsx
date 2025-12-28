import { useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LiabilityForm } from './LiabilityForm';
import type { Liability } from '@/types/domain';

interface EditLiabilityModalProps {
  liability: Liability;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Liability>) => void;
  isLoading?: boolean;
}

export function EditLiabilityModal({
  liability,
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: EditLiabilityModalProps) {
  const handleSubmit = useCallback((data: Omit<Liability, 'id'>) => {
    console.log('[EditModal] Updating:', data.name);
    onSubmit(data);
  }, [onSubmit]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Liability</DialogTitle>
          <DialogDescription>Update liability information.</DialogDescription>
        </DialogHeader>
        <LiabilityForm
          liability={liability}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}

