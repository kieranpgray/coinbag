import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadFileList } from './UploadFileList';
import { UploadStatusAlerts } from './UploadStatusAlerts';
import type { FileWithStatus } from '@/components/shared/MultiStatementFileUpload';

interface UploadOverlayProps {
  files: FileWithStatus[];
  error: string | null;
  onDismiss?: () => void;
  onRemoveFile?: (id: string) => void;
  disabled?: boolean;
}

export function UploadOverlay({ files, error, onDismiss, onRemoveFile, disabled }: UploadOverlayProps) {
  const hasFiles = files.length > 0;

  if (!hasFiles && !error) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 z-40 rounded-lg"
        onClick={onDismiss}
        aria-hidden="true"
      />
      
      {/* Overlay Content */}
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-card border border-border rounded-lg shadow-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto pointer-events-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-h3 font-semibold text-foreground">Upload Statement</h3>
            {onDismiss && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onDismiss}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload your bank statement files to import transactions.
            </p>
            
            <UploadFileList 
              files={files} 
              onRemoveFile={onRemoveFile}
              disabled={disabled}
            />
            
            <UploadStatusAlerts files={files} error={error} />
          </div>
        </div>
      </div>
    </>
  );
}

