import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatDate } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import type { Goal } from '@/types/domain';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete?: (goal: Goal) => void;
}

export function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  const isCompleted = progress >= 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{goal.name}</h3>
            {goal.description && (
              <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(goal)}
              aria-label="Edit goal"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(goal)}
                aria-label="Delete goal"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Current:</span>
          <span className="font-semibold">
            <PrivacyWrapper value={goal.currentAmount} />
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Goal:</span>
          <span className="font-semibold">
            <PrivacyWrapper value={goal.targetAmount} />
          </span>
        </div>
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">
              {Math.round(progress)}% complete
            </span>
            {isCompleted && (
              <span className="text-green-600 font-semibold">
                Goal achieved!
              </span>
            )}
          </div>
        </div>
        {goal.deadline && (
          <div className="text-sm text-muted-foreground">
            Target: {formatDate(goal.deadline)}
          </div>
        )}
        {goal.source && (
          <div className="text-sm text-muted-foreground">
            Source: {goal.source}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

