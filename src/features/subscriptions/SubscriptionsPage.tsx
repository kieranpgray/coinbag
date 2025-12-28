import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/utils';
import { useSubscriptions } from './hooks';
import { useCategories } from '@/features/categories/hooks';
import { SubscriptionList } from './components/SubscriptionList';
import { ExpenseSummary } from './components/ExpenseSummary';
import { CreateSubscriptionModal } from './components/CreateSubscriptionModal';
import { ensureDefaultCategories } from '@/data/categories/ensureDefaults';
import { calculateMonthlyEquivalent } from './utils';
import { useAuth } from '@clerk/clerk-react';

export function SubscriptionsPage() {
  const { data: subscriptions = [], isLoading, error, refetch } = useSubscriptions();
  const { data: categories = [], isLoading: categoriesLoading, refetch: refetchCategories } = useCategories();
  const { getToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showGrouped, setShowGrouped] = useState(true);
  const [ensuringDefaults, setEnsuringDefaults] = useState(false);

  // Calculate total monthly expenses
  const totalMonthlyExpenses = useMemo(() => {
    return subscriptions.reduce((sum, subscription) => {
      return sum + calculateMonthlyEquivalent(subscription.amount, subscription.frequency);
    }, 0);
  }, [subscriptions]);

  // Handle query params for auto-opening create modal
  useEffect(() => {
    const shouldCreate = searchParams.get('create') === '1';
    if (shouldCreate) {
      setIsCreateModalOpen(true);
      // Clear the query params after processing
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Ensure default categories exist on mount
  useEffect(() => {
    const ensureDefaults = async () => {
      if (!categoriesLoading && categories.length === 0 && !ensuringDefaults) {
        setEnsuringDefaults(true);
        const result = await ensureDefaultCategories(getToken);
        if (result.success) {
          // Refetch categories to get the newly created defaults
          await refetchCategories();
        }
        setEnsuringDefaults(false);
      }
    };
    ensureDefaults();
  }, [categories.length, categoriesLoading, getToken, refetchCategories, ensuringDefaults]);

  const isPageLoading = isLoading || categoriesLoading || ensuringDefaults;

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
            <div className="space-y-0.5">
              <p className="text-5xl font-bold tracking-tight">
                {formatCurrency(totalMonthlyExpenses)}
              </p>
              <p className="text-sm text-muted-foreground">Total monthly expenses</p>
            </div>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add Subscription
          </Button>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to load subscriptions</AlertTitle>
          <AlertDescription className="mt-2">
            We couldn't load your subscriptions. Please try again.
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

  if (isPageLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-14 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-4">
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Total Value */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <div className="space-y-0.5">
            <p className="text-5xl font-bold tracking-tight">
              {formatCurrency(totalMonthlyExpenses)}
            </p>
            <p className="text-sm text-muted-foreground">Total monthly expenses</p>
          </div>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Subscription
        </Button>
      </div>

      {/* Expense Summary - positioned above subscription list */}
      {subscriptions.length > 0 && (
        <ExpenseSummary subscriptions={subscriptions} showGrouped={showGrouped} />
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Subscriptions</CardTitle>
            {subscriptions.length > 0 && (
              <div className="flex items-center space-x-2">
                <Label htmlFor="group-toggle" className="text-sm text-muted-foreground">
                  Show grouped
                </Label>
                <Switch
                  id="group-toggle"
                  checked={showGrouped}
                  onCheckedChange={setShowGrouped}
                  aria-label="Show subscriptions grouped by category"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <SubscriptionList 
            subscriptions={subscriptions} 
            grouped={showGrouped}
            onCreate={() => setIsCreateModalOpen(true)}
          />
        </CardContent>
      </Card>

      <CreateSubscriptionModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
