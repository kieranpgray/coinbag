import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useDeleteCategory } from '../hooks';
import type { Category } from '@/types/domain';

interface DeleteCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  dependentSubscriptionsCount: number;
}

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  dependentSubscriptionsCount,
}: DeleteCategoryDialogProps) {
  const deleteMutation = useDeleteCategory();

  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>This category is in use</DialogTitle>
          <DialogDescription>
            This category is currently used by the following items:
            <ul className="mt-2 list-disc list-inside">
              {/* Note: In real impl, list actual subscription names */}
              <li>{dependentSubscriptionsCount} subscription(s)</li>
            </ul>
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Deleting this category will remove it from these items.
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={async () => {
              await deleteMutation.mutateAsync(category.id);
              onOpenChange(false);
            }}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete and uncategorise'}
          </Button>
        </DialogFooter>

        {deleteMutation.error ? (
          <p className="text-sm text-destructive mt-2">
            {(deleteMutation.error as { error?: string })?.error || 'Failed to delete category.'}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}



