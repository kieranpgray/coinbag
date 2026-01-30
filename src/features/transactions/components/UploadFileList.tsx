import { FileText, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { FileWithStatus } from '@/components/shared/MultiStatementFileUpload';

interface UploadFileListProps {
  files: FileWithStatus[];
  onRemoveFile?: (id: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function UploadFileList({ files, onRemoveFile, disabled = false, compact = false }: UploadFileListProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  if (files.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">
        Selected Files ({files.length})
      </p>
      <div className={`space-y-2 ${compact ? '' : 'max-h-[300px] overflow-y-auto'}`}>
        {files.map((fileWithStatus) => (
          <div
            key={fileWithStatus.id}
            className={`flex items-center gap-3 p-3 rounded-lg border bg-card transition-all ${
              fileWithStatus.status === 'processing' ? 'border-blue-500/50 bg-blue-50/50' : ''
            }`}
          >
            <div className="flex-shrink-0">
              {fileWithStatus.status === 'processing' ? (
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              ) : fileWithStatus.status === 'success' ? (
                <div className="h-5 w-5 rounded-full bg-green-600 flex items-center justify-center">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">
                  {fileWithStatus.file.name}
                </p>
                {fileWithStatus.status === 'processing' && fileWithStatus.progress !== undefined && (
                  <span className="text-xs font-medium text-blue-600 flex-shrink-0">
                    {fileWithStatus.progress}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(fileWithStatus.file.size)}
                </p>
                {fileWithStatus.status === 'uploading' && (
                  <div className="flex items-center gap-1.5 flex-1">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">
                      Uploading...
                    </span>
                    {fileWithStatus.progress !== undefined && (
                      <>
                        <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden max-w-[100px]">
                          <div 
                            className="h-full bg-primary transition-all duration-300 ease-out"
                            style={{ width: `${fileWithStatus.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {fileWithStatus.progress}%
                        </span>
                      </>
                    )}
                  </div>
                )}
                {fileWithStatus.status === 'processing' && (
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                      <span className="text-xs text-blue-600 font-medium">Analyzing statement...</span>
                      {fileWithStatus.progress !== undefined && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {fileWithStatus.progress}%
                        </span>
                      )}
                    </div>
                    {fileWithStatus.progress !== undefined && (
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-300 ease-out"
                          style={{ width: `${fileWithStatus.progress}%` }}
                        />
                      </div>
                    )}
                    {fileWithStatus.transactionCount !== undefined && fileWithStatus.transactionCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {fileWithStatus.transactionCount} transaction{fileWithStatus.transactionCount !== 1 ? 's' : ''} found so far
                      </span>
                    )}
                    {fileWithStatus.processingStatus && (
                      <span className="text-xs text-muted-foreground capitalize">
                        {fileWithStatus.processingStatus === 'processing' ? 'Extracting transactions...' : fileWithStatus.processingStatus}
                      </span>
                    )}
                  </div>
                )}
                {fileWithStatus.status === 'success' && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-green-600 font-medium">Completed</span>
                    {fileWithStatus.transactionCount !== undefined && fileWithStatus.transactionCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {fileWithStatus.transactionCount} transaction{fileWithStatus.transactionCount !== 1 ? 's' : ''} imported
                      </span>
                    )}
                  </div>
                )}
                {fileWithStatus.status === 'error' && (
                  <span className="text-xs text-destructive">
                    {fileWithStatus.error || 'Error'}
                  </span>
                )}
              </div>
              {fileWithStatus.status === 'error' && fileWithStatus.error && (
                <Alert className="mt-2 border-destructive bg-destructive/10">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive text-xs">
                    {fileWithStatus.error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            {fileWithStatus.status !== 'uploading' && fileWithStatus.status !== 'processing' && onRemoveFile && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemoveFile(fileWithStatus.id)}
                disabled={disabled}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

