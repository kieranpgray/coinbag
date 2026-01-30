import { useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAccounts, useDeleteAccount, useAccount, useCreateAccount, useUpdateAccount } from '@/features/accounts/hooks';
import { useTransactions } from '@/features/transactions/hooks';
import { useViewMode } from '@/hooks/useViewMode';
import { ROUTES } from '@/lib/constants/routes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, AlertTriangle, Trash2, Pencil, ChevronLeft, Upload } from 'lucide-react';
import { DeleteAccountDialog } from '@/features/accounts/components/DeleteAccountDialog';
import { CreateAccountModal } from '@/features/accounts/components/CreateAccountModal';
import { AccountForm } from '@/features/accounts/components/AccountForm';
import { AccountCard } from '@/features/accounts/components/AccountCard';
import { ViewModeToggle } from '@/components/shared/ViewModeToggle';
import { TransactionList } from '@/features/transactions/components/TransactionList';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { isAccountError } from '@/features/accounts/utils/errorUtils';
import { useAuth } from '@clerk/clerk-react';
import { uploadStatementFile } from '@/lib/statementUpload';
import { triggerStatementProcessing, subscribeToStatementImportStatus } from '@/lib/statementProcessing';
import { watchStatementImport } from '@/features/statements/watchStatementImport';
import { logger, getCorrelationId } from '@/lib/logger';
import type { Account } from '@/types/domain';
import type { AccountCreate } from '@/contracts/accounts';
import type { FileWithStatus } from '@/components/shared/MultiStatementFileUpload';
import type { StatementImportEntity } from '@/contracts/statementImports';
import { useEffect } from 'react';

export function AccountsPage() {
  const { accountId } = useParams<{ accountId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { locale } = useLocale();
  const { t } = useTranslation(['accounts', 'common', 'aria']);
  const { data: accounts = [], isLoading, error, refetch: refetchAccounts } = useAccounts();
  const { data: selectedAccountData, isLoading: isLoadingAccount, refetch: refetchAccount } = useAccount(accountId || '');
  
  // CRITICAL: Log account balance when data loads
  useEffect(() => {
    if (selectedAccountData && (import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGGING === 'true')) {
      console.log('[UI:ACCOUNT_BALANCE:LOADED]', {
        accountId: selectedAccountData.id,
        balance: selectedAccountData.balance,
        lastUpdated: selectedAccountData.lastUpdated,
        accountName: selectedAccountData.accountName,
        accountType: selectedAccountData.accountType
      });
    }
  }, [selectedAccountData]);
  
  const deleteMutation = useDeleteAccount();
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const [viewMode, setViewMode] = useViewMode('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  // Store upload state per account (keyed by accountId)
  const [uploadFilesByAccount, setUploadFilesByAccount] = useState<Map<string, FileWithStatus[]>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrorByAccount, setUploadErrorByAccount] = useState<Map<string, string | null>>(new Map());
  const [activeSubscriptions, setActiveSubscriptions] = useState<Map<string, () => void>>(new Map());
  
  // Get upload files for current account
  const uploadFiles = accountId ? (uploadFilesByAccount.get(accountId) || []) : [];
  const uploadError = accountId ? (uploadErrorByAccount.get(accountId) || null) : null;
  
  // Set upload files for current account
  const setUploadFiles = (files: FileWithStatus[] | ((prev: FileWithStatus[]) => FileWithStatus[])) => {
    if (!accountId) return;
    setUploadFilesByAccount((prev) => {
      const current = prev.get(accountId) || [];
      const updated = typeof files === 'function' ? files(current) : files;
      const newMap = new Map(prev);
      if (updated.length === 0) {
        newMap.delete(accountId);
      } else {
        newMap.set(accountId, updated);
      }
      return newMap;
    });
  };
  
  // Set upload error for current account
  const setUploadError = (error: string | null | ((prev: string | null) => string | null)) => {
    if (!accountId) return;
    setUploadErrorByAccount((prev) => {
      const current = prev.get(accountId) || null;
      const updated = typeof error === 'function' ? error(current) : error;
      const newMap = new Map(prev);
      if (!updated) {
        newMap.delete(accountId);
      } else {
        newMap.set(accountId, updated);
      }
      return newMap;
    });
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getToken } = useAuth();

  const { data: transactions = [] } = useTransactions(accountId);
  const isPopulated = transactions.length > 0;

  // Filter and search accounts
  const filteredAccounts = useMemo(() => {
    let filtered = accounts;

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((account) => account.accountType === typeFilter);
    }

    // Search by name or institution
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (account) =>
          account.accountName.toLowerCase().includes(query) ||
          (account.institution && account.institution.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [accounts, typeFilter, searchQuery]);

  const accountTypes = [
    { value: 'all', label: t('accountTypes.all', { ns: 'accounts' }) },
    { value: 'Bank Account', label: t('accountTypes.bankAccount', { ns: 'accounts' }) },
    { value: 'Savings', label: t('accountTypes.savings', { ns: 'accounts' }) },
    { value: 'Credit Card', label: t('accountTypes.creditCard', { ns: 'accounts' }) },
    { value: 'Loan', label: t('accountTypes.loan', { ns: 'accounts' }) },
    { value: 'Other', label: t('accountTypes.other', { ns: 'accounts' }) },
  ];

  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
    setEditModalOpen(true);
  };

  const handleUpdate = (data: AccountCreate) => {
    if (!selectedAccount) return;
    
    // AccountCreate matches Account except for 'id' and potential extra fields
    const updateData: Partial<Account> = {
      institution: data.institution,
      accountName: data.accountName,
      balance: data.balance,
      accountType: data.accountType,
      creditLimit: data.creditLimit,
      balanceOwed: data.balanceOwed,
      lastUpdated: data.lastUpdated,
      hidden: data.hidden,
    };

    updateMutation.mutate(
      { id: selectedAccount.id, data: updateData },
      {
        onSuccess: () => {
          setEditModalOpen(false);
          setSelectedAccount(null);
        },
      }
    );
  };

  const handleDelete = (account: Account) => {
    setSelectedAccount(account);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedAccount) return;
    deleteMutation.mutate(selectedAccount.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setSelectedAccount(null);
        // If we're viewing the deleted account, navigate back to accounts list
        if (accountId === selectedAccount.id) {
          navigate(ROUTES.app.accounts);
        }
      },
    });
  };

  const handleAccountClick = (account: Account) => {
    navigate(ROUTES.app.accountsDetail(account.id));
  };

  const handleBackToAccounts = () => {
    navigate(ROUTES.app.accounts);
  };

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      activeSubscriptions.forEach(unsubscribe => unsubscribe());
      activeSubscriptions.clear();
    };
  }, [activeSubscriptions]);
  
  // Clean up upload state and subscriptions when accountId changes
  useEffect(() => {
    // Clean up subscriptions for other accounts (keep current account's subscriptions)
    setActiveSubscriptions((prev) => {
      const filtered = new Map<string, () => void>();
      prev.forEach((unsubscribe, subscriptionKey) => {
        // Keep subscriptions that might be for the current account
        // (We'll clean them up when upload completes)
        filtered.set(subscriptionKey, unsubscribe);
      });
      return filtered;
    });
    
    // Note: We don't clear uploadFiles here - they're already scoped by accountId
    // The uploadFiles getter automatically returns only files for the current account
  }, [accountId]);

  // Monitor transaction count changes when processing completes
  // Auto-close modal when transactions appear after processing completes
  useEffect(() => {
    const hasCompletedFiles = uploadFiles.some(f => f.status === 'success' || f.processingStatus === 'completed');
    const hasProcessingFiles = uploadFiles.some(f => f.status === 'processing');
    
    // If we have completed files and transactions are now available, auto-close
    if (hasCompletedFiles && !hasProcessingFiles && transactions.length > 0 && uploadFiles.length > 0) {
      // Give brief moment to show success, then clear
      const timer = setTimeout(() => {
        setUploadFiles([]);
        setUploadError(null);
      }, 2000); // 2 seconds to show success message
      
      return () => clearTimeout(timer);
    }
    
    return undefined;
  }, [uploadFiles, transactions.length]);

  const handleUploadButtonClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (!selectedFiles || selectedFiles.length === 0) {
        return;
      }

      // Validate files
      const validFiles: FileWithStatus[] = [];
      const errors: string[] = [];

      Array.from(selectedFiles).forEach((file) => {
        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          errors.push(`${file.name}: File size exceeds 10MB limit`);
          return;
        }

        // Check MIME type
        const validMimeTypes = [
          'application/pdf',
          'image/jpeg',
          'image/jpg',
          'image/png',
        ];

        if (!validMimeTypes.includes(file.type)) {
          errors.push(`${file.name}: Invalid file type. Please upload a PDF or image (JPEG/PNG)`);
          return;
        }

        validFiles.push({
          file,
          id: `${file.name}-${file.size}-${Date.now()}`,
          status: 'pending',
        });
      });

      if (errors.length > 0) {
        setUploadError(errors.join('; '));
      }

      if (validFiles.length === 0) {
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Set files and start upload
      setUploadFiles(validFiles);
      setUploadError(null);

      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Auto-start upload
      setIsUploading(true);

      // Upload files in parallel batches (3-5 concurrent) for better performance
      const MAX_CONCURRENT_UPLOADS = 4 // Optimal balance between speed and server load
      
      // Helper function to upload a single file
      const uploadSingleFile = async (fileWithStatus: FileWithStatus) => {
        if (!fileWithStatus || !accountId) return { success: false, fileId: fileWithStatus?.id };

        // Declare statementImportId in outer scope so it's available in catch block
        let statementImportId: string | undefined = undefined

        // Update status to uploading
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.id === fileWithStatus.id
              ? { ...f, status: 'uploading', progress: 0 }
              : f
          )
        );

        try {
          // Upload file to storage and create statement import record
          const result = await uploadStatementFile(
            fileWithStatus.file,
            accountId,
            getToken
          );

          if (result.error) {
            // Update status to error
            setUploadFiles((prev) =>
              prev.map((f) =>
                f.id === fileWithStatus.id
                  ? {
                      ...f,
                      status: 'error',
                      error: result.error?.error || 'Upload failed',
                    }
                  : f
              )
            );
            setUploadError(
              (prev) =>
                `${prev ? prev + '; ' : ''}${fileWithStatus.file.name}: ${result.error?.error || 'Upload failed'}`
            );
            return { success: false, fileId: fileWithStatus.id };
          }

          if (!result.data) {
            setUploadFiles((prev) =>
              prev.map((f) =>
                f.id === fileWithStatus.id
                  ? {
                      ...f,
                      status: 'error',
                      error: 'Upload failed - no data returned',
                    }
                  : f
              )
            );
            return { success: false, fileId: fileWithStatus.id };
          }

          statementImportId = result.data.statementImportId;
          
          // Get correlation ID for this upload flow
          const correlationId = getCorrelationId() || `ui-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

          // Update status to processing (file uploaded, now processing)
          // Store statementImportId and correlationId for debugging
          setUploadFiles((prev) =>
            prev.map((f) =>
              f.id === fileWithStatus.id
                ? { 
                    ...f, 
                    status: 'processing', 
                    progress: 50, 
                    processingStatus: 'pending',
                    statementImportId,
                    correlationId,
                  }
                : f
            )
          );

          // Trigger Edge Function processing
          try {
            await triggerStatementProcessing(statementImportId, getToken, correlationId);
          } catch (triggerError) {
            // Handle timeout errors gracefully - processing may continue in background
            const isTimeout = triggerError instanceof Error && 
              (triggerError.message.includes('timeout') || 
               triggerError.message.includes('504') || 
               triggerError.message.includes('546'))
            
            if (isTimeout) {
              // Update status to show timeout warning but keep processing
              setUploadFiles((prev) =>
                prev.map((f) =>
                  f.id === fileWithStatus.id
                    ? {
                        ...f,
                        status: 'processing',
                        error: 'Processing may take longer than usual. Please wait...',
                        progress: 50
                      }
                    : f
                )
              );
              // Don't throw - allow subscription to handle status updates
            } else {
              // For other errors, update status to error
              setUploadFiles((prev) =>
                prev.map((f) =>
                  f.id === fileWithStatus.id
                    ? {
                        ...f,
                        status: 'error',
                        error: triggerError instanceof Error ? triggerError.message : 'Failed to start processing'
                      }
                    : f
                )
              );
              setUploadError(
                (prev) =>
                  `${prev ? prev + '; ' : ''}${fileWithStatus.file.name}: ${triggerError instanceof Error ? triggerError.message : 'Failed to start processing'}`
              );
              return { success: false, fileId: fileWithStatus.id }; // Skip subscription setup for non-timeout errors
            }
          }

          // Check if subscription already exists for this statementImportId (deduplication)
          if (activeSubscriptions.has(statementImportId)) {
            console.warn(`Subscription already exists for statement import ${statementImportId}, skipping duplicate`);
            return { success: true, fileId: fileWithStatus.id, statementImportId }; // Already subscribed
          }

          logger.info(
            'ImportWatch:started',
            'Starting deterministic watcher for statement import',
            {
              correlationId,
              statementImportId,
              accountId,
            },
            correlationId
          );

          // Start deterministic watcher (works even if realtime fails)
          // This is the primary mechanism for ensuring UI updates
          watchStatementImport({
            statementImportId,
            queryClient,
            accountId: accountId || undefined,
            correlationId,
            getToken, // Pass getToken for RLS diagnostics
          }).then((result) => {
            // Handle terminal states from deterministic watcher
            if (result.status === 'completed') {
              // Queries already invalidated by watcher, but update UI state
              setUploadFiles((prev) =>
                prev.map((f) =>
                  f.id === fileWithStatus.id && f.status !== 'success'
                    ? { ...f, status: 'success', progress: 100, processingStatus: 'completed' }
                    : f
                )
              );
              
              // Close modal after brief delay
              setTimeout(() => {
                setUploadFiles([]);
                setUploadError(null);
              }, 1500);
            } else if (result.status === 'failed') {
              // Update UI to show error with debugging info
              const errorMsg = result.error_message || 'Processing failed';
              const isTimeoutError = result.error_message?.includes('timeout') || 
                                result.error_message?.includes('Timeout') ||
                                result.error_message?.includes('WORKER_LIMIT');
              
              const baseErrorMsg = isTimeoutError
                ? `${fileWithStatus.file.name}: Processing timed out. The statement may be too large. Please try uploading a smaller statement or contact support.`
                : `${fileWithStatus.file.name}: ${errorMsg}`;
              
              const fullErrorMsg = `${baseErrorMsg} (Import ID: ${statementImportId}, Correlation: ${correlationId}). Check the browser console for detailed logs.`;
              
              setUploadFiles((prev) =>
                prev.map((f) =>
                  f.id === fileWithStatus.id
                    ? {
                        ...f,
                        status: 'error',
                        error: fullErrorMsg,
                        processingStatus: 'failed',
                        canRetry: true,
                        statementImportId,
                        correlationId,
                      }
                    : f
                )
              );
              
              setUploadError((prev) =>
                `${prev ? prev + '; ' : ''}${fullErrorMsg}`
              );
              
              logger.error(
                'ImportWatch:failed',
                'Statement import failed',
                {
                  correlationId,
                  statementImportId,
                  accountId,
                  errorMessage: result.error_message,
                },
                correlationId
              );
            }
            // If status is 'processing', it means timeout - show "still processing" state
            else if (result.status === 'processing') {
              // Watcher timed out but status is still processing
              // Show "still processing" state with refresh option
              const timeoutErrorMsg = `Processing is taking longer than expected. The import may still be processing in the background. Check the browser console for detailed logs. (Import ID: ${statementImportId}, Correlation: ${correlationId})`;
              
              setUploadFiles((prev) =>
                prev.map((f) =>
                  f.id === fileWithStatus.id
                    ? {
                        ...f,
                        status: 'timeout',
                        error: timeoutErrorMsg,
                        processingStatus: 'processing',
                        canRetry: true,
                        statementImportId,
                        correlationId,
                      }
                    : f
                )
              );
              
              logger.warn(
                'ImportWatch:timeout',
                'Watcher timed out but status is still processing',
                {
                  correlationId,
                  statementImportId,
                  accountId,
                },
                correlationId
              );
            }
          }).catch((error) => {
            console.error('Deterministic watcher failed:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            logger.error(
              'ImportWatch:error',
              'Deterministic watcher failed',
              {
                correlationId,
                statementImportId,
                accountId,
                error: errorMessage,
              },
              correlationId
            );
            
            // Update UI to show error but allow retry
            const watcherErrorMsg = `Failed to monitor import status: ${errorMessage}. (Import ID: ${statementImportId}, Correlation: ${correlationId}). Check the browser console for detailed logs.`;
            setUploadFiles((prev) =>
              prev.map((f) =>
                f.id === fileWithStatus.id
                  ? {
                      ...f,
                      status: 'error',
                      error: watcherErrorMsg,
                      processingStatus: 'failed',
                      canRetry: true,
                      statementImportId,
                      correlationId,
                    }
                  : f
              )
            );
          });

          // Subscribe to real-time status updates (optional optimization)
          // Realtime can provide faster updates, but we don't depend on it
          subscribeToStatementImportStatus(
            statementImportId,
            (updatedImport: StatementImportEntity) => {
              // Update UI with processing status
              setUploadFiles((prev) =>
                prev.map((f) =>
                  f.id === fileWithStatus.id
                    ? {
                        ...f,
                        status: updatedImport.status === 'completed' ? 'success' :
                               updatedImport.status === 'failed' ? 'error' :
                               updatedImport.status === 'review' ? 'processing' : // Handle review status
                               updatedImport.status === 'processing' ? 'processing' : 
                               updatedImport.status === 'pending' ? 'processing' : 'pending',
                        error: updatedImport.errorMessage || undefined,
                        progress: updatedImport.status === 'processing' ? 
                                 (updatedImport.importedTransactions && updatedImport.importedTransactions > 0 ? 85 : 60) :
                                 updatedImport.status === 'completed' ? 100 : 
                                 updatedImport.status === 'pending' ? 50 : 0,
                        processingStatus: updatedImport.status,
                        transactionCount: updatedImport.importedTransactions || 0,
                        totalTransactions: updatedImport.totalTransactions || 0
                      }
                    : f
                )
              );

              // Update error state if processing failed
              if (updatedImport.status === 'failed' && updatedImport.errorMessage) {
                const errorMsg = updatedImport.errorMessage.includes('timeout') || 
                                updatedImport.errorMessage.includes('Timeout') ||
                                updatedImport.errorMessage.includes('WORKER_LIMIT')
                  ? `${fileWithStatus.file.name}: Processing timed out. The statement may be too large. Please try uploading a smaller statement or contact support.`
                  : `${fileWithStatus.file.name}: ${updatedImport.errorMessage}`
                
                setUploadError((prev) =>
                  `${prev ? prev + '; ' : ''}${errorMsg}`
                );
              }

              // Cleanup subscription when processing is complete
              if (updatedImport.status === 'completed' || updatedImport.status === 'failed') {
                if (statementImportId) {
                  const unsubscribe = activeSubscriptions.get(statementImportId);
                  if (unsubscribe) {
                    unsubscribe();
                    const idToDelete = statementImportId;
                    setActiveSubscriptions(prev => {
                      const newMap = new Map(prev);
                      newMap.delete(idToDelete);
                      return newMap;
                    });
                  }
                }
                
                // When realtime fires completion, also invalidate queries (same as deterministic watcher)
                // This ensures UI updates even if realtime fires before watcher completes
                if (updatedImport.status === 'completed') {
                  // Invalidate queries (same as deterministic watcher does)
                  queryClient.invalidateQueries({ queryKey: ['transactions', accountId] });
                  queryClient.invalidateQueries({ queryKey: ['transactions'] });
                  queryClient.invalidateQueries({ queryKey: ['accounts'] });
                  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                      
                  // Also trigger refetches
                  refetchAccount();
                  refetchAccounts();
                }
              }
            },
            getToken
          ).then((unsubscribe) => {
            // Store unsubscribe function for cleanup
            if (statementImportId) {
              const idToSet = statementImportId;
              setActiveSubscriptions(prev => new Map(prev).set(idToSet, unsubscribe));
            }
          }).catch((error) => {
            console.error('Failed to subscribe to status updates:', error);
          });

          // Store unsubscribe function for cleanup (optional)
          // In a real app, you'd want to clean up subscriptions when component unmounts

        } catch (error) {
          // Update status to error
          setUploadFiles((prev) =>
            prev.map((f) =>
              f.id === fileWithStatus.id
                ? {
                    ...f,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Processing failed',
                  }
                : f
            )
          );
          return { success: false, fileId: fileWithStatus.id };
        }

        return { success: true, fileId: fileWithStatus.id, statementImportId };
      };

      // Process files in parallel batches
      const processBatch = async (batch: FileWithStatus[]) => {
        return Promise.all(batch.map(file => uploadSingleFile(file)));
      };

      // Split files into batches of MAX_CONCURRENT_UPLOADS
      const batches: FileWithStatus[][] = [];
      for (let i = 0; i < validFiles.length; i += MAX_CONCURRENT_UPLOADS) {
        batches.push(validFiles.slice(i, i + MAX_CONCURRENT_UPLOADS));
      }

      // Process batches sequentially, but files within each batch in parallel
      for (const batch of batches) {
        await processBatch(batch);
        // Small delay between batches to avoid overwhelming the server
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setIsUploading(false);
    },
    [accountId, getToken, refetchAccount, refetchAccounts]
  );

  const handleDismissOverlay = useCallback(() => {
    setUploadFiles([]);
    setUploadError(null);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // Account Detail View (when accountId is in URL)
  if (accountId) {
    if (isLoadingAccount) {
      return (
        <div className="space-y-6 p-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      );
    }

    if (!selectedAccountData) {
      return (
        <div className="p-8 space-y-6">
          <Button 
            variant="ghost" 
            onClick={handleBackToAccounts} 
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-6"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Accounts
          </Button>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('accountNotFound', { ns: 'accounts' })}</AlertTitle>
            <AlertDescription className="mt-2">
              {t('accountNotFoundDescription', { ns: 'accounts' })}
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background">
        {/* Hidden file input - always rendered so ref is available */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Account Header Section */}
        <div className="border-b border-border bg-gradient-to-br from-background to-card px-8 py-6">
          <Button
            variant="ghost"
            onClick={handleBackToAccounts}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 h-auto p-0 hover:bg-transparent"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Accounts
          </Button>

          <div className="flex justify-between items-start gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg font-semibold text-gray-900 leading-tight">
                  {selectedAccountData.accountName}
                </h1>
                <span className="px-3 py-1 bg-card border border-border rounded-full text-body-sm text-muted-foreground font-medium">
                  {selectedAccountData.accountType}
                </span>
              </div>

              <div className="flex flex-row gap-6">
                {/* Balance Card */}
                <div className="bg-card border border-border rounded-xl px-6 py-4 shadow-sm min-w-[200px]">
                  <p className="text-body-sm text-muted-foreground uppercase tracking-wide mb-2 font-medium">
                    Current Balance
                  </p>
                  <p className="text-balance font-bold text-foreground">
                    {formatCurrency(selectedAccountData.balance, locale)}
                  </p>
                </div>

                {/* Last Updated Card */}
                <div className="bg-card border border-border rounded-xl px-6 py-4 shadow-sm">
                  <p className="text-body-sm text-muted-foreground uppercase tracking-wide mb-2 font-medium">
                    Last Updated
                  </p>
                  <p className="text-body-lg font-medium text-foreground">
                    {formatDate(selectedAccountData.lastUpdated, locale)}
                  </p>
                </div>
              </div>
            </div>

            {isPopulated && (
              <Button 
                variant="outline" 
                className="flex items-center gap-2 rounded-lg"
                onClick={handleUploadButtonClick}
                type="button"
              >
                <Upload className="h-4 w-4" />
                Upload Statement
              </Button>
            )}
          </div>
        </div>

        {/* Transactions Section */}
        <div className="p-8">
          <TransactionList 
            accountId={accountId} 
            onUploadClick={handleUploadButtonClick}
            isPopulated={isPopulated}
            uploadFiles={uploadFiles}
            isUploading={isUploading}
            uploadError={uploadError}
            onRemoveFile={handleRemoveFile}
            onDismissOverlay={handleDismissOverlay}
          />
        </div>

      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold">{t('title', { ns: 'accounts' })}</h1>
          <Button disabled className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t('addNewAccountButton', { ns: 'accounts' })}
          </Button>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('unableToLoad', { ns: 'accounts' })}</AlertTitle>
          <AlertDescription className="mt-2">
            {t('unableToLoadDescription', { ns: 'accounts' })}
          </AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchAccounts()}
            className="mt-4"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('tryAgain', { ns: 'common' })}
          </Button>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      {/* Show page-level empty state when no accounts exist */}
      {accounts.length === 0 ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold">Accounts</h1>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-12 h-12 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <h3 className="text-h3 font-medium text-foreground mb-2">No accounts yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Add an account to track balances and unlock transaction history.
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold">Accounts</h1>
            </div>
            <div className="flex flex-col gap-4 sm:items-end">
              <Button onClick={() => setCreateModalOpen(true)} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                ADD NEW ACCOUNT
              </Button>
              <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
          </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder={t('searchPlaceholder', { ns: 'accounts' })}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {accountTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Accounts View */}
      {viewMode === 'list' ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('tableHeaders.institution', { ns: 'accounts' })}</TableHead>
                <TableHead>{t('tableHeaders.accountName', { ns: 'accounts' })}</TableHead>
                <TableHead>{t('tableHeaders.accountType', { ns: 'accounts' })}</TableHead>
                <TableHead className="text-right">{t('tableHeaders.balance', { ns: 'accounts' })}</TableHead>
                <TableHead>{t('tableHeaders.lastUpdated', { ns: 'accounts' })}</TableHead>
                <TableHead className="text-right">{t('tableHeaders.actions', { ns: 'accounts' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t('noAccountsFound', { ns: 'accounts' })}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => (
                  <TableRow
                    key={account.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleAccountClick(account)}
                  >
                    <TableCell className="font-medium">{account.institution || '-'}</TableCell>
                    <TableCell>{account.accountName}</TableCell>
                    <TableCell>{account.accountType}</TableCell>
                    <TableCell className="text-right">{formatCurrency(account.balance, locale)}</TableCell>
                    <TableCell>{formatDate(account.lastUpdated, locale)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(account)}
                          aria-label={t('editAccount', { ns: 'aria' })}
                        >
                          <Pencil className="h-3.5 w-3.5 text-neutral-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDelete(account)}
                          aria-label={t('deleteAccount', { ns: 'aria' })}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <>
          {filteredAccounts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {t('noAccountsFound', { ns: 'accounts' })}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onClick={handleAccountClick}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete Dialog */}
      <DeleteAccountDialog
        account={selectedAccount}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
      />

      {/* Edit Account Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update your account details below.
            </DialogDescription>
          </DialogHeader>
          {selectedAccount && (
            <AccountForm
              account={selectedAccount}
              onSubmit={handleUpdate}
              onCancel={() => setEditModalOpen(false)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
        </div>
      )}

      {/* Create Account Modal - Always rendered so it works from empty state */}
      <CreateAccountModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          // Reset error state when closing modal
          if (!open) {
            createMutation.reset();
          }
        }}
        onSubmit={(data: AccountCreate) => {
          createMutation.mutate(data, {
            onSuccess: (account) => {
              setCreateModalOpen(false);
              // Navigate to the new account's detail page
              navigate(ROUTES.app.accountsDetail(account.id));
            },
            onError: (error: unknown) => {
              // Error will be displayed in the form via the mutation error state
              console.error('Account creation error:', error);
            },
          });
        }}
        isLoading={createMutation.isPending}
        error={isAccountError(createMutation.error) ? createMutation.error : undefined}
      />
    </>
  );
}
