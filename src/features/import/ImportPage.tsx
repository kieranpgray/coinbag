import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileUpload } from '@/components/shared/FileUpload';
import { ImportPreview } from './ImportPreview';
import { ImportResults } from './ImportResults';
import { generateErrorReport } from '@/lib/excel/errorReport';
import { ImportService } from './ImportService';
import { generateImportTemplate } from '@/lib/excel/templateGenerator';
import { useImportProgress } from './hooks/useImportProgress';
import type { ParsedImportData, ValidationResult, ImportResult } from './types';
import { useAccounts } from '@/features/accounts/hooks';
import { useAssets } from '@/features/assets/hooks';
import { useLiabilities } from '@/features/liabilities/hooks';
import { useExpenses } from '@/features/expenses/hooks';
import { useIncomes } from '@/features/income/hooks';

type ImportStep = 'upload' | 'preview' | 'importing' | 'results';

export function ImportPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedData, setParsedData] = useState<ParsedImportData | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { progress, startImport, updateProgress, finishImport, reset: resetProgress } = useImportProgress();
  const [isParsing, setIsParsing] = useState(false);

  // Fetch existing data for duplicate detection
  const { data: existingAccounts = [] } = useAccounts();
  const { data: existingAssets = [] } = useAssets();
  const { data: existingLiabilities = [] } = useLiabilities();
  const { data: existingExpenses = [] } = useExpenses();
  const { data: existingIncome = [] } = useIncomes();

  const importService = useMemo(() => new ImportService(getToken), [getToken]);

  const handleDownloadTemplate = useCallback(() => {
    try {
      const template = generateImportTemplate();
      const url = URL.createObjectURL(template);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'coinbag-import-template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate template');
    }
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);
      setIsParsing(true);

      try {
        // Parse file
        const parsed = await importService.parseFile(file);
        setParsedData(parsed);

        // Validate
        const validationResult = await importService.validate(parsed, {
          accounts: existingAccounts,
          assets: existingAssets,
          liabilities: existingLiabilities,
          expenses: existingExpenses,
          income: existingIncome,
        });

        setValidation(validationResult);
        setStep('preview');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse file');
        setStep('upload');
      } finally {
        setIsParsing(false);
      }
    },
    [importService, existingAccounts, existingAssets, existingLiabilities, existingExpenses, existingIncome]
  );

  const handleConfirmImport = useCallback(async () => {
    if (!parsedData || !validation) {
      return;
    }

    setStep('importing');
    startImport();

    try {
      const result = await importService.import(
        parsedData,
        validation,
        {
          skipDuplicates,
          dryRun: false,
          onProgress: updateProgress,
        }
      );

      setImportResult(result);
      setStep('results');

      // Batch invalidate all related queries efficiently
      // Using predicate to invalidate multiple queries at once reduces overhead
      // This ensures the UI refreshes with newly imported data
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return ['accounts', 'assets', 'liabilities', 'expenses', 'incomes', 'dashboard', 'income'].includes(key as string);
        },
      });

      // Also explicitly refetch critical queries to ensure data is fresh
      // This is a safety measure in case invalidation doesn't trigger refetch
      if (result.imported.accounts > 0) {
        queryClient.refetchQueries({ queryKey: ['accounts'] });
      }
      if (result.imported.assets > 0) {
        queryClient.refetchQueries({ queryKey: ['assets'] });
      }
      if (result.imported.liabilities > 0) {
        queryClient.refetchQueries({ queryKey: ['liabilities'] });
      }
      if (result.imported.expenses > 0) {
        queryClient.refetchQueries({ queryKey: ['expenses'] });
      }
      if (result.imported.income > 0) {
        queryClient.refetchQueries({ queryKey: ['incomes'] });
        queryClient.refetchQueries({ queryKey: ['income'] });
      }
      // Always refetch dashboard to show updated totals
      queryClient.refetchQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('preview');
    } finally {
      finishImport();
      setIsParsing(false);
    }
  }, [parsedData, validation, skipDuplicates, importService, startImport, updateProgress, finishImport, queryClient]);

  const handleCancel = useCallback(() => {
    setStep('upload');
    setParsedData(null);
    setValidation(null);
    setError(null);
    resetProgress();
  }, [resetProgress]);

  const handleImportMore = useCallback(() => {
    setStep('upload');
    setParsedData(null);
    setValidation(null);
    setImportResult(null);
    setError(null);
    resetProgress();
  }, [resetProgress]);

  const handleDownloadErrorReport = useCallback(() => {
    if (!importResult) {
      return;
    }

    try {
      const report = generateErrorReport(importResult);
      const url = URL.createObjectURL(report);
      const link = document.createElement('a');
      link.href = url;
      link.download = `import-errors-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate error report');
    }
  }, [importResult]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold">Import Data</h1>
          <p className="text-muted-foreground mt-2">
            Import your financial data from an Excel spreadsheet
          </p>
        </div>
        <Button onClick={handleDownloadTemplate} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      {error && (
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <div className="text-red-500">{error}</div>
          </CardContent>
        </Card>
      )}

      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Excel File</CardTitle>
            <CardDescription>
              Upload your filled Excel template to import data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              accept=".xlsx,.xls,.ods"
              maxSize={10 * 1024 * 1024}
              onFileSelect={handleFileSelect}
              onError={setError}
              disabled={isParsing}
            />
            {isParsing && (
              <div className="mt-4 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Parsing file...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'preview' && parsedData && validation && (
        <ImportPreview
          parsedData={parsedData}
          validation={validation}
          onConfirm={handleConfirmImport}
          onCancel={handleCancel}
          skipDuplicates={skipDuplicates}
          onSkipDuplicatesChange={setSkipDuplicates}
        />
      )}

      {step === 'importing' && progress && (
        <Card>
          <CardHeader>
            <CardTitle>Importing Data</CardTitle>
            <CardDescription>{progress.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{progress.message}</span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <Progress
                value={(progress.current / progress.total) * 100}
                className="h-2"
              />
            </div>
            {progress.estimatedTimeRemaining && (
              <div className="text-sm text-muted-foreground">
                Estimated time remaining: {progress.estimatedTimeRemaining} seconds
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'results' && importResult && (
        <ImportResults
          result={importResult}
          onDownloadErrorReport={handleDownloadErrorReport}
          onImportMore={handleImportMore}
        />
      )}
    </div>
  );
}

