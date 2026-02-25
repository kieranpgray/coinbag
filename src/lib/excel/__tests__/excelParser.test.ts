import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseExcelFile, validateExcelFile } from '../excelParser';
import type { ParsedImportData } from '@/features/import/types';

// Mock XLSX library
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
  },
}));

// Mock parseDate and other utilities
vi.mock('@/features/import/utils', () => ({
  parseDate: vi.fn(),
  normalizeNumber: vi.fn(),
  normalizeBoolean: vi.fn(),
  normalizeString: vi.fn(),
  normalizeFrequency: vi.fn(),
  normalizeAssetType: vi.fn(),
  normalizeLiabilityType: vi.fn(),
  normalizeIncomeSource: vi.fn(),
}));

describe('excelParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateExcelFile', () => {
    it('should validate file size under 10MB', () => {
      const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }); // 5MB

      const result = validateExcelFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject files over 10MB', () => {
      const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }); // 15MB

      const result = validateExcelFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File size exceeds 10MB limit');
    });

    it('should validate file type by MIME type', () => {
      const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const result = validateExcelFile(file);
      expect(result.valid).toBe(true);
    });

    it('should validate file type by extension', () => {
      const file = new File(['test'], 'test.xls', { type: 'application/vnd.ms-excel' });

      const result = validateExcelFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid file types', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      const result = validateExcelFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });
  });

  describe('parseExcelFile - Expense Sheet', () => {
    it('should parse expense sheet with standard headers', async () => {
      const mockWorkbook = {
        SheetNames: ['Expenses'],
        Sheets: {
          Expenses: {
            '!ref': 'A1:G2',
            A1: { v: 'name*' },
            B1: { v: 'amount*' },
            C1: { v: 'frequency*' },
            D1: { v: 'charge_date*' },
            E1: { v: 'next_due_date*' },
            F1: { v: 'category_name*' },
            G1: { v: 'notes' },
            A2: { v: 'Netflix' },
            B2: { v: '15.99' },
            C2: { v: 'monthly' },
            D2: { v: '2024-01-15' },
            E2: { v: '2024-02-15' },
            F2: { v: 'Entertainment' },
            G2: { v: 'Monthly subscription' },
          },
        },
      };

      const { read, utils } = await import('xlsx');
      vi.mocked(read).mockReturnValue(mockWorkbook);
      vi.mocked(utils.sheet_to_json).mockReturnValue([
        {
          'name*': 'Netflix',
          'amount*': '15.99',
          'frequency*': 'monthly',
          'charge_date*': '2024-01-15',
          'next_due_date*': '2024-02-15',
          'category_name*': 'Entertainment',
          notes: 'Monthly subscription',
        },
      ]);

      const { parseDate, normalizeNumber, normalizeFrequency, normalizeString } = await import('@/features/import/utils');
      vi.mocked(parseDate).mockImplementation((date) => date as string);
      vi.mocked(normalizeNumber).mockImplementation((val) => {
        if (val === '#VALUE!') return undefined;
        return parseFloat(val as string);
      });
      vi.mocked(normalizeFrequency).mockImplementation((val) => val as any);
      vi.mocked(normalizeString).mockImplementation((val) => val as string);

      const file = new File(['test'], 'test.xlsx');
      const result = await parseExcelFile(file);

      expect(result.expenses).toHaveLength(1);
      expect(result.expenses[0].data).toEqual({
        name: 'Netflix',
        amount: 15.99,
        frequency: 'monthly',
        chargeDate: '2024-01-15',
        nextDueDate: '2024-02-15',
        categoryName: 'Entertainment',
        notes: 'Monthly subscription',
      });
    });

    it('should handle column name variants with asterisks', async () => {
      const mockWorkbook = {
        SheetNames: ['Expenses'],
        Sheets: {
          Expenses: {
            A1: { v: 'name*' },
            B1: { v: 'amount*' },
            C1: { v: 'frequency*' },
            D1: { v: 'charge_date*' },
            E1: { v: 'next_due_date*' },
            F1: { v: 'category_name*' },
            G1: { v: 'notes' },
          },
        },
      };

      const { read, utils } = await import('xlsx');
      vi.mocked(read).mockReturnValue(mockWorkbook);
      vi.mocked(utils.sheet_to_json).mockReturnValue([
        {
          'name*': 'Rent',
          'amount*': '1200',
          'frequency*': 'monthly',
          'charge_date*': '2024-01-01',
          'next_due_date*': '2024-02-01',
          'category_name*': 'Housing',
          notes: '',
        },
      ]);

      const { normalizeNumber, normalizeString } = await import('@/features/import/utils');
      vi.mocked(normalizeNumber).mockReturnValue(1200);
      vi.mocked(normalizeString).mockImplementation((val) => val as string);

      const file = new File(['test'], 'test.xlsx');
      const result = await parseExcelFile(file);

      expect(result.expenses[0].data.name).toBe('Rent');
      expect(result.expenses[0].data.amount).toBe(1200);
    });

    it('should handle snake_case column names', async () => {
      const mockWorkbook = {
        SheetNames: ['Expenses'],
        Sheets: {
          Expenses: {
            A1: { v: 'name' },
            B1: { v: 'amount' },
            C1: { v: 'frequency' },
            D1: { v: 'charge_date' },
            E1: { v: 'next_due_date' },
            F1: { v: 'category_name' },
            G1: { v: 'notes' },
          },
        },
      };

      const { read, utils } = await import('xlsx');
      vi.mocked(read).mockReturnValue(mockWorkbook);
      vi.mocked(utils.sheet_to_json).mockReturnValue([
        {
          name: 'Insurance',
          amount: '150',
          frequency: 'yearly',
          charge_date: '2024-03-01',
          next_due_date: '2025-03-01',
          category_name: 'Insurance',
          notes: 'Annual policy',
        },
      ]);

      const { normalizeString } = await import('@/features/import/utils');
      vi.mocked(normalizeString).mockImplementation((val) => val as string);

      const file = new File(['test'], 'test.xlsx');
      const result = await parseExcelFile(file);

      expect(result.expenses[0].data.name).toBe('Insurance');
      expect(result.expenses[0].data.categoryName).toBe('Insurance');
    });

    it('should normalize frequency values', async () => {
      const mockWorkbook = {
        SheetNames: ['Expenses'],
        Sheets: {
          Expenses: {
            A1: { v: 'name' },
            B1: { v: 'frequency' },
          },
        },
      };

      const { read, utils } = await import('xlsx');
      vi.mocked(read).mockReturnValue(mockWorkbook);
      vi.mocked(utils.sheet_to_json).mockReturnValue([
        {
          name: 'Test Expense',
          frequency: 'bi-weekly',
        },
      ]);

      const { normalizeFrequency, normalizeString } = await import('@/features/import/utils');
      vi.mocked(normalizeFrequency).mockReturnValue('fortnightly');
      vi.mocked(normalizeString).mockImplementation((val) => val as string);

      const file = new File(['test'], 'test.xlsx');
      const result = await parseExcelFile(file);

      expect(result.expenses[0].data.frequency).toBe('fortnightly');
      expect(vi.mocked(normalizeFrequency)).toHaveBeenCalledWith('bi-weekly');
    });

    it('should handle Excel error values', async () => {
      const mockWorkbook = {
        SheetNames: ['Expenses'],
        Sheets: {
          Expenses: {
            A1: { v: 'name' },
            B1: { v: 'amount' },
          },
        },
      };

      const { read, utils } = await import('xlsx');
      vi.mocked(read).mockReturnValue(mockWorkbook);
      vi.mocked(utils.sheet_to_json).mockReturnValue([
        {
          name: 'Bad Expense',
          amount: '#VALUE!',
        },
      ]);

      const { normalizeNumber, normalizeString } = await import('@/features/import/utils');
      vi.mocked(normalizeNumber).mockReturnValue(undefined); // Mock to return undefined for error values
      vi.mocked(normalizeString).mockImplementation((val) => val as string);

      const file = new File(['test'], 'test.xlsx');
      const result = await parseExcelFile(file);

      expect(result.expenses[0].data.amount).toBeUndefined();
    });

    it('should skip empty rows', async () => {
      const mockWorkbook = {
        SheetNames: ['Expenses'],
        Sheets: {
          Expenses: {
            A1: { v: 'name' },
            B1: { v: 'amount' },
          },
        },
      };

      const { read, utils } = await import('xlsx');
      vi.mocked(read).mockReturnValue(mockWorkbook);
      vi.mocked(utils.sheet_to_json).mockReturnValue([
        {
          name: 'Valid Expense',
          amount: '100',
        },
        {
          name: '',
          amount: '',
        },
        {
          name: 'Another Valid',
          amount: '200',
        },
      ]);

      const { normalizeString } = await import('@/features/import/utils');
      vi.mocked(normalizeString).mockImplementation((val) => val as string);

      const file = new File(['test'], 'test.xlsx');
      const result = await parseExcelFile(file);

      expect(result.expenses).toHaveLength(2);
      expect(result.expenses[0].data.name).toBe('Valid Expense');
      expect(result.expenses[1].data.name).toBe('Another Valid');
    });
  });

  describe('parseExcelFile - General', () => {
    it('should throw error for empty file', async () => {
      const mockWorkbook = {
        SheetNames: ['Instructions'],
        Sheets: {
          Instructions: {},
        },
      };

      const { read, utils } = await import('xlsx');
      vi.mocked(read).mockReturnValue(mockWorkbook);
      vi.mocked(utils.sheet_to_json).mockReturnValue([]);

      const file = new File(['test'], 'test.xlsx');
      await expect(parseExcelFile(file)).rejects.toThrow(
        'No data found in Excel file'
      );
    });

    it('should ignore non-data sheets', async () => {
      const mockWorkbook = {
        SheetNames: ['Instructions', 'Expenses'],
        Sheets: {
          Instructions: {
            A1: { v: 'Some text' },
          },
          Expenses: {
            A1: { v: 'name' },
            A2: { v: 'Test Expense' },
          },
        },
      };

      const { read, utils } = await import('xlsx');
      vi.mocked(read).mockReturnValue(mockWorkbook);
      vi.mocked(utils.sheet_to_json).mockReturnValue([
        { name: 'Test Expense' },
      ]);

      const { normalizeString } = await import('@/features/import/utils');
      vi.mocked(normalizeString).mockImplementation((val) => val as string);

      const file = new File(['test'], 'test.xlsx');
      const result = await parseExcelFile(file);

      expect(result.expenses).toHaveLength(1);
      expect(result.accounts).toHaveLength(0);
    });
  });
});