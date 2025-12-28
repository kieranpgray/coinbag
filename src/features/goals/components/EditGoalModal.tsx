import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GoalForm, type GoalFormData } from './GoalForm';
import type { Goal } from '@/types/domain';

interface EditGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal;
  onSubmit: (data: GoalFormData) => void;
  isLoading?: boolean;
}

export function EditGoalModal({
  open,
  onOpenChange,
  goal,
  onSubmit,
  isLoading,
}: EditGoalModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
          <DialogDescription>Update your financial goal details.</DialogDescription>
        </DialogHeader>
        <GoalForm
          goal={goal}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}

