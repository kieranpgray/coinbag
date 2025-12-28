import { useState, useCallback } from 'react';
import type { ParsedImportData, ValidationResult } from '../types';

export interface ImportPreviewState {
  parsedData: ParsedImportData | null;
  validation: ValidationResult | null;
  isPreviewing: boolean;
}

export function useImportPreview() {
  const [state, setState] = useState<ImportPreviewState>({
    parsedData: null,
    validation: null,
    isPreviewing: false,
  });

  const setPreview = useCallback(
    (parsedData: ParsedImportData, validation: ValidationResult) => {
      setState({
        parsedData,
        validation,
        isPreviewing: true,
      });
    },
    []
  );

  const clearPreview = useCallback(() => {
    setState({
      parsedData: null,
      validation: null,
      isPreviewing: false,
    });
  }, []);

  return {
    ...state,
    setPreview,
    clearPreview,
  };
}

