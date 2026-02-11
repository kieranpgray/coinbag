import { useState, useMemo, useCallback } from 'react';
import { useAssetValueHistory } from '../hooks/useAssets';
import { formatCurrency, formatDate, formatPercentage } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp } from 'lucide-react';
import { AssetValueTimeline } from './AssetValueTimeline';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AssetChangeLogProps {
  assetId: string;
}

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
type FilterOption = 'all' | 'increases' | 'decreases' | 'creations';

export function AssetChangeLog({ assetId }: AssetChangeLogProps) {
  const { data: history, isLoading, error } = useAssetValueHistory(assetId);
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showTimeline, setShowTimeline] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-muted-foreground">
        Unable to load change history.
      </div>
    );
  }

  const filteredAndSortedHistory = useMemo(() => {
    if (!history) return [];

    // Filter
    let filtered = history;
    if (filterBy === 'increases') {
      filtered = history.filter((entry) => entry.previousValue !== null && entry.changeAmount > 0);
    } else if (filterBy === 'decreases') {
      filtered = history.filter((entry) => entry.previousValue !== null && entry.changeAmount < 0);
    } else if (filterBy === 'creations') {
      filtered = history.filter((entry) => entry.previousValue === null);
    }

    // Sort
    const sorted = [...filtered];
    if (sortBy === 'date-desc') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'date-asc') {
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === 'amount-desc') {
      sorted.sort((a, b) => {
        if (a.previousValue === null) return 1;
        if (b.previousValue === null) return -1;
        return b.changeAmount - a.changeAmount;
      });
    } else if (sortBy === 'amount-asc') {
      sorted.sort((a, b) => {
        if (a.previousValue === null) return 1;
        if (b.previousValue === null) return -1;
        return a.changeAmount - b.changeAmount;
      });
    }

    return sorted;
  }, [history, sortBy, filterBy]);

  const handleExportCSV = useCallback(() => {
    if (!filteredAndSortedHistory || filteredAndSortedHistory.length === 0) return;

    const csvHeaders = ['Date', 'Previous Value', 'New Value', 'Change Amount', 'Type'];
    const csvRows = filteredAndSortedHistory.map((entry) => {
      const isCreation = entry.previousValue === null;
      return [
        formatDate(entry.createdAt),
        entry.previousValue === null ? 'N/A' : formatCurrency(entry.previousValue),
        formatCurrency(entry.newValue),
        isCreation ? 'N/A' : formatCurrency(entry.changeAmount),
        isCreation ? 'Creation' : entry.changeAmount > 0 ? 'Increase' : 'Decrease',
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asset-value-history-${assetId.slice(0, 8)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredAndSortedHistory, assetId]);

  if (!history || history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No change history available.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Date (Newest)</SelectItem>
            <SelectItem value="date-asc">Date (Oldest)</SelectItem>
            <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
            <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBy} onValueChange={(value) => setFilterBy(value as FilterOption)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Changes</SelectItem>
            <SelectItem value="creations">Creations Only</SelectItem>
            <SelectItem value="increases">Increases Only</SelectItem>
            <SelectItem value="decreases">Decreases Only</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTimeline(!showTimeline)}
          className="h-8 text-xs"
        >
          <TrendingUp className="h-3 w-3 mr-1" />
          {showTimeline ? 'Hide' : 'Show'} Timeline
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={!filteredAndSortedHistory || filteredAndSortedHistory.length === 0}
          className="h-8 text-xs ml-auto"
        >
          <Download className="h-3 w-3 mr-1" />
          Export CSV
        </Button>
      </div>
      {showTimeline && (
        <div className="border border-border rounded-lg p-3 bg-muted/30">
          <h4 className="text-xs font-semibold mb-2">Value Over Time</h4>
          <AssetValueTimeline assetId={assetId} />
        </div>
      )}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredAndSortedHistory.map((entry) => {
        const isCreation = entry.previousValue === null;
        const isIncrease = entry.changeAmount > 0;
        
        return (
          <div
            key={entry.id}
            className="flex items-start justify-between py-2 border-b border-border last:border-0"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm text-muted-foreground">
                {formatDate(entry.createdAt)}
              </div>
              <div className="text-sm text-foreground mt-0.5">
                {isCreation ? (
                  <>Created with value {formatCurrency(entry.newValue)}</>
                ) : (
                  <>
                    Updated from {formatCurrency(entry.previousValue ?? 0)} to{' '}
                    {formatCurrency(entry.newValue)}
                  </>
                )}
              </div>
            </div>
            <div className="ml-4 flex-shrink-0 text-right">
              {!isCreation && (
                <div className="flex flex-col items-end">
                  <span
                    className={`text-sm font-medium ${
                      isIncrease ? 'text-success' : 'text-error'
                    }`}
                  >
                    {isIncrease ? '+' : ''}
                    {formatCurrency(entry.changeAmount)}
                  </span>
                  {entry.previousValue !== null && entry.previousValue !== 0 && (
                    <span
                      className={`text-xs text-muted-foreground ${
                        isIncrease ? 'text-success' : 'text-error'
                      }`}
                    >
                      {formatPercentage((entry.changeAmount / entry.previousValue) * 100)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
