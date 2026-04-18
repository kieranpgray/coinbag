import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import { Pencil, Trash2, Plus, Check, Loader2, AlertCircle, ArrowDown, ArrowUp, LayoutGrid } from 'lucide-react';
import { format } from 'date-fns';
import type { Expense, ExpenseFrequency } from '@/types/domain';
import { convertToFrequency, normalizeToFrequency, type Frequency } from '../utils/frequencyConversion';
import { useExpenseMutations } from '@/features/expenses/hooks/useExpenseMutations';
import { CategoryInput } from '@/features/expenses/components/CategoryInput';
import { AccountSelect } from '@/components/shared/AccountSelect';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { expenseUpdateSchema } from '@/contracts/expenses';
import { cn } from '@/lib/utils';
import { getExpenseType } from '../utils/expenseTypeMapping';

interface ExpenseListProps {
  expenses: Expense[];
  categoryMap: Map<string, string>;
  accountMap: Map<string, string>;
  uncategorisedId?: string;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onCreate: () => void;
  onCategoryChanged?: (
    expense: Expense,
    nextCategoryId: string,
    previousCategoryId: string,
    isRepaymentCategory: boolean
  ) => void;
  displayFrequency?: Frequency;
}

const FREQUENCIES: Array<{ value: ExpenseFrequency; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

type SortType = 'text' | 'numeric' | 'date';

interface SortableColumn {
  id: string;
  label: string;
  type: SortType;
  accessor: string;
}

const SORTABLE_COLUMNS: SortableColumn[] = [
  { id: 'name', label: 'Name', type: 'text', accessor: 'name' },
  { id: 'category', label: 'Category', type: 'text', accessor: 'categoryId' },
  { id: 'amount', label: 'Amount', type: 'numeric', accessor: 'amount' },
  { id: 'frequency', label: 'Frequency', type: 'text', accessor: 'frequency' },
  { id: 'nextDueDate', label: 'Next Due Date', type: 'date', accessor: 'nextDueDate' },
  { id: 'paidFromAccountId', label: 'Paid From', type: 'text', accessor: 'paidFromAccountId' },
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
  onCategoryChanged,
  displayFrequency,
}: ExpenseListProps) {
  const { update } = useExpenseMutations();
  
  // Editing state
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<Expense>>>(new Map());
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Map<string, string>>(new Map());
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set());

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
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
    const finalChanges = { ...changes };
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

  // Comparator functions for sorting
  const getSortValue = useCallback((expense: Expense, column: SortableColumn): string | number | null => {
    switch (column.id) {
      case 'name':
        return expense.name;
      case 'category':
        return getCategoryName(expense.categoryId);
      case 'amount': {
        // Use display amount when displayFrequency is set for consistency
        if (displayFrequency) {
          return convertToFrequency(expense.amount, normalizeToFrequency(expense.frequency), displayFrequency);
        }
        return expense.amount;
      }
      case 'frequency':
        return expense.frequency;
      case 'nextDueDate':
        return expense.nextDueDate || null;
      case 'paidFromAccountId':
        return expense.paidFromAccountId ? (accountMap.get(expense.paidFromAccountId) || 'Unknown Account') : null;
      default:
        return null;
    }
  }, [categoryMap, accountMap, uncategorisedId, displayFrequency]);

  const compareValues = useCallback((a: any, b: any, type: SortType): number => {
    // Handle null/undefined values (put them at the end)
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;

    switch (type) {
      case 'numeric':
        return (a as number) - (b as number);
      case 'date': {
        const dateA = new Date(a as string).getTime();
        const dateB = new Date(b as string).getTime();
        return dateA - dateB;
      }
      case 'text':
      default:
        return (a as string).localeCompare(b as string, undefined, { numeric: true, sensitivity: 'base' });
    }
  }, []);

  const sortExpenses = useCallback((expenses: Expense[], columnId: string, direction: 'asc' | 'desc'): Expense[] => {
    const column = SORTABLE_COLUMNS.find(col => col.id === columnId);
    if (!column) return expenses;

    return [...expenses].sort((a, b) => {
      const valueA = getSortValue(a, column);
      const valueB = getSortValue(b, column);

      const comparison = compareValues(valueA, valueB, column.type);
      return direction === 'asc' ? comparison : -comparison;
    });
  }, [getSortValue, compareValues]);

  // Handle column sort
  const handleSort = useCallback((columnId: string) => {
    if (sortColumn === columnId) {
      // Same column - cycle through states
      if (sortDirection === 'desc') {
        // desc -> asc
        setSortDirection('asc');
      } else {
        // asc -> default (null)
        setSortColumn(null);
      }
    } else {
      // Different column - set to desc
      setSortColumn(columnId);
      setSortDirection('desc');
    }
  }, [sortColumn, sortDirection]);

  // Derive sorted expenses
  const sortedExpenses = useMemo(() => {
    if (!sortColumn) {
      return expenses;
    }
    return sortExpenses(expenses, sortColumn, sortDirection);
  }, [expenses, sortColumn, sortDirection, sortExpenses]);

  return (
    <Table variant="ds" className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead
            className={cn(
              'w-[20%] sortable',
              sortColumn === 'name' && (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc')
            )}
            aria-sort={sortColumn === 'name' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
          >
            <button
              type="button"
              className="data-table-sort-btn"
              onClick={() => handleSort('name')}
              aria-label={`Sort by Name${sortColumn === 'name' ? (sortDirection === 'asc' ? ' (ascending)' : ' (descending)') : ''}`}
            >
              Name
              <span
                className={cn(
                  'sort-icon',
                  sortColumn === 'name' && sortDirection === 'asc' && 'asc',
                  sortColumn === 'name' && sortDirection === 'desc' && 'desc'
                )}
              >
                {sortColumn === 'name' && sortDirection === 'desc' && <ArrowDown className="h-3 w-3" aria-hidden />}
                {sortColumn === 'name' && sortDirection === 'asc' && <ArrowUp className="h-3 w-3" aria-hidden />}
              </span>
            </button>
          </TableHead>
          <TableHead
            className={cn(
              'w-[15%] sortable',
              sortColumn === 'category' && (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc')
            )}
            aria-sort={sortColumn === 'category' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
          >
            <button
              type="button"
              className="data-table-sort-btn"
              onClick={() => handleSort('category')}
              aria-label={`Sort by Category${sortColumn === 'category' ? (sortDirection === 'asc' ? ' (ascending)' : ' (descending)') : ''}`}
            >
              Category
              <span
                className={cn(
                  'sort-icon',
                  sortColumn === 'category' && sortDirection === 'asc' && 'asc',
                  sortColumn === 'category' && sortDirection === 'desc' && 'desc'
                )}
              >
                {sortColumn === 'category' && sortDirection === 'desc' && <ArrowDown className="h-3 w-3" aria-hidden />}
                {sortColumn === 'category' && sortDirection === 'asc' && <ArrowUp className="h-3 w-3" aria-hidden />}
              </span>
            </button>
          </TableHead>
          <TableHead
            className={cn(
              'w-[12%] min-w-[6rem] text-right sortable',
              sortColumn === 'amount' && (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc')
            )}
            aria-sort={sortColumn === 'amount' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
          >
            <button
              type="button"
              className="data-table-sort-btn"
              onClick={() => handleSort('amount')}
              aria-label={`Sort by Amount${sortColumn === 'amount' ? (sortDirection === 'asc' ? ' (ascending)' : ' (descending)') : ''}`}
            >
              Amount
              <span
                className={cn(
                  'sort-icon',
                  sortColumn === 'amount' && sortDirection === 'asc' && 'asc',
                  sortColumn === 'amount' && sortDirection === 'desc' && 'desc'
                )}
              >
                {sortColumn === 'amount' && sortDirection === 'desc' && <ArrowDown className="h-3 w-3" aria-hidden />}
                {sortColumn === 'amount' && sortDirection === 'asc' && <ArrowUp className="h-3 w-3" aria-hidden />}
              </span>
            </button>
          </TableHead>
          <TableHead
            className={cn(
              'w-[12%] sortable',
              sortColumn === 'frequency' && (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc')
            )}
            aria-sort={sortColumn === 'frequency' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
          >
            <button
              type="button"
              className="data-table-sort-btn"
              onClick={() => handleSort('frequency')}
              aria-label={`Sort by Frequency${sortColumn === 'frequency' ? (sortDirection === 'asc' ? ' (ascending)' : ' (descending)') : ''}`}
            >
              Frequency
              <span
                className={cn(
                  'sort-icon',
                  sortColumn === 'frequency' && sortDirection === 'asc' && 'asc',
                  sortColumn === 'frequency' && sortDirection === 'desc' && 'desc'
                )}
              >
                {sortColumn === 'frequency' && sortDirection === 'desc' && <ArrowDown className="h-3 w-3" aria-hidden />}
                {sortColumn === 'frequency' && sortDirection === 'asc' && <ArrowUp className="h-3 w-3" aria-hidden />}
              </span>
            </button>
          </TableHead>
          <TableHead
            className={cn(
              'w-[15%] sortable',
              sortColumn === 'nextDueDate' && (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc')
            )}
            aria-sort={sortColumn === 'nextDueDate' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
          >
            <button
              type="button"
              className="data-table-sort-btn"
              onClick={() => handleSort('nextDueDate')}
              aria-label={`Sort by Next Due Date${sortColumn === 'nextDueDate' ? (sortDirection === 'asc' ? ' (ascending)' : ' (descending)') : ''}`}
            >
              Next Due Date
              <span
                className={cn(
                  'sort-icon',
                  sortColumn === 'nextDueDate' && sortDirection === 'asc' && 'asc',
                  sortColumn === 'nextDueDate' && sortDirection === 'desc' && 'desc'
                )}
              >
                {sortColumn === 'nextDueDate' && sortDirection === 'desc' && <ArrowDown className="h-3 w-3" aria-hidden />}
                {sortColumn === 'nextDueDate' && sortDirection === 'asc' && <ArrowUp className="h-3 w-3" aria-hidden />}
              </span>
            </button>
          </TableHead>
          <TableHead
            className={cn(
              'w-[15%] sortable',
              sortColumn === 'paidFromAccountId' && (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc')
            )}
            aria-sort={
              sortColumn === 'paidFromAccountId' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'
            }
          >
            <button
              type="button"
              className="data-table-sort-btn"
              onClick={() => handleSort('paidFromAccountId')}
              aria-label={`Sort by Paid From${sortColumn === 'paidFromAccountId' ? (sortDirection === 'asc' ? ' (ascending)' : ' (descending)') : ''}`}
            >
              Paid From
              <span
                className={cn(
                  'sort-icon',
                  sortColumn === 'paidFromAccountId' && sortDirection === 'asc' && 'asc',
                  sortColumn === 'paidFromAccountId' && sortDirection === 'desc' && 'desc'
                )}
              >
                {sortColumn === 'paidFromAccountId' && sortDirection === 'desc' && (
                  <ArrowDown className="h-3 w-3" aria-hidden />
                )}
                {sortColumn === 'paidFromAccountId' && sortDirection === 'asc' && (
                  <ArrowUp className="h-3 w-3" aria-hidden />
                )}
              </span>
            </button>
          </TableHead>
          <TableHead className="w-[10%] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="p-0">
              <div className="empty-state-table">
                <div className="empty-state-icon">
                  <LayoutGrid className="h-5 w-5 text-[var(--ink-3)]" strokeWidth={1.5} aria-hidden />
                </div>
                <div className="empty-state-title">No expenses yet.</div>
                <div className="empty-state-body">
                  Add your first expense to start tracking your spending.
                </div>
                <Button onClick={onCreate} size="sm" className="mx-auto flex">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Expense
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ) : (
            sortedExpenses.map((expense: Expense) => {
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
                <TableRow key={expense.id} className={cn(isRowEditing && 'selected')}>
                  {/* Name Cell */}
                  <TableCell
                    className={cn(
                      'cursor-pointer transition-colors',
                      isEditing(expense.id, 'name') && 'bg-primary/5 ring-2 ring-primary/30 ring-inset transition-all duration-150'
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
                          <p className="text-caption text-destructive flex items-center gap-1 truncate mt-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{getFieldError(expense.id, 'name')}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate font-medium text-[color:var(--ink)]">{currentName}</span>
                        {isSaving(expense.id, 'name') && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />}
                        {isSaved(expense.id, 'name') && <Check className="h-3 w-3 text-green-600 flex-shrink-0" />}
                      </div>
                    )}
                  </TableCell>

                  {/* Category Cell */}
                  <TableCell
                    className={cn(
                      'cursor-pointer transition-colors',
                      isEditing(expense.id, 'categoryId') && 'bg-primary/5 ring-2 ring-primary/30 ring-inset transition-all duration-150'
                    )}
                    onClick={(e) => handleCellClick(expense.id, 'categoryId', e)}
                  >
                    {isEditing(expense.id, 'categoryId') ? (
                      <div className="space-y-1 min-w-0">
                        <div className="w-full max-w-full min-w-0">
                          <CategoryInput
                            variant="compact"
                            value={currentCategoryId ?? uncategorisedId ?? ''}
                            onChange={(value) => {
                              const previousCategoryId = currentCategoryId;
                              const nextCategoryName = categoryMap.get(value) || '';
                              const isRepaymentCategory = getExpenseType(nextCategoryName) === 'repayments';
                              handleFieldChange(expense.id, 'categoryId', value);
                              onCategoryChanged?.(
                                expense,
                                value,
                                previousCategoryId,
                                isRepaymentCategory
                              );
                              // Close edit mode after selection
                              setTimeout(() => setEditingCell(null), 100);
                            }}
                            onCategoriesRefresh={() => {}}
                          />
                        </div>
                        {getFieldError(expense.id, 'categoryId') && (
                          <p className="text-caption text-destructive flex items-center gap-1 truncate mt-1">
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
                      'num cursor-pointer transition-colors',
                      isEditing(expense.id, 'amount') && 'bg-primary/5 ring-2 ring-primary/30 ring-inset transition-all duration-150'
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
                          <p className="text-caption text-destructive flex items-center gap-1 justify-end truncate mt-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{getFieldError(expense.id, 'amount')}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 justify-end min-w-0">
                        <span className="truncate">{formatCurrency(currentAmount, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                        {isSaving(expense.id, 'amount') && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />}
                        {isSaved(expense.id, 'amount') && <Check className="h-3 w-3 text-green-600 flex-shrink-0" />}
                      </div>
                    )}
                  </TableCell>

                  {/* Frequency Cell */}
                  <TableCell
                    className={cn(
                      'cursor-pointer transition-colors',
                      isEditing(expense.id, 'frequency') && 'bg-primary/5 ring-2 ring-primary/30 ring-inset transition-all duration-150'
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
                          <p className="text-caption text-destructive flex items-center gap-1 truncate mt-1">
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
                      'cursor-pointer transition-colors',
                      isEditing(expense.id, 'nextDueDate') && 'bg-primary/5 ring-2 ring-primary/30 ring-inset transition-all duration-150'
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
                          <p className="text-caption text-destructive flex items-center gap-1 truncate mt-1">
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
                      'cursor-pointer transition-colors',
                      isEditing(expense.id, 'paidFromAccountId') && 'bg-primary/5 ring-2 ring-primary/30 ring-inset transition-all duration-150'
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
                          <p className="text-caption text-destructive flex items-center gap-1 truncate mt-1">
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
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="table-row-actions">
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => onEdit(expense)}
                        aria-label={`Edit ${expense.name}`}
                      >
                        <Pencil className="h-3 w-3" strokeWidth={2} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="table-action-btn danger"
                        onClick={() => onDelete(expense)}
                        aria-label={`Delete ${expense.name}`}
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
    </Table>
  );
}
