import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CategoryForm } from './CategoryForm';
import { useCreateCategory } from '../hooks';

interface CreateCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCategoryModal({ open, onOpenChange }: CreateCategoryModalProps) {
  const createMutation = useCreateCategory();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create category</DialogTitle>
          <DialogDescription>
            Create a category to organise subscriptions (optional). You can also do this while adding a subscription.
          </DialogDescription>
        </DialogHeader>

        <CategoryForm
          submitLabel="Create"
          isSubmitting={createMutation.isPending}
          onSubmit={async (data) => {
            await createMutation.mutateAsync(data);
            onOpenChange(false);
          }}
        />

        {createMutation.error ? (
          <p className="text-sm text-destructive">
            {(createMutation.error as { error?: string })?.error || 'Failed to create category.'}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}



