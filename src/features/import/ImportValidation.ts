import type {
  ParsedImportData,
  ValidationResult,
  RowError,
  RowWarning,
  DuplicateMatch,
  ValidationSummary,
  EntityType,
} from './types';
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
  subscriptionCreateSchema,
} from '@/contracts/subscriptionsOrExpenses';
import {
  incomeCreateSchema,
} from '@/contracts/income';
import type { Account, Asset, Liability, Subscription, Income } from '@/types/domain';

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
  row: ParsedImportData['accounts'][0] | ParsedImportData['assets'][0] | ParsedImportData['liabilities'][0] | ParsedImportData['subscriptions'][0] | ParsedImportData['income'][0],
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
  private existingSubscriptions: Subscription[] = [];
  private existingIncome: Income[] = [];

  /**
   * Set existing data for duplicate detection
   */
  setExistingData(data: {
    accounts?: Account[];
    assets?: Asset[];
    liabilities?: Liability[];
    subscriptions?: Subscription[];
    income?: Income[];
  }) {
    this.existingAccounts = data.accounts || [];
    this.existingAssets = data.assets || [];
    this.existingLiabilities = data.liabilities || [];
    this.existingSubscriptions = data.subscriptions || [];
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

    // Validate subscriptions
    const subscriptionResults = this.validateSubscriptions(data.subscriptions);
    errors.push(...subscriptionResults.errors);
    warnings.push(...subscriptionResults.warnings);
    duplicates.push(...subscriptionResults.duplicates);

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
          fields: validation.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
            value: String(err.path?.[0] || 'unknown'),
          })),
          rawData: row.data,
        });
        return;
      }

      // Duplicate detection
      const duplicate = this.findDuplicateAccount(validation.data);
      if (duplicate) {
        duplicates.push({
          rowNumber: row.rowNumber,
          entityType: 'account',
          existingId: duplicate.id,
          matchReason: `Account "${validation.data.accountName}" at "${validation.data.institution}" already exists`,
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
          fields: validation.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
            value: String(err.path?.[0] || 'unknown'),
          })),
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
          fields: validation.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
            value: String(err.path?.[0] || 'unknown'),
          })),
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
   * Validate subscriptions
   */
  private validateSubscriptions(
    rows: ParsedImportData['subscriptions']
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
      const excelErrors = checkExcelErrors(row, 'subscription');
      if (excelErrors.length > 0) {
        errors.push({
          rowNumber: row.rowNumber,
          entityType: 'subscription',
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
      const validation = subscriptionCreateSchema.safeParse({
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
            entityType: 'subscription',
            fields: relevantErrors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
              value: String(err.path?.[0] || 'unknown'),
            })),
            rawData: row.data,
          });
        }

        // Check if categoryName is missing
        if (!categoryName || categoryName.trim() === '') {
          errors.push({
            rowNumber: row.rowNumber,
            entityType: 'subscription',
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
      const duplicate = this.findDuplicateSubscription({
        name: validation.data.name,
        amount: validation.data.amount,
        frequency: validation.data.frequency,
        chargeDate: validation.data.chargeDate,
        nextDueDate: validation.data.nextDueDate,
        categoryId: 'placeholder', // Not used for duplicate detection
        notes: validation.data.notes,
      });
      if (duplicate) {
        duplicates.push({
          rowNumber: row.rowNumber,
          entityType: 'subscription',
          existingId: duplicate.id,
          matchReason: `Subscription "${validation.data.name}" with amount ${validation.data.amount} and frequency ${validation.data.frequency} already exists`,
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
          fields: validation.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
            value: String(err.path?.[0] || 'unknown'),
          })),
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
   */
  private normalizeForComparison(str: string): string {
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
   * Find duplicate subscription
   */
  private findDuplicateSubscription(
    subscription: ReturnType<typeof subscriptionCreateSchema.parse>
  ): Subscription | undefined {
    const normalizedName = this.normalizeForComparison(subscription.name);

    return this.existingSubscriptions.find(
      (existing) =>
        this.normalizeForComparison(existing.name) === normalizedName &&
        existing.amount === subscription.amount &&
        existing.frequency === subscription.frequency
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

