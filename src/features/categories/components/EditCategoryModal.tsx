import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CategoryForm } from './CategoryForm';
import { useUpdateCategory } from '../hooks';
import type { Category } from '@/types/domain';

interface EditCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
}

export function EditCategoryModal({ open, onOpenChange, category }: EditCategoryModalProps) {
  const updateMutation = useUpdateCategory();

  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit category</DialogTitle>
        </DialogHeader>

        <CategoryForm
          defaultName={category.name}
          submitLabel="Save"
          isSubmitting={updateMutation.isPending}
          onSubmit={async (data) => {
            await updateMutation.mutateAsync({ id: category.id, data });
            onOpenChange(false);
          }}
        />

        {updateMutation.error ? (
          <p className="text-sm text-destructive">
            {(updateMutation.error as { error?: string })?.error || 'Failed to update category.'}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}



