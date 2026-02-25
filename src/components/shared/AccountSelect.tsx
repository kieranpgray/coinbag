import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, Check, Loader2, Search, Plus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccounts, useCreateAccount } from '@/features/accounts/hooks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SimplifiedAccountForm } from '@/features/expenses/components/SimplifiedAccountForm';
import type { Account } from '@/types/domain';
import type { AccountCreate } from '@/contracts/accounts';

interface AccountSelectProps {
  /**
   * Optional id to support <Label htmlFor="..."> association.
   * This is particularly helpful for accessibility and testing.
   */
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  onAccountCreationStateChange?: (isCreating: boolean) => void;
  onAccountCreationError?: (error: string | null) => void;
  context?: 'expense' | 'income';
}

export function AccountSelect({ id, value, onChange, placeholder = "Select account", error, onAccountCreationStateChange, onAccountCreationError, context = 'expense' }: AccountSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountCreationError, setAccountCreationError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Use accounts hook for data
  const { data: accounts = [], isLoading, error: loadError, refetch: refetchAccounts } = useAccounts();
  const createAccountMutation = useCreateAccount();

  // Filter accounts based on search query
  const filteredAccounts = accounts.filter((account) =>
    account.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (account.institution && account.institution.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Find selected account
  const selectedAccount = accounts.find(account => account.id === value);

  // Format account display name
  const formatAccountName = (account: Account) => {
    if (account.institution) {
      return `${account.accountName} (${account.institution})`;
    }
    return account.accountName;
  };

  const handleAccountSelect = (accountId: string) => {
    onChange(accountId);
    setIsOpen(false);
    setSearchQuery('');
    buttonRef.current?.focus();
  };

  const handleOpenCreateDialog = () => {
    setIsOpen(false);
    setIsCreateDialogOpen(true);
  };

  const handleCreateAccount = async (accountData: AccountCreate) => {
    setIsCreating(true);
    setAccountCreationError(null);
    onAccountCreationStateChange?.(true);
    try {
      const result = await createAccountMutation.mutateAsync(accountData);

      // Refresh accounts list
      await refetchAccounts();

      // Auto-select the newly created account
      onChange(result.id);

      setIsCreateDialogOpen(false);
      setAccountCreationError(null);
      onAccountCreationError?.(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
      setAccountCreationError(errorMessage);
      onAccountCreationError?.(errorMessage);
      // Keep dialog open on error so user can retry
    } finally {
      setIsCreating(false);
      onAccountCreationStateChange?.(false);
    }
  };

  const handleCancelCreate = () => {
    setIsCreateDialogOpen(false);
    setAccountCreationError(null);
    onAccountCreationError?.(null);
  };

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    return undefined;
  }, [isOpen]);

  // Handle keyboard navigation in dropdown
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, filteredAccounts.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredAccounts[highlightedIndex]) {
        handleAccountSelect(filteredAccounts[highlightedIndex].id);
      }
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <>
      <div className="relative">
        <Button
          id={id}
          ref={buttonRef}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={cn(
            // Atlassian Design System styling: clean borders, subtle focus states
            'w-full justify-between h-10 rounded-md border border-border bg-background px-3 py-2 text-body text-foreground',
            'hover:border-neutral-mid hover:bg-muted/50',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 focus:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted disabled:hover:border-border',
            error && 'border-destructive',
            !selectedAccount && 'text-muted-foreground'
          )}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
              setSearchQuery('');
              buttonRef.current?.focus();
            } else if (e.key === 'ArrowDown' && !isOpen) {
              setIsOpen(true);
            } else if (e.key.length === 1 && !isOpen) {
              // Open dropdown when user starts typing
              e.preventDefault(); // Prevent browser from inserting character into input
              setIsOpen(true);
              setSearchQuery(e.key);
            }
          }}
        >
          <span className="truncate">
            {selectedAccount ? formatAccountName(selectedAccount) : placeholder}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform ml-2 shrink-0',
              isOpen && 'rotate-180'
            )}
          />
        </Button>

        {isOpen && (
          <div
            ref={dropdownRef}
            role="listbox"
            className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md max-h-80 overflow-hidden flex flex-col shadow-lg"
          >
            {/* Search input */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Type to search accounts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-8 h-8"
                />
              </div>
            </div>

            {/* Accounts list */}
            <div className="overflow-auto max-h-60">
              {isLoading ? (
                <div className="px-3 py-6 text-center text-body text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Loading accounts...
                </div>
              ) : loadError ? (
                <div className="px-3 py-6 text-center text-body text-destructive">
                  Failed to load accounts
                </div>
              ) : filteredAccounts.length > 0 ? (
                <div className="py-1">
                  {filteredAccounts.map((account, index) => (
                    <button
                      key={account.id}
                      type="button"
                      role="option"
                      aria-selected={account.id === value}
                      className={cn(
                        // Atlassian Design System styling: improved hover states, better selected state indication
                        'w-full px-3 py-2 text-left text-body text-foreground rounded-sm flex items-center justify-between',
                        'hover:bg-muted',
                        'focus:bg-primary/10 focus:outline-none',
                        index === highlightedIndex && 'bg-primary/10',
                        account.id === value && 'bg-primary/10'
                      )}
                      onClick={() => handleAccountSelect(account.id)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <span>{formatAccountName(account)}</span>
                      {account.id === value && <Check className="h-4 w-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-6 text-center text-body text-muted-foreground">
                  {searchQuery ? `No accounts found for "${searchQuery}"` : 'No accounts available'}
                </div>
              )}
            </div>

            {/* Create new account button */}
            <div className="border-t border-border">
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-muted text-primary rounded-sm text-body flex items-center"
                onClick={handleOpenCreateDialog}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add new account
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-body text-red-500 mt-1">{error}</p>
        )}
      </div>

      {/* Inline create account dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Create a new account to track where this {context === 'expense' ? 'expense is paid from' : 'income is paid to'}.
            </DialogDescription>
          </DialogHeader>
          {accountCreationError && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{accountCreationError}</AlertDescription>
            </Alert>
          )}
          <SimplifiedAccountForm
            onSubmit={handleCreateAccount}
            onCancel={handleCancelCreate}
            isLoading={isCreating}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
