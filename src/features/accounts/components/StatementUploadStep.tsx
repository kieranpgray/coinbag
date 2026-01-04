import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MultiStatementFileUpload, type FileWithStatus } from '@/components/shared/MultiStatementFileUpload';
import { uploadStatementFile } from '@/lib/statementUpload';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFilesChange = useCallback((newFiles: FileWithStatus[]) => {
    setFiles(newFiles);
    setUploadError(null);
  }, []);

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
  }, [files, accountId, getToken]);

  const hasFiles = files.length > 0;
  const hasPendingFiles = files.some((f) => f.status === 'pending');
  const allComplete = files.length > 0 && files.every((f) => f.status === 'success' || f.status === 'error');

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Upload Statements (Optional)</h3>
        <p className="text-sm text-muted-foreground">
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

