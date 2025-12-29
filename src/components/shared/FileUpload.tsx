import { useRef, useState, useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in bytes
  onFileSelect: (file: File) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  accept = '.xlsx,.xls,.ods',
  maxSize = 10 * 1024 * 1024, // 10MB default
  onFileSelect,
  onError,
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      // Check file size
      if (file.size > maxSize) {
        return {
          valid: false,
          error: `File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`,
        };
      }

      // Check file type
      const validExtensions = accept.split(',').map((ext) => ext.trim());
      const fileName = file.name.toLowerCase();
      const hasValidExtension = validExtensions.some((ext) =>
        fileName.endsWith(ext.replace('.', ''))
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

  const handleFile = useCallback(
    (file: File) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        onError?.(validation.error || 'Invalid file');
        return;
      }

      setSelectedFile(file);
      onFileSelect(file);
    },
    [validateFile, onFileSelect, onError]
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

      const files = Array.from(e.dataTransfer.files);
      const file = files[0];
      if (file) {
        handleFile(file as File);
      }
    },
    [disabled, handleFile]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file) {
          handleFile(file as File);
        }
      }
    },
    [handleFile]
  );

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div className={cn('w-full', className)}>
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
            'border-primary/50 bg-primary/10': selectedFile && !disabled,
          }
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <Upload
              className={cn('h-12 w-12 mx-auto mb-4', {
                'text-muted-foreground': !disabled,
                'text-muted-foreground/50': disabled,
              })}
            />
            <p className="text-sm font-medium mb-2">
              {isDragging ? 'Drop file here' : 'Drag and drop your Excel file'}
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
              Select File
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Supports .xlsx, .xls, .ods (max {(maxSize / 1024 / 1024).toFixed(0)}MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

