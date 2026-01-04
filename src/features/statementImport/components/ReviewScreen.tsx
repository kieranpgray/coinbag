import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import type { TransactionCreate } from '@/contracts/transactions';
import { formatCurrency } from '@/lib/utils';

interface ReviewScreenProps {
  transactions: TransactionCreate[];
  errors: string[];
  warnings: string[];
  onCommit: (transactions: TransactionCreate[]) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ReviewScreen({
  transactions,
  errors,
  warnings,
  onCommit,
  onCancel,
  isLoading = false,
}: ReviewScreenProps) {
  const { t } = useTranslation(['import', 'common']);
  const [editableTransactions, setEditableTransactions] = useState<TransactionCreate[]>(transactions);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set(Array.from({ length: transactions.length }, (_, i) => i)));

  const summary = useMemo(() => {
    const selected = editableTransactions.filter((_, index) => selectedRows.has(index));
    const income = selected
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const expenses = selected
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    return {
      total: selected.length,
      income,
      expenses,
      net: income - expenses,
    };
  }, [editableTransactions, selectedRows]);

  const handleToggleRow = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedRows.size === editableTransactions.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(Array.from({ length: editableTransactions.length }, (_, i) => i)));
    }
  };

  const handleUpdateTransaction = (index: number, field: keyof TransactionCreate, value: unknown) => {
    const updated = [...editableTransactions];
    const currentTransaction = updated[index];

    // Ensure we maintain valid TransactionCreate structure
    const updatedTransaction = { ...currentTransaction };

    // Type-safe field updates with validation - ensure required fields are never undefined
    if (field === 'type' && (value === 'income' || value === 'expense')) {
      updatedTransaction.type = value;
    } else if (field === 'accountId' && typeof value === 'string' && value.trim()) {
      updatedTransaction.accountId = value;
    } else if (field === 'date' && typeof value === 'string' && value.trim()) {
      updatedTransaction.date = value;
    } else if (field === 'description' && typeof value === 'string' && value.trim()) {
      updatedTransaction.description = value;
    } else if (field === 'amount' && typeof value === 'number' && !isNaN(value)) {
      updatedTransaction.amount = value;
    } else if (field === 'category' && (value === null || value === undefined || (typeof value === 'string' && value.trim()))) {
      updatedTransaction.category = typeof value === 'string' ? value : value;
    } else if (field === 'transactionReference' && (value === null || value === undefined || (typeof value === 'string' && value.trim()))) {
      updatedTransaction.transactionReference = typeof value === 'string' ? value : value;
    } else if (field === 'statementImportId' && (value === null || value === undefined || (typeof value === 'string' && value.trim()))) {
      updatedTransaction.statementImportId = typeof value === 'string' ? value : value;
    }

    // Ensure the transaction conforms to TransactionCreate type
    updated[index] = updatedTransaction as TransactionCreate;
    setEditableTransactions(updated);
  };

  const handleCommit = async () => {
    const selectedTransactions = editableTransactions.filter((_, index) => selectedRows.has(index));
    await onCommit(selectedTransactions);
  };

  // Empty state
  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('noTransactionsFound', { ns: 'import' })}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('noTransactionsDescription', { ns: 'import' })}
            </p>
            <ul className="text-sm text-muted-foreground text-left max-w-md mx-auto space-y-1 mb-6">
              <li>• {t('checkStatementFormat', { ns: 'import' })}</li>
              <li>• {t('checkFileReadable', { ns: 'import' })}</li>
              <li>• {t('checkTransactionData', { ns: 'import' })}</li>
            </ul>
            {errors.length > 0 && (
              <Alert className="max-w-md mx-auto mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errors.map((error, i) => (
                    <p key={i}>{error}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}
            <Button onClick={onCancel} variant="outline">
              {t('goBack', { ns: 'import' })}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Review Transactions</CardTitle>
          <CardDescription>
            Review and edit transactions before importing. Uncheck any transactions you don't want to import.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Selected</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Income</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.income)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expenses</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.expenses)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net</p>
              <p className={`text-2xl font-bold ${summary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.net)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Warnings:</p>
            <ul className="list-disc list-inside space-y-1">
              {warnings.map((warning, i) => (
                <li key={i} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Errors:</p>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, i) => (
                <li key={i} className="text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Transactions Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === editableTransactions.length}
                      onChange={handleToggleAll}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editableTransactions.map((transaction, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(index)}
                        onChange={() => handleToggleRow(index)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <DatePicker
                        value={transaction.date}
                        onChange={(e) => handleUpdateTransaction(index, 'date', e.target.value)}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={transaction.description}
                        onChange={(e) => handleUpdateTransaction(index, 'description', e.target.value)}
                        className="min-w-[200px]"
                      />
                    </TableCell>
                    <TableCell>
                      <select
                        value={transaction.type}
                        onChange={(e) => handleUpdateTransaction(index, 'type', e.target.value as 'income' | 'expense')}
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={transaction.amount}
                        onChange={(e) => handleUpdateTransaction(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-24 text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={transaction.transactionReference || ''}
                        onChange={(e) => handleUpdateTransaction(index, 'transactionReference', e.target.value || undefined)}
                        className="w-32"
                        placeholder="Optional"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} variant="outline" disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleCommit} disabled={isLoading || summary.total === 0}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Import {summary.total} Transaction{summary.total !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

