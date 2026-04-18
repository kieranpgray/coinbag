import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ParsedImportData, ValidationResult } from './types';
import { cn } from '@/lib/utils';

export interface ImportPreviewProps {
  parsedData: ParsedImportData;
  validation: ValidationResult;
  onConfirm: () => void;
  onCancel: () => void;
  skipDuplicates: boolean;
  onSkipDuplicatesChange: (skip: boolean) => void;
}

export function ImportPreview({
  parsedData,
  validation,
  onConfirm,
  onCancel,
  skipDuplicates,
  onSkipDuplicatesChange,
}: ImportPreviewProps) {
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());

  const toggleError = (rowNumber: number) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(rowNumber)) {
      newExpanded.delete(rowNumber);
    } else {
      newExpanded.add(rowNumber);
    }
    setExpandedErrors(newExpanded);
  };

  const summary = validation.summary;
  const hasErrors = validation.errors.length > 0;
  const hasDuplicates = validation.duplicates.length > 0;
  const canImport = summary.validRows > 0 && !hasErrors;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-body font-medium">Total Rows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-balance">{summary.totalRows}</div>
          </CardContent>
        </Card>

        <Card className={cn({ 'border-success/50': summary.validRows > 0 })}>
          <CardHeader className="pb-3">
            <CardTitle className="text-body font-medium">Valid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-balance text-success">
              {summary.validRows}
            </div>
          </CardContent>
        </Card>

        <Card className={cn({ 'border-destructive/50': hasErrors })}>
          <CardHeader className="pb-3">
            <CardTitle className="text-body font-medium">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-balance text-destructive">
              {summary.errorRows}
            </div>
          </CardContent>
        </Card>

        <Card className={cn({ 'border-[var(--warning)]': hasDuplicates })}>
          <CardHeader className="pb-3">
            <CardTitle className="text-body font-medium">Duplicates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-balance text-[var(--warning)]">
              {summary.duplicateRows}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-body font-medium">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-balance text-[var(--warning)]">
              {summary.warningRows}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entity Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Import Summary</CardTitle>
          <CardDescription>
            Review what will be imported before confirming
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="accounts" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="accounts">
                Accounts ({parsedData.accounts.length})
              </TabsTrigger>
              <TabsTrigger value="assets">
                Assets ({parsedData.assets.length})
              </TabsTrigger>
              <TabsTrigger value="liabilities">
                Liabilities ({parsedData.liabilities.length})
              </TabsTrigger>
              <TabsTrigger value="expenses">
                Expenses ({parsedData.expenses.length + parsedData.subscriptions.length})
              </TabsTrigger>
              <TabsTrigger value="income">
                Income ({parsedData.income.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="accounts" className="mt-4">
              <EntityTypePreview
                entityType="account"
                rows={parsedData.accounts}
                errors={validation.errors.filter((e) => e.entityType === 'account')}
                duplicates={validation.duplicates.filter((d) => d.entityType === 'account')}
                expandedErrors={expandedErrors}
                onToggleError={toggleError}
              />
            </TabsContent>

            <TabsContent value="assets" className="mt-4">
              <EntityTypePreview
                entityType="asset"
                rows={parsedData.assets}
                errors={validation.errors.filter((e) => e.entityType === 'asset')}
                duplicates={validation.duplicates.filter((d) => d.entityType === 'asset')}
                expandedErrors={expandedErrors}
                onToggleError={toggleError}
              />
            </TabsContent>

            <TabsContent value="liabilities" className="mt-4">
              <EntityTypePreview
                entityType="liability"
                rows={parsedData.liabilities}
                errors={validation.errors.filter((e) => e.entityType === 'liability')}
                duplicates={validation.duplicates.filter((d) => d.entityType === 'liability')}
                expandedErrors={expandedErrors}
                onToggleError={toggleError}
              />
            </TabsContent>

            <TabsContent value="expenses" className="mt-4">
              <EntityTypePreview
                entityType="expense"
                rows={[...parsedData.expenses, ...parsedData.subscriptions]}
                errors={validation.errors.filter((e) => e.entityType === 'expense' || e.entityType === 'subscription')}
                duplicates={validation.duplicates.filter((d) => d.entityType === 'expense' || d.entityType === 'subscription')}
                expandedErrors={expandedErrors}
                onToggleError={toggleError}
              />
            </TabsContent>

            <TabsContent value="income" className="mt-4">
              <EntityTypePreview
                entityType="income"
                rows={parsedData.income}
                errors={validation.errors.filter((e) => e.entityType === 'income')}
                duplicates={validation.duplicates.filter((d) => d.entityType === 'income')}
                expandedErrors={expandedErrors}
                onToggleError={toggleError}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Alerts */}
      {hasErrors && (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Validation Errors</CardTitle>
            </div>
            <CardDescription>
              Please fix the errors before importing. You can download an error report to fix them in Excel.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {hasDuplicates && (
        <Card className="border-[var(--warning)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-[var(--warning)]" />
              <CardTitle className="text-[var(--warning)]">Duplicate Items Found</CardTitle>
            </div>
            <CardDescription>
              {validation.duplicates.length} item(s) already exist in your data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="skip-duplicates"
                checked={skipDuplicates}
                onChange={(e) => onSkipDuplicatesChange(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="skip-duplicates" className="text-body cursor-pointer">
                Skip duplicate items during import
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {canImport && (
          <Button onClick={onConfirm} disabled={!canImport}>
            Import {summary.validRows} Item{summary.validRows !== 1 ? 's' : ''}
          </Button>
        )}
      </div>
    </div>
  );
}

interface EntityTypePreviewProps {
  entityType: string;
  rows: Array<{ rowNumber: number; data: Record<string, unknown> }>;
  errors: Array<{ rowNumber: number; fields: Array<{ field: string; message: string }> }>;
  duplicates: Array<{ rowNumber: number; matchReason: string }>;
  expandedErrors: Set<number>;
  onToggleError: (rowNumber: number) => void;
}

function EntityTypePreview({
  rows,
  errors,
  duplicates,
  expandedErrors,
  onToggleError,
}: EntityTypePreviewProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No {rows.length === 0 ? 'data' : 'items'} to import
      </div>
    );
  }

  const errorRowNumbers = new Set(errors.map((e) => e.rowNumber));
  const duplicateRowNumbers = new Set(duplicates.map((d) => d.rowNumber));

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const hasError = errorRowNumbers.has(row.rowNumber);
        const isDuplicate = duplicateRowNumbers.has(row.rowNumber);
        const isExpanded = expandedErrors.has(row.rowNumber);
        const rowErrors = errors.filter((e) => e.rowNumber === row.rowNumber);

        return (
          <div
            key={row.rowNumber}
            className={cn(
              'border rounded-lg p-4',
              {
                'border-destructive/50 bg-destructive/10': hasError,
                'border-[var(--warning)] bg-[var(--warning-light)]': isDuplicate && !hasError,
                'border-border': !hasError && !isDuplicate,
              }
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-body font-medium">Row {row.rowNumber}</span>
                  {hasError && (
                    <Badge variant="destructive">Error</Badge>
                  )}
                  {isDuplicate && (
                    <Badge variant="outline" className="border-[var(--warning)] text-[var(--warning)]">
                      Duplicate
                    </Badge>
                  )}
                  {!hasError && !isDuplicate && (
                    <Badge variant="outline" className="border-success/50 text-success">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Valid
                    </Badge>
                  )}
                </div>

                {isDuplicate && (
                  <p className="text-body text-[var(--warning)] mb-2">
                    {duplicates.find((d) => d.rowNumber === row.rowNumber)?.matchReason}
                  </p>
                )}

                {hasError && (
                  <div className="mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleError(row.rowNumber)}
                      className="text-body"
                    >
                      {isExpanded ? 'Hide' : 'Show'} Errors ({rowErrors.length})
                    </Button>
                    {isExpanded && (
                      <div className="mt-2 space-y-1">
                        {rowErrors.map((error, idx) => (
                          <div key={idx} className="text-body text-destructive">
                            {error.fields.map((field, fieldIdx) => (
                              <div key={fieldIdx}>
                                <strong>{field.field}:</strong> {field.message}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

