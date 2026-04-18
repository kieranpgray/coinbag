import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import type { ListData } from '../utils/assetAllocation';

const MAX_VISIBLE_ROWS = 8;

function formatPercentage(percentage: number): string {
  if (percentage > 0 && percentage < 1) {
    return '< 1%';
  }
  return `${Math.round(percentage)}%`;
}

interface AssetAllocationListProps {
  data: ListData[];
}

export const AssetAllocationList = memo(function AssetAllocationList({
  data,
}: AssetAllocationListProps) {
  const { t } = useTranslation('pages');

  const { visibleRows, overflowCount } = useMemo(() => {
    if (!data?.length) {
      return { visibleRows: [], overflowCount: 0 };
    }
    return {
      visibleRows: data.slice(0, MAX_VISIBLE_ROWS),
      overflowCount: Math.max(0, data.length - MAX_VISIBLE_ROWS),
    };
  }, [data]);

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div>
      <table className="chart-legend-table">
        <caption className="sr-only">{t('allocationBreakdown.legendCaptionAssets')}</caption>
        <tbody>
          {visibleRows.map((item) => (
            <tr key={item.category}>
              <td className="w-[10px] align-middle">
                <div
                  className="chart-legend-swatch"
                  style={{ background: item.color }}
                  aria-hidden
                />
              </td>
              <td className="chart-legend-name min-w-0" title={item.category}>
                {item.category}
              </td>
              <td className="chart-legend-pct">{formatPercentage(item.percentage)}</td>
              <td>
                <PrivacyWrapper value={item.value} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {overflowCount > 0 ? (
        <Link
          to="/app/wealth"
          className="mt-3 inline-block text-body text-primary hover:underline"
        >
          {t('allocationBreakdown.moreCategories', { count: overflowCount })}
        </Link>
      ) : null}

      <Link
        to="/app/wealth"
        className={`${overflowCount > 0 ? 'mt-2' : 'mt-3'} inline-block text-body text-primary hover:underline`}
      >
        {t('allocationBreakdown.viewAllAssets')}
      </Link>
    </div>
  );
});
