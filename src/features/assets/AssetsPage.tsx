import { useState, useMemo, useEffect } from 'react';
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from '@/features/assets/hooks';
import { useSearchParams } from 'react-router-dom';
import { logger, getCorrelationId } from '@/lib/logger';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AssetList } from '@/features/assets/components/AssetList';
import { AssetCard } from '@/features/assets/components/AssetCard';
import { CreateAssetModal } from '@/features/assets/components/CreateAssetModal';
import { EditAssetModal } from '@/features/assets/components/EditAssetModal';
import { DeleteAssetDialog } from '@/features/assets/components/DeleteAssetDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Asset } from '@/types/domain';

export function AssetsPage() {
  const { data: assets = [], isLoading, error, refetch } = useAssets();
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const deleteMutation = useDeleteAsset();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [defaultAssetType, setDefaultAssetType] = useState<Asset['type'] | undefined>();

  // Handle query params for auto-opening create modal with prefilled type
  // CRITICAL: Only depend on searchParams - assets/selectedAsset changes should NOT retrigger this effect
  useEffect(() => {
    const shouldCreate = searchParams.get('create') === '1';
    const type = searchParams.get('type') as Asset['type'] | null;
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
      if (type && ['Real Estate', 'Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Other'].includes(type)) {
        setDefaultAssetType(type);
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
        setCreateModalOpen(false);
      },
      onError: (error) => {
        logger.error(
          'MUTATION:ASSET_CREATE',
          'handleCreate failed',
          { error: String(error) },
          correlationId || undefined
        );
      },
    });
  };

  const handleEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    setEditModalOpen(true);
  };

  const handleUpdate = (data: Partial<Asset>) => {
    if (!selectedAsset) return;
    updateMutation.mutate(
      { id: selectedAsset.id, data },
      {
        onSuccess: () => {
          setEditModalOpen(false);
          setSelectedAsset(null);
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
    deleteMutation.mutate(selectedAsset.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setSelectedAsset(null);
      },
    });
  };

  const assetCategories: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'Real Estate', label: 'Real Estate' },
    { value: 'Investments', label: 'Investments' },
    { value: 'Vehicles', label: 'Vehicles' },
    { value: 'Crypto', label: 'Crypto' },
    { value: 'Cash', label: 'Cash' },
    { value: 'Superannuation', label: 'Superannuation' },
    { value: 'Other', label: 'Other' },
  ];

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
            <div className="space-y-0.5">
              <div className="text-4xl font-bold mb-4">
                {formatCurrency(totalAssetValue)}
              </div>
              <p className="text-sm text-muted-foreground">Total asset value</p>
            </div>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Asset
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Assets</h1>
            <div className="space-y-0.5">
              <div className="text-3xl sm:text-4xl font-bold mb-4">
                {formatCurrency(totalAssetValue)}
              </div>
              <p className="text-sm text-muted-foreground">Total asset value</p>
            </div>
        </div>
        <div className="flex flex-col gap-4 sm:items-end">
          <Button onClick={() => setCreateModalOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add New Asset
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
                        <Button onClick={() => setCreateModalOpen(true)} size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Asset
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
