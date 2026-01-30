import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from '@/features/assets/hooks';
import { useLiabilities, useCreateLiability, useUpdateLiability, useDeleteLiability } from '@/features/liabilities/hooks';
import { useViewMode } from '@/hooks/useViewMode';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AssetsSection } from './components/AssetsSection';
import { LiabilitiesSection } from './components/LiabilitiesSection';
import { VisualDivider } from '@/features/budget/components/VisualDivider';
import { ViewModeToggle } from '@/components/shared/ViewModeToggle';
import { WealthBreakdown } from './components/WealthBreakdown';
import { CreateAssetModal } from '@/features/assets/components/CreateAssetModal';
import { EditAssetModal } from '@/features/assets/components/EditAssetModal';
import { DeleteAssetDialog } from '@/features/assets/components/DeleteAssetDialog';
import { CreateLiabilityModal } from '@/features/liabilities/components/CreateLiabilityModal';
import { EditLiabilityModal } from '@/features/liabilities/components/EditLiabilityModal';
import { DeleteLiabilityDialog } from '@/features/liabilities/components/DeleteLiabilityDialog';
import type { Asset } from '@/types/domain';
import type { Liability } from '@/types/domain';

/**
 * Wealth page component
 * Unified view for assets and liabilities
 */
export function WealthPage() {
  // View mode state
  const [viewMode, setViewMode] = useViewMode();

  // Data hooks
  const { data: assets = [], isLoading: assetsLoading, error: assetsError, refetch: refetchAssets } = useAssets();
  const { data: liabilities = [], isLoading: liabilitiesLoading, error: liabilitiesError, refetch: refetchLiabilities } = useLiabilities();

  // Mutations
  const createAssetMutation = useCreateAsset();
  const updateAssetMutation = useUpdateAsset();
  const deleteAssetMutation = useDeleteAsset();
  const createLiabilityMutation = useCreateLiability();
  const updateLiabilityMutation = useUpdateLiability();
  const deleteLiabilityMutation = useDeleteLiability();

  // State
  const [searchParams, setSearchParams] = useSearchParams();
  const [createAssetModalOpen, setCreateAssetModalOpen] = useState(false);
  const [editAssetModalOpen, setEditAssetModalOpen] = useState(false);
  const [deleteAssetDialogOpen, setDeleteAssetDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [defaultAssetType, setDefaultAssetType] = useState<Asset['type'] | undefined>();
  
  const [createLiabilityModalOpen, setCreateLiabilityModalOpen] = useState(false);
  const [editLiabilityModalOpen, setEditLiabilityModalOpen] = useState(false);
  const [deleteLiabilityDialogOpen, setDeleteLiabilityDialogOpen] = useState(false);
  const [selectedLiability, setSelectedLiability] = useState<Liability | null>(null);

  // Handle query params for auto-opening create modal
  useEffect(() => {
    const shouldCreate = searchParams.get('create');
    const type = searchParams.get('type') as Asset['type'] | null;
    
    if (shouldCreate === 'asset') {
      setCreateAssetModalOpen(true);
      if (type && ['Real Estate', 'Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Other'].includes(type)) {
        setDefaultAssetType(type);
      }
      setSearchParams({});
    } else if (shouldCreate === 'liability') {
      setCreateLiabilityModalOpen(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Calculate totals (memoized)
  const totalAssets = useMemo(() => {
    return assets.reduce((sum, asset) => sum + asset.value, 0);
  }, [assets]);

  const totalLiabilities = useMemo(() => {
    return liabilities.reduce((sum, liability) => sum + liability.balance, 0);
  }, [liabilities]);

  const netWorth = useMemo(() => {
    return totalAssets - totalLiabilities;
  }, [totalAssets, totalLiabilities]);

  // Asset handlers
  const handleCreateAsset = (data: Omit<Asset, 'id' | 'change1D' | 'change1W'>) => {
    createAssetMutation.mutate(data, {
      onSuccess: () => {
        setCreateAssetModalOpen(false);
        setDefaultAssetType(undefined);
      },
    });
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setEditAssetModalOpen(true);
  };

  const handleUpdateAsset = (data: Partial<Asset>) => {
    if (!selectedAsset) return;
    updateAssetMutation.mutate(
      { id: selectedAsset.id, data },
      {
        onSuccess: () => {
          setEditAssetModalOpen(false);
          setSelectedAsset(null);
        },
      }
    );
  };

  const handleDeleteAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setDeleteAssetDialogOpen(true);
  };

  const handleConfirmDeleteAsset = () => {
    if (!selectedAsset) return;
    deleteAssetMutation.mutate(selectedAsset.id, {
      onSuccess: () => {
        setDeleteAssetDialogOpen(false);
        setSelectedAsset(null);
      },
    });
  };

  // Liability handlers
  const handleCreateLiability = (data: Omit<Liability, 'id'>) => {
    createLiabilityMutation.mutate(data, {
      onSuccess: () => {
        setCreateLiabilityModalOpen(false);
      },
    });
  };

  const handleEditLiability = (liability: Liability) => {
    setSelectedLiability(liability);
    setEditLiabilityModalOpen(true);
  };

  const handleUpdateLiability = (data: Partial<Liability>) => {
    if (!selectedLiability) return;
    updateLiabilityMutation.mutate(
      { id: selectedLiability.id, data },
      {
        onSuccess: () => {
          setEditLiabilityModalOpen(false);
          setSelectedLiability(null);
        },
      }
    );
  };

  const handleDeleteLiability = (liability: Liability) => {
    setSelectedLiability(liability);
    setDeleteLiabilityDialogOpen(true);
  };

  const handleConfirmDeleteLiability = () => {
    if (!selectedLiability) return;
    deleteLiabilityMutation.mutate(selectedLiability.id, {
      onSuccess: () => {
        setDeleteLiabilityDialogOpen(false);
        setSelectedLiability(null);
      },
    });
  };

  // Loading state
  const isLoading = assetsLoading || liabilitiesLoading;

  if (isLoading) {
    return (
      <div className="space-y-12">
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

  // Error states (show available data even if one section fails)
  const hasAssetsError = !!assetsError;
  const hasLiabilitiesError = !!liabilitiesError;

  return (
    <div className="space-y-12">
      {/* Wealth Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold tracking-tight">Wealth</h1>
        <div className="flex items-center gap-3">
          <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} id="view-mode-wealth" />
        </div>
      </div>

      {/* Wealth Breakdown */}
      <WealthBreakdown
        totalAssets={totalAssets}
        totalLiabilities={totalLiabilities}
        netWorth={netWorth}
      />

      {/* Assets Section */}
      {hasAssetsError ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to load assets</AlertTitle>
          <AlertDescription className="mt-2">
            We couldn't load your assets. Please try again.
          </AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchAssets()}
            className="mt-4"
            disabled={assetsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${assetsLoading ? 'animate-spin' : ''}`} />
            Try again
          </Button>
        </Alert>
      ) : (
        <AssetsSection
          totalAssets={totalAssets}
          assets={assets}
          onCreate={() => setCreateAssetModalOpen(true)}
          onEdit={handleEditAsset}
          onDelete={handleDeleteAsset}
          viewMode={viewMode}
        />
      )}

      {/* Visual Divider */}
      <VisualDivider />

      {/* Liabilities Section */}
      {hasLiabilitiesError ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to load liabilities</AlertTitle>
          <AlertDescription className="mt-2">
            We couldn't load your liabilities. Please try again.
          </AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchLiabilities()}
            className="mt-4"
            disabled={liabilitiesLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${liabilitiesLoading ? 'animate-spin' : ''}`} />
            Try again
          </Button>
        </Alert>
      ) : (
        <LiabilitiesSection
          totalLiabilities={totalLiabilities}
          liabilities={liabilities}
          onCreate={() => setCreateLiabilityModalOpen(true)}
          onEdit={handleEditLiability}
          onDelete={handleDeleteLiability}
          viewMode={viewMode}
        />
      )}

      {/* Asset Modals */}
      <CreateAssetModal
        open={createAssetModalOpen}
        onOpenChange={(open) => {
          setCreateAssetModalOpen(open);
          if (!open) {
            setDefaultAssetType(undefined);
          }
        }}
        onSubmit={handleCreateAsset}
        isLoading={createAssetMutation.isPending}
        defaultType={defaultAssetType}
      />

      {selectedAsset && (
        <EditAssetModal
          asset={selectedAsset}
          open={editAssetModalOpen}
          onOpenChange={setEditAssetModalOpen}
          onSubmit={handleUpdateAsset}
          isLoading={updateAssetMutation.isPending}
        />
      )}

      <DeleteAssetDialog
        asset={selectedAsset}
        open={deleteAssetDialogOpen}
        onOpenChange={setDeleteAssetDialogOpen}
        onConfirm={handleConfirmDeleteAsset}
        isLoading={deleteAssetMutation.isPending}
      />

      {/* Liability Modals */}
      <CreateLiabilityModal
        open={createLiabilityModalOpen}
        onOpenChange={setCreateLiabilityModalOpen}
        onSubmit={handleCreateLiability}
        isLoading={createLiabilityMutation.isPending}
      />

      {selectedLiability && (
        <EditLiabilityModal
          liability={selectedLiability}
          open={editLiabilityModalOpen}
          onOpenChange={setEditLiabilityModalOpen}
          onSubmit={handleUpdateLiability}
          isLoading={updateLiabilityMutation.isPending}
        />
      )}

      <DeleteLiabilityDialog
        liability={selectedLiability}
        open={deleteLiabilityDialogOpen}
        onOpenChange={setDeleteLiabilityDialogOpen}
        onConfirm={handleConfirmDeleteLiability}
        isLoading={deleteLiabilityMutation.isPending}
      />
    </div>
  );
}

