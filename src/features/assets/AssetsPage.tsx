import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from '@/features/assets/hooks';
import { useViewMode } from '@/hooks/useViewMode';
import { useSearchParams } from 'react-router-dom';
import { logger, getCorrelationId } from '@/lib/logger';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AssetList } from '@/features/assets/components/AssetList';
import { AssetCard } from '@/features/assets/components/AssetCard';
import { CreateAssetModal } from '@/features/assets/components/CreateAssetModal';
import { EditAssetModal } from '@/features/assets/components/EditAssetModal';
import { DeleteAssetDialog } from '@/features/assets/components/DeleteAssetDialog';
import { useDisconnectBrokerageSync } from '@/features/snaptrade/hooks/useDisconnectBrokerageSync';
import { ViewModeToggle } from '@/components/shared/ViewModeToggle';
import { ManualRefreshButton } from '@/components/shared/ManualRefreshButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Asset } from '@/types/domain';

const ASSET_TYPES_FROM_QUERY: readonly Asset['type'][] = [
  'Property',
  'Other asset',
  'Vehicle',
  'Crypto',
  'Cash',
  'Super',
  'Shares',
  'RSUs',
];

function normalizeAssetTypeFromQueryParam(type: string | null): Asset['type'] | undefined {
  if (!type) return undefined;
  let t = type;
  if (t === 'Investments' || t === 'Other') t = 'Other Investments';
  const legacy: Record<string, Asset['type']> = {
    'Other Investments': 'Other asset',
    'Real Estate': 'Property',
    Vehicles: 'Vehicle',
    Superannuation: 'Super',
    Stock: 'Shares',
    RSU: 'RSUs',
  };
  const mapped = legacy[t] ?? (t as Asset['type']);
  return ASSET_TYPES_FROM_QUERY.includes(mapped) ? mapped : undefined;
}

export function AssetsPage() {
  const { t } = useTranslation('pages');
  const { data: assets = [], isLoading, error, refetch } = useAssets();
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const deleteMutation = useDeleteAsset();
  const disconnectBrokerageMutation = useDisconnectBrokerageSync();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useViewMode();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [defaultAssetType, setDefaultAssetType] = useState<Asset['type'] | undefined>();

  // Handle query params for auto-opening create modal with prefilled type
  // CRITICAL: Only depend on searchParams - assets/selectedAsset changes should NOT retrigger this effect
  useEffect(() => {
    const shouldCreate = searchParams.get('create') === '1';
    const type = searchParams.get('type');
    const correlationId = getCorrelationId();
    
    logger.debug(
      'NAV:ASSETS_PAGE_EFFECT',
      'Query params effect running',
      {
        shouldCreate,
        type,
        searchParams: searchParams.toString(),
      },
      correlationId || undefined
    );
    
    if (shouldCreate) {
      logger.info(
        'NAV:ASSETS_PAGE_EFFECT',
        'Opening create modal from query params',
        {
          type,
        },
        correlationId || undefined
      );
      
      setCreateModalOpen(true);
      const normalizedType = normalizeAssetTypeFromQueryParam(type);
      if (normalizedType) {
        setDefaultAssetType(normalizedType);
      }
      // Clear the query params after processing
      setSearchParams({});
      
      logger.debug(
        'NAV:ASSETS_PAGE_EFFECT',
        'Query params cleared',
        {},
        correlationId || undefined
      );
    }
  }, [searchParams, setSearchParams]); // FIXED: Removed assets and selectedAsset from dependencies

  // Calculate total asset value
  const totalAssetValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + asset.value, 0);
  }, [assets]);

  // Get assets for a specific category
  const getAssetsForCategory = (category: string) => {
    if (category === 'all') {
      return assets;
    }
    return assets.filter((asset) => asset.type === category);
  };

  const handleCreate = (data: Omit<Asset, 'id' | 'change1D' | 'change1W'>) => {
    const correlationId = getCorrelationId();
    
    logger.info(
      'MUTATION:ASSET_CREATE',
      'handleCreate called in AssetsPage',
      {
        assetType: data.type,
        assetName: data.name,
        assetValue: data.value,
        assetsBefore: assets.map(a => ({id: a.id, name: a.name, type: a.type})),
        assetsBeforeCount: assets.length,
        createModalOpen,
        editModalOpen,
      },
      correlationId || undefined
    );
    
    createMutation.mutate(data, {
      onSuccess: () => {
        logger.info(
          'MUTATION:ASSET_CREATE',
          'handleCreate onSuccess - closing modal',
          {
            assetsAfterCount: assets.length,
          },
          correlationId || undefined
        );
        toast.success(`${data.name} added to Holdings.`);
        setCreateModalOpen(false);
      },
      onError: (error) => {
        logger.error(
          'MUTATION:ASSET_CREATE',
          'handleCreate failed',
          { error: String(error) },
          correlationId || undefined
        );
        toast.error("Couldn't save your changes. Try again.");
      },
    });
  };

  const handleEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    setEditModalOpen(true);
  };

  const handleUpdate = (data: Partial<Asset>) => {
    if (!selectedAsset) return;
    const name = selectedAsset.name;
    updateMutation.mutate(
      { id: selectedAsset.id, data },
      {
        onSuccess: () => {
          toast.success(`${name} updated.`);
          setEditModalOpen(false);
          setSelectedAsset(null);
        },
        onError: () => {
          toast.error("Couldn't save your changes. Try again.");
        },
      }
    );
  };

  const handleDelete = (asset: Asset) => {
    setSelectedAsset(asset);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedAsset) return;
    const name = selectedAsset.name;
    deleteMutation.mutate(selectedAsset.id, {
      onSuccess: () => {
        toast.success(`${name} removed.`);
        setDeleteDialogOpen(false);
        setSelectedAsset(null);
      },
      onError: () => {
        toast.error("Couldn't save your changes. Try again.");
      },
    });
  };

  const priceBackedAssets = useMemo(
    () =>
      assets.filter((a) => {
        if (!a.ticker?.trim()) return false;
        return ['Shares', 'RSUs', 'Crypto', 'Other asset', 'Super'].includes(a.type);
      }),
    [assets]
  );

  const assetCategories: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'Property', label: 'Property' },
    { value: 'Other asset', label: 'Other asset' },
    { value: 'Vehicle', label: 'Vehicle' },
    { value: 'Crypto', label: 'Crypto' },
    { value: 'Cash', label: 'Cash' },
    { value: 'Super', label: 'Super' },
    { value: 'Shares', label: 'Shares' },
    { value: 'RSUs', label: 'RSUs' },
  ];

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold tracking-tight">Assets</h1>
            <div className="space-y-0.5">
              <div className="text-display-sm sm:text-display-md lg:text-display-lg font-bold mb-4">
                {formatCurrency(totalAssetValue)}
              </div>
              <p className="text-body text-muted-foreground">Total asset value</p>
            </div>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add an asset
          </Button>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to load assets</AlertTitle>
          <AlertDescription className="mt-2">
            We couldn't load your assets. Please try again.
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

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Skeleton className="h-9 w-32" />
            <div className="space-y-0.5">
              <Skeleton className="h-9 w-48 mb-4" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Total Value */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
            <h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold tracking-tight">Assets</h1>
            <div className="space-y-0.5">
              <div className="text-display-sm sm:text-display-md lg:text-display-lg font-bold mb-4">
                {formatCurrency(totalAssetValue)}
              </div>
              <p className="text-body text-muted-foreground">Total asset value</p>
            </div>
        </div>
        <div className="flex flex-col gap-4 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            {priceBackedAssets.length > 0 && (
              <ManualRefreshButton
                assets={priceBackedAssets}
                onSuccess={() => setRefreshError(null)}
                onError={(msg) => setRefreshError(msg)}
              />
            )}
            <Button onClick={() => setCreateModalOpen(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add an asset
            </Button>
            <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
          {refreshError && (
            <p className="text-body text-destructive">{refreshError}</p>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-full">
        <TabsList className="w-full justify-start">
          {assetCategories.map((category) => (
            <TabsTrigger key={category.value} value={category.value}>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {assetCategories.map((category) => (
          <TabsContent key={category.value} value={category.value} className="mt-6">
            {viewMode === 'list' ? (
              <AssetList
                assets={getAssetsForCategory(category.value)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddAsset={() => setCreateModalOpen(true)}
              />
            ) : (
              <>
                {getAssetsForCategory(category.value).length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="space-y-4">
                        <p className="text-muted-foreground">
                          No assets found. Start building your portfolio.
                        </p>
                        <Button
                          onClick={() => setCreateModalOpen(true)}
                          size="sm"
                          aria-label="Add my first asset"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add my first asset →
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getAssetsForCategory(category.value).map((asset) => (
                      <AssetCard
                        key={asset.id}
                        asset={asset}
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
      <CreateAssetModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        defaultType={defaultAssetType}
      />

      {selectedAsset && (
        <EditAssetModal
          asset={selectedAsset}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onSubmit={handleUpdate}
          onDeleteRequested={() => {
            setEditModalOpen(false);
            setDeleteDialogOpen(true);
          }}
          onDisconnectBrokerageSync={async (assetId) => {
            try {
              await disconnectBrokerageMutation.mutateAsync(assetId);
              toast.success(t('snaptrade.disconnectSuccessToast'));
              setSelectedAsset(null);
            } catch (err) {
              toast.error(t('snaptrade.disconnectErrorToast'));
              throw err;
            }
          }}
          isDisconnectingBrokerage={disconnectBrokerageMutation.isPending}
          isLoading={updateMutation.isPending}
        />
      )}

      <DeleteAssetDialog
        asset={selectedAsset}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
