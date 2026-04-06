import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { Asset } from '@/types/domain';

interface AssetPortfolioRowProps {
  asset: Asset;
  onClick: (asset: Asset) => void;
  isConnectionBroken?: boolean;
  onReconnect?: () => void;
}

/**
 * Compact portfolio row component for individual assets.
 * For SnapTrade-connected assets, shows freshness timestamp and
 * an inline "Reconnect" prompt when the connection is broken.
 */
export function AssetPortfolioRow({ asset, onClick, isConnectionBroken, onReconnect }: AssetPortfolioRowProps) {
  const { t } = useTranslation('pages');
  const isConnected = asset.dataSource === 'snaptrade';

  const syncBrokenLabel = (() => {
    const name = asset.institution?.trim();
    if (name) {
      return t('snaptrade.syncErrorWithName', { brokerage: name });
    }
    return t('snaptrade.syncErrorGeneric');
  })();

  const freshnessLabel = (() => {
    if (!isConnected) return null;
    if (!asset.updatedAt) return null;
    try {
      return formatDistanceToNow(new Date(asset.updatedAt), { addSuffix: true });
    } catch {
      return null;
    }
  })();

  const isStale = (() => {
    if (!isConnected || !asset.updatedAt) return false;
    try {
      const ageMs = Date.now() - new Date(asset.updatedAt).getTime();
      return ageMs > 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  })();

  const sublineParts: Array<{ text: string; className?: string }> = [];

  if (isConnected) {
    if (asset.institution) {
      sublineParts.push({ text: asset.institution });
    }
    if (isConnectionBroken) {
      sublineParts.push({ text: syncBrokenLabel, className: 'text-destructive' });
    } else if (freshnessLabel) {
      sublineParts.push({
        text: freshnessLabel,
        className: isStale ? 'text-[var(--warning)]' : undefined,
      });
    }
  } else if (asset.institution) {
    sublineParts.push({ text: asset.institution });
  }

  return (
    <button
      type="button"
      onClick={() => onClick(asset)}
      className="w-full flex items-center justify-between py-2 px-4 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-b-0"
      aria-label={`View details for ${asset.name}`}
    >
      {/* Left side: Name, institution, freshness */}
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-1.5">
          {isStale && isConnected && !isConnectionBroken && (
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--warning)]"
              aria-label="Balance may be outdated"
            />
          )}
          <span className="text-body text-foreground truncate">
            {asset.name}
          </span>
        </div>

        {sublineParts.length > 0 && (
          <div className="flex items-center gap-1 text-body-sm text-muted-foreground truncate mt-0.5">
            {sublineParts.map((part, i) => (
              <span key={i} className={part.className}>
                {i > 0 && <span className="text-muted-foreground/50 mx-1">·</span>}
                {part.text}
              </span>
            ))}
            {isConnectionBroken && onReconnect && (
              <>
                <span className="text-muted-foreground/50 mx-1">·</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onReconnect(); }}
                  className="text-primary underline underline-offset-2 hover:no-underline text-body-sm"
                  aria-label={`Reconnect ${asset.name}`}
                >
                  {t('snaptrade.reconnectCta')}
                </button>
              </>
            )}
          </div>
        )}

        {/* Balance currency badge for non-AUD connected assets */}
        {isConnected && asset.balanceCurrency && asset.balanceCurrency !== 'AUD' && (
          <span className="inline-block mt-0.5 text-[11px] font-medium text-muted-foreground border border-border/60 rounded px-1 py-0 leading-relaxed">
            {asset.balanceCurrency}
          </span>
        )}
      </div>

      {/* Right side: Value */}
      <div className="flex-shrink-0">
        <span className="text-body-lg font-medium text-foreground tabular-nums">
          {formatCurrency(asset.value)}
        </span>
      </div>
    </button>
  );
}
