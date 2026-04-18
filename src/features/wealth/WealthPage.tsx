import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from '@/features/assets/hooks';
import { useLiabilities, useCreateLiability, useUpdateLiability, useDeleteLiability } from '@/features/liabilities/hooks';
import { useAccounts } from '@/features/accounts/hooks';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AssetsSection } from './components/AssetsSection';
import { LiabilitiesSection } from './components/LiabilitiesSection';
import { VisualDivider } from '@/features/budget/components/VisualDivider';
import { WealthBreakdown } from './components/WealthBreakdown';
import { CreateAssetModal } from '@/features/assets/components/CreateAssetModal';
import { EditAssetModal } from '@/features/assets/components/EditAssetModal';
import { DeleteAssetDialog } from '@/features/assets/components/DeleteAssetDialog';
import { CreateLiabilityModal } from '@/features/liabilities/components/CreateLiabilityModal';
import { EditLiabilityModal } from '@/features/liabilities/components/EditLiabilityModal';
import { DeleteLiabilityDialog } from '@/features/liabilities/components/DeleteLiabilityDialog';
import { useDisconnectBrokerageSync } from '@/features/snaptrade/hooks/useDisconnectBrokerageSync';
import type { Asset } from '@/types/domain';
import type { Liability } from '@/types/domain';
import { ROUTES } from '@/lib/constants/routes';
import { classifyAccountHolding } from '@/features/wealth/utils/accountClassification';
import { isFeatureEnabled } from '@/lib/featureFlags';

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

/**
 * Wealth page component
 * Unified view for assets and liabilities
 */
export function WealthPage() {
  const { t } = useTranslation(['pages', 'navigation']);
  const navigate = useNavigate();
  const disconnectBrokerageMutation = useDisconnectBrokerageSync();
  const holdingsAccountMigrationEnabled = isFeatureEnabled('holdings_account_activity_migration');

  useEffect(() => {
    document.title = t('holdingsDocumentTitle', { ns: 'pages' });
    return () => {
      document.title = 'Supafolio';
    };
  }, [t]);

  // Always use portfolio view (list mode)
  const viewMode: 'list' | 'cards' = 'list';

  // Data hooks
  const { data: assets = [], isLoading: assetsLoading, error: assetsError, refetch: refetchAssets } = useAssets();
  const { data: liabilities = [], isLoading: liabilitiesLoading, error: liabilitiesError, refetch: refetchLiabilities } = useLiabilities();
  const { data: accounts = [] } = useAccounts();

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
    const type = searchParams.get('type');

    if (shouldCreate === 'asset') {
      setCreateAssetModalOpen(true);
      const normalizedType = normalizeAssetTypeFromQueryParam(type);
      if (normalizedType) {
        setDefaultAssetType(normalizedType);
      }
      setSearchParams({});
    } else if (shouldCreate === 'liability') {
      setCreateLiabilityModalOpen(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const accountHoldings = useMemo(
    () => (holdingsAccountMigrationEnabled ? accounts.map(classifyAccountHolding) : []),
    [accounts, holdingsAccountMigrationEnabled]
  );
  const assetAccountHoldings = useMemo(
    () => accountHoldings.filter((holding) => holding.bucket === 'asset'),
    [accountHoldings]
  );
  const liabilityAccountHoldings = useMemo(
    () => accountHoldings.filter((holding) => holding.bucket === 'liability'),
    [accountHoldings]
  );

  // Calculate totals (memoized)
  const totalAssets = useMemo(() => {
    const directAssetsTotal = assets.reduce((sum, asset) => sum + asset.value, 0);
    const accountAssetsTotal = assetAccountHoldings.reduce((sum, holding) => sum + holding.holdingValue, 0);
    return directAssetsTotal + accountAssetsTotal;
  }, [assets, assetAccountHoldings]);

  const totalLiabilities = useMemo(() => {
    const directLiabilitiesTotal = liabilities.reduce((sum, liability) => sum + liability.balance, 0);
    const accountLiabilitiesTotal = liabilityAccountHoldings.reduce((sum, holding) => sum + holding.holdingValue, 0);
    return directLiabilitiesTotal + accountLiabilitiesTotal;
  }, [liabilities, liabilityAccountHoldings]);

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
        <div>
          <h1 className="page-title">
            {t('wealth', { ns: 'navigation' })}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('holdingsSubtitle', { ns: 'pages' })}</p>
        </div>
      </div>

      {/* Wealth Breakdown */}
      <WealthBreakdown
        totalAssets={totalAssets}
        totalLiabilities={totalLiabilities}
        netWorth={netWorth}
        assetsUnavailable={hasAssetsError}
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
          accountHoldings={assetAccountHoldings}
          onCreate={() => setCreateAssetModalOpen(true)}
          onEdit={handleEditAsset}
          onDelete={handleDeleteAsset}
          onViewActivity={(accountId) => navigate(ROUTES.app.accountsDetail(accountId))}
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
          accountHoldings={liabilityAccountHoldings}
          onCreate={() => setCreateLiabilityModalOpen(true)}
          onEdit={handleEditLiability}
          onDelete={handleDeleteLiability}
          onViewActivity={(accountId) => navigate(ROUTES.app.accountsDetail(accountId))}
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
          onDeleteRequested={() => {
            setEditAssetModalOpen(false);
            setDeleteAssetDialogOpen(true);
          }}
          onDisconnectBrokerageSync={async (assetId) => {
            try {
              await disconnectBrokerageMutation.mutateAsync(assetId);
              toast.success(t('snaptrade.disconnectSuccessToast', { ns: 'pages' }));
              setSelectedAsset(null);
            } catch (err) {
              toast.error(t('snaptrade.disconnectErrorToast', { ns: 'pages' }));
              throw err;
            }
          }}
          isDisconnectingBrokerage={disconnectBrokerageMutation.isPending}
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
          onDeleteRequested={() => {
            setEditLiabilityModalOpen(false);
            setDeleteLiabilityDialogOpen(true);
          }}
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

