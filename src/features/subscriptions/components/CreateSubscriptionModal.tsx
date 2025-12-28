import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SubscriptionForm } from './SubscriptionForm';
import { useSubscriptionMutations } from '../hooks';
import type { Subscription } from '@/types/domain';

interface CreateSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSubscriptionModal({ open, onOpenChange }: CreateSubscriptionModalProps) {
  const { create: createMutation } = useSubscriptionMutations();

  const handleSubmit = async (data: Omit<Subscription, 'id'>) => {
    try {
      await createMutation.mutateAsync(data);
      // If we reach here, the mutation was successful
      onOpenChange(false);
      // TODO: Show success toast notification
      console.log('Subscription created successfully');
    } catch (error) {
      // TODO: Show error toast notification
      console.error('Failed to create subscription:', error);
      throw error; // Re-throw to let form handle it
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Subscription</DialogTitle>
          <DialogDescription>
            Track recurring expenses like streaming services, utilities, or memberships.
          </DialogDescription>
        </DialogHeader>
        <SubscriptionForm
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
