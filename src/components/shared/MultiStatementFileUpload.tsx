import { useRef, useState, useCallback } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export interface FileWithStatus {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
}

export interface MultiStatementFileUploadProps {
  accept?: string;
  maxSize?: number; // in bytes
  onFilesChange: (files: FileWithStatus[]) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  files?: FileWithStatus[];
}

/**
 * Multi-file upload component for statement files (PDFs and images)
 * Supports multiple file selection, drag-and-drop, and upload queue
 */
export function MultiStatementFileUpload({
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSize = 10 * 1024 * 1024, // 10MB default
  onFilesChange,
  onError,
  disabled = false,
  className,
  files: controlledFiles,
}: MultiStatementFileUploadProps) {
  const [internalFiles, setInternalFiles] = useState<FileWithStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use controlled files if provided, otherwise use internal state
  const files = controlledFiles ?? internalFiles;
  const setFiles = controlledFiles ? onFilesChange : setInternalFiles;

  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      // Check file size
      if (file.size > maxSize) {
        return {
          valid: false,
          error: `File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`,
        };
      }

      // Check MIME type
      const validMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
      ];
      
      if (!validMimeTypes.includes(file.type)) {
        return {
          valid: false,
          error: 'Invalid file type. Please upload a PDF or image (JPEG/PNG)',
        };
      }

      // Check file extension
      const fileName = file.name.toLowerCase();
      const validExtensions = accept.split(',').map((ext) => ext.trim().replace('.', ''));
      const hasValidExtension = validExtensions.some((ext) =>
        fileName.endsWith(ext)
      );

      if (!hasValidExtension) {
        return {
          valid: false,
          error: `Invalid file type. Please upload ${accept}`,
        };
      }

      return { valid: true };
    },
    [accept, maxSize]
  );

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const validFiles: FileWithStatus[] = [];
      const errors: string[] = [];

      newFiles.forEach((file) => {
        // Check for duplicates
        const isDuplicate = files.some(
          (f) => f.file.name === file.name && f.file.size === file.size
        );

        if (isDuplicate) {
          errors.push(`${file.name} is already in the queue`);
          return;
        }

        const validation = validateFile(file);
        if (!validation.valid) {
          errors.push(`${file.name}: ${validation.error || 'Invalid file'}`);
          return;
        }

        validFiles.push({
          file,
          id: `${file.name}-${file.size}-${Date.now()}`,
          status: 'pending',
        });
      });

      if (errors.length > 0) {
        onError?.(errors.join('; '));
      }

      if (validFiles.length > 0) {
        setFiles([...files, ...validFiles]);
      }
    },
    [files, validateFile, setFiles, onError]
  );

  const removeFile = useCallback(
    (id: string) => {
      setFiles(files.filter((f) => f.id !== id));
    },
    [files, setFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) {
        return;
      }

      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    },
    [disabled, addFiles]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        addFiles(Array.from(selectedFiles));
      }
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className={cn('w-full space-y-4', className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 transition-colors',
          {
            'border-primary bg-primary/5': isDragging && !disabled,
            'border-muted bg-muted/50': !isDragging && !disabled,
            'border-muted bg-muted/20 opacity-50': disabled,
          }
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="text-center">
          <Upload
            className={cn('h-12 w-12 mx-auto mb-4', {
              'text-muted-foreground': !disabled,
              'text-muted-foreground/50': disabled,
            })}
          />
          <p className="text-sm font-medium mb-2">
            {isDragging ? 'Drop files here' : 'Drag and drop statement files'}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            or click to browse
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleClick}
            disabled={disabled}
          >
            Select Files
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Supports PDF, JPEG, PNG (max {(maxSize / 1024 / 1024).toFixed(0)}MB per file)
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Selected Files ({files.length})
          </p>
          <div className="space-y-2">
            {files.map((fileWithStatus) => (
              <div
                key={fileWithStatus.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {fileWithStatus.file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(fileWithStatus.file.size)}
                    </p>
                    {fileWithStatus.status === 'uploading' && (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        {fileWithStatus.progress !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {fileWithStatus.progress}%
                          </span>
                        )}
                      </>
                    )}
                    {fileWithStatus.status === 'success' && (
                      <span className="text-xs text-green-600">Uploaded</span>
                    )}
                    {fileWithStatus.status === 'error' && (
                      <span className="text-xs text-destructive">
                        {fileWithStatus.error || 'Error'}
                      </span>
                    )}
                  </div>
                  {fileWithStatus.status === 'uploading' &&
                    fileWithStatus.progress !== undefined && (
                      <Progress
                        value={fileWithStatus.progress}
                        className="mt-2 h-1"
                      />
                    )}
                  {fileWithStatus.status === 'error' && fileWithStatus.error && (
                    <Alert className="mt-2 border-destructive bg-destructive/10">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <AlertDescription className="text-destructive text-xs">
                        {fileWithStatus.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                {fileWithStatus.status !== 'uploading' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(fileWithStatus.id)}
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
      )}
    </div>
  );
}

