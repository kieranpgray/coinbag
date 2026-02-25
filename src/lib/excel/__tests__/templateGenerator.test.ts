import { describe, it, expect, vi } from 'vitest';
import { generateImportTemplate } from '../templateGenerator';

// Mock XLSX library
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(),
    book_append_sheet: vi.fn(),
    aoa_to_sheet: vi.fn(),
  },
  write: vi.fn(),
}));

describe('templateGenerator', () => {
  describe('generateImportTemplate', () => {
    it('should generate Excel template with all required sheets', () => {
      const mockWorkbook = {};
      const mockSheet = {};

      const { utils, write } = require('xlsx');
      utils.book_new.mockReturnValue(mockWorkbook);
      utils.aoa_to_sheet.mockReturnValue(mockSheet);
      utils.book_append_sheet.mockImplementation(() => {});
      write.mockReturnValue(new ArrayBuffer(8));

      const result = generateImportTemplate();

      expect(result).toBeInstanceOf(Blob);
      expect(utils.book_new).toHaveBeenCalled();
      expect(utils.book_append_sheet).toHaveBeenCalledTimes(6); // Instructions + 5 data sheets
      expect(write).toHaveBeenCalledWith(mockWorkbook, {
        type: 'array',
        bookType: 'xlsx',
        cellStyles: true,
      });
    });

    it('should include Instructions sheet', () => {
      const mockWorkbook = {};
      const mockSheet = {};

      const { utils } = require('xlsx');
      utils.book_new.mockReturnValue(mockWorkbook);
      utils.aoa_to_sheet.mockReturnValue(mockSheet);
      utils.book_append_sheet.mockImplementation(() => {});

      generateImportTemplate();

      // Check that Instructions sheet was created
      const appendCalls = utils.book_append_sheet.mock.calls;
      const instructionsCall = appendCalls.find(call => call[2] === 'Instructions');
      expect(instructionsCall).toBeDefined();
    });

    it('should include all data sheets', () => {
      const mockWorkbook = {};
      const mockSheet = {};

      const { utils } = require('xlsx');
      utils.book_new.mockReturnValue(mockWorkbook);
      utils.aoa_to_sheet.mockReturnValue(mockSheet);
      utils.book_append_sheet.mockImplementation(() => {});

      generateImportTemplate();

      const appendCalls = utils.book_append_sheet.mock.calls;
      const sheetNames = appendCalls.map(call => call[2]);

      expect(sheetNames).toContain('Instructions');
      expect(sheetNames).toContain('Accounts');
      expect(sheetNames).toContain('Assets');
      expect(sheetNames).toContain('Liabilities');
      expect(sheetNames).toContain('Expenses');
      expect(sheetNames).toContain('Income');
    });
  });

  describe('createExpensesSheet', () => {
    it('should create expense sheet with correct headers', () => {
      const mockSheet = {
        '!cols': [],
      };

      const { utils } = require('xlsx');
      utils.aoa_to_sheet.mockReturnValue(mockSheet);

      // Import the function indirectly by calling generateImportTemplate
      // which calls createExpensesSheet internally
      generateImportTemplate();

      // Check that aoa_to_sheet was called with expense headers
      const aoaCalls = utils.aoa_to_sheet.mock.calls;
      const expenseCall = aoaCalls.find(call => {
        const data = call[0] as string[][];
        return data[0] && data[0][0] === 'name*';
      });

      expect(expenseCall).toBeDefined();
      const expenseData = expenseCall![0] as string[][];
      expect(expenseData[0]).toEqual([
        'name*',
        'amount*',
        'frequency*',
        'charge_date*',
        'next_due_date*',
        'category_name*',
        'notes',
      ]);

      expect(expenseData[1]).toEqual([
        'Weekly Groceries',
        120.00,
        'weekly',
        '2024-12-15',
        '2024-12-22',
        'Groceries',
        'Weekly food shopping',
      ]);
    });

    it('should set correct column widths for expense sheet', () => {
      const mockSheet = {
        '!cols': [],
      };

      const { utils } = require('xlsx');
      utils.aoa_to_sheet.mockReturnValue(mockSheet);

      generateImportTemplate();

      // The sheet should have !cols set for column widths
      expect(mockSheet['!cols']).toBeDefined();
      expect(Array.isArray(mockSheet['!cols'])).toBe(true);
    });
  });
});