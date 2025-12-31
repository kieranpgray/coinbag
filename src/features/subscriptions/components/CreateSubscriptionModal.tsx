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
  defaultCategoryId?: string;
}

export function CreateSubscriptionModal({ open, onOpenChange, defaultCategoryId }: CreateSubscriptionModalProps) {
  const { create: createMutation } = useSubscriptionMutations();

  const handleSubmit = async (data: Omit<Subscription, 'id'>) => {
    try {
      await createMutation.mutateAsync(data);
      // If we reach here, the mutation was successful
      onOpenChange(false);
      // Note: Toast notifications are deferred - form validation and mutation errors
      // are handled by react-hook-form and React Query error states
      if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
        console.log('Subscription created successfully');
      }
    } catch (error) {
      // Error is handled by react-hook-form and React Query
      // Toast notifications can be added in the future if needed
      if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
        console.error('Failed to create subscription:', error);
      }
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
          defaultValues={defaultCategoryId ? { categoryId: defaultCategoryId } : undefined}
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
