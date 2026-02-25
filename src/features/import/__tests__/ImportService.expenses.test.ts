import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportService } from '../ImportService';
import type { ParsedImportData, ValidationResult } from '../types';

// Mock dependencies
const mockCategoriesRepo = {
  list: vi.fn(),
  create: vi.fn(),
};

const mockExpensesRepo = {
  create: vi.fn(),
};

const mockEnsureDefaultCategories = vi.fn();

vi.mock('@/data/categories/repo', () => ({
  createCategoriesRepository: vi.fn(() => mockCategoriesRepo),
}));

vi.mock('@/data/expenses/repo', () => ({
  createExpensesRepository: vi.fn(() => mockExpensesRepo),
}));

vi.mock('@/data/categories/ensureDefaults', () => ({
  ensureDefaultCategories: mockEnsureDefaultCategories,
}));

describe('ImportService - Expenses', () => {
  let importService: ImportService;
  let mockGetToken: () => Promise<string | null>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetToken = vi.fn().mockResolvedValue('mock-token');

    mockEnsureDefaultCategories.mockResolvedValue(undefined);

    importService = new ImportService(mockGetToken);
  });

  describe('importExpenses', () => {
    it('should successfully import valid expense rows', async () => {
      const mockRows: ParsedImportData['expenses'] = [
        {
          rowNumber: 2,
          entityType: 'expense',
          data: {
            name: 'Netflix',
            amount: 15.99,
            frequency: 'monthly',
            chargeDate: '2024-01-15',
            nextDueDate: '2024-02-15',
            categoryName: 'Entertainment',
            notes: 'Monthly subscription',
          },
        },
      ];

      const categoryMap = new Map<string, string>([
        ['entertainment', 'cat-1'],
      ]);

      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        duplicates: [],
        summary: {
          totalRows: 1,
          validRows: 1,
          errorRows: 0,
          duplicateRows: 0,
          warningRows: 0,
        },
      };

      // Setup category resolution
      mockCategoriesRepo.list.mockResolvedValue({
        data: [{ id: 'cat-1', name: 'Entertainment' }],
      });

      // Setup expense creation
      mockExpensesRepo.create.mockResolvedValue({
        data: {
          id: 'exp-1',
          name: 'Netflix',
          amount: 15.99,
          frequency: 'monthly',
          chargeDate: '2024-01-15',
          nextDueDate: '2024-02-15',
          categoryId: 'cat-1',
          paidFromAccountId: undefined,
          notes: 'Monthly subscription',
        },
      });

      const result = await importService.importExpenses(mockRows, categoryMap, {
        skipDuplicates: false,
        dryRun: false,
      });

      expect(result.successes).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.validationErrors).toHaveLength(0);

      expect(mockExpensesRepo.create).toHaveBeenCalledWith(
        {
          name: 'Netflix',
          amount: 15.99,
          frequency: 'monthly',
          chargeDate: '2024-01-15',
          nextDueDate: '2024-02-15',
          categoryId: 'cat-1',
          notes: 'Monthly subscription',
        },
        'mock-token'
      );
    });

    it('should handle category resolution for new categories', async () => {
      const mockRows: ParsedImportData['expenses'] = [
        {
          rowNumber: 2,
          entityType: 'expense',
          data: {
            name: 'Gym Membership',
            amount: 50,
            frequency: 'monthly',
            categoryName: 'Health & Fitness',
          },
        },
      ];

      const categoryMap = new Map<string, string>();

      // Mock existing categories (empty)
      mockCategoriesRepo.list.mockResolvedValue({ data: [] });

      // Mock creating new category
      mockCategoriesRepo.create.mockResolvedValue({
        data: { id: 'cat-2', name: 'Health & Fitness' },
      });

      // Mock expense creation
      mockExpensesRepo.create.mockResolvedValue({
        data: {
          id: 'exp-2',
          name: 'Gym Membership',
          amount: 50,
          frequency: 'monthly',
          categoryId: 'cat-2',
        },
      });

      const result = await importService.importExpenses(mockRows, categoryMap, {
        skipDuplicates: false,
        dryRun: false,
      });

      expect(mockCategoriesRepo.create).toHaveBeenCalledWith(
        { name: 'Health & Fitness' },
        'mock-token'
      );
      expect(categoryMap.get('health & fitness')).toBe('cat-2');
      expect(result.successes).toHaveLength(1);
    });

    it('should fallback to Uncategorised when category creation fails', async () => {
      const mockRows: ParsedImportData['expenses'] = [
        {
          rowNumber: 2,
          entityType: 'expense',
          data: {
            name: 'Test Expense',
            amount: 100,
            frequency: 'monthly',
            categoryName: 'New Category',
          },
        },
      ];

      const categoryMap = new Map<string, string>([
        ['uncategorised', 'uncat-1'],
      ]);

      // Mock existing categories (empty)
      mockCategoriesRepo.list.mockResolvedValue({
        data: [{ id: 'uncat-1', name: 'Uncategorised' }],
      });

      // Mock category creation failure
      mockCategoriesRepo.create.mockResolvedValue({
        error: { error: 'Failed to create category', code: 'ERROR' },
      });

      // Mock expense creation with fallback category
      mockExpensesRepo.create.mockResolvedValue({
        data: {
          id: 'exp-3',
          name: 'Test Expense',
          amount: 100,
          frequency: 'monthly',
          categoryId: 'uncat-1',
        },
      });

      const result = await importService.importExpenses(mockRows, categoryMap, {
        skipDuplicates: false,
        dryRun: false,
      });

      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].fields[0].message).toContain('Using Uncategorised as fallback');
      expect(result.successes).toHaveLength(1);

      expect(mockExpensesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 'uncat-1',
        }),
        'mock-token'
      );
    });

    it('should handle validation errors from expense schema', async () => {
      const mockRows: ParsedImportData['expenses'] = [
        {
          rowNumber: 2,
          entityType: 'expense',
          data: {
            name: '', // Invalid: empty name
            amount: 100,
            frequency: 'monthly',
            categoryName: 'Test',
          },
        },
      ];

      const categoryMap = new Map<string, string>([
        ['test', 'cat-1'],
      ]);

      // Mock categories
      mockCategoriesRepo.list.mockResolvedValue({ data: [] });

      const result = await importService.importExpenses(mockRows, categoryMap, {
        skipDuplicates: false,
        dryRun: false,
      });

      expect(result.successes).toHaveLength(0);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].fields[0].message).toContain('Name is required');
    });

    it('should handle amount validation errors (too high for frequency)', async () => {
      const mockRows: ParsedImportData['expenses'] = [
        {
          rowNumber: 2,
          entityType: 'expense',
          data: {
            name: 'High Expense',
            amount: 15000, // Too high for monthly (>10000)
            frequency: 'monthly',
            categoryName: 'Test',
          },
        },
      ];

      const categoryMap = new Map<string, string>([
        ['test', 'cat-1'],
      ]);

      // Mock categories
      mockCategoriesRepo.list.mockResolvedValue({ data: [] });

      const result = await importService.importExpenses(mockRows, categoryMap, {
        skipDuplicates: false,
        dryRun: false,
      });

      expect(result.successes).toHaveLength(0);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].fields[0].message).toContain('Amount must be between');
    });

    it('should handle date order validation', async () => {
      const mockRows: ParsedImportData['expenses'] = [
        {
          rowNumber: 2,
          entityType: 'expense',
          data: {
            name: 'Date Test',
            amount: 100,
            frequency: 'monthly',
            chargeDate: '2024-02-15',
            nextDueDate: '2024-01-15', // Before charge date
            categoryName: 'Test',
          },
        },
      ];

      const categoryMap = new Map<string, string>([
        ['test', 'cat-1'],
      ]);

      // Mock categories
      mockCategoriesRepo.list.mockResolvedValue({ data: [] });

      const result = await importService.importExpenses(mockRows, categoryMap, {
        skipDuplicates: false,
        dryRun: false,
      });

      expect(result.successes).toHaveLength(0);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].fields[0].message).toContain('must be after or equal to charge date');
    });

    it('should pass notes through to expense creation', async () => {
      const mockRows: ParsedImportData['expenses'] = [
        {
          rowNumber: 2,
          entityType: 'expense',
          data: {
            name: 'Expense with Notes',
            amount: 50,
            frequency: 'weekly',
            categoryName: 'Test',
            notes: 'Important notes here',
          },
        },
      ];

      const categoryMap = new Map<string, string>([
        ['test', 'cat-1'],
      ]);

      // Mock categories
      mockCategoriesRepo.list.mockResolvedValue({ data: [] });

      // Mock expense creation
      mockExpensesRepo.create.mockResolvedValue({
        data: {
          id: 'exp-4',
          name: 'Expense with Notes',
          amount: 50,
          frequency: 'weekly',
          categoryId: 'cat-1',
          notes: 'Important notes here',
        },
      });

      const result = await importService.importExpenses(mockRows, categoryMap, {
        skipDuplicates: false,
        dryRun: false,
      });

      expect(mockExpensesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'Important notes here',
        }),
        'mock-token'
      );
      expect(result.successes).toHaveLength(1);
    });

    it('should handle batch creation failures', async () => {
      const mockRows: ParsedImportData['expenses'] = [
        {
          rowNumber: 2,
          entityType: 'expense',
          data: {
            name: 'Failing Expense',
            amount: 100,
            frequency: 'monthly',
            categoryName: 'Test',
          },
        },
      ];

      const categoryMap = new Map<string, string>([
        ['test', 'cat-1'],
      ]);

      // Mock categories
      mockCategoriesRepo.list.mockResolvedValue({ data: [] });

      // Mock expense creation failure
      mockExpensesRepo.create.mockResolvedValue({
        error: { error: 'Database error', code: 'DB_ERROR' },
      });

      const result = await importService.importExpenses(mockRows, categoryMap, {
        skipDuplicates: false,
        dryRun: false,
      });

      expect(result.successes).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].fields[0].message).toBe('Database error');
    });
  });
});