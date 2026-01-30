import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { FileWithStatus } from '@/components/shared/MultiStatementFileUpload';

interface UploadStatusAlertsProps {
  files: FileWithStatus[];
  error: string | null;
}

export function UploadStatusAlerts({ files, error }: UploadStatusAlertsProps) {
  const hasSuccessfulUploads = files.some((f) => f.status === 'success' || f.status === 'processing');
  const isProcessing = files.some((f) => f.status === 'processing');
  const allComplete = files.length > 0 && files.every((f) => f.status === 'success' || f.status === 'error');

  return (
    <>
      {error && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {hasSuccessfulUploads && (
        <>
          {allComplete && !isProcessing && (
            <Alert className="border-green-500 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                <div className="space-y-1">
                  <p className="font-medium">Processing complete!</p>
                  <p className="text-sm">
                    {files.filter(f => f.status === 'success').length} file(s) processed successfully.
                    {files.some(f => f.transactionCount && f.transactionCount > 0) && (
                      <span className="ml-1">
                        {files.reduce((sum, f) => sum + (f.transactionCount || 0), 0)} transaction(s) imported.
                      </span>
                    )}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}
          {!isProcessing && !allComplete && (
            <Alert className="border-green-500 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Files uploaded successfully! Your statements are being processed and transactions will appear shortly.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </>
  );
}

