import type {
  ParsedImportData,
  ValidationResult,
  ImportOptions,
  ImportResult,
  ImportProgress,
  BatchResult,
  RowError,
  EntityType,
} from './types';
import { logger } from '@/lib/logger';
import { ImportValidation } from './ImportValidation';
import { parseExcelFile, validateExcelFile } from '@/lib/excel/excelParser';
import { createCategoriesRepository } from '@/data/categories/repo';
import { ensureDefaultCategories } from '@/data/categories/ensureDefaults';
import { createAccountsRepository } from '@/data/accounts/repo';
import { createAssetsRepository } from '@/data/assets/repo';
import { createLiabilitiesRepository } from '@/data/liabilities/repo';
import { createExpensesRepository } from '@/data/expenses/repo';
import { createIncomeRepository } from '@/data/income/repo';
import { accountCreateSchema } from '@/contracts/accounts';
import { assetCreateSchema } from '@/contracts/assets';
import { liabilityCreateSchema } from '@/contracts/liabilities';
import { expenseCreateSchema } from '@/contracts/expenses';
import { incomeCreateSchema } from '@/contracts/income';
import type { Asset, Income } from '@/types/domain';

const BATCH_SIZE = 10;

/**
 * Import service for handling data imports
 */
export class ImportService {
  private validation: ImportValidation;
  private getToken: () => Promise<string | null>;
  private abortController?: AbortController;

  constructor(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
    this.validation = new ImportValidation();
  }

  /**
   * Parse Excel file
   */
  async parseFile(file: File): Promise<ParsedImportData> {
    // Validate file first
    const validation = validateExcelFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid file');
    }

    return parseExcelFile(file);
  }

  /**
   * Validate import data
   */
  async validate(
    data: ParsedImportData,
    existingData?: {
      accounts?: unknown[];
      assets?: unknown[];
      liabilities?: unknown[];
      expenses?: unknown[];
      income?: unknown[];
    }
  ): Promise<ValidationResult> {
    // Set existing data for duplicate detection
    if (existingData) {
      // Type assertion needed because existingData uses unknown[] but setExistingData expects specific types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.validation.setExistingData(existingData as any);
    }

    return this.validation.validate(data);
  }

  /**
   * Resolve category names to IDs
   */
  async resolveCategories(
    categoryNames: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, string>> {
    const categoryMap = new Map<string, string>();
    const categoriesRepo = createCategoriesRepository();

    // Ensure default categories exist (including "Uncategorised")
    await ensureDefaultCategories(this.getToken);

    // Load all existing categories
    const existingCategoriesResult = await categoriesRepo.list(this.getToken);
    if (existingCategoriesResult.error) {
      throw new Error(
        `Failed to load categories: ${existingCategoriesResult.error.error}`
      );
    }

    const existingCategories = existingCategoriesResult.data;
    const existingMap = new Map<string, string>();

    // Create lookup map (case-insensitive, normalize whitespace)
    existingCategories.forEach((cat) => {
      const key = cat.name.toLowerCase().trim().replace(/\s+/g, ' ');
      existingMap.set(key, cat.id);
    });

    // Find "Uncategorised" category for fallback (should exist after ensureDefaultCategories)
    const uncategorisedCategory = existingCategories.find(
      (cat) => cat.name.toLowerCase().trim() === 'uncategorised'
    );
    const uncategorisedId = uncategorisedCategory?.id;

    if (!uncategorisedId) {
      throw new Error('Uncategorised category not found. Please contact support.');
    }

    // Process each unique category name
    const uniqueNames = Array.from(new Set(categoryNames.map((n) => n.trim())))
      .filter((n) => n.length > 0);

    let processed = 0;
    for (const categoryName of uniqueNames) {
      // Check for abort
      if (this.abortController?.signal.aborted) {
        break;
      }

      const normalizedName = categoryName.toLowerCase().trim().replace(/\s+/g, ' ');

      // Check if category already exists
      if (existingMap.has(normalizedName)) {
        categoryMap.set(categoryName, existingMap.get(normalizedName)!);
        processed++;
        onProgress?.(processed, uniqueNames.length);
        continue;
      }

      // Create new category
      try {
        const createResult = await categoriesRepo.create(
          { name: categoryName.trim() },
          this.getToken
        );

        if (createResult.error) {
          logger.warn('IMPORT:SERVICE', `Failed to create category "${categoryName}"`, { error: createResult.error.error });
          // Use Uncategorised as fallback
          categoryMap.set(categoryName, uncategorisedId);
        } else if (createResult.data) {
          categoryMap.set(categoryName, createResult.data.id);
          // Update existing map for subsequent lookups
          existingMap.set(normalizedName, createResult.data.id);
        } else {
          // Fallback to Uncategorised if creation returned no data
          categoryMap.set(categoryName, uncategorisedId);
        }
      } catch (error) {
        logger.warn('IMPORT:SERVICE', `Error creating category "${categoryName}"`, { error });
        // Use Uncategorised as fallback
        categoryMap.set(categoryName, uncategorisedId);
      }

      processed++;
      onProgress?.(processed, uniqueNames.length);
    }

    return categoryMap;
  }

  /**
   * Import data with progress tracking
   */
  async import(
    data: ParsedImportData,
    validation: ValidationResult,
    options: ImportOptions
  ): Promise<ImportResult> {
    const startTime = Date.now();
    this.abortController = new AbortController();

    const result: ImportResult = {
      success: false,
      imported: {
        accounts: 0,
        assets: 0,
        liabilities: 0,
        expenses: 0,
        income: 0,
        subscriptions: 0,
      },
      errors: [],
      duplicates: [],
      warnings: validation.warnings,
      duration: 0,
    };

    try {
      // Filter out duplicates and errors
      const validAccounts = this.filterValidRows(
        data.accounts,
        validation,
        'account'
      );
      const validAssets = this.filterValidRows(
        data.assets,
        validation,
        'asset'
      );
      const validLiabilities = this.filterValidRows(
        data.liabilities,
        validation,
        'liability'
      );
      const validExpenses = this.filterValidRows(
        data.expenses,
        validation,
        'expense'
      );
      const validIncome = this.filterValidRows(
        data.income,
        validation,
        'income'
      );

      // Calculate total items for overall progress tracking
      const totalItems =
        validAccounts.length +
        validAssets.length +
        validLiabilities.length +
        validExpenses.length +
        validIncome.length;
      
      let overallProgress = 0;

      // Helper to create progress callback with overall tracking
      const createProgressCallback = (
        _entityType: string,
        _entityTotal: number,
        entityOffset: number
      ) => {
        return (progress: ImportProgress) => {
          // Calculate overall progress
          const currentOverall = entityOffset + progress.current;
          const overallPercent = totalItems > 0 ? Math.round((currentOverall / totalItems) * 100) : 0;
          
          // Update progress with overall information
          options.onProgress?.({
            ...progress,
            current: currentOverall,
            total: totalItems,
            message: `${progress.message} (${currentOverall}/${totalItems} total items, ${overallPercent}%)`,
          });
        };
      };

      // Resolve categories for expenses
      const categoryNames = validExpenses
        .map((row) => (row.data.categoryName as string) || '')
        .filter((name) => name.trim().length > 0);

      let categoryMap = new Map<string, string>();
      if (categoryNames.length > 0) {
        categoryMap = await this.resolveCategories(
          categoryNames,
          (current, total) => {
            options.onProgress?.({
              step: 'resolving-categories',
              current: 0,
              total: totalItems,
              message: `Resolving categories... (${current}/${total} categories, 0/${totalItems} total items)`,
            });
          }
        );
      }

      // Import accounts
      if (validAccounts.length > 0 && !options.dryRun) {
        const accountResults = await this.importAccounts(
          validAccounts,
          {
            ...options,
            onProgress: createProgressCallback('accounts', validAccounts.length, overallProgress),
          }
        );
        result.imported.accounts = accountResults.successes.length;
        result.errors.push(...this.convertBatchErrorsToRowErrors(accountResults.errors, 'account'));
        overallProgress += validAccounts.length;
      }

      // Import assets
      if (validAssets.length > 0 && !options.dryRun) {
        const assetResults = await this.importAssets(
          validAssets,
          {
            ...options,
            onProgress: createProgressCallback('assets', validAssets.length, overallProgress),
          }
        );
        result.imported.assets = assetResults.successes.length;
        result.errors.push(...this.convertBatchErrorsToRowErrors(assetResults.errors, 'asset'));
        overallProgress += validAssets.length;
      }

      // Import liabilities
      if (validLiabilities.length > 0 && !options.dryRun) {
        const liabilityResults = await this.importLiabilities(
          validLiabilities,
          {
            ...options,
            onProgress: createProgressCallback('liabilities', validLiabilities.length, overallProgress),
          }
        );
        result.imported.liabilities = liabilityResults.successes.length;
        result.errors.push(...this.convertBatchErrorsToRowErrors(liabilityResults.errors, 'liability'));
        overallProgress += validLiabilities.length;
      }

      // Import expenses
      if (validExpenses.length > 0 && !options.dryRun) {
        const expenseResults = await this.importExpenses(
          validExpenses,
          categoryMap,
          {
            ...options,
            onProgress: createProgressCallback('expenses', validExpenses.length, overallProgress),
          }
        );
        result.imported.expenses = expenseResults.successes.length;
        result.errors.push(...this.convertBatchErrorsToRowErrors(expenseResults.errors, 'expense'));
        // Add validation errors from expense processing
        if (expenseResults.validationErrors) {
          result.errors.push(...expenseResults.validationErrors);
        }
        overallProgress += validExpenses.length;
      }

      // Import income
      if (validIncome.length > 0 && !options.dryRun) {
        const incomeResults = await this.importIncome(
          validIncome,
          {
            ...options,
            onProgress: createProgressCallback('income', validIncome.length, overallProgress),
          }
        );
        result.imported.income = incomeResults.successes.length;
        result.errors.push(...this.convertBatchErrorsToRowErrors(incomeResults.errors, 'income'));
        overallProgress += validIncome.length;
      }

      result.success = result.errors.length === 0;
      result.duplicates = validation.duplicates;
      result.duration = Date.now() - startTime;

      options.onProgress?.({
        step: 'completed',
        current: 100,
        total: 100,
        message: 'Import completed',
      });

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push({
        rowNumber: 0,
        entityType: 'account',
        fields: [
          {
            field: 'import',
            message:
              error instanceof Error ? error.message : 'Unknown error occurred',
          },
        ],
        rawData: {},
      });

      options.onProgress?.({
        step: 'error',
        current: 0,
        total: 0,
        message:
          error instanceof Error ? error.message : 'Import failed',
      });

      return result;
    }
  }

  /**
   * Cancel ongoing import
   */
  cancel(): void {
    this.abortController?.abort();
  }

  /**
   * Convert batch errors to RowError format
   */
  private convertBatchErrorsToRowErrors<T extends { rowNumber?: number; data?: unknown }>(
    batchErrors: Array<{ item: T; error: { error: string; code: string } }>,
    entityType: EntityType
  ): RowError[] {
    return batchErrors.map((batchError) => ({
      rowNumber: batchError.item.rowNumber || 0,
      entityType,
      fields: [
        {
          field: 'import',
          message: batchError.error.error,
        },
      ],
      rawData: (batchError.item.data as Record<string, unknown>) || {},
    }));
  }

  /**
   * Filter valid rows (exclude errors and duplicates)
   */
  private filterValidRows<T extends { rowNumber: number }>(
    rows: T[],
    validation: ValidationResult,
    entityType: string
  ): T[] {
    const errorRowNumbers = new Set(
      validation.errors
        .filter((e) => e.entityType === entityType)
        .map((e) => e.rowNumber)
    );
    const duplicateRowNumbers = new Set(
      validation.duplicates
        .filter((d) => d.entityType === entityType)
        .map((d) => d.rowNumber)
    );

    return rows.filter(
      (row) =>
        !errorRowNumbers.has(row.rowNumber) &&
        !duplicateRowNumbers.has(row.rowNumber)
    );
  }

  /**
   * Import accounts in batches
   */
  private async importAccounts(
    rows: ParsedImportData['accounts'],
    options: ImportOptions
  ): Promise<BatchResult<{ rowNumber: number; data: unknown }>> {
    const accountsRepo = createAccountsRepository();
    const validData = rows
      .map((row) => {
        const validation = accountCreateSchema.safeParse(row.data);
        return validation.success
          ? { rowNumber: row.rowNumber, data: validation.data }
          : null;
      })
      .filter(
        (item): item is { rowNumber: number; data: ReturnType<typeof accountCreateSchema.parse> } =>
          item !== null
      );

    return this.importBatch(
      validData,
      (item) => accountsRepo.create(item.data, this.getToken),
      'importing-accounts',
      'accounts',
      options
    );
  }

  /**
   * Import assets in batches
   */
  private async importAssets(
    rows: ParsedImportData['assets'],
    options: ImportOptions
  ): Promise<BatchResult<{ rowNumber: number; data: unknown }>> {
    const assetsRepo = createAssetsRepository();
    const validData = rows
      .map((row) => {
        const validation = assetCreateSchema.safeParse(row.data);
        return validation.success
          ? { rowNumber: row.rowNumber, data: validation.data }
          : null;
      })
      .filter(
        (item): item is { rowNumber: number; data: ReturnType<typeof assetCreateSchema.parse> } =>
          item !== null
      );

    return this.importBatch(
      validData,
      (item) => {
        // Ensure dateAdded is present (schema validation guarantees it)
        const dateAddedValue = item.data.dateAdded;
        const assetData = {
          ...item.data,
          dateAdded: (typeof dateAddedValue === 'string' && dateAddedValue ? dateAddedValue : new Date().toISOString().split('T')[0]),
        } as Omit<Asset, 'id'>;
        return assetsRepo.create(assetData, this.getToken);
      },
      'importing-assets',
      'assets',
      options
    );
  }

  /**
   * Import liabilities in batches
   */
  private async importLiabilities(
    rows: ParsedImportData['liabilities'],
    options: ImportOptions
  ): Promise<BatchResult<{ rowNumber: number; data: unknown }>> {
    const liabilitiesRepo = createLiabilitiesRepository();
    const validData = rows
      .map((row) => {
        const validation = liabilityCreateSchema.safeParse(row.data);
        return validation.success
          ? { rowNumber: row.rowNumber, data: validation.data }
          : null;
      })
      .filter(
        (item): item is { rowNumber: number; data: ReturnType<typeof liabilityCreateSchema.parse> } =>
          item !== null
      );

    return this.importBatch(
      validData,
      (item) => liabilitiesRepo.create(item.data, this.getToken),
      'importing-liabilities',
      'liabilities',
      options
    );
  }

  /**
   * Import expenses in batches
   */
  private async importExpenses(
    rows: ParsedImportData['expenses'],
    categoryMap: Map<string, string>,
    options: ImportOptions
  ): Promise<BatchResult<{ rowNumber: number; data: unknown }>> {
    const expensesRepo = createExpensesRepository();
    const errors: RowError[] = [];
    const validData = rows
      .map((row) => {
        const categoryName = (row.data.categoryName as string) || '';
        const categoryId = categoryMap.get(categoryName);

        if (!categoryId) {
          // Report as error instead of silently filtering
          errors.push({
            rowNumber: row.rowNumber,
            entityType: 'expense',
            fields: [
              {
                field: 'categoryName',
                message: `Category "${categoryName}" could not be resolved. Using Uncategorised as fallback.`,
              },
            ],
            rawData: row.data,
          });
          // Try to get Uncategorised as fallback
          const uncategorisedId = categoryMap.get('Uncategorised') || categoryMap.values().next().value;
          if (!uncategorisedId) {
            return null; // No fallback available
          }
          // Continue with fallback
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { categoryName: _, ...restData } = row.data;
        const validation = expenseCreateSchema.safeParse({
          ...restData,
          categoryId: categoryId || categoryMap.get('Uncategorised') || categoryMap.values().next().value,
        });

        if (!validation.success) {
          errors.push({
            rowNumber: row.rowNumber,
            entityType: 'expense',
            fields: validation.error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
              value: String(err.path?.[0] || 'unknown'),
            })),
            rawData: row.data,
          });
          return null;
        }

        return { rowNumber: row.rowNumber, data: validation.data };
      })
      .filter(
        (item): item is { rowNumber: number; data: ReturnType<typeof expenseCreateSchema.parse> } =>
          item !== null
      );

    const batchResult = await this.importBatch(
      validData,
      (item) => expensesRepo.create(item.data, this.getToken),
      'importing-expenses',
      'expenses',
      options
    );

    // Note: Validation errors are already in RowError format and will be added separately
    // Batch errors will be converted via convertBatchErrorsToRowErrors
    // Store validation errors separately to be merged later
    batchResult.validationErrors = errors;

    return batchResult;
  }

  /**
   * Import income in batches
   */
  private async importIncome(
    rows: ParsedImportData['income'],
    options: ImportOptions
  ): Promise<BatchResult<{ rowNumber: number; data: unknown }>> {
    const incomeRepo = createIncomeRepository();
    const validData = rows
      .map((row) => {
        const validation = incomeCreateSchema.safeParse(row.data);
        return validation.success
          ? { rowNumber: row.rowNumber, data: validation.data }
          : null;
      })
      .filter(
        (item): item is { rowNumber: number; data: ReturnType<typeof incomeCreateSchema.parse> } =>
          item !== null
      );

    return this.importBatch(
      validData,
      (item) => {
        // Ensure nextPaymentDate is present (schema validation guarantees it)
        const nextPaymentDateValue = item.data.nextPaymentDate;
        const incomeData = {
          ...item.data,
          nextPaymentDate: (typeof nextPaymentDateValue === 'string' && nextPaymentDateValue ? nextPaymentDateValue : new Date().toISOString().split('T')[0]),
        } as Omit<Income, 'id'>;
        return incomeRepo.create(incomeData, this.getToken);
      },
      'importing-income',
      'income',
      options
    );
  }

  /**
   * Import items in batches with progress tracking
   */
  private async importBatch<T extends { rowNumber?: number }>(
    items: T[],
    createFn: (item: T) => Promise<{ data?: unknown; error?: { error: string; code: string } }>,
    step: ImportProgress['step'],
    entityType: string,
    options: ImportOptions
  ): Promise<BatchResult<T>> {
    const results: BatchResult<T> = { successes: [], errors: [] };

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      if (this.abortController?.signal.aborted) {
        break;
      }

      const batch = items.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((item) => createFn(item))
      );

      // Process results
      batchResults.forEach((result, index) => {
        const item = batch[index];
        if (!item) return;
        if (result.status === 'fulfilled') {
          if (result.value.data) {
            results.successes.push({
              item: item as T,
              data: result.value.data,
            });
          } else if (result.value.error) {
            // Enhance error with row number if available
            const rowNumber = 'rowNumber' in item ? item.rowNumber : undefined;
            const enhancedError = {
              ...result.value.error,
              error: rowNumber
                ? `Row ${rowNumber}: ${result.value.error.error}`
                : result.value.error.error,
            };
            // Log error for debugging
            logger.error('IMPORT:SERVICE', `Failed to import ${entityType} at row ${rowNumber || 'unknown'}`, {
              error: result.value.error.error,
              code: result.value.error.code,
              item: item,
            });
            results.errors.push({
              item: item as T,
              error: enhancedError,
            });
          }
        } else {
          const rowNumber = 'rowNumber' in item ? item.rowNumber : undefined;
          const errorMessage = result.reason?.message || 'Unknown error';
          // Log error for debugging
          logger.error('IMPORT:SERVICE', `Exception importing ${entityType} at row ${rowNumber || 'unknown'}`, {
            error: errorMessage,
            reason: result.reason,
            item: item,
          });
          const enhancedError = {
            error: rowNumber
              ? `Row ${rowNumber}: ${errorMessage}`
              : errorMessage,
            code: 'UNKNOWN_ERROR' as const,
          };
          results.errors.push({
            item: item as T,
            error: enhancedError,
          });
        }
      });

      // Update progress
      options.onProgress?.({
        step,
        current: Math.min(i + BATCH_SIZE, items.length),
        total: items.length,
        entityType: entityType as EntityType,
        message: `Importing ${entityType}... (${Math.min(i + BATCH_SIZE, items.length)}/${items.length})`,
      });
    }

    return results;
  }
}

