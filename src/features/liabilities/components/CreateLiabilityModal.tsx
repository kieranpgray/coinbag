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

interface CreateLiabilityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Liability, 'id'>) => void;
  isLoading?: boolean;
}

export function CreateLiabilityModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateLiabilityModalProps) {
  const handleSubmit = useCallback((data: Omit<Liability, 'id'>) => {
    console.log('[Modal] Submitting:', data.name);
    onSubmit(data);
  }, [onSubmit]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Liability</DialogTitle>
          <DialogDescription>Create a new liability to track in your portfolio.</DialogDescription>
        </DialogHeader>
        <LiabilityForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}

