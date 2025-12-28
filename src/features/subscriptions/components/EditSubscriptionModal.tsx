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

interface EditSubscriptionModalProps {
  subscription: Subscription;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSubscriptionModal({ subscription, open, onOpenChange }: EditSubscriptionModalProps) {
  const { update: updateMutation } = useSubscriptionMutations();

  const handleSubmit = async (data: Omit<Subscription, 'id'>) => {
    try {
      await updateMutation.mutateAsync({ id: subscription.id, data });
      // If we reach here, the mutation was successful
      onOpenChange(false);
      // TODO: Show success toast notification
      console.log('Subscription updated successfully');
    } catch (error) {
      // TODO: Show error toast notification
      console.error('Failed to update subscription:', error);
      throw error; // Re-throw to let form handle it
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Subscription</DialogTitle>
          <DialogDescription>
            Update the details of your subscription.
          </DialogDescription>
        </DialogHeader>
        <SubscriptionForm
          defaultValues={subscription}
          onSubmit={handleSubmit}
          isSubmitting={updateMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
