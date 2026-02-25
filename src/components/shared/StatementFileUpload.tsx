import { FileUpload, type FileUploadProps } from './FileUpload';
import { FileText, Image } from 'lucide-react';

export interface StatementFileUploadProps extends Omit<FileUploadProps, 'accept'> {
  accept?: string; // Override to allow PDF/images
}

/**
 * Extended FileUpload component specifically for statement files (PDFs and images)
 */
export function StatementFileUpload({
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSize = 10 * 1024 * 1024, // 10MB default
  onFileSelect,
  onError,
  disabled = false,
  className,
}: StatementFileUploadProps) {
  // Enhanced validation for statement files
  const validateStatementFile = (file: File): { valid: boolean; error?: string } => {
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
  };

  const handleFileSelect = (file: File) => {
    const validation = validateStatementFile(file);
    if (!validation.valid) {
      onError?.(validation.error || 'Invalid file');
      return;
    }
    onFileSelect(file);
  };

  return (
    <div className={className}>
      <FileUpload
        accept={accept}
        maxSize={maxSize}
        onFileSelect={handleFileSelect}
        onError={onError}
        disabled={disabled}
      />
      <div className="mt-2 flex items-center gap-2 text-caption text-muted-foreground">
        <FileText className="h-3 w-3" />
        <span>PDF statements</span>
        <Image className="h-3 w-3 ml-2" />
        <span>Image files (JPEG, PNG)</span>
      </div>
    </div>
  );
}

