import { CheckCircle2, XCircle, AlertTriangle, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants/routes';
import type { ImportResult } from './types';

export interface ImportResultsProps {
  result: ImportResult;
  onDownloadErrorReport: () => void;
  onImportMore: () => void;
}

export function ImportResults({
  result,
  onDownloadErrorReport,
  onImportMore,
}: ImportResultsProps) {
  const totalImported =
    result.imported.accounts +
    result.imported.assets +
    result.imported.liabilities +
    result.imported.expenses +
    result.imported.subscriptions +
    result.imported.income;

  const hasErrors = result.errors.length > 0;
  const hasDuplicates = result.duplicates.length > 0;
  const hasWarnings = result.warnings.length > 0;

  return (
    <div className="space-y-6">
      {/* Success Summary */}
      {totalImported > 0 && (
        <Card className="border-green-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <CardTitle className="text-green-500">Import Completed</CardTitle>
            </div>
            <CardDescription>
              Successfully imported {totalImported} item{totalImported !== 1 ? 's' : ''} in{' '}
              {(result.duration / 1000).toFixed(1)} seconds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {result.imported.accounts > 0 && (
                <div>
                  <div className="text-2xl font-bold">{result.imported.accounts}</div>
                  <div className="text-sm text-muted-foreground">Accounts</div>
                </div>
              )}
              {result.imported.assets > 0 && (
                <div>
                  <div className="text-2xl font-bold">{result.imported.assets}</div>
                  <div className="text-sm text-muted-foreground">Assets</div>
                </div>
              )}
              {result.imported.liabilities > 0 && (
                <div>
                  <div className="text-2xl font-bold">{result.imported.liabilities}</div>
                  <div className="text-sm text-muted-foreground">Liabilities</div>
                </div>
              )}
              {(result.imported.expenses > 0 || result.imported.subscriptions > 0) && (
                <div>
                  <div className="text-2xl font-bold">{result.imported.expenses + result.imported.subscriptions}</div>
                  <div className="text-sm text-muted-foreground">Expenses</div>
                </div>
              )}
              {result.imported.income > 0 && (
                <div>
                  <div className="text-2xl font-bold">{result.imported.income}</div>
                  <div className="text-sm text-muted-foreground">Income</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {hasErrors && (
        <Card className="border-red-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-red-500">
                {result.errors.length} Error{result.errors.length !== 1 ? 's' : ''} Occurred
              </CardTitle>
            </div>
            <CardDescription>
              Some items failed to import. Download the error report to see details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              {result.errors.slice(0, 5).map((error, idx) => (
                <div
                  key={idx}
                  className="text-sm p-2 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800"
                >
                  <div className="font-medium">
                    Row {error.rowNumber} ({error.entityType}):
                  </div>
                  <div className="text-red-700 dark:text-red-300">
                    {error.fields.map((field, fieldIdx) => (
                      <div key={fieldIdx}>
                        <strong>{field.field}:</strong> {field.message}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {result.errors.length > 5 && (
                <div className="text-sm text-muted-foreground">
                  ... and {result.errors.length - 5} more error{result.errors.length - 5 !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            <Button variant="outline" onClick={onDownloadErrorReport}>
              <Download className="h-4 w-4 mr-2" />
              Download Error Report
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Duplicates */}
      {hasDuplicates && (
        <Card className="border-yellow-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-yellow-500">
                {result.duplicates.length} Duplicate{result.duplicates.length !== 1 ? 's' : ''} Skipped
              </CardTitle>
            </div>
            <CardDescription>
              These items were skipped because they already exist in your data.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <Card className="border-yellow-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-yellow-500">
                {result.warnings.length} Warning{result.warnings.length !== 1 ? 's' : ''}
              </CardTitle>
            </div>
            <CardContent>
              <div className="space-y-2">
                {result.warnings.slice(0, 5).map((warning, idx) => (
                  <div
                    key={idx}
                    className="text-sm p-2 bg-yellow-50 dark:bg-yellow-950 rounded border border-yellow-200 dark:border-yellow-800"
                  >
                    Row {warning.rowNumber} ({warning.entityType}): {warning.message}
                  </div>
                ))}
              </div>
            </CardContent>
          </CardHeader>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onImportMore}>
          Import More Data
        </Button>
        <div className="flex items-center gap-2">
          {totalImported > 0 && (
            <>
              <Button variant="outline" onClick={() => window.location.href = ROUTES.app.accounts}>
                View Accounts
              </Button>
              <Button variant="outline" onClick={() => window.location.href = ROUTES.app.wealth}>
                View Assets
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


