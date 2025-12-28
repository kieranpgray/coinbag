import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSubscriptionMutations } from '../hooks';
import type { Subscription } from '@/types/domain';

interface DeleteSubscriptionDialogProps {
  subscription: Subscription;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteSubscriptionDialog({ subscription, open, onOpenChange }: DeleteSubscriptionDialogProps) {
  const { delete: deleteMutation } = useSubscriptionMutations();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(subscription.id);
      // If we reach here, the mutation was successful
      onOpenChange(false);
      // TODO: Show success toast notification
      console.log('Subscription deleted successfully');
    } catch (error) {
      // TODO: Show error toast notification
      console.error('Failed to delete subscription:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Subscription</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{subscription.name}</strong>? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
