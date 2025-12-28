import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GoalForm, type GoalFormData } from './GoalForm';

interface CreateGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GoalFormData) => void;
  isLoading?: boolean;
}

export function CreateGoalModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateGoalModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
          <DialogDescription>
            Set up a new financial goal to track your progress.
          </DialogDescription>
        </DialogHeader>
        <GoalForm onSubmit={onSubmit} onCancel={() => onOpenChange(false)} isLoading={isLoading} />
      </DialogContent>
    </Dialog>
  );
}

