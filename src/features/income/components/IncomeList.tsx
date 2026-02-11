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
import type { Income } from '@/types/domain';
import { useUpdateIncome } from '@/features/income/hooks/useIncome';
import { AccountSelect } from '@/components/shared/AccountSelect';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { incomeUpdateSchema } from '@/contracts/income';
import { cn } from '@/lib/utils';

interface IncomeListProps {
  incomes: Income[];
  accountMap?: Map<string, string>;
  onEdit: (income: Income) => void;
  onDelete: (income: Income) => void;
  onCreate: () => void;
}

const INCOME_SOURCES: Array<{ value: Income['source']; label: string }> = [
  { value: 'Salary', label: 'Salary' },
  { value: 'Freelance', label: 'Freelance' },
  { value: 'Business', label: 'Business' },
  { value: 'Investments', label: 'Investments' },
  { value: 'Rental', label: 'Rental' },
  { value: 'Other', label: 'Other' },
] as const;

const INCOME_FREQUENCIES: Array<{ value: Income['frequency']; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

type EditingCell = { incomeId: string; field: string } | null;

/**
 * Income list component with inline editing
 * Displays income sources in a table format with editable cells
 */
export function IncomeList({ incomes, accountMap, onEdit, onDelete, onCreate }: IncomeListProps) {
  const updateIncomeMutation = useUpdateIncome();
  
  // Editing state
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<Income>>>(new Map());
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Map<string, string>>(new Map());
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set());
  
  // Store original income data for revert
  const originalIncomesRef = useRef<Map<string, Income>>(new Map());

  /**
   * Ref holds the latest pending changes for the debounced save.
   * Updated synchronously in handleFieldChange so the debounced callback
   * reads fresh data instead of a stale closure over pendingChanges state.
   */
  const pendingChangesRef = useRef<Map<string, Partial<Income>>>(new Map());
  
  // Refs for focus management
  const cellRefs = useRef<Map<string, HTMLInputElement | HTMLButtonElement>>(new Map());
  
  // Initialize original incomes
  useEffect(() => {
    incomes.forEach(income => {
      originalIncomesRef.current.set(income.id, { ...income });
    });
  }, [incomes]);

  // Validate fields for an income (handles cross-field validation)
  const validateIncomeFields = useCallback((incomeId: string, changes: Partial<Income>, _income: Income): Map<string, string> => {
    const errors = new Map<string, string>();
    
    try {
      // Validate using the update schema (it will validate only provided fields)
      incomeUpdateSchema.parse(changes);
      return errors;
    } catch (error: any) {
      // Extract errors for each field
      if (error.errors && Array.isArray(error.errors)) {
        error.errors.forEach((err: any) => {
          const fieldPath = err.path?.[0];
          if (fieldPath) {
            errors.set(`${incomeId}-${fieldPath}`, err.message || 'Invalid value');
          }
        });
      }
      return errors;
    }
  }, []);

  // Save income changes (reads from ref so debounced callback sees latest data)
  const saveIncome = useCallback(async (incomeId: string) => {
    const changes = pendingChangesRef.current.get(incomeId);
    if (!changes || Object.keys(changes).length === 0) return;

    const income = incomes.find(i => i.id === incomeId);
    if (!income) return;

    // Validate all changed fields
    const validationErrors = validateIncomeFields(incomeId, changes, income);

    if (validationErrors.size > 0) {
      setFieldErrors(prev => {
        const next = new Map(prev);
        validationErrors.forEach((error, key) => next.set(key, error));
        return next;
      });
      return;
    }

    // Mark fields as saving
    const fieldKeys = Object.keys(changes).map(field => `${incomeId}-${field}`);
    setSavingFields(prev => {
      const next = new Set(prev);
      fieldKeys.forEach(key => next.add(key));
      return next;
    });

    try {
      await updateIncomeMutation.mutateAsync({ id: incomeId, data: changes });
      
      // Clear pending changes and errors (state + ref)
      pendingChangesRef.current.delete(incomeId);
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.delete(incomeId);
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
  }, [incomes, updateIncomeMutation, validateIncomeFields]);

  // Debounced save function (300ms for text fields)
  const debouncedSave = useDebouncedCallback(saveIncome, 300);

  const DISCRETE_FIELDS = ['source', 'frequency', 'nextPaymentDate', 'paidToAccountId'];

  // Handle field change
  const handleFieldChange = useCallback((incomeId: string, field: string, value: any) => {
    // Clear error for this field
    setFieldErrors(prev => {
      const next = new Map(prev);
      next.delete(`${incomeId}-${field}`);
      return next;
    });

    // Update ref synchronously so debounced save sees the latest data
    const incomeChanges = pendingChangesRef.current.get(incomeId) || {};
    const merged = { ...incomeChanges, [field]: value };
    pendingChangesRef.current = new Map(pendingChangesRef.current);
    pendingChangesRef.current.set(incomeId, merged);

    // Update pending changes (state, for render)
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(incomeId, merged);
      return next;
    });

    if (DISCRETE_FIELDS.includes(field)) {
      saveIncome(incomeId);
    } else {
      debouncedSave(incomeId);
    }
  }, [debouncedSave, saveIncome]);

  // Handle cell click to enter edit mode
  const handleCellClick = useCallback((incomeId: string, field: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCell({ incomeId, field });
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((
    incomeId: string,
    field: string,
    e: React.KeyboardEvent,
    direction: 'next' | 'prev' = 'next'
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Save and move to next field (use ref for latest pending changes)
      const fieldKeys = Object.keys(pendingChangesRef.current.get(incomeId) || {});
      if (fieldKeys.length > 0) {
        saveIncome(incomeId);
      }
      focusNextCell(incomeId, field, 'next');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // Cancel editing and revert changes
      setEditingCell(null);
      pendingChangesRef.current.delete(incomeId);
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.delete(incomeId);
        return next;
      });
      setFieldErrors(prev => {
        const next = new Map(prev);
        next.delete(`${incomeId}-${field}`);
        return next;
      });
    } else if (e.key === 'Tab') {
      // Don't prevent default, but save before moving
      if (!e.shiftKey && direction === 'next') {
        const fieldKeys = Object.keys(pendingChangesRef.current.get(incomeId) || {});
        if (fieldKeys.length > 0) {
          saveIncome(incomeId);
        }
      }
    }
  }, [saveIncome]);

  // Focus next/previous cell
  const focusNextCell = useCallback((currentIncomeId: string, currentField: string, direction: 'next' | 'prev' = 'next') => {
    const fields = ['name', 'source', 'amount', 'frequency', 'nextPaymentDate', 'paidToAccountId'];
    const currentIndex = fields.indexOf(currentField);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (nextIndex >= 0 && nextIndex < fields.length) {
      // Move to next field in same row
      const nextField = fields[nextIndex];
      if (nextField === undefined) return;
      const nextKey = `${currentIncomeId}-${nextField}`;
      const nextRef = cellRefs.current.get(nextKey);
      if (nextRef && 'focus' in nextRef) {
        nextRef.focus();
        setEditingCell({ incomeId: currentIncomeId, field: nextField });
      }
    } else if (direction === 'next' && nextIndex >= fields.length) {
      // Move to next row, first field
      const currentRowIndex = incomes.findIndex(i => i.id === currentIncomeId);
      if (currentRowIndex < incomes.length - 1) {
        const nextIncome = incomes[currentRowIndex + 1];
        if (!nextIncome) return;
        const nextIncomeId = nextIncome.id;
        const nextKey = `${nextIncomeId}-name`;
        const nextRef = cellRefs.current.get(nextKey);
        if (nextRef && 'focus' in nextRef) {
          nextRef.focus();
          setEditingCell({ incomeId: nextIncomeId, field: 'name' });
        }
      }
    } else if (direction === 'prev' && nextIndex < 0) {
      // Move to previous row, last field
      const currentRowIndex = incomes.findIndex(i => i.id === currentIncomeId);
      if (currentRowIndex > 0) {
        const prevIncome = incomes[currentRowIndex - 1];
        if (!prevIncome) return;
        const prevIncomeId = prevIncome.id;
        const lastField = fields[fields.length - 1];
        if (lastField === undefined) return;
        const prevKey = `${prevIncomeId}-${lastField}`;
        const prevRef = cellRefs.current.get(prevKey);
        if (prevRef && 'focus' in prevRef) {
          prevRef.focus();
          setEditingCell({ incomeId: prevIncomeId, field: lastField });
        }
      }
    }
  }, [incomes]);

  // Get cell value (from pending changes or original)
  const getCellValue = useCallback((income: Income, field: string): any => {
    const changes = pendingChanges.get(income.id);
    if (changes && field in changes) {
      return changes[field as keyof Income];
    }
    return income[field as keyof Income];
  }, [pendingChanges]);

  // Check if cell is being edited
  const isEditing = useCallback((incomeId: string, field: string): boolean => {
    return editingCell?.incomeId === incomeId && editingCell?.field === field;
  }, [editingCell]);

  // Check if field is saving
  const isSaving = useCallback((incomeId: string, field: string): boolean => {
    return savingFields.has(`${incomeId}-${field}`);
  }, [savingFields]);

  // Check if field was just saved
  const isSaved = useCallback((incomeId: string, field: string): boolean => {
    return savedFields.has(`${incomeId}-${field}`);
  }, [savedFields]);

  // Get field error
  const getFieldError = useCallback((incomeId: string, field: string): string | undefined => {
    return fieldErrors.get(`${incomeId}-${field}`);
  }, [fieldErrors]);

  return (
    <div className="rounded-md border border-border">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[20%]">Name</TableHead>
            <TableHead className="w-[15%]">Source</TableHead>
            <TableHead className="w-[12%] text-right">Amount</TableHead>
            <TableHead className="w-[12%]">Frequency</TableHead>
            <TableHead className="w-[15%]">Next Payment</TableHead>
            <TableHead className="w-[15%]">Paid To</TableHead>
            <TableHead className="w-[10%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incomes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-muted-foreground">
                    No income sources found. Add your first income source to track your earnings.
                  </div>
                  <Button
                    onClick={onCreate}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Income Source
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            incomes.map((income) => {
              const isRowEditing = editingCell?.incomeId === income.id;
              
              // Get current values (from pending changes or original)
              const currentName = getCellValue(income, 'name') as string;
              const currentSource = getCellValue(income, 'source') as Income['source'];
              const currentAmount = getCellValue(income, 'amount') as number;
              const currentFrequency = getCellValue(income, 'frequency') as Income['frequency'];
              const currentNextPaymentDate = getCellValue(income, 'nextPaymentDate') as string | null | undefined;
              const currentPaidToAccountId = getCellValue(income, 'paidToAccountId') as string | undefined;

              return (
                <TableRow
                  key={income.id}
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
                      isEditing(income.id, 'name') && "bg-primary/5 ring-2 ring-primary/30 transition-all duration-150"
                    )}
                    onClick={(e) => handleCellClick(income.id, 'name', e)}
                  >
                    {isEditing(income.id, 'name') ? (
                      <div className="space-y-1 min-w-0">
                        <Input
                          ref={(el) => {
                            if (el) cellRefs.current.set(`${income.id}-name`, el);
                          }}
                          value={currentName}
                          onChange={(e) => handleFieldChange(income.id, 'name', e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => handleKeyDown(income.id, 'name', e)}
                          className={cn(
                            "h-8 w-full max-w-full min-w-0",
                            getFieldError(income.id, 'name') && "border-destructive"
                          )}
                          aria-invalid={!!getFieldError(income.id, 'name')}
                          autoFocus
                        />
                        {getFieldError(income.id, 'name') && (
                          <p className="text-xs text-destructive flex items-center gap-1 truncate mt-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{getFieldError(income.id, 'name')}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{currentName}</span>
                        {isSaving(income.id, 'name') && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />}
                        {isSaved(income.id, 'name') && <Check className="h-3 w-3 text-green-600 flex-shrink-0" />}
                      </div>
                    )}
                  </TableCell>

                  {/* Source Cell */}
                  <TableCell
                    className={cn(
                      "px-3 py-2 cursor-pointer transition-colors",
                      "hover:bg-muted/30",
                      isEditing(income.id, 'source') && "bg-primary/5 ring-2 ring-primary/30 transition-all duration-150"
                    )}
                    onClick={(e) => handleCellClick(income.id, 'source', e)}
                  >
                    {isEditing(income.id, 'source') ? (
                      <div className="space-y-1 min-w-0">
                        <div className="w-full max-w-full min-w-0">
                          <Select
                            value={currentSource ?? ''}
                            onValueChange={(value) => {
                              handleFieldChange(income.id, 'source', value as Income['source']);
                              // Close edit mode after selection
                              setTimeout(() => setEditingCell(null), 100);
                            }}
                          >
                            <SelectTrigger className="h-8 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {INCOME_SOURCES.map((source) => (
                                <SelectItem key={source.value} value={source.value}>
                                  {source.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {getFieldError(income.id, 'source') && (
                          <p className="text-xs text-destructive flex items-center gap-1 truncate mt-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{getFieldError(income.id, 'source')}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{currentSource}</span>
                        {isSaving(income.id, 'source') && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />}
                        {isSaved(income.id, 'source') && <Check className="h-3 w-3 text-green-600 flex-shrink-0" />}
                      </div>
                    )}
                  </TableCell>

                  {/* Amount Cell */}
                  <TableCell
                    className={cn(
                      "text-right px-3 py-2 cursor-pointer transition-colors",
                      "hover:bg-muted/30",
                      isEditing(income.id, 'amount') && "bg-primary/5 ring-2 ring-primary/30 transition-all duration-150"
                    )}
                    onClick={(e) => handleCellClick(income.id, 'amount', e)}
                  >
                    {isEditing(income.id, 'amount') ? (
                      <div className="space-y-1 min-w-0">
                        <Input
                          ref={(el) => {
                            if (el) cellRefs.current.set(`${income.id}-amount`, el);
                          }}
                          type="number"
                          step="0.01"
                          value={currentAmount}
                          onChange={(e) => handleFieldChange(income.id, 'amount', parseFloat(e.target.value) || 0)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => handleKeyDown(income.id, 'amount', e)}
                          className={cn(
                            "h-8 w-full max-w-full min-w-0 text-right",
                            getFieldError(income.id, 'amount') && "border-destructive"
                          )}
                          aria-invalid={!!getFieldError(income.id, 'amount')}
                          autoFocus
                        />
                        {getFieldError(income.id, 'amount') && (
                          <p className="text-xs text-destructive flex items-center gap-1 justify-end truncate mt-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{getFieldError(income.id, 'amount')}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 justify-end min-w-0">
                        <span className="truncate">{formatCurrency(currentAmount)}</span>
                        {isSaving(income.id, 'amount') && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />}
                        {isSaved(income.id, 'amount') && <Check className="h-3 w-3 text-green-600 flex-shrink-0" />}
                      </div>
                    )}
                  </TableCell>

                  {/* Frequency Cell */}
                  <TableCell
                    className={cn(
                      "px-3 py-2 cursor-pointer transition-colors",
                      "hover:bg-muted/30",
                      isEditing(income.id, 'frequency') && "bg-primary/5 ring-2 ring-primary/30 transition-all duration-150"
                    )}
                    onClick={(e) => handleCellClick(income.id, 'frequency', e)}
                  >
                    {isEditing(income.id, 'frequency') ? (
                      <div className="space-y-1 min-w-0">
                        <div className="w-full max-w-full min-w-0">
                          <Select
                            value={currentFrequency ?? ''}
                            onValueChange={(value) => {
                              handleFieldChange(income.id, 'frequency', value as Income['frequency']);
                              // Close edit mode after selection
                              setTimeout(() => setEditingCell(null), 100);
                            }}
                          >
                            <SelectTrigger className="h-8 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {INCOME_FREQUENCIES.map((freq) => (
                                <SelectItem key={freq.value} value={freq.value}>
                                  {freq.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {getFieldError(income.id, 'frequency') && (
                          <p className="text-xs text-destructive flex items-center gap-1 truncate mt-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{getFieldError(income.id, 'frequency')}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="capitalize truncate">{currentFrequency}</span>
                        {isSaving(income.id, 'frequency') && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />}
                        {isSaved(income.id, 'frequency') && <Check className="h-3 w-3 text-green-600 flex-shrink-0" />}
                      </div>
                    )}
                  </TableCell>

                  {/* Next Payment Date Cell */}
                  <TableCell
                    className={cn(
                      "px-3 py-2 cursor-pointer transition-colors",
                      "hover:bg-muted/30",
                      isEditing(income.id, 'nextPaymentDate') && "bg-primary/5 ring-2 ring-primary/30 transition-all duration-150"
                    )}
                    onClick={(e) => handleCellClick(income.id, 'nextPaymentDate', e)}
                  >
                    {isEditing(income.id, 'nextPaymentDate') ? (
                      <div className="space-y-1 min-w-0">
                        <div className="w-full max-w-full min-w-0">
                          <DatePicker
                            value={currentNextPaymentDate || undefined}
                            onChange={(e) => {
                              const value = e.target.value || null;
                              handleFieldChange(income.id, 'nextPaymentDate', value);
                              // Close edit mode after selection
                              setTimeout(() => setEditingCell(null), 100);
                            }}
                            allowClear
                            shouldShowCalendarButton
                            className="w-full"
                          />
                        </div>
                        {getFieldError(income.id, 'nextPaymentDate') && (
                          <p className="text-xs text-destructive flex items-center gap-1 truncate mt-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{getFieldError(income.id, 'nextPaymentDate')}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{currentNextPaymentDate ? format(new Date(currentNextPaymentDate), 'MMM d, yyyy') : '-'}</span>
                        {isSaving(income.id, 'nextPaymentDate') && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />}
                        {isSaved(income.id, 'nextPaymentDate') && <Check className="h-3 w-3 text-green-600 flex-shrink-0" />}
                      </div>
                    )}
                  </TableCell>

                  {/* Paid To Cell */}
                  <TableCell
                    className={cn(
                      "px-3 py-2 cursor-pointer transition-colors",
                      "hover:bg-muted/30",
                      isEditing(income.id, 'paidToAccountId') && "bg-primary/5 ring-2 ring-primary/30 transition-all duration-150"
                    )}
                    onClick={(e) => handleCellClick(income.id, 'paidToAccountId', e)}
                  >
                    {isEditing(income.id, 'paidToAccountId') ? (
                      <div className="space-y-1 min-w-0">
                        <div className="w-full max-w-full min-w-0">
                          <AccountSelect
                            value={currentPaidToAccountId ?? ''}
                            onChange={(value) => {
                              handleFieldChange(income.id, 'paidToAccountId', value || undefined);
                              // Close edit mode after selection
                              setTimeout(() => setEditingCell(null), 100);
                            }}
                            context="income"
                          />
                        </div>
                        {getFieldError(income.id, 'paidToAccountId') && (
                          <p className="text-xs text-destructive flex items-center gap-1 truncate mt-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{getFieldError(income.id, 'paidToAccountId')}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{currentPaidToAccountId ? (accountMap?.get(currentPaidToAccountId) || 'Unknown Account') : '-'}</span>
                        {isSaving(income.id, 'paidToAccountId') && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />}
                        {isSaved(income.id, 'paidToAccountId') && <Check className="h-3 w-3 text-green-600 flex-shrink-0" />}
                      </div>
                    )}
                  </TableCell>

                  {/* Actions Cell */}
                  <TableCell className="text-right px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(income)}
                        aria-label={`Edit ${income.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(income)}
                        aria-label={`Delete ${income.name}`}
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
