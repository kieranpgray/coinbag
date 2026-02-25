import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MultiStatementFileUpload, type FileWithStatus } from '@/components/shared/MultiStatementFileUpload';
import { uploadStatementFile } from '@/lib/statementUpload';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { triggerStatementProcessing, subscribeToStatementImportStatus } from '@/lib/statementProcessing';
import { useQueryClient } from '@tanstack/react-query';
import type { StatementImportEntity } from '@/contracts/statementImports';
import { logger, getCorrelationId } from '@/lib/logger';

interface StatementUploadStepProps {
  accountId: string;
  accountName: string;
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * Optional step for uploading statement files after account creation
 * Supports multiple file uploads with progress tracking
 */
export function StatementUploadStep({
  accountId,
  accountName,
  onComplete,
  onSkip,
}: StatementUploadStepProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeSubscriptions, setActiveSubscriptions] = useState<Map<string, () => void>>(new Map());
  // Use ref to avoid re-creating cleanup effect when subscriptions change
  const subscriptionsRef = useRef<Map<string, () => void>>(new Map());
  
  // Keep ref in sync with state
  useEffect(() => {
    subscriptionsRef.current = activeSubscriptions;
  }, [activeSubscriptions]);

  const handleFilesChange = useCallback((newFiles: FileWithStatus[]) => {
    setFiles(newFiles);
    setUploadError(null);
  }, []);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      // Cleanup all subscriptions on unmount
      subscriptionsRef.current.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch (error) {
          // Ignore errors during cleanup
          logger.warn('STATEMENT_UPLOAD:cleanup', 'Error during subscription cleanup', { error }, getCorrelationId() || undefined);
        }
      });
    };
  }, []); // Empty deps - only run on mount/unmount

  const handleUpload = useCallback(async () => {
    if (files.length === 0) {
      // No files to upload, just complete
      onComplete();
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    // Upload files sequentially to avoid overwhelming the server
    const pendingFiles = files.filter((f) => f.status === 'pending');
    
    for (let i = 0; i < pendingFiles.length; i++) {
      const fileWithStatus = pendingFiles[i];
      if (!fileWithStatus) continue;

      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileWithStatus.id
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        )
      );

      const result = await uploadStatementFile(
        fileWithStatus.file,
        accountId,
        getToken
      );

      if (result.error) {
        // Update status to error
        setFiles((prev) =>
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
      } else if (result.data) {
        // Upload successful - update status to processing
        const statementImportId = result.data.statementImportId;
        
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileWithStatus.id
              ? { ...f, status: 'processing', progress: 10 }
              : f
          )
        );

        // Trigger background processing (non-blocking)
        const correlationId = getCorrelationId();
        triggerStatementProcessing(statementImportId, getToken, correlationId || undefined)
          .catch((error) => {
            // Log error but don't block UI - processing may still work
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(
              'STATEMENT_UPLOAD:trigger',
              'Failed to trigger statement processing',
              {
                statementImportId,
                fileName: fileWithStatus.file.name,
                error: errorMessage,
                note: 'Processing may still continue in background - subscription will handle status updates'
              },
              correlationId || undefined
            );
            
            // Only update status if it's a critical error (not timeout/404 which are handled gracefully)
            const isCriticalError = !errorMessage.includes('timeout') && 
                                   !errorMessage.includes('404') && 
                                   !errorMessage.includes('Not Found');
            
            if (isCriticalError) {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === fileWithStatus.id
                    ? {
                        ...f,
                        status: 'error',
                        error: 'Failed to start processing. Please try again.',
                      }
                    : f
                )
              );
            }
          });

        // Subscribe to status updates
        subscribeToStatementImportStatus(
          statementImportId,
          (updatedImport: StatementImportEntity) => {
            const correlationId = getCorrelationId();
            
            // Map statement import status to file status
            let fileStatus: FileWithStatus['status'];
            let progress: number;
            
            switch (updatedImport.status) {
              case 'completed':
                fileStatus = 'success';
                progress = 100;
                break;
              case 'failed':
                fileStatus = 'error';
                progress = 0;
                break;
              case 'processing':
              case 'review':
              case 'pending':
                fileStatus = 'processing';
                progress = updatedImport.status === 'processing' ? 50 : 10;
                break;
              default:
                fileStatus = 'processing';
                progress = 10;
            }
            
            // Update file status based on statement import status
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileWithStatus.id
                  ? {
                      ...f,
                      status: fileStatus,
                      progress,
                      error: updatedImport.errorMessage || undefined,
                      message: updatedImport.status === 'completed' 
                        ? `Imported ${updatedImport.importedTransactions || 0} transactions`
                        : undefined,
                    }
                  : f
              )
            );

            // Update error state if processing failed (match AccountsPage pattern)
            if (updatedImport.status === 'failed' && updatedImport.errorMessage) {
              const isTimeout = updatedImport.errorMessage.includes('timeout') || 
                               updatedImport.errorMessage.includes('Timeout') ||
                               updatedImport.errorMessage.includes('WORKER_LIMIT');
              
              const errorMsg = isTimeout
                ? `${fileWithStatus.file.name}: Processing timed out. The statement may be too large. Please try uploading a smaller statement or contact support.`
                : `${fileWithStatus.file.name}: ${updatedImport.errorMessage}`;
              
              setUploadError((prev) =>
                `${prev ? prev + '; ' : ''}${errorMsg}`
              );
              
              logger.warn(
                'STATEMENT_UPLOAD:failed',
                'Statement processing failed',
                {
                  statementImportId,
                  fileName: fileWithStatus.file.name,
                  errorMessage: updatedImport.errorMessage,
                  isTimeout
                },
                correlationId || undefined
              );
            }

            // Invalidate queries when completed
            if (updatedImport.status === 'completed') {
              logger.info(
                'STATEMENT_UPLOAD:completed',
                'Statement processing completed successfully',
                {
                  statementImportId,
                  fileName: fileWithStatus.file.name,
                  importedTransactions: updatedImport.importedTransactions || 0
                },
                correlationId || undefined
              );
              
              queryClient.invalidateQueries({ queryKey: ['transactions', accountId] });
              queryClient.invalidateQueries({ queryKey: ['transactions'] });
              queryClient.invalidateQueries({ queryKey: ['accounts'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            }

            // Cleanup subscription when complete
            if (updatedImport.status === 'completed' || updatedImport.status === 'failed') {
              const unsubscribe = activeSubscriptions.get(statementImportId);
              if (unsubscribe) {
                unsubscribe();
                setActiveSubscriptions(prev => {
                  const next = new Map(prev);
                  next.delete(statementImportId);
                  return next;
                });
              }
            }
          },
          getToken
        ).then((unsubscribe) => {
          setActiveSubscriptions(prev => new Map(prev).set(statementImportId, unsubscribe));
          logger.info(
            'STATEMENT_UPLOAD:subscribe',
            'Subscribed to statement import status updates',
            { statementImportId, fileName: fileWithStatus.file.name },
            getCorrelationId() || undefined
          );
        }).catch((error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(
            'STATEMENT_UPLOAD:subscribe',
            'Failed to subscribe to status updates',
            {
              statementImportId,
              fileName: fileWithStatus.file.name,
              error: errorMessage
            },
            getCorrelationId() || undefined
          );
          
          // Update file status to show subscription error
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileWithStatus.id
                ? {
                    ...f,
                    status: 'error',
                    error: 'Failed to monitor processing status. Please refresh to check status.',
                  }
                : f
            )
          );
        });
      }
    }

    setIsUploading(false);
  }, [files, accountId, getToken, queryClient]);

  const hasFiles = files.length > 0;
  const hasPendingFiles = files.some((f) => f.status === 'pending');
  const allComplete = files.length > 0 && files.every((f) => f.status === 'success' || f.status === 'error');
  const hasProcessing = files.some((f) => f.status === 'processing');

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Upload Statements (Optional)</h3>
        <p className="text-body text-muted-foreground">
          Upload PDF or image statements for <strong>{accountName}</strong> to import transactions.
          You can skip this step and upload statements later.
        </p>
      </div>

      <MultiStatementFileUpload
        files={files}
        onFilesChange={handleFilesChange}
        onError={(error) => setUploadError(error)}
        disabled={isUploading}
      />

      {uploadError && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            {uploadError}
          </AlertDescription>
        </Alert>
      )}

      {hasProcessing && (
        <Alert className="border-blue-500 bg-blue-500/10">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertDescription className="text-blue-600">
            Processing statements... This may take 15-30 seconds.
          </AlertDescription>
        </Alert>
      )}

      {allComplete && (
        <Alert className="border-green-500 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            All files uploaded successfully! Your statements are being processed.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onSkip}
          disabled={isUploading}
        >
          Skip
        </Button>
        {hasFiles && !allComplete && (
          <Button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || !hasPendingFiles}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
              </>
            )}
          </Button>
        )}
        {(allComplete || !hasFiles) && (
          <Button type="button" onClick={onComplete}>
            {allComplete ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Done
              </>
            ) : (
              'Done'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

