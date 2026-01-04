import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GoalCard } from '@/features/goals/components/GoalCard';
import { CreateGoalModal } from '@/features/goals/components/CreateGoalModal';
import { EditGoalModal } from '@/features/goals/components/EditGoalModal';
import { DeleteGoalDialog } from '@/features/goals/components/DeleteGoalDialog';
import {
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
} from '@/features/goals/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import type { Goal } from '@/types/domain';
import type { GoalFormData } from '@/features/goals/components/GoalForm';

export function GoalsPage() {
  const { data: goals = [], isLoading, error, refetch } = useGoals();
  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoal();
  const deleteMutation = useDeleteGoal();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const handleCreate = (data: GoalFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setCreateModalOpen(false);
      },
    });
  };

  const handleEdit = (goal: Goal) => {
    setSelectedGoal(goal);
    setEditModalOpen(true);
  };

  const handleUpdate = (data: GoalFormData) => {
    if (!selectedGoal) return;
    updateMutation.mutate(
      { id: selectedGoal.id, data },
      {
        onSuccess: () => {
          setEditModalOpen(false);
          setSelectedGoal(null);
        },
      }
    );
  };

  const handleDeleteClick = (goal: Goal) => {
    setSelectedGoal(goal);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedGoal) return;
    deleteMutation.mutate(selectedGoal.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setSelectedGoal(null);
      },
    });
  };

  const emptyState = (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground mb-4">
          You don't have any goals yet.
        </p>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create your first goal
        </Button>
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Goals</h1>
          <Button onClick={() => setCreateModalOpen(true)} disabled>
            <Plus className="h-4 w-4 mr-2" />
            Add Goal
          </Button>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to load goals</AlertTitle>
          <AlertDescription className="mt-2">
            We couldn't load your goals. Please try again.
          </AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-4"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Try again
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Goals</h1>
        <Button onClick={() => setCreateModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : goals.length === 0 ? (
        emptyState
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      <CreateGoalModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      {selectedGoal && (
        <>
          <EditGoalModal
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            goal={selectedGoal}
            onSubmit={handleUpdate}
            isLoading={updateMutation.isPending}
          />
          <DeleteGoalDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            goal={selectedGoal}
            onConfirm={confirmDelete}
            isLoading={deleteMutation.isPending}
          />
        </>
      )}
    </div>
  );
}
