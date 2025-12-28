import { useState, useCallback } from 'react';
import type { ImportProgress } from '../types';

export function useImportProgress() {
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const startImport = useCallback(() => {
    setIsImporting(true);
    setProgress({
      step: 'parsing',
      current: 0,
      total: 100,
      message: 'Starting import...',
    });
  }, []);

  const updateProgress = useCallback((newProgress: ImportProgress) => {
    setProgress(newProgress);
  }, []);

  const finishImport = useCallback(() => {
    setIsImporting(false);
  }, []);

  const reset = useCallback(() => {
    setIsImporting(false);
    setProgress(null);
  }, []);

  return {
    progress,
    isImporting,
    startImport,
    updateProgress,
    finishImport,
    reset,
  };
}

