import { useState, useMemo, useCallback } from 'react';
import { useLiabilityBalanceHistory } from '../hooks/useLiabilities';
import { formatCurrency, formatDate, formatPercentage } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp } from 'lucide-react';
import { LiabilityBalanceTimeline } from './LiabilityBalanceTimeline';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LiabilityChangeLogProps {
  liabilityId: string;
}

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
type FilterOption = 'all' | 'decreases' | 'increases' | 'creations';

export function LiabilityChangeLog({ liabilityId }: LiabilityChangeLogProps) {
  const { data: history, isLoading, error } = useLiabilityBalanceHistory(liabilityId);
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
      <div className="text-body text-muted-foreground">
        Unable to load change history.
      </div>
    );
  }

  const filteredAndSortedHistory = useMemo(() => {
    if (!history) return [];

    // Filter
    let filtered = history;
    if (filterBy === 'increases') {
      filtered = history.filter((entry) => entry.previousBalance !== null && entry.changeAmount > 0);
    } else if (filterBy === 'decreases') {
      filtered = history.filter((entry) => entry.previousBalance !== null && entry.changeAmount < 0);
    } else if (filterBy === 'creations') {
      filtered = history.filter((entry) => entry.previousBalance === null);
    }

    // Sort
    const sorted = [...filtered];
    if (sortBy === 'date-desc') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'date-asc') {
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === 'amount-desc') {
      sorted.sort((a, b) => {
        if (a.previousBalance === null) return 1;
        if (b.previousBalance === null) return -1;
        return Math.abs(b.changeAmount) - Math.abs(a.changeAmount);
      });
    } else if (sortBy === 'amount-asc') {
      sorted.sort((a, b) => {
        if (a.previousBalance === null) return 1;
        if (b.previousBalance === null) return -1;
        return Math.abs(a.changeAmount) - Math.abs(b.changeAmount);
      });
    }

    return sorted;
  }, [history, sortBy, filterBy]);

  const handleExportCSV = useCallback(() => {
    if (!filteredAndSortedHistory || filteredAndSortedHistory.length === 0) return;

    const csvHeaders = ['Date', 'Previous Balance', 'New Balance', 'Change Amount', 'Type'];
    const csvRows = filteredAndSortedHistory.map((entry) => {
      const isCreation = entry.previousBalance === null;
      return [
        formatDate(entry.createdAt),
        entry.previousBalance === null ? 'N/A' : formatCurrency(entry.previousBalance),
        formatCurrency(entry.newBalance),
        isCreation ? 'N/A' : formatCurrency(Math.abs(entry.changeAmount)),
        isCreation ? 'Creation' : entry.changeAmount < 0 ? 'Decrease' : 'Increase',
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
    link.download = `liability-balance-history-${liabilityId.slice(0, 8)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredAndSortedHistory, liabilityId]);

  if (!history || history.length === 0) {
    return (
      <div className="text-body text-muted-foreground">
        No change history available.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="h-8 text-caption">
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
          <SelectTrigger className="h-8 text-caption">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Changes</SelectItem>
            <SelectItem value="creations">Creations Only</SelectItem>
            <SelectItem value="decreases">Decreases Only</SelectItem>
            <SelectItem value="increases">Increases Only</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTimeline(!showTimeline)}
          className="h-8 text-caption"
        >
          <TrendingUp className="h-3 w-3 mr-1" />
          {showTimeline ? 'Hide' : 'Show'} Timeline
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={!filteredAndSortedHistory || filteredAndSortedHistory.length === 0}
          className="h-8 text-caption ml-auto"
        >
          <Download className="h-3 w-3 mr-1" />
          Export CSV
        </Button>
      </div>
      {showTimeline && (
        <div className="border border-border rounded-lg p-3 bg-muted/30">
          <h4 className="text-caption font-semibold mb-2">Balance Over Time</h4>
          <LiabilityBalanceTimeline liabilityId={liabilityId} />
        </div>
      )}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredAndSortedHistory.map((entry) => {
        const isCreation = entry.previousBalance === null;
        // For liabilities, a decrease (negative changeAmount) is positive (paying down debt)
        const isDecrease = entry.changeAmount < 0;
        
        return (
          <div
            key={entry.id}
            className="flex items-start justify-between py-2 border-b border-border last:border-0"
          >
            <div className="flex-1 min-w-0">
              <div className="text-body text-muted-foreground">
                {formatDate(entry.createdAt)}
              </div>
              <div className="text-body text-foreground mt-0.5">
                {isCreation ? (
                  <>Created with balance {formatCurrency(entry.newBalance)}</>
                ) : (
                  <>
                    Updated from {formatCurrency(entry.previousBalance ?? 0)} to{' '}
                    {formatCurrency(entry.newBalance)}
                  </>
                )}
              </div>
            </div>
            <div className="ml-4 flex-shrink-0 text-right">
              {!isCreation && (
                <div className="flex flex-col items-end">
                  <span
                    className={`text-body font-medium ${
                      isDecrease ? 'text-success' : 'text-error'
                    }`}
                  >
                    {isDecrease ? '-' : '+'}
                    {formatCurrency(Math.abs(entry.changeAmount))}
                  </span>
                  {entry.previousBalance !== null && entry.previousBalance !== 0 && (
                    <span
                      className={`text-caption text-muted-foreground ${
                        isDecrease ? 'text-success' : 'text-error'
                      }`}
                    >
                      {formatPercentage((Math.abs(entry.changeAmount) / entry.previousBalance) * 100)}
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
