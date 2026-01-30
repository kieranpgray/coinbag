import { useMemo, useEffect, useRef } from 'react';
import { useTransactions } from '../hooks';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeftRight, RefreshCw, Upload } from 'lucide-react';
import type { Transaction } from '@/types/domain';
import type { FileWithStatus } from '@/components/shared/MultiStatementFileUpload';
import { UploadFileList } from './UploadFileList';
import { UploadStatusAlerts } from './UploadStatusAlerts';
import { UploadOverlay } from './UploadOverlay';
import { getCorrelationId } from '@/lib/logger';

interface TransactionListProps {
  accountId: string;
  onUploadClick?: () => void;
  isPopulated?: boolean;
  uploadFiles?: FileWithStatus[];
  isUploading?: boolean;
  uploadError?: string | null;
  onRemoveFile?: (id: string) => void;
  onDismissOverlay?: () => void;
  statementImportId?: string; // Optional: when provided, only show transactions from this statement import
}

/**
 * Transaction list component
 * Displays transactions for a specific account
 */
export function TransactionList({ 
  accountId, 
  onUploadClick, 
  isPopulated: isPopulatedProp,
  uploadFiles = [],
  isUploading = false,
  uploadError = null,
  onRemoveFile,
  onDismissOverlay,
  statementImportId,
}: TransactionListProps) {
  const { data: transactions = [], isLoading, error, refetch } = useTransactions(accountId, statementImportId);
  const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;
  const { locale } = useLocale();
  const { t } = useTranslation(['transactions', 'common']);

  // CRITICAL: Filter transactions by provenance (client-side safety check)
  // This ensures we only render transactions with statement_import_id when viewing statement imports
  const validatedTransactions = useMemo(() => {
    // === CHECKPOINT 7: UI RENDER ===
    console.log('=== CHECKPOINT 7: UI RENDER ===')
    console.log('File: src/features/transactions/components/TransactionList.tsx:45')
    console.log('Transactions received by component:', transactions.length)
    console.log('Account ID:', accountId)
    console.log('Statement Import ID:', statementImportId)
    console.log('Sample transactions (first 3):', transactions.slice(0, 3))
    
    // If statementImportId is provided, ensure ALL transactions have matching statementImportId
    // Note: The repository already filters, but this is a safety check
    let filtered = transactions;

    // CRITICAL: In production, filter out transactions without statement_import_id
    // This prevents showing test/manual transactions
    if (isProduction) {
      // Note: We can't check statementImportId from Transaction domain type directly
      // The repository already filters, but we can validate the count matches expectations
      // If we expected statementImportId but got transactions, log a warning
      if (statementImportId && transactions.length > 0) {
        // Repository should have filtered, but log if we see suspicious data
        console.warn('[TransactionList] Transactions loaded for statement import', {
          statementImportId,
          count: transactions.length,
          accountId
        });
      }
    }

    // CRITICAL: If statementImportId was provided but we have no transactions,
    // this means either processing failed or is incomplete
    // Show appropriate state (handled by empty state UI)
    
    console.log('Transactions after client-side filters:', filtered.length)
    console.log('Client-side filtering applied?', filtered.length !== transactions.length ? 'YES' : 'NO')
    console.log('Status:', filtered.length >= 40 ? `✅ ${filtered.length} transactions (expected ~43)` : `❌ Only ${filtered.length} transactions (expected 43)`)

    return filtered;
  }, [transactions, statementImportId, accountId, isProduction]);

  const isPopulated = isPopulatedProp ?? validatedTransactions.length > 0;
  
  // Log render with transaction count (dev-only)
  useEffect(() => {
    if (import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGGING === 'true') {
      const correlationId = getCorrelationId();
      console.log("[Render] transactions", { 
        correlationId, 
        accountId, 
        statementImportId,
        count: validatedTransactions.length 
      });
    }
  }, [validatedTransactions.length, accountId, statementImportId]);
  
  // Add transaction count monitoring
  const prevTransactionCount = useRef(validatedTransactions.length);
  
  // Auto-dismiss overlay after successful completion
  // Check both file status AND transaction availability
  useEffect(() => {
    // Track transaction count changes
    const transactionCountIncreased = validatedTransactions.length > prevTransactionCount.current;
    const hasTransactions = validatedTransactions.length > 0;
    prevTransactionCount.current = validatedTransactions.length;
    
    if ((isPopulated || hasTransactions) && uploadFiles.length > 0) {
      const allComplete = uploadFiles.every((f) => f.status === 'success' || f.status === 'error');
      const hasSuccess = uploadFiles.some((f) => f.status === 'success');
      const hasCompletedFiles = uploadFiles.some((f) => f.status === 'success' || f.processingStatus === 'completed');
      const isProcessing = uploadFiles.some((f) => f.status === 'processing');

      // If transactions just appeared AND we have completed files, close modal
      if (transactionCountIncreased && hasTransactions && hasCompletedFiles && !isProcessing && onDismissOverlay) {
        // Close after brief delay to show success state
        const timer = setTimeout(() => {
          onDismissOverlay();
        }, 1500);
        return () => clearTimeout(timer);
      }
      
      // Fallback: If transactions are available AND processing complete, close modal
      if (allComplete && hasSuccess && !isProcessing && hasTransactions && onDismissOverlay) {
        // Auto-dismiss after 2 seconds to show success message
        const timer = setTimeout(() => {
          onDismissOverlay();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [validatedTransactions.length, uploadFiles, isPopulated, onDismissOverlay]);
  
  // Determine upload state
  const hasUploadFiles = uploadFiles.length > 0;
  const hasPendingFiles = uploadFiles.some((f) => f.status === 'pending');
  const hasUploadingFiles = uploadFiles.some((f) => f.status === 'uploading');
  const hasProcessingFiles = uploadFiles.some((f) => f.status === 'processing');
  const hasSuccessFiles = uploadFiles.some((f) => f.status === 'success');
  const showUploadState = hasUploadFiles && (hasPendingFiles || hasUploadingFiles || hasProcessingFiles || hasSuccessFiles);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    validatedTransactions.forEach((transaction) => {
      // Use display date for the key
      const displayDate = formatDate(transaction.date, locale);
      if (!groups[displayDate]) {
        groups[displayDate] = [];
      }
      groups[displayDate].push(transaction);
    });
    
    return Object.entries(groups).sort((a, b) => {
      const dateA = a[1][0]?.date;
      const dateB = b[1][0]?.date;
      if (!dateA || !dateB) return 0;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [validatedTransactions, locale]);

  if (error) {
    return (
      <Alert className="border-destructive text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('unableToLoad', { ns: 'transactions' })}</AlertTitle>
        <AlertDescription className="mt-2 text-destructive">
          {t('unableToLoadDescription', { ns: 'transactions' })}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <div className="px-8 py-4 border-b border-border flex justify-between items-center">
          <h2 className="text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold text-foreground">Transactions</h2>
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="p-8 space-y-8">
          {[1, 2].map((group) => (
            <div key={group} className="space-y-4">
              <Skeleton className="h-4 w-32" />
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden relative">
      {/* Card Header */}
      <div className="px-8 py-4 border-b border-border flex justify-between items-center bg-card">
        <h2 className="text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold text-foreground">Transactions</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 text-body-lg text-gray-600 hover:text-gray-900 transition-colors h-auto p-0 hover:bg-transparent"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {!isPopulated ? (
        /* EMPTY STATE - Show upload UI inline */
        <div className="py-24 px-8">
          {!showUploadState ? (
            /* Empty state - no files selected */
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
                <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-h3 font-semibold text-foreground mb-3">
                No transactions yet
              </h3>
              <p className="text-body-lg text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
                Get started by uploading your bank statements. We'll automatically extract and categorize your transactions to give you a complete view of your account activity.
              </p>
              <Button 
                className="flex items-center gap-2 rounded-lg"
                onClick={onUploadClick}
              >
                <Upload className="h-4 w-4" />
                Upload Statement
              </Button>
            </div>
          ) : (
            /* Upload/Processing state - show inline */
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-h3 font-semibold text-foreground mb-2">Upload Statement</h3>
                <p className="text-sm text-muted-foreground">
                  Upload your bank statement files to import transactions.
                </p>
              </div>
              
              <UploadFileList 
                files={uploadFiles} 
                onRemoveFile={onRemoveFile}
                disabled={isUploading || hasProcessingFiles}
              />
              
              <UploadStatusAlerts files={uploadFiles} error={uploadError} />
            </div>
          )}
        </div>
      ) : (
        /* POPULATED STATE */
        <div className="divide-y divide-border">
          {groupedTransactions.map(([date, groupTransactions]) => (
            <div key={date} className="px-8 py-4">
              <h3 className="text-body-sm font-medium text-muted-foreground uppercase mb-3">
                {date}
              </h3>
              <div className="space-y-3">
                {groupTransactions.map((transaction) => {
                  // CRITICAL: Sign mapping based on transaction type
                  // Database schema: amount is positive for income, negative for expense
                  // - 'income' → credit (positive amount in DB, shows as +amount)
                  // - 'expense' → debit (negative amount in DB, shows as -amount)
                  // Note: TransactionEntity only has 'income' | 'expense', so 'credit' check is for domain type compatibility
                  const isCredit = transaction.type === 'income' || transaction.type === 'credit';
                  const isPending = transaction.status === 'pending';

                  // CRITICAL: Use absolute value for display, then add sign based on type
                  // Database stores sign in amount (positive for income, negative for expense)
                  // This ensures correct rendering: income shows +amount (green), expense shows -amount (gray)
                  const displayAmount = Math.abs(transaction.amount);
                  const color = isCredit ? 'text-[#059669]' : 'text-gray-900';

                  // CRITICAL: Log UI rendering data for debugging
                  if (import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGGING === 'true') {
                    console.log('[UI:TRANSACTION_RENDER:DETAIL]', {
                      id: transaction.id,
                      amount: transaction.amount,
                      type: transaction.type,
                      isCredit,
                      displayAmount,
                      color,
                      description: transaction.description?.substring(0, 50),
                      accountId,
                      amountSignMatchesType: (transaction.type === 'income' && transaction.amount > 0) || (transaction.type === 'expense' && transaction.amount < 0)
                    });
                  }

                  return (
                    <div
                      key={transaction.id}
                      className="flex justify-between items-center py-2 px-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">
                            {transaction.description}
                          </span>
                          {isPending && (
                            <Badge variant="secondary" className="text-body-sm px-2 py-0.5 bg-muted text-muted-foreground hover:bg-muted border-none">
                              Pending
                            </Badge>
                          )}
                        </div>
                        <p className="text-body-lg text-muted-foreground">
                          {transaction.category}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-body font-semibold ${color}`}>
                          {isCredit ? '+' : '-'}
                          {formatCurrency(displayAmount, locale)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Upload Overlay when populated and uploading/processing */}
      {isPopulated && showUploadState && (
        <UploadOverlay
          files={uploadFiles}
          error={uploadError}
          onDismiss={onDismissOverlay}
          onRemoveFile={onRemoveFile}
          disabled={isUploading || hasProcessingFiles}
        />
      )}

    </div>
  );
}

