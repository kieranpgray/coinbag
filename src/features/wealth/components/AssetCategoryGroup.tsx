import { formatCurrency } from '@/lib/utils';
import { AssetPortfolioRow } from './AssetPortfolioRow';
import type { Asset } from '@/types/domain';

interface AssetCategoryGroupProps {
  categoryName: string;
  assets: Asset[];
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  /** Set of brokerage_auth_ids that are currently broken */
  brokenAuthIds?: Set<string>;
  /** Called when user clicks "Reconnect" on a broken connection asset */
  onReconnect?: (brokerageAuthId: string) => void;
  /** Map from snaptrade_account_id (string uuid) to brokerage_auth_id */
  accountToBrokerageAuthId?: Map<string, string>;
}

/**
 * Category group component for assets
 * Displays a section header, list of assets, and category total
 */
export function AssetCategoryGroup({
  categoryName,
  assets,
  onEdit,
  onDelete: _onDelete,
  brokenAuthIds,
  onReconnect,
  accountToBrokerageAuthId,
}: AssetCategoryGroupProps) {
  const categoryTotal = assets.reduce((sum, asset) => sum + asset.value, 0);

  if (assets.length === 0) {
    return null; // Don't render empty categories
  }

  return (
    <div className="mb-6 last:mb-0">
      {/* Section header */}
      <div className="flex items-center justify-between mb-2 border-l-2 border-[var(--accent-light)] pl-3">
        <h3 className="display-sm">{categoryName}</h3>
      </div>

      {/* Asset rows */}
      <div className="mt-1 border border-border rounded-lg bg-surface shadow-sm overflow-hidden">
        {assets.map((asset) => {
          const authId = asset.snaptradeAccountId
            ? accountToBrokerageAuthId?.get(asset.snaptradeAccountId)
            : undefined;
          const isConnectionBroken = authId ? (brokenAuthIds?.has(authId) ?? false) : false;

          return (
            <AssetPortfolioRow
              key={asset.id}
              asset={asset}
              onClick={onEdit}
              isConnectionBroken={isConnectionBroken}
              onReconnect={authId && onReconnect ? () => onReconnect(authId) : undefined}
            />
          );
        })}

        {/* Category total row */}
        <div className="flex items-center justify-end py-3 px-4 border-t-2 border-border bg-muted/50">
          <span className="text-body-lg font-medium text-foreground tabular-nums">
            {formatCurrency(categoryTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
