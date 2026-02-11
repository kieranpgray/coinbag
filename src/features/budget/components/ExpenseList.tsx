import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { formatCurrency } from '@/lib/utils';
import { Pencil, Trash2, Plus, Check, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Expense, ExpenseFrequency } from '@/types/domain';
import { convertToFrequency, normalizeToFrequency, type Frequency } from '../utils/frequencyConversion';
import { useExpenseMutations } from '@/features/expenses/hooks/useExpenseMutations';
import { CategoryInput } from '@/features/expenses/components/CategoryInput';
import { AccountSelect } from '@/components/shared/AccountSelect';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { expenseUpdateSchema } from '@/contracts/expenses';
import { cn } from '@/lib/utils';

interface ExpenseListProps {
  expenses: Expense[];
  categoryMap: Map<string, string>;
  accountMap: Map<string, string>;
  uncategorisedId?: string;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onCreate: () => void;
  displayFrequency?: Frequency;
}

const FREQUENCIES: Array<{ value: ExpenseFrequency; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

type EditingCell = { expenseId: string; field: string } | null;

/**
 * Expense list component with inline editing
 * Displays expenses in a table format with editable cells
 */
export function ExpenseList({
  expenses,
  categoryMap,
  accountMap,
  uncategorisedId,
  onEdit,
  onDelete,
  onCreate,
  displayFrequency,
}: ExpenseListProps) {
  const { update } = useExpenseMutations();
  
  // Editing state
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<Expense>>>(new Map());
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Map<string, string>>(new Map());
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set());
  
  // Store original expense data for frequency conversion and revert
  const originalExpensesRef = useRef<Map<string, Expense>>(new Map());

  /**
   * Ref holds the latest pending changes for the debounced save.
   * Updated synchronously in handleFieldChange so the debounced callback
   * reads fresh data instead of a stale closure over pendingChanges state.
   */
  const pendingChangesRef = useRef<Map<string, Partial<Expense>>>(new Map());
  
  // Refs for focus management
  const cellRefs = useRef<Map<string, HTMLInputElement | HTMLButtonElement>>(new Map());
  
  // Initialize original expenses
  useEffect(() => {
    expenses.forEach(expense => {
      originalExpensesRef.current.set(expense.id, { ...expense });
    });
  }, [expenses]);

  const getCategoryName = (categoryId: string) => {
    return categoryMap.get(categoryId) || (uncategorisedId === categoryId ? 'Uncategorised' : 'Unknown');
  };

  // Validate fields for an expense (handles cross-field validation)
  const validateExpenseFields = useCallback((expenseId: string, changes: Partial<Expense>, _expense: Expense): Map<string, string> => {
    const errors = new Map<string, string>();
    
    try {
      // Validate using the update schema (it will validate only provided fields)
      expenseUpdateSchema.parse(changes);
      return errors;
    } catch (error: any) {
      // Extract errors for each field
      if (error.errors && Array.isArray(error.errors)) {
        error.errors.forEach((err: any) => {
          const fieldPath = err.path?.[0];
          if (fieldPath) {
            errors.set(`${expenseId}-${fieldPath}`, err.message || 'Invalid value');
          }
        });
      }
      return errors;
    }
  }, []);

  // Save expense changes (reads from ref so debounced callback sees latest data)
  const saveExpense = useCallback(async (expenseId: string) => {
    const changes = pendingChangesRef.current.get(expenseId);
    if (!changes || Object.keys(changes).length === 0) return;

    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;

    // Validate all changed fields (handles cross-field validation like amount + frequency)
    const validationErrors = validateExpenseFields(expenseId, changes, expense);

    if (validationErrors.size > 0) {
      setFieldErrors(prev => {
        const next = new Map(prev);
        validationErrors.forEach((error, key) => next.set(key, error));
        return next;
      });
      return;
    }

    // Handle frequency conversion for amount
    let finalChanges = { ...changes };
    if (displayFrequency && 'amount' in changes && changes.amount !== undefined) {
      const originalExpense = originalExpensesRef.current.get(expenseId);
      if (originalExpense) {
        // Convert display amount back to original frequency
        const originalFreq = normalizeToFrequency(originalExpense.frequency);
        const displayFreq = normalizeToFrequency(displayFrequency);
        const convertedAmount = convertToFrequency(
          changes.amount as number,
          displayFreq,
          originalFreq
        );
        finalChanges.amount = convertedAmount;
      }
    }

    // Mark fields as saving
    const fieldKeys = Object.keys(changes).map(field => `${expenseId}-${field}`);
    setSavingFields(prev => {
      const next = new Set(prev);
      fieldKeys.forEach(key => next.add(key));
      return next;
    });

    try {
      await update.mutateAsync({ id: expenseId, data: finalChanges });
      
      // Clear pending changes and errors (state + ref)
      pendingChangesRef.current.delete(expenseId);
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.delete(expenseId);
        return next;
      });
      
      setFieldErrors(prev => {
        const next = new Map(prev);
        fieldKeys.forEach(key => next.delete(key));
        return next;
      });

      // Show success indicator
      setSavedFields(prev => {
        const next = new Set(prev);
        fieldKeys.forEach(key => next.add(key));
        return next;
      });

      // Clear success indicator after 2 seconds
      setTimeout(() => {
        setSavedFields(prev => {
          const next = new Set(prev);
          fieldKeys.forEach(key => next.delete(key));
          return next;
        });
      }, 2000);
    } catch (error: any) {
      // Set error for failed fields
      const errorMessage = error?.error || error?.message || 'Failed to save';
      setFieldErrors(prev => {
        const next = new Map(prev);
        fieldKeys.forEach(key => next.set(key, errorMessage));
        return next;
      });
    } finally {
      // Clear saving state
      setSavingFields(prev => {
        const next = new Set(prev);
        fieldKeys.forEach(key => next.delete(key));
        return next;
      });
    }
  }, [expenses, update, displayFrequency, validateExpenseFields]);

  // Debounced save function (300ms for text fields)
  const debouncedSave = useDebouncedCallback(saveExpense, 300);

  const DISCRETE_FIELDS = ['categoryId', 'frequency', 'nextDueDate', 'paidFromAccountId'];

  // Handle field change
  const handleFieldChange = useCallback((expenseId: string, field: string, value: any) => {
    // Clear error for this field
    setFieldErrors(prev => {
      const next = new Map(prev);
      next.delete(`${expenseId}-${field}`);
      return next;
    });

    // Update ref synchronously so debounced save sees the latest data
    const expenseChanges = pendingChangesRef.current.get(expenseId) || {};
    const merged = { ...expenseChanges, [field]: value };
    pendingChangesRef.current = new Map(pendingChangesRef.current);
    pendingChangesRef.current.set(expenseId, merged);

    // Update pending changes (state, for render)
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(expenseId, merged);
      return next;
    });

    if (DISCRETE_FIELDS.includes(field)) {
      saveExpense(expenseId);
    } else {
      debouncedSave(expenseId);
    }
  }, [debouncedSave, saveExpense]);

  // Handle cell click to enter edit mode
  const handleCellClick = useCallback((expenseId: string, field: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCell({ expenseId, field });
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((
    expenseId: string,
    field: string,
    e: React.KeyboardEvent,
    direction: 'next' | 'prev' = 'next'
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Save and move to next field (use ref for latest pending changes)
      const fieldKeys = Object.keys(pendingChangesRef.current.get(expenseId) || {});
      if (fieldKeys.length > 0) {
        saveExpense(expenseId);
      }
      focusNextCell(expenseId, field, 'next');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // Cancel editing and revert changes
      setEditingCell(null);
      pendingChangesRef.current.delete(expenseId);
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.delete(expenseId);
        return next;
      });
      setFieldErrors(prev => {
        const next = new Map(prev);
        next.delete(`${expenseId}-${field}`);
        return next;
      });
    } else if (e.key === 'Tab') {
      // Don't prevent default, but save before moving
      if (!e.shiftKey && direction === 'next') {
        const fieldKeys = Object.keys(pendingChangesRef.current.get(expenseId) || {});
        if (fieldKeys.length > 0) {
          saveExpense(expenseId);
        }
      }
    }
  }, [saveExpense]);

  // Focus next/previous cell
  const focusNextCell = useCallback((currentExpenseId: string, currentField: string, direction: 'next' | 'prev' = 'next') => {
    const fields = ['name', 'categoryId', 'amount', 'frequency', 'nextDueDate', 'paidFromAccountId'];
    const currentIndex = fields.indexOf(currentField);
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (nextIndex >= 0 && nextIndex < fields.length) {
      // Move to next field in same row
      const nextField = fields[nextIndex];
      if (nextField === undefined) return;
      const nextKey = `${currentExpenseId}-${nextField}`;
      const nextRef = cellRefs.current.get(nextKey);
      if (nextRef && 'focus' in nextRef) {
        nextRef.focus();
        setEditingCell({ expenseId: currentExpenseId, field: nextField });
      }
    } else if (direction === 'next' && nextIndex >= fields.length) {
      // Move to next row, first field
      const currentRowIndex = expenses.findIndex(e => e.id === currentExpenseId);
      if (currentRowIndex < expenses.length - 1) {
        const nextExpense = expenses[currentRowIndex + 1];
        if (!nextExpense) return;
        const nextExpenseId = nextExpense.id;
        const nextKey = `${nextExpenseId}-name`;
        const nextRef = cellRefs.current.get(nextKey);
        if (nextRef && 'focus' in nextRef) {
          nextRef.focus();
          setEditingCell({ expenseId: nextExpenseId, field: 'name' });
        }
      }
    } else if (direction === 'prev' && nextIndex < 0) {
      // Move to previous row, last field
      const currentRowIndex = expenses.findIndex(e => e.id === currentExpenseId);
      if (currentRowIndex > 0) {
        const prevExpense = expenses[currentRowIndex - 1];
        if (!prevExpense) return;
        const prevExpenseId = prevExpense.id;
        const lastField = fields[fields.length - 1];
        if (lastField === undefined) return;
        const prevKey = `${prevExpenseId}-${lastField}`;
        const prevRef = cellRefs.current.get(prevKey);
        if (prevRef && 'focus' in prevRef) {
          prevRef.focus();
          setEditingCell({ expenseId: prevExpenseId, field: lastField });
        }
      }
    }
  }, [expenses]);

  // Get cell value (from pending changes or original)
  const getCellValue = useCallback((expense: Expense, field: string): any => {
    const changes = pendingChanges.get(expense.id);
    if (changes && field in changes) {
      return changes[field as keyof Expense];
    }
    return expense[field as keyof Expense];
  }, [pendingChanges]);

  // Check if cell is being edited
  const isEditing = useCallback((expenseId: string, field: string): boolean => {
    return editingCell?.expenseId === expenseId && editingCell?.field === field;
  }, [editingCell]);

  // Check if field is saving
  const isSaving = useCallback((expenseId: string, field: string): boolean => {
    return savingFields.has(`${expenseId}-${field}`);
  }, [savingFields]);

  // Check if field was just saved
  const isSaved = useCallback((expenseId: string, field: string): boolean => {
    return savedFields.has(`${expenseId}-${field}`);
  }, [savedFields]);

  // Get field error
  const getFieldError = useCallback((expenseId: string, field: string): string | undefined => {
    return fieldErrors.get(`${expenseId}-${field}`);
  }, [fieldErrors]);

  return (
    <div className="rounded-md border border-border">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[20%]">Name</TableHead>
            <TableHead className="w-[15%]">Category</TableHead>
            <TableHead className="w-[12%] text-right">Amount</TableHead>
            <TableHead className="w-[12%]">Frequency</TableHead>
            <TableHead className="w-[15%]">Next Due Date</TableHead>
            <TableHead className="w-[15%]">Paid From</TableHead>
            <TableHead className="w-[10%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-muted-foreground">
                    No expenses found. Add your first expense to start tracking your spending.
                  </div>
                  <Button
                    onClick={onCreate}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Expense
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            expenses.map((expense) => {
              const isRowEditing = editingCell?.expenseId === expense.id;
              const displayAmount = displayFrequency
                ? convertToFrequency(expense.amount, normalizeToFrequency(expense.frequency), displayFrequency)
                : expense.amount;

              // Get current values (from pending changes or original)
              const currentName = getCellValue(expense, 'name') as string;
              const currentCategoryId = getCellValue(expense, 'categoryId') as string;
              const currentAmount = displayFrequency && isEditing(expense.id, 'amount')
                ? (getCellValue(expense, 'amount') as number ?? displayAmount)
                : displayAmount;
              const currentFrequency = getCellValue(expense, 'frequency') as ExpenseFrequency;
              const currentNextDueDate = getCellValue(expense, 'nextDueDate') as string | null | undefined;
              const currentPaidFromAccountId = getCellValue(expense, 'paidFromAccountId') as string | undefined;
              
              return (
                <TableRow
                  key={expense.id}
                  className={cn(
                    "hover:bg-muted/50",
                    isRowEditing && "bg-muted/20"
                  )}
                >
                  {/* Name Cell */}
                  <TableCell
                    className={cn(
                      "font-medium px-3 py-2 cursor-pointer transition-colors",
                      "hover:bg-muted/30",
                      isEditing(expense.id, 'name') && "bg-primary/5 ring-2 ring-primary/30 transition-all duration-150"
                    )}
                    onClick={(e) => handleCellClick(expense.id, 'name', e)}
                  >
                    {isEditing(expense.id, 'name') ? (
                      <div className="space-y-1 min-w-0">
                        <Input
                          ref={(el) => {
                            if (el) cellRefs.current.set(`${expense.id}-name`, el);
                          }}
                          value={currentName}
                          onChange={(e) => handleFieldChange(expense.id, 'name', e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => handleKeyDown(expense.id, 'name', e)}
                          className={cn(
                            "h-8 w-full max-w-full min-w-0",
                            getFieldError(expense.id, 'name') && "border-destructive"
                          )}
                          aria-invalid={!!getFieldError(expense.id, 'name')}
                          autoFocus
                        />
                        {getFieldError(expense.id, 'name') && (
                          <p className="text-xs text-destructive flex items-center gap-1 truncate mt-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{getFieldError(expense.id, 'name')}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{currentName}</span>
                        {isSaving(expense.id, 'name') && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />}
                        {isSaved(expense.id, 'name') && <Check className="h-3 w-3 text-green-600 flex-shrink-0" />}
                      </div>
                    )}
                  </TableCell>

                  {/* Category Cell */}
                  <TableCell
                    className={cn(
                      "px-3 py-2 cursor-pointer transition-colors",
                      "hover:bg-muted/30",
                      isEditing(expense.id, 'categoryId') && "bg-primary/5 ring-2 ring-primary/30 transition-all duration-150"
                    )}
                    onClick={(e) => handleCellClick(expense.id, 'categoryId', e)}
                  >
                    {isEditing(expense.id, 'categoryId') ? (
                      <div className="space-y-1 min-w-0">
                        <div className="w-full max-w-full min-w-0">
                          <CategoryInput
                            value={currentCategoryId ?? uncategorisedId ?? ''}
                            onChange={(value) => {
                              handleFieldChange(expense.id, 'categoryId', value);
                              // Close edit mode after selection
                              setTimeout(() => setEditingCell(null), 100);
                            }}
                            onCategoriesRefresh={() => {}}
                          />
                        </div>
                        {getFieldError(expense.id, 'categoryId') && (
                          <p className="text-xs text-destructive flex items-center gap-1 truncate mt-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{getFieldError(expense.id, 'categoryId')}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{getCategoryName(currentCategoryId)}</span>
                        {isSaving(expense.id, 'categoryId') && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />}
                        {isSaved(expense.id, 'categoryId') && <Check className="h-3 w-3 text-green-600 flex-shrink-0" />}
                      </div>
                    )}
                  </TableCell>

                  {/* Amount Cell */}
                  <TableCell
                    className={cn(
                      "text-right px-3 py-2 cursor-pointer transition-colors",
                      "hover:bg-muted/30",
                      isEditing(expense.id, 'amount') && "bg-primary/5 ring-2 ring-primary/30 transition-all duration-150"
                    )}
                    onClick={(e) => handleCellClick(expense.id, 'amount', e)}
                  >
                    {isEditing(expense.id, 'amount') ? (
                      <div className="space-y-1 min-w-0">
                        <Input
                          ref={(el) => {
                            if (el) cellRefs.current.set(`${expense.id}-amount`, el);
                          }}
                          type="number"
                          step="0.01"
                          value={currentAmount}
                          onChange={(e) => handleFieldChange(expense.id, 'amount', parseFloat(e.target.value) || 0)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => handleKeyDown(expense.id, 'amount', e)}
                          className={cn(
                            "h-8 w-full max-w-full min-w-0 text-right",
                            getFieldError(expense.id, 'amount') && "border-destructive"
                          )}
                          aria-invalid={!!getFieldError(expense.id, 'amount')}
                          autoFocus
                        />
                        {getFieldError(expense.id, 'amount') && (
                          <p className="text-xs text-destructive flex items-center gap-1 justify-end truncate mt-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{getFieldError(expense.id, 'amount')}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 justify-end min-w-0">
                        <span className="truncate">{formatCurrency(currentAmount)}</span>
                        {isSaving(expense.id, 'amount') && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />}
                        {isSaved(expense.id, 'amount') && <Check className="h-3 w-3 text-green-600 flex-shrink-0" />}
                      </div>
                    )}
                  </TableCell>

                  {/* Frequency Cell */}
                  <TableCell
                    className={cn(
                      "px-3 py-2 cursor-pointer transition-colors",
                      "hover:bg-muted/30",
                      isEditing(expense.id, 'frequency') && "bg-primary/5 ring-2 ring-primary/30 transition-all duration-150"
                    )}
                    onClick={(e) => handleCellClick(expense.id, 'frequency', e)}
                  >
                    {isEditing(expense.id, 'frequency') ? (
                      <div className="space-y-1 min-w-0">
                        <div className="w-full max-w-full min-w-0">
                          <Select
                            value={currentFrequency}
                            onValueChange={(value) => {
                              handleFieldChange(expense.id, 'frequency', value);
                              // Close edit mode after selection
                              setTimeout(() => setEditingCell(null), 100);
                            }}
                          >
                            <SelectTrigger className="h-8 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FREQUENCIES.map((freq) => (
                                <SelectItem key={freq.value} value={freq.value}>
                                  {freq.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {getFieldError(expense.id, 'frequency') && (
                          <p className="text-xs text-destructive flex items-center gap-1 truncate mt-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{getFieldError(expense.id, 'frequency')}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="capitalize truncate">{currentFrequency}</span>
                        {isSaving(expense.id, 'frequency') && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />}
                        {isSaved(expense.id, 'frequency') && <Check className="h-3 w-3 text-green-600 flex-shrink-0" />}
                      </div>
                    )}
                  </TableCell>

                  {/* Next Due Date Cell */}
                  <TableCell
                    className={cn(
                      "px-3 py-2 cursor-pointer transition-colors",
                      "hover:bg-muted/30",
                      isEditing(expense.id, 'nextDueDate') && "bg-primary/5 ring-2 ring-primary/30 transition-all duration-150"
                    )}
                    onClick={(e) => handleCellClick(expense.id, 'nextDueDate', e)}
                  >
                    {isEditing(expense.id, 'nextDueDate') ? (
                      <div className="space-y-1 min-w-0">
                        <div className="w-full max-w-full min-w-0">
                          <DatePicker
                            value={currentNextDueDate || undefined}
                            onChange={(e) => {
                              const value = e.target.value || null;
                              handleFieldChange(expense.id, 'nextDueDate', value);
                              // Close edit mode after selection
                              setTimeout(() => setEditingCell(null), 100);
                            }}
                            allowClear
                            shouldShowCalendarButton
                            className="w-full"
                          />
                        </div>
                        {getFieldError(expense.id, 'nextDueDate') && (
                          <p className="text-xs text-destructive flex items-center gap-1 truncate mt-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{getFieldError(expense.id, 'nextDueDate')}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{currentNextDueDate ? format(new Date(currentNextDueDate), 'MMM d, yyyy') : '-'}</span>
                        {isSaving(expense.id, 'nextDueDate') && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />}
                        {isSaved(expense.id, 'nextDueDate') && <Check className="h-3 w-3 text-green-600 flex-shrink-0" />}
                      </div>
                    )}
                  </TableCell>

                  {/* Paid From Cell */}
                  <TableCell
                    className={cn(
                      "px-3 py-2 cursor-pointer transition-colors",
                      "hover:bg-muted/30",
                      isEditing(expense.id, 'paidFromAccountId') && "bg-primary/5 ring-2 ring-primary/30 transition-all duration-150"
                    )}
                    onClick={(e) => handleCellClick(expense.id, 'paidFromAccountId', e)}
                  >
                    {isEditing(expense.id, 'paidFromAccountId') ? (
                      <div className="space-y-1 min-w-0">
                        <div className="w-full max-w-full min-w-0">
                          <AccountSelect
                            value={currentPaidFromAccountId}
                            onChange={(value) => {
                              handleFieldChange(expense.id, 'paidFromAccountId', value || undefined);
                              // Close edit mode after selection
                              setTimeout(() => setEditingCell(null), 100);
                            }}
                            context="expense"
                          />
                        </div>
                        {getFieldError(expense.id, 'paidFromAccountId') && (
                          <p className="text-xs text-destructive flex items-center gap-1 truncate mt-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{getFieldError(expense.id, 'paidFromAccountId')}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{currentPaidFromAccountId ? (accountMap.get(currentPaidFromAccountId) || 'Unknown Account') : '-'}</span>
                        {isSaving(expense.id, 'paidFromAccountId') && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />}
                        {isSaved(expense.id, 'paidFromAccountId') && <Check className="h-3 w-3 text-green-600 flex-shrink-0" />}
                      </div>
                    )}
                  </TableCell>

                  {/* Actions Cell */}
                  <TableCell className="text-right px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(expense)}
                        aria-label={`Edit ${expense.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(expense)}
                        aria-label={`Delete ${expense.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
