import { useState, useMemo, useEffect } from 'react';
import {
  useLiabilities,
  useCreateLiability,
  useUpdateLiability,
  useDeleteLiability,
} from '@/features/liabilities/hooks';
import { useSearchParams } from 'react-router-dom';
import { logger, getCorrelationId } from '@/lib/logger';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { LiabilityList } from '@/features/liabilities/components/LiabilityList';
import { LiabilityCard } from '@/features/liabilities/components/LiabilityCard';
import { CreateLiabilityModal } from '@/features/liabilities/components/CreateLiabilityModal';
import { EditLiabilityModal } from '@/features/liabilities/components/EditLiabilityModal';
import { DeleteLiabilityDialog } from '@/features/liabilities/components/DeleteLiabilityDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import type { Liability } from '@/types/domain';

export function LiabilitiesPage() {
  const { data: liabilities = [], isLoading } = useLiabilities();
  const createMutation = useCreateLiability();
  const updateMutation = useUpdateLiability();
  const deleteMutation = useDeleteLiability();
  const [searchParams, setSearchParams] = useSearchParams();
  const correlationId = getCorrelationId();

  const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLiability, setSelectedLiability] = useState<Liability | null>(null);

  // Log component mount and initial state
  useEffect(() => {
    logger.info(
      'NAV:LIABILITIES_PAGE_MOUNT',
      'LiabilitiesPage component mounted',
      {
        searchParams: searchParams.toString(),
        createParam: searchParams.get('create'),
        createModalOpen,
        liabilitiesCount: liabilities.length,
      },
      correlationId || undefined
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Handle query params for auto-opening create modal
  // CRITICAL: Only depend on searchParams - createModalOpen changes should NOT retrigger this effect
  useEffect(() => {
    const shouldCreate = searchParams.get('create') === '1';
    const createParam = searchParams.get('create');
    const allParams = searchParams.toString();
    
    logger.debug(
      'NAV:LIABILITIES_PAGE_EFFECT',
      'Query params effect running',
      {
        shouldCreate,
        createParam,
        allParams,
        searchParamsString: searchParams.toString(),
        createModalOpenBefore: createModalOpen,
        liabilitiesCount: liabilities.length,
        liabilities: liabilities.map(l => ({id: l.id, name: l.name, type: l.type})),
      },
      correlationId || undefined
    );
    
    if (shouldCreate) {
      logger.info(
        'NAV:LIABILITIES_PAGE_EFFECT',
        'Opening create modal from query params',
        {
          createParam,
          createModalOpenBefore: createModalOpen,
          liabilitiesCount: liabilities.length,
        },
        correlationId || undefined
      );
      
      setCreateModalOpen(true);
      
      logger.debug(
        'NAV:LIABILITIES_PAGE_EFFECT',
        'setCreateModalOpen(true) called',
        {
          createModalOpenAfter: true,
        },
        correlationId || undefined
      );
      
      // Clear the query params after processing
      setSearchParams({}, { replace: true });
      
      logger.debug(
        'NAV:LIABILITIES_PAGE_EFFECT',
        'Query params cleared',
        {
          searchParamsAfter: '',
        },
        correlationId || undefined
      );
    } else {
      logger.debug(
        'NAV:LIABILITIES_PAGE_EFFECT',
        'No create param found, skipping modal open',
        {
          createParam,
          allParams,
        },
        correlationId || undefined
      );
    }
  }, [searchParams, setSearchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Log createModalOpen state changes
  useEffect(() => {
    logger.debug(
      'NAV:LIABILITIES_MODAL_STATE',
      'createModalOpen state changed',
      {
        createModalOpen,
        searchParams: searchParams.toString(),
      },
      correlationId || undefined
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createModalOpen, searchParams]);

  // Calculate total liability balance
  const totalLiabilityBalance = useMemo(() => {
    return liabilities.reduce((sum, liability) => sum + liability.balance, 0);
  }, [liabilities]);

  // Get liabilities for a specific category
  const getLiabilitiesForCategory = (category: string) => {
    if (category === 'all') {
      return liabilities;
    }
    return liabilities.filter((liability) => liability.type === category);
  };

  const handleCreate = (data: Omit<Liability, 'id'>) => {
    if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
      logger.debug('LIABILITY:CREATE', 'Creating liability', { name: data.name });
    }
    createMutation.mutate(data, {
      onSuccess: () => {
        if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
          logger.debug('LIABILITY:CREATE', 'Success - closing modal');
        }
        setCreateModalOpen(false);
      },
      onError: (error) => {
        logger.error('LIABILITY:CREATE', 'Failed to create liability', { error });
      },
    });
  };

  const handleEdit = (liability: Liability) => {
    setSelectedLiability(liability);
    setEditModalOpen(true);
  };

  const handleUpdate = (data: Partial<Liability>) => {
    if (!selectedLiability) return;
    updateMutation.mutate(
      { id: selectedLiability.id, data },
      {
        onSuccess: () => {
          setEditModalOpen(false);
          setSelectedLiability(null);
        },
      }
    );
  };

  const handleDelete = (liability: Liability) => {
    setSelectedLiability(liability);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedLiability) return;
    deleteMutation.mutate(selectedLiability.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setSelectedLiability(null);
      },
    });
  };

  const liabilityCategories: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'Loans', label: 'Loans' },
    { value: 'Credit Cards', label: 'Credit Cards' },
    { value: 'Other', label: 'Other' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-14 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Total Value */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Liabilities</h1>
          <div className="space-y-0.5">
            <div className="text-3xl sm:text-4xl font-bold mb-4">
              {formatCurrency(totalLiabilityBalance)}
            </div>
            <p className="text-sm text-muted-foreground">Total debt balance</p>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:items-end">
          <Button onClick={() => {
            logger.info(
              'NAV:LIABILITIES_BUTTON_CLICK',
              'Add New Liability button clicked',
              {
                createModalOpenBefore: createModalOpen,
              },
              correlationId || undefined
            );
            setCreateModalOpen(true);
          }} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add New Liability
          </Button>
          <div className="flex items-center gap-3">
            <Label htmlFor="view-mode" className="text-sm text-muted-foreground">
              List view
            </Label>
            <Switch
              id="view-mode"
              checked={viewMode === 'cards'}
              onCheckedChange={(checked) => setViewMode(checked ? 'cards' : 'list')}
              aria-label="Toggle between list view and card view"
            />
            <Label htmlFor="view-mode" className="text-sm text-muted-foreground">
              Card view
            </Label>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-full">
        <TabsList className="w-full justify-start">
          {liabilityCategories.map((category) => (
            <TabsTrigger key={category.value} value={category.value}>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {liabilityCategories.map((category) => (
          <TabsContent key={category.value} value={category.value} className="mt-6">
            {viewMode === 'list' ? (
              <LiabilityList
                liabilities={getLiabilitiesForCategory(category.value)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onCreate={() => setCreateModalOpen(true)}
              />
            ) : (
              <>
                {getLiabilitiesForCategory(category.value).length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="space-y-4">
                        <p className="text-muted-foreground">
                          No liabilities found. Add your first liability to track debts and payments.
                        </p>
                        <Button onClick={() => setCreateModalOpen(true)} size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Liability
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getLiabilitiesForCategory(category.value).map((liability) => (
                      <LiabilityCard
                        key={liability.id}
                        liability={liability}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Modals */}
      {(() => {
        logger.debug(
          'NAV:LIABILITIES_MODAL_RENDER',
          'Rendering CreateLiabilityModal',
          {
            createModalOpen,
            searchParams: searchParams.toString(),
            isLoading: createMutation.isPending,
          },
          correlationId || undefined
        );
        return (
          <CreateLiabilityModal
            open={createModalOpen}
            onOpenChange={(open) => {
              logger.info(
                'NAV:LIABILITIES_MODAL_CHANGE',
                'CreateLiabilityModal onOpenChange called',
                {
                  open,
                  previousState: createModalOpen,
                },
                correlationId || undefined
              );
              setCreateModalOpen(open);
            }}
            onSubmit={handleCreate}
            isLoading={createMutation.isPending}
          />
        );
      })()}

      {selectedLiability && (
        <EditLiabilityModal
          liability={selectedLiability}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onSubmit={handleUpdate}
          isLoading={updateMutation.isPending}
        />
      )}

      <DeleteLiabilityDialog
        liability={selectedLiability}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
