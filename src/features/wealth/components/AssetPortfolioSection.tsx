import { useMemo, useRef } from 'react';
import { Plus, ChevronDown, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency, cn } from '@/lib/utils';
import { isDsV2 } from '@/lib/dsV2';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { AssetCategoryGroup } from './AssetCategoryGroup';
import { AccountSelectionModal } from '@/features/snaptrade/components/AccountSelectionModal';
import { useSnaptradePortal } from '@/features/snaptrade/hooks/useSnaptradePortal';
import { useSnaptradeConnections } from '@/features/snaptrade/hooks/useSnaptradeConnections';
import type { Asset } from '@/types/domain';

// SnapTradeReact: only loaded when flag is on (tree-shaken when flag is off)
import { SnapTradeReact } from 'snaptrade-react';

interface AssetPortfolioSectionProps {
  totalAssets: number;
  assets: Asset[];
  onCreate: () => void;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}

/**
 * Asset categories in display order
 */
const ASSET_CATEGORIES: Array<Asset['type']> = [
  'Real Estate',
  'Other Investments',
  'Vehicles',
  'Crypto',
  'Cash',
  'Superannuation',
  'Stock',
  'RSU',
];

/**
 * Portfolio section component for assets.
 * When snaptrade_integration flag is on, "Add Asset" becomes a split button
 * that exposes "Connect a broker account" as the primary path.
 */
export function AssetPortfolioSection({
  totalAssets,
  assets,
  onCreate,
  onEdit,
  onDelete,
}: AssetPortfolioSectionProps) {
  const snaptradeEnabled = isFeatureEnabled('snaptrade_integration');

  const {
    state: portalState,
    isModalOpen,
    startConnect,
    retryConnect,
    handlePortalSuccess,
    handlePortalExit,
    handlePortalError,
    handleImport,
    skipImport,
  } = useSnaptradePortal();

  // Connection state (broken connections, for inline reconnect prompts)
  const { data: connections = [] } = useSnaptradeConnections();

  const brokenAuthIds = useMemo(
    () => new Set(connections.filter((c) => c.is_disabled).map((c) => c.brokerage_auth_id)),
    [connections]
  );

  // Map from snaptrade_account_id (uuid) to brokerage_auth_id
  // We need this to check if a specific asset's connection is broken.
  // This requires fetching snaptrade_accounts — but for Phase 2 we use a simpler
  // heuristic: if the asset has a snaptrade_account_id and any connection is broken,
  // we pass the full accountToBrokerageAuthId map once we have it.
  // For now we build it from the assets themselves — the asset's snaptradeAccountId
  // maps to a connection via the snaptrade_accounts table. We'll resolve this via
  // a separate query when needed.
  const accountToBrokerageAuthId = useMemo<Map<string, string>>(() => new Map(), []);

  const handleReconnect = (brokerageAuthId: string) => {
    startConnect(brokerageAuthId);
  };

  // Prevent double-click
  const connectingRef = useRef(false);
  const handleConnectClick = async () => {
    if (connectingRef.current) return;
    connectingRef.current = true;
    try {
      await startConnect();
    } finally {
      connectingRef.current = false;
    }
  };

  // Group assets by category
  const assetsByCategory = useMemo(() => {
    const grouped: Record<string, Asset[]> = {};
    assets.forEach((asset) => {
      (grouped[asset.type] ??= []).push(asset);
    });
    return grouped;
  }, [assets]);

  // Get categories that have assets, in display order
  const categoriesWithAssets = useMemo(() => {
    return ASSET_CATEGORIES.filter((category) => {
      const categoryAssets = assetsByCategory[category];
      return categoryAssets && categoryAssets.length > 0;
    });
  }, [assetsByCategory]);

  const isLoadingUrl = portalState.status === 'loading_url';
  const hasUrlError = portalState.status === 'url_error';

  return (
    <section className="space-y-6" aria-label="Assets section">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-foreground text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold">
              Assets
            </h2>
          </div>
          {isDsV2 ? (
            <div
              className={cn(
                'mt-2 inline-block rounded-[var(--rl)] border border-border bg-card px-6 py-5',
                'metric-tile'
              )}
            >
              <div className="metric-label">Total assets</div>
              <div className="metric-value tabular-nums">{formatCurrency(totalAssets)}</div>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-balance font-bold tabular-nums">{formatCurrency(totalAssets)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-start sm:items-end gap-2">
          {/* Split button (SnapTrade enabled) or plain button (disabled) */}
          {snaptradeEnabled ? (
            <div className="flex items-center">
              <Button
                size="sm"
                className="rounded-r-none border-r-0"
                onClick={handleConnectClick}
                disabled={isLoadingUrl}
                aria-label="Connect a broker account"
              >
                {isLoadingUrl ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Add Asset
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="rounded-l-none px-2"
                    disabled={isLoadingUrl}
                    aria-label="More options for adding an asset"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={handleConnectClick} disabled={isLoadingUrl}>
                    Connect a broker account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onCreate}>
                    Enter manually
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={onCreate}
              aria-label="Add asset"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Asset
            </Button>
          )}

          {/* Inline error below button */}
          {hasUrlError && portalState.errorMessage && (
            <div className="flex items-center gap-1.5 text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="text-body-sm">{portalState.errorMessage}</span>
              <button
                type="button"
                onClick={retryConnect}
                className="ml-1 text-body-sm underline underline-offset-2 hover:no-underline"
              >
                <RefreshCw className="h-3 w-3 inline mr-0.5" />
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SnapTrade portal iframe (SDK-managed overlay) */}
      {portalState.loginLink && (
        <SnapTradeReact
          loginLink={portalState.loginLink}
          isOpen={portalState.status === 'portal_open'}
          close={handlePortalExit}
          onSuccess={handlePortalSuccess}
          onExit={handlePortalExit}
          onError={handlePortalError}
          contentLabel="Connect your broker account via SnapTrade"
        />
      )}

      {/* Account selection modal (after portal success, multiple accounts) */}
      <AccountSelectionModal
        key={portalState.authorizationId ?? 'no-auth'}
        open={isModalOpen}
        onOpenChange={(open) => { if (!open) skipImport(); }}
        accounts={portalState.accounts}
        syncPending={portalState.syncPending}
        isImporting={portalState.status === 'importing'}
        importError={portalState.importError}
        onImport={handleImport}
        onSkip={skipImport}
        isLoadingAccounts={portalState.status === 'loading_accounts'}
      />

      {/* Category groups in responsive grid */}
      {categoriesWithAssets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                No assets found. Start building your portfolio.
              </p>
              <Button
                onClick={snaptradeEnabled ? handleConnectClick : onCreate}
                size="sm"
                disabled={isLoadingUrl}
              >
                {isLoadingUrl ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Your First Asset
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {categoriesWithAssets.map((category) => (
            <AssetCategoryGroup
              key={category}
              categoryName={category}
              assets={assetsByCategory[category] || []}
              onEdit={onEdit}
              onDelete={onDelete}
              brokenAuthIds={brokenAuthIds}
              onReconnect={handleReconnect}
              accountToBrokerageAuthId={accountToBrokerageAuthId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
