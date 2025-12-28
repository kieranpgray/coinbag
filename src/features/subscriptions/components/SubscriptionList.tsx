import { Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Subscription } from '@/types/domain';
import { format } from 'date-fns';
import { useState } from 'react';
import { EditSubscriptionModal } from './EditSubscriptionModal';
import { DeleteSubscriptionDialog } from './DeleteSubscriptionDialog';
import { useCategories } from '@/features/categories/hooks';

interface SubscriptionListProps {
  subscriptions: Subscription[];
  grouped?: boolean;
  onCreate?: () => void;
}

export function SubscriptionList({ subscriptions, grouped = false, onCreate }: SubscriptionListProps) {
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [deletingSubscription, setDeletingSubscription] = useState<Subscription | null>(null);
  const { data: categories = [] } = useCategories();
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              No subscriptions found. Add your first subscription to track recurring expenses and payments.
            </p>
            {onCreate && (
              <Button onClick={onCreate} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group subscriptions by category if grouped mode is enabled
  const groupedSubscriptions = grouped
    ? subscriptions.reduce((acc, subscription) => {
        const category = subscription.categoryId;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(subscription);
        return acc;
      }, {} as Record<string, Subscription[]>)
    : null;

  if (grouped && groupedSubscriptions) {
    return (
      <>
        <div className="space-y-6">
          {Object.entries(groupedSubscriptions)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, categorySubscriptions]) => {
              const totalAmount = categorySubscriptions.reduce((sum, sub) => sum + sub.amount, 0);
              const categoryName = categoryNameById.get(category) || 'Unknown category';
              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <h3 className="text-lg font-semibold text-foreground">{categoryName}</h3>
                    <div className="text-sm text-muted-foreground">
                      {categorySubscriptions.length} subscription{categorySubscriptions.length !== 1 ? 's' : ''} • Total: ${totalAmount.toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {categorySubscriptions.map((subscription) => (
                      <div key={subscription.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{subscription.name}</div>
                          <div className="text-sm text-muted-foreground">
                            ${subscription.amount.toLocaleString()} • {subscription.frequency} • Due {format(new Date(subscription.nextDueDate), 'MMM dd, yyyy')}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingSubscription(subscription)}
                            aria-label="Edit subscription"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingSubscription(subscription)}
                            aria-label="Delete subscription"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>

        {editingSubscription && (
          <EditSubscriptionModal
            subscription={editingSubscription}
            open={!!editingSubscription}
            onOpenChange={(open) => {
              if (!open) setEditingSubscription(null);
            }}
          />
        )}

        {deletingSubscription && (
          <DeleteSubscriptionDialog
            subscription={deletingSubscription}
            open={!!deletingSubscription}
            onOpenChange={(open) => {
              if (!open) setDeletingSubscription(null);
            }}
          />
        )}
      </>
    );
  }

  // Default table view (not grouped)
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Next Due</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.map((subscription) => (
            <TableRow key={subscription.id}>
              <TableCell className="font-medium">{subscription.name}</TableCell>
              <TableCell>${subscription.amount.toLocaleString()}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="capitalize">
                  {subscription.frequency}
                </Badge>
              </TableCell>
              <TableCell>{categoryNameById.get(subscription.categoryId) || 'Unknown'}</TableCell>
              <TableCell>
                {format(new Date(subscription.nextDueDate), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingSubscription(subscription)}
                    aria-label="Edit subscription"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingSubscription(subscription)}
                    aria-label="Delete subscription"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingSubscription && (
        <EditSubscriptionModal
          subscription={editingSubscription}
          open={!!editingSubscription}
          onOpenChange={(open) => {
            if (!open) setEditingSubscription(null);
          }}
        />
      )}

      {deletingSubscription && (
        <DeleteSubscriptionDialog
          subscription={deletingSubscription}
          open={!!deletingSubscription}
          onOpenChange={(open) => {
            if (!open) setDeletingSubscription(null);
          }}
        />
      )}
    </>
  );
}
