import { useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { logger } from '@/lib/logger';
import { LiabilityForm } from './LiabilityForm';
import { LiabilityChangeLog } from './LiabilityChangeLog';
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
    if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
      logger.debug('LIABILITY:UPDATE', 'Updating liability', { name: data.name });
    }
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
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold mb-3">Change History</h3>
          <LiabilityChangeLog liabilityId={liability.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

