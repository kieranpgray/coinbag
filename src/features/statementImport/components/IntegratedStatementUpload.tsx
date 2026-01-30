import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MultiStatementFileUpload, type FileWithStatus } from '@/components/shared/MultiStatementFileUpload';
import { uploadStatementFile } from '@/lib/statementUpload';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { cn } from '@/lib/utils';

interface IntegratedStatementUploadProps {
  accountId: string;
  accountName: string;
  onUploadComplete?: () => void;
  onUploadError?: (error: string) => void;
  className?: string;
  variant?: 'default' | 'emptyState';
  title?: string;
  description?: string;
}

/**
 * Integrated statement upload component that provides a high-quality upload experience
 * for embedding directly in account detail views and empty states.
 * Handles sequential uploads and displays progress/errors.
 */
export function IntegratedStatementUpload({
  accountId,
  accountName,
  onUploadComplete,
  onUploadError,
  className,
  variant = 'default',
  title,
  description,
}: IntegratedStatementUploadProps) {
  const { getToken } = useAuth();
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFilesChange = useCallback((newFiles: FileWithStatus[]) => {
    setFiles(newFiles);
    setUploadError(null);
  }, []);

  const handleUpload = useCallback(async () => {
    if (files.length === 0) {
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    let hasErrors = false;

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
        hasErrors = true;
      } else {
        // Update status to success
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileWithStatus.id
              ? { ...f, status: 'success', progress: 100 }
              : f
          )
        );
      }
    }

    setIsUploading(false);

    if (!hasErrors) {
      // All uploads successful
      onUploadComplete?.();
    } else {
      // Some uploads failed
      onUploadError?.(uploadError || 'Some files failed to upload');
    }
  }, [files, accountId, getToken, onUploadComplete, onUploadError, uploadError]);

  const hasFiles = files.length > 0;
  const hasPendingFiles = files.some((f) => f.status === 'pending');
  const hasSuccessfulUploads = files.some((f) => f.status === 'success');
  const allComplete = files.length > 0 && files.every((f) => f.status === 'success' || f.status === 'error');

  const isEmptyState = variant === 'emptyState';

  return (
    <Card className={cn(
      isEmptyState ? "rounded-[16px] border bg-card text-card-foreground transition-colors hover:bg-muted/30" : "",
      className
    )}>
      <CardHeader className={cn(isEmptyState && "flex flex-col space-y-1.5 p-4")}>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {title || "Upload Statement Files"}
        </CardTitle>
        <CardDescription className={cn(isEmptyState && "text-sm text-muted-foreground")}>
          {description || (
            <>
              Import transactions from PDF or image statements for <strong>{accountName}</strong>.
              Files are processed securely and transactions will appear in your account automatically.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("space-y-6", isEmptyState && "p-4 pt-0")}>
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

        {hasSuccessfulUploads && (
          <Alert className="border-green-500 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              Files uploaded successfully! Your statements are being processed and transactions will appear shortly.
            </AlertDescription>
          </Alert>
        )}

        {hasFiles && (
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || !hasPendingFiles}
              className="rounded-full px-6"
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
          </div>
        )}

        {allComplete && hasSuccessfulUploads && (
          <Alert className="border-green-500 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              All files uploaded successfully! Your statements are being processed.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
