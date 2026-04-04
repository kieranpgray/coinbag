import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { SnaptradeAccount } from '../api/snaptradeApi';

interface AccountSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: SnaptradeAccount[];
  syncPending: boolean;
  isImporting: boolean;
  importError: string | null;
  onImport: (selectedIds: string[]) => void;
  onSkip: () => void;
  isLoadingAccounts?: boolean;
}

export function AccountSelectionModal({
  open,
  onOpenChange,
  accounts,
  syncPending,
  isImporting,
  importError,
  onImport,
  onSkip,
  isLoadingAccounts = false,
}: AccountSelectionModalProps) {
  const importableAccounts = accounts.filter((a) => !a.isAlreadyImported);

  // All importable accounts selected by default
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(importableAccounts.map((a) => a.snaptradeAccountId))
  );

  // Reset selection when accounts change (new connection)
  // Using a key on the modal handles this via remount

  const toggleAccount = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedCount = selected.size;

  const handleImport = () => {
    if (selectedCount === 0) return;
    onImport(Array.from(selected));
  };

  const formatBalance = (amount: number | null, currency: string | null) => {
    if (amount === null) return '—';
    const formatted = new Intl.NumberFormat('en-AU', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return currency ? `$${formatted} ${currency}` : `$${formatted}`;
  };

  const ctaLabel = selectedCount === 0
    ? 'Select accounts to add'
    : selectedCount === 1
    ? 'Add 1 account'
    : `Add ${selectedCount} accounts`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add accounts</DialogTitle>
          <DialogDescription>
            {isLoadingAccounts
              ? 'Connecting to your broker…'
              : syncPending
                ? 'Your accounts are loading from your broker.'
                : `Select which accounts to track in your portfolio.`}
          </DialogDescription>
        </DialogHeader>

        {/* Loading accounts state */}
        {isLoadingAccounts ? (
          <div className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-body text-muted-foreground">Connecting to your broker…</p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {/* Sync pending state */}
            {syncPending && (
              <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-4 py-4">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                <p className="text-body-sm text-muted-foreground">
                  This usually takes under a minute. Checking for accounts…
                </p>
              </div>
            )}

            {/* Account list */}
            {!syncPending && importableAccounts.length === 0 && accounts.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-body-sm text-muted-foreground">
                  No accounts were found under this connection. They may take a few minutes to appear — check back shortly.
                </p>
              </div>
            )}

            {!syncPending && importableAccounts.map((account) => {
              const isSelected = selected.has(account.snaptradeAccountId);
              return (
                <button
                  key={account.snaptradeAccountId}
                  type="button"
                  onClick={() => toggleAccount(account.snaptradeAccountId)}
                  disabled={isImporting}
                  className="flex w-full items-center gap-3 rounded-md border border-border px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  aria-pressed={isSelected}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleAccount(account.snaptradeAccountId)}
                    disabled={isImporting}
                    aria-label={`Select ${account.name}`}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex flex-1 items-center justify-between min-w-0">
                    <div className="min-w-0 pr-3">
                      <div className="text-body font-medium text-foreground truncate">
                        {account.name}
                      </div>
                      {(account.type || account.number) && (
                        <div className="text-body-sm text-muted-foreground truncate mt-0.5">
                          {[account.type, account.number].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-body-sm font-medium text-foreground tabular-nums">
                      {formatBalance(account.balanceAmount, account.balanceCurrency)}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Already-imported accounts (informational, not selectable) */}
            {!syncPending && accounts.filter((a) => a.isAlreadyImported).map((account) => (
              <div
                key={account.snaptradeAccountId}
                className="flex items-center gap-3 rounded-md border border-border px-4 py-3 opacity-50 cursor-default"
              >
                <Checkbox checked disabled aria-label={`${account.name} already added`} />
                <div className="flex flex-1 items-center justify-between min-w-0">
                  <div className="min-w-0 pr-3">
                    <div className="text-body text-foreground truncate">{account.name}</div>
                    <div className="text-body-sm text-muted-foreground mt-0.5">Already added</div>
                  </div>
                  <div className="shrink-0 text-body-sm text-muted-foreground tabular-nums">
                    {formatBalance(account.balanceAmount, account.balanceCurrency)}
                  </div>
                </div>
              </div>
            ))}

            {/* Error state */}
            {importError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                <p className="text-body-sm text-destructive">{importError}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer - only show when not loading accounts */}
        {!isLoadingAccounts && !syncPending && (importableAccounts.length > 0 || accounts.length === 0) && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleImport}
              disabled={selectedCount === 0 || isImporting}
            >
              {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isImporting ? 'Adding…' : ctaLabel}
            </Button>
            <button
              type="button"
              onClick={onSkip}
              disabled={isImporting}
              className="text-body-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
            >
              Skip ›
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {!isLoadingAccounts && !syncPending && accounts.length === 0 && importableAccounts.length === 0 && (
          <div className="space-y-3 py-2">
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
