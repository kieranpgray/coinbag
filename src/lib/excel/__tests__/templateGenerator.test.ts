import { describe, it, expect, vi } from 'vitest';
import { generateImportTemplate } from '../templateGenerator';

import { DEFAULT_CATEGORY_NAMES } from '@/data/categories/constants';

describe('templateGenerator', () => {
  describe('generateImportTemplate', () => {
    it('should return a Promise that resolves to a Blob', async () => {
      const result = await generateImportTemplate();
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('should generate a non-empty Excel file', async () => {
      const result = await generateImportTemplate();
      expect(result.size).toBeGreaterThan(0);
    });
  });

  describe('DEFAULT_CATEGORY_NAMES import', () => {
    it('should have access to the category constants', () => {
      expect(DEFAULT_CATEGORY_NAMES).toBeDefined();
      expect(Array.isArray(DEFAULT_CATEGORY_NAMES)).toBe(true);
      expect(DEFAULT_CATEGORY_NAMES.length).toBeGreaterThan(40);
      expect(DEFAULT_CATEGORY_NAMES).toContain('Uncategorised');
      expect(DEFAULT_CATEGORY_NAMES).toContain('Groceries');
      expect(DEFAULT_CATEGORY_NAMES).toContain('Entertainment');
    });

    it('should include all major expense categories', () => {
      const majorCategories = [
        'Utilities', 'Electricity', 'Gas', 'Water',
        'Phone / Internet', 'Insurance', 'Rent', 'Mortgage',
        'Groceries', 'Food', 'Transportation', 'Health',
        'Entertainment', 'Shopping', 'Dining Out'
      ];

      majorCategories.forEach(category => {
        expect(DEFAULT_CATEGORY_NAMES).toContain(category);
      });
    });
  });

  describe('Integration test - template structure', () => {
    it('should generate template that can be parsed as valid Excel', async () => {
      const blob = await generateImportTemplate();

      // Convert blob to array buffer for XLSX parsing
      const buffer = await blob.arrayBuffer();

      // Import xlsx to verify the generated file is valid
      const { read } = await import('xlsx');
      const workbook = read(buffer, { type: 'array' });

      // Verify expected sheets exist
      expect(workbook.SheetNames).toContain('Instructions');
      expect(workbook.SheetNames).toContain('Categories');
      expect(workbook.SheetNames).toContain('Accounts');
      expect(workbook.SheetNames).toContain('Assets');
      expect(workbook.SheetNames).toContain('Liabilities');
      expect(workbook.SheetNames).toContain('Expenses');
      expect(workbook.SheetNames).toContain('Income');
    });

    it('should include Categories sheet with all category names', async () => {
      const blob = await generateImportTemplate();
      const buffer = await blob.arrayBuffer();

      const { read, utils } = await import('xlsx');
      const workbook = read(buffer, { type: 'array' });

      expect(workbook.SheetNames).toContain('Categories');
      const categoriesSheet = workbook.Sheets['Categories'];
      const categoriesData = utils.sheet_to_json<string[]>(categoriesSheet, { header: 1 });

      // Should have header + all categories
      expect(categoriesData.length).toBe(DEFAULT_CATEGORY_NAMES.length + 1);
      expect(categoriesData[0][0]).toBe('Available Categories');

      // Check some key categories are present
      const categoryNames = categoriesData.slice(1).map(row => row[0]);
      expect(categoryNames).toContain('Uncategorised');
      expect(categoryNames).toContain('Groceries');
      expect(categoryNames).toContain('Entertainment');
    });

    it('should include Expenses sheet with correct headers', async () => {
      const blob = await generateImportTemplate();
      const buffer = await blob.arrayBuffer();

      const { read, utils } = await import('xlsx');
      const workbook = read(buffer, { type: 'array' });

      expect(workbook.SheetNames).toContain('Expenses');
      const expensesSheet = workbook.Sheets['Expenses'];
      const expensesData = utils.sheet_to_json<string[]>(expensesSheet, { header: 1 });

      // Check headers
      expect(expensesData[0]).toEqual([
        'name*',
        'amount*',
        'frequency*',
        'charge_date*',
        'next_due_date*',
        'category_name*',
        'notes',
      ]);

      // Check example row exists
      expect(expensesData[1][0]).toBe('Weekly Groceries');
      expect(expensesData[1][5]).toBe('Groceries'); // category_name column
    });

    it('should include updated Instructions with category guidance', async () => {
      const blob = await generateImportTemplate();
      const buffer = await blob.arrayBuffer();

      const { read, utils } = await import('xlsx');
      const workbook = read(buffer, { type: 'array' });

      expect(workbook.SheetNames).toContain('Instructions');
      const instructionsSheet = workbook.Sheets['Instructions'];
      const instructionsData = utils.sheet_to_json<string[]>(instructionsSheet, { header: 1 });

      // Find the CATEGORIES section
      const categoriesRowIndex = instructionsData.findIndex(row => row[0] === 'CATEGORIES');
      expect(categoriesRowIndex).toBeGreaterThan(-1);

      // Check for category guidance
      const categoryGuidance = instructionsData.slice(categoriesRowIndex);
      expect(categoryGuidance.some(row => row[0]?.includes('dropdown'))).toBe(true);
      expect(categoryGuidance.some(row => row[0]?.includes('category_name*: Select from the dropdown list'))).toBe(true);
    });
  });
});