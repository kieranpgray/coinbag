import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, ChevronDown, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { AssetCategoryGroup } from './AssetCategoryGroup';
import { AccountSelectionModal } from '@/features/snaptrade/components/AccountSelectionModal';
import { useSnaptradePortal } from '@/features/snaptrade/hooks/useSnaptradePortal';
import { useSnaptradeConnections } from '@/features/snaptrade/hooks/useSnaptradeConnections';
import type { Asset } from '@/types/domain';
import type { ClassifiedAccountHolding } from '@/features/wealth/utils/accountClassification';
import { formatCurrency } from '@/lib/utils';

// SnapTradeReact: only loaded when flag is on (tree-shaken when flag is off)
import { SnapTradeReact } from 'snaptrade-react';

interface AssetPortfolioSectionProps {
  assets: Asset[];
  accountHoldings?: ClassifiedAccountHolding[];
  onCreate: () => void;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onViewActivity?: (accountId: string) => void;
}

/**
 * Asset categories in display order
 */
const ASSET_CATEGORIES: Array<Asset['type']> = [
  'Property',
  'Other asset',
  'Vehicle',
  'Crypto',
  'Cash',
  'Super',
  'Shares',
  'RSUs',
];

/**
 * Portfolio section component for assets.
 * When snaptrade_integration flag is on, "Add an asset" becomes a split button
 * that exposes "Connect a brokerage" as the primary path.
 */
export function AssetPortfolioSection({
  assets,
  accountHoldings = [],
  onCreate,
  onEdit,
  onDelete,
  onViewActivity,
}: AssetPortfolioSectionProps) {
  const { t } = useTranslation('pages');
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
    const name =
      connections.find((c) => c.brokerage_auth_id === brokerageAuthId)?.brokerage_name ?? null;
    startConnect(brokerageAuthId, name);
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
  const hasPortalError =
    portalState.status === 'url_error' || portalState.status === 'accounts_error';

  return (
    <section className="space-y-6" aria-label={`${t('whatYouOwn')} section`}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="display-sm">
              {t('whatYouOwn')}
            </h2>
          </div>
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
                aria-label="Connect a brokerage"
              >
                {isLoadingUrl ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Add an asset
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
                    Connect a brokerage
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
              aria-label="Add an asset"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add an asset
            </Button>
          )}

          {snaptradeEnabled && (
            <p className="text-body-sm text-muted-foreground max-w-xs sm:text-right">
              {t('snaptrade.trustCredentialsNote')}
            </p>
          )}

          {/* Inline error below button */}
          {hasPortalError && portalState.errorMessage && (
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

      {/* Category groups */}
      {categoriesWithAssets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-4">
              <h3 className="display-sm">
                {t('emptyStates.holdingsNoAssets.headline')}
              </h3>
              <p className="text-muted-foreground text-balance max-w-lg mx-auto">
                {t('emptyStates.holdingsNoAssets.body')}
              </p>
              <Button
                onClick={snaptradeEnabled ? handleConnectClick : onCreate}
                size="sm"
                disabled={isLoadingUrl}
                aria-label={t('emptyStates.holdingsNoAssets.ctaAriaLabel')}
              >
                {isLoadingUrl ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {t('emptyStates.holdingsNoAssets.cta')}
              </Button>
              {snaptradeEnabled && (
                <p className="text-body-sm text-muted-foreground max-w-md mx-auto">
                  {t('snaptrade.trustCredentialsNote')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
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

      {accountHoldings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-l-2 border-[var(--accent-light)] pl-3">
            <h3 className="display-sm">{t('holdings.accountBackedAssetsHeading')}</h3>
          </div>
          <div className="detail-list">
            {accountHoldings.map((holding) => (
              <div key={holding.account.id} className="detail-item">
                <div className="flex min-w-0 flex-col">
                  <span className="text-body font-medium text-foreground truncate">{holding.account.accountName}</span>
                  <span className="text-body-sm text-muted-foreground">
                    {holding.isUnknownType ? t('holdings.uncategorizedAccountType') : holding.normalizedType}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-body font-medium text-foreground">
                    {formatCurrency(holding.holdingValue)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewActivity?.(holding.account.id)}
                    aria-label={t('holdings.viewActivityAriaLabel', { accountName: holding.account.accountName })}
                  >
                    {t('holdings.viewActivityCta')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
