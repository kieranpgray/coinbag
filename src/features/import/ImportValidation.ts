import type {
  ParsedImportData,
  ValidationResult,
  RowError,
  RowWarning,
  DuplicateMatch,
  ValidationSummary,
  EntityType,
} from './types';
import {
  normalizeFrequency,
  normalizeAssetType,
  normalizeLiabilityType,
  normalizeIncomeSource,
} from './utils';
import type { FieldError } from './types';
import {
  accountCreateSchema,
} from '@/contracts/accounts';
import {
  assetCreateSchema,
} from '@/contracts/assets';
import {
  liabilityCreateSchema,
} from '@/contracts/liabilities';
import {
  expenseCreateSchema,
} from '@/contracts/expenses';
import {
  incomeCreateSchema,
} from '@/contracts/income';
import type { Account, Asset, Liability, Expense, Income } from '@/types/domain';

/**
 * Check if a value is an Excel error value
 */
function isExcelError(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  const str = value.trim();
  return /^#[A-Z]+!?$/.test(str) || str.startsWith('#');
}

/**
 * Check for Excel error values in row data and add to errors
 */
function checkExcelErrors(
  row: ParsedImportData['accounts'][0] | ParsedImportData['assets'][0] | ParsedImportData['liabilities'][0] | ParsedImportData['expenses'][0] | ParsedImportData['income'][0],
  _entityType: EntityType
): FieldError[] {
  const errors: FieldError[] = [];
  
  Object.entries(row.data).forEach(([field, value]) => {
    if (isExcelError(value)) {
      errors.push({
        field,
        message: `Excel formula error detected: "${value}". Please fix the formula in this cell.`,
        value,
      });
    }
  });
  
  return errors;
}

/**
 * Validation engine for import data
 */
export class ImportValidation {
  private existingAccounts: Account[] = [];
  private existingAssets: Asset[] = [];
  private existingLiabilities: Liability[] = [];
  private existingExpenses: Expense[] = [];
  private existingIncome: Income[] = [];

  /**
   * Set existing data for duplicate detection
   */
  setExistingData(data: {
    accounts?: Account[];
    assets?: Asset[];
    liabilities?: Liability[];
    expenses?: Expense[];
    income?: Income[];
  }) {
    this.existingAccounts = data.accounts || [];
    this.existingAssets = data.assets || [];
    this.existingLiabilities = data.liabilities || [];
    this.existingExpenses = data.expenses || [];
    this.existingIncome = data.income || [];
  }

  /**
   * Validate all import data
   */
  validate(data: ParsedImportData): ValidationResult {
    const errors: RowError[] = [];
    const warnings: RowWarning[] = [];
    const duplicates: DuplicateMatch[] = [];

    // Validate accounts
    const accountResults = this.validateAccounts(data.accounts);
    errors.push(...accountResults.errors);
    warnings.push(...accountResults.warnings);
    duplicates.push(...accountResults.duplicates);

    // Validate assets
    const assetResults = this.validateAssets(data.assets);
    errors.push(...assetResults.errors);
    warnings.push(...assetResults.warnings);
    duplicates.push(...assetResults.duplicates);

    // Validate liabilities
    const liabilityResults = this.validateLiabilities(data.liabilities);
    errors.push(...liabilityResults.errors);
    warnings.push(...liabilityResults.warnings);
    duplicates.push(...liabilityResults.duplicates);

    // Validate expenses (merging legacy subscriptions)
    const expenseResults = this.validateExpenses([...data.expenses, ...data.subscriptions]);
    errors.push(...expenseResults.errors);
    warnings.push(...expenseResults.warnings);
    duplicates.push(...expenseResults.duplicates);

    // Validate income
    const incomeResults = this.validateIncome(data.income);
    errors.push(...incomeResults.errors);
    warnings.push(...incomeResults.warnings);
    duplicates.push(...incomeResults.duplicates);

    // Calculate summary
    const totalRows =
      data.accounts.length +
      data.assets.length +
      data.liabilities.length +
      data.expenses.length +
      data.subscriptions.length +
      data.income.length;

    const errorRowNumbers = new Set(errors.map((e) => e.rowNumber));
    const duplicateRowNumbers = new Set(duplicates.map((d) => d.rowNumber));
    const warningRowNumbers = new Set(warnings.map((w) => w.rowNumber));

    const summary: ValidationSummary = {
      totalRows,
      validRows: totalRows - errorRowNumbers.size - duplicateRowNumbers.size,
      errorRows: errorRowNumbers.size,
      duplicateRows: duplicateRowNumbers.size,
      warningRows: warningRowNumbers.size,
    };

    return {
      isValid: errors.length === 0 && duplicates.length === 0,
      errors,
      warnings,
      duplicates,
      summary,
    };
  }

  /**
   * Validate accounts
   */
  private validateAccounts(
    rows: ParsedImportData['accounts']
  ): {
    errors: RowError[];
    warnings: RowWarning[];
    duplicates: DuplicateMatch[];
  } {
    const errors: RowError[] = [];
    const warnings: RowWarning[] = [];
    const duplicates: DuplicateMatch[] = [];

    rows.forEach((row) => {
      // Check for Excel error values first
      const excelErrors = checkExcelErrors(row, 'account');
      if (excelErrors.length > 0) {
        errors.push({
          rowNumber: row.rowNumber,
          entityType: 'account',
          fields: excelErrors,
          rawData: row.data,
        });
        return;
      }

      // Schema validation
      const validation = accountCreateSchema.safeParse(row.data);
      if (!validation.success) {
        errors.push({
          rowNumber: row.rowNumber,
          entityType: 'account',
          fields: validation.error.errors.map((err) => {
            let message = err.message;
            // Enhance error messages with suggestions
            // Type guard for ZodIssue input property (may not exist in all Zod versions)
            const errInput = 'input' in err ? (err as { input?: unknown }).input : undefined;
            if (err.path[0] === 'accountType' && typeof errInput === 'string') {
              message = `${err.message}. Valid values: Bank Account, Savings, Credit Card, Investment, Other`;
            }
            return {
              field: err.path.join('.'),
              message,
              value: errInput !== undefined ? String(errInput) : String(err.path?.[0] || 'unknown'),
            };
          }),
          rawData: row.data,
        });
        return;
      }

      // Duplicate detection
      const duplicate = this.findDuplicateAccount(validation.data);
      if (duplicate) {
        const institutionText = validation.data.institution ? ` at "${validation.data.institution}"` : '';
        duplicates.push({
          rowNumber: row.rowNumber,
          entityType: 'account',
          existingId: duplicate.id,
          matchReason: `Account "${validation.data.accountName}"${institutionText} already exists`,
          rawData: row.data,
        });
      }
    });

    return { errors, warnings, duplicates };
  }

  /**
   * Validate assets
   */
  private validateAssets(
    rows: ParsedImportData['assets']
  ): {
    errors: RowError[];
    warnings: RowWarning[];
    duplicates: DuplicateMatch[];
  } {
    const errors: RowError[] = [];
    const warnings: RowWarning[] = [];
    const duplicates: DuplicateMatch[] = [];

    rows.forEach((row) => {
      // Check for Excel error values first
      const excelErrors = checkExcelErrors(row, 'asset');
      if (excelErrors.length > 0) {
        errors.push({
          rowNumber: row.rowNumber,
          entityType: 'asset',
          fields: excelErrors,
          rawData: row.data,
        });
        return;
      }

      // Schema validation
      const validation = assetCreateSchema.safeParse(row.data);
      if (!validation.success) {
        errors.push({
          rowNumber: row.rowNumber,
          entityType: 'asset',
          fields: validation.error.errors.map((err) => {
            let message = err.message;
            // Enhance error messages with suggestions for type field
            // Type guard for ZodIssue input property (may not exist in all Zod versions)
            const errInput = 'input' in err ? (err as { input?: unknown }).input : undefined;
            if (err.path[0] === 'type' && typeof errInput === 'string') {
              const normalized = normalizeAssetType(errInput);
              if (normalized) {
                message = `Invalid asset type "${errInput}". Did you mean "${normalized}"? Valid values: Real Estate, Investments, Vehicles, Crypto, Cash, Superannuation, Other`;
              } else {
                message = `${err.message}. Valid values: Real Estate, Investments, Vehicles, Crypto, Cash, Superannuation, Other`;
              }
            }
            return {
              field: err.path.join('.'),
              message,
              value: errInput !== undefined ? String(errInput) : String(err.path?.[0] || 'unknown'),
            };
          }),
          rawData: row.data,
        });
        return;
      }

      // Duplicate detection
      const duplicate = this.findDuplicateAsset(validation.data);
      if (duplicate) {
        duplicates.push({
          rowNumber: row.rowNumber,
          entityType: 'asset',
          existingId: duplicate.id,
          matchReason: `Asset "${validation.data.name}" of type "${validation.data.type}" already exists`,
          rawData: row.data,
        });
      }
    });

    return { errors, warnings, duplicates };
  }

  /**
   * Validate liabilities
   */
  private validateLiabilities(
    rows: ParsedImportData['liabilities']
  ): {
    errors: RowError[];
    warnings: RowWarning[];
    duplicates: DuplicateMatch[];
  } {
    const errors: RowError[] = [];
    const warnings: RowWarning[] = [];
    const duplicates: DuplicateMatch[] = [];

    rows.forEach((row) => {
      // Check for Excel error values first
      const excelErrors = checkExcelErrors(row, 'liability');
      if (excelErrors.length > 0) {
        errors.push({
          rowNumber: row.rowNumber,
          entityType: 'liability',
          fields: excelErrors,
          rawData: row.data,
        });
        return;
      }

      // Schema validation
      const validation = liabilityCreateSchema.safeParse(row.data);
      if (!validation.success) {
        errors.push({
          rowNumber: row.rowNumber,
          entityType: 'liability',
          fields: validation.error.errors.map((err) => {
            let message = err.message;
            // Enhance error messages with suggestions for type field
            // Type guard for ZodIssue input property (may not exist in all Zod versions)
            const errInput = 'input' in err ? (err as { input?: unknown }).input : undefined;
            if (err.path[0] === 'type' && typeof errInput === 'string') {
              const normalized = normalizeLiabilityType(errInput);
              if (normalized) {
                message = `Invalid liability type "${errInput}". Did you mean "${normalized}"? Valid values: Loans, Credit Cards, Other`;
              } else {
                message = `${err.message}. Valid values: Loans, Credit Cards, Other`;
              }
            }
            return {
              field: err.path.join('.'),
              message,
              value: errInput !== undefined ? String(errInput) : String(err.path?.[0] || 'unknown'),
            };
          }),
          rawData: row.data,
        });
        return;
      }

      // Duplicate detection
      const duplicate = this.findDuplicateLiability(validation.data);
      if (duplicate) {
        duplicates.push({
          rowNumber: row.rowNumber,
          entityType: 'liability',
          existingId: duplicate.id,
          matchReason: `Liability "${validation.data.name}"${validation.data.institution ? ` at "${validation.data.institution}"` : ''} already exists`,
          rawData: row.data,
        });
      }
    });

    return { errors, warnings, duplicates };
  }

  /**
   * Validate expenses
   */
  private validateExpenses(
    rows: ParsedImportData['expenses']
  ): {
    errors: RowError[];
    warnings: RowWarning[];
    duplicates: DuplicateMatch[];
  } {
    const errors: RowError[] = [];
    const warnings: RowWarning[] = [];
    const duplicates: DuplicateMatch[] = [];

    rows.forEach((row) => {
      // Check for Excel error values first
      const excelErrors = checkExcelErrors(row, 'expense');
      if (excelErrors.length > 0) {
        errors.push({
          rowNumber: row.rowNumber,
          entityType: 'expense',
          fields: excelErrors,
          rawData: row.data,
        });
        return;
      }

      // Note: categoryName will be resolved later, so we skip categoryId validation here
      // We'll validate the rest of the fields
      const { categoryName, ...restData } = row.data as { categoryName?: string; [key: string]: unknown };
      
      // Create a temporary validation object without categoryId
      // Use a valid UUID format for validation (categoryId will be resolved during import)
      const validation = expenseCreateSchema.safeParse({
        ...restData,
        categoryId: 'ffffffff-ffff-ffff-ffff-ffffffffffff', // Valid UUID format placeholder
      });

      if (!validation.success) {
        // Filter out categoryId errors since we handle that separately
        const relevantErrors = validation.error.errors.filter(
          (err) => err.path[0] !== 'categoryId'
        );

        if (relevantErrors.length > 0) {
          errors.push({
            rowNumber: row.rowNumber,
            entityType: 'expense',
            fields: relevantErrors.map((err) => {
              let message = err.message;
              // Enhance error messages with suggestions for frequency field
              // Type guard for ZodIssue input property (may not exist in all Zod versions)
              const errInput = 'input' in err ? (err as { input?: unknown }).input : undefined;
              if (err.path[0] === 'frequency' && typeof errInput === 'string') {
                const normalized = normalizeFrequency(errInput);
                if (normalized) {
                  message = `Invalid frequency "${errInput}". Did you mean "${normalized}"? Valid values: weekly, fortnightly, monthly, quarterly, yearly`;
                } else {
                  message = `${err.message}. Valid values: weekly, fortnightly, monthly, quarterly, yearly`;
                }
              }
              return {
                field: err.path.join('.'),
                message,
                value: errInput !== undefined ? String(errInput) : String(err.path?.[0] || 'unknown'),
              };
            }),
            rawData: row.data,
          });
        }

        // Check if categoryName is missing
        if (!categoryName || categoryName.trim() === '') {
          errors.push({
            rowNumber: row.rowNumber,
            entityType: 'expense',
            fields: [
              {
                field: 'categoryName',
                message: 'Category name is required',
              },
            ],
            rawData: row.data,
          });
        }
        return;
      }

      // Duplicate detection - use data without categoryId for matching
      const duplicate = this.findDuplicateExpense({
        name: validation.data.name,
        amount: validation.data.amount,
        frequency: validation.data.frequency,
        chargeDate: validation.data.chargeDate,
        nextDueDate: validation.data.nextDueDate,
        categoryId: 'placeholder', // Not used for duplicate detection
        paidFromAccountId: validation.data.paidFromAccountId,
      });
      if (duplicate) {
        duplicates.push({
          rowNumber: row.rowNumber,
          entityType: 'expense',
          existingId: duplicate.id,
          matchReason: `Expense "${validation.data.name}" with amount ${validation.data.amount} and frequency ${validation.data.frequency} already exists`,
          rawData: row.data,
        });
      }
    });

    return { errors, warnings, duplicates };
  }

  /**
   * Validate income
   */
  private validateIncome(
    rows: ParsedImportData['income']
  ): {
    errors: RowError[];
    warnings: RowWarning[];
    duplicates: DuplicateMatch[];
  } {
    const errors: RowError[] = [];
    const warnings: RowWarning[] = [];
    const duplicates: DuplicateMatch[] = [];

    rows.forEach((row) => {
      // Check for Excel error values first
      const excelErrors = checkExcelErrors(row, 'income');
      if (excelErrors.length > 0) {
        errors.push({
          rowNumber: row.rowNumber,
          entityType: 'income',
          fields: excelErrors,
          rawData: row.data,
        });
        return;
      }

      // Schema validation
      const validation = incomeCreateSchema.safeParse(row.data);
      if (!validation.success) {
        errors.push({
          rowNumber: row.rowNumber,
          entityType: 'income',
          fields: validation.error.errors.map((err) => {
            let message = err.message;
            // Enhance error messages with suggestions
            // Type guard for ZodIssue input property (may not exist in all Zod versions)
            const errInput = 'input' in err ? (err as { input?: unknown }).input : undefined;
            if (err.path[0] === 'frequency' && typeof errInput === 'string') {
              const normalized = normalizeFrequency(errInput);
              if (normalized) {
                message = `Invalid frequency "${errInput}". Did you mean "${normalized}"? Valid values: weekly, fortnightly, monthly, quarterly, yearly`;
              } else {
                message = `${err.message}. Valid values: weekly, fortnightly, monthly, yearly`;
              }
            } else if (err.path[0] === 'source' && typeof errInput === 'string') {
              const normalized = normalizeIncomeSource(errInput);
              if (normalized) {
                message = `Invalid income source "${errInput}". Did you mean "${normalized}"? Valid values: Salary, Freelance, Business, Investments, Rental, Other`;
              } else {
                message = `${err.message}. Valid values: Salary, Freelance, Business, Investments, Rental, Other`;
              }
            }
            return {
              field: err.path.join('.'),
              message,
              value: errInput !== undefined ? String(errInput) : String(err.path?.[0] || 'unknown'),
            };
          }),
          rawData: row.data,
        });
        return;
      }

      // Duplicate detection
      const duplicate = this.findDuplicateIncome(validation.data);
      if (duplicate) {
        duplicates.push({
          rowNumber: row.rowNumber,
          entityType: 'income',
          existingId: duplicate.id,
          matchReason: `Income "${validation.data.name}" from source "${validation.data.source}" with amount ${validation.data.amount} already exists`,
          rawData: row.data,
        });
      }
    });

    return { errors, warnings, duplicates };
  }

  /**
   * Normalize string for comparison (lowercase, trim, normalize whitespace)
   * Handles edge cases like multiple spaces, tabs, newlines, etc.
   * Handles undefined/null values by converting them to empty string for comparison
   */
  private normalizeForComparison(str: string | undefined | null): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Replace all whitespace (spaces, tabs, newlines) with single space
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens and underscores
      .trim();
  }

  /**
   * Find duplicate account
   */
  private findDuplicateAccount(
    account: ReturnType<typeof accountCreateSchema.parse>
  ): Account | undefined {
    const normalizedInstitution = this.normalizeForComparison(account.institution);
    const normalizedAccountName = this.normalizeForComparison(account.accountName);

    return this.existingAccounts.find(
      (existing) =>
        this.normalizeForComparison(existing.institution) === normalizedInstitution &&
        this.normalizeForComparison(existing.accountName) === normalizedAccountName
    );
  }

  /**
   * Find duplicate asset
   */
  private findDuplicateAsset(
    asset: ReturnType<typeof assetCreateSchema.parse>
  ): Asset | undefined {
    const normalizedName = this.normalizeForComparison(asset.name);

    return this.existingAssets.find(
      (existing) =>
        this.normalizeForComparison(existing.name) === normalizedName &&
        existing.type === asset.type
    );
  }

  /**
   * Find duplicate liability
   */
  private findDuplicateLiability(
    liability: ReturnType<typeof liabilityCreateSchema.parse>
  ): Liability | undefined {
    const normalizedName = this.normalizeForComparison(liability.name);
    const normalizedInstitution = this.normalizeForComparison(liability.institution || '');

    return this.existingLiabilities.find(
      (existing) =>
        this.normalizeForComparison(existing.name) === normalizedName &&
        this.normalizeForComparison(existing.institution || '') === normalizedInstitution
    );
  }

  /**
   * Find duplicate expense
   */
  private findDuplicateExpense(
    expense: ReturnType<typeof expenseCreateSchema.parse>
  ): Expense | undefined {
    const normalizedName = this.normalizeForComparison(expense.name);

    return this.existingExpenses.find(
      (existing) =>
        this.normalizeForComparison(existing.name) === normalizedName &&
        existing.amount === expense.amount &&
        existing.frequency === expense.frequency
    );
  }

  /**
   * Find duplicate income
   */
  private findDuplicateIncome(
    income: ReturnType<typeof incomeCreateSchema.parse>
  ): Income | undefined {
    const normalizedName = this.normalizeForComparison(income.name);
    const normalizedSource = this.normalizeForComparison(income.source);

    return this.existingIncome.find(
      (existing) =>
        this.normalizeForComparison(existing.name) === normalizedName &&
        this.normalizeForComparison(existing.source) === normalizedSource &&
        existing.amount === income.amount
    );
  }
}

