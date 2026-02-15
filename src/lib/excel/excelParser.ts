import * as XLSX from 'xlsx';
import type { ParsedImportData, ParsedRow, EntityType } from '@/features/import/types';
import { 
  parseDate, 
  normalizeNumber, 
  normalizeBoolean, 
  normalizeString,
  normalizeFrequency,
  normalizeAssetType,
  normalizeLiabilityType,
  normalizeIncomeSource,
} from '@/features/import/utils';

/**
 * Parse Excel file into structured import data
 */
export async function parseExcelFile(file: File): Promise<ParsedImportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const parsed = parseWorkbook(workbook);
        resolve(parsed);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to parse Excel file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Parse workbook into structured data
 */
function parseWorkbook(workbook: XLSX.WorkBook): ParsedImportData {
  const result: ParsedImportData = {
    accounts: [],
    assets: [],
    liabilities: [],
    expenses: [],
    income: [],
    subscriptions: [],
  };

  // Map sheet names to entity types
  const sheetMap: Record<string, EntityType> = {
    Accounts: 'account',
    Assets: 'asset',
    Liabilities: 'liability',
    Expenses: 'expense',
    Income: 'income',
  };

  // Process each sheet
  workbook.SheetNames.forEach((sheetName) => {
    const entityType = sheetMap[sheetName];
    if (!entityType) {
      // Skip non-data sheets (e.g., Instructions)
      return;
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      // Sheet exists but is empty
      return;
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      raw: false, // Convert all values to strings/numbers
      defval: '', // Default value for empty cells
    });

    const parsedRows: ParsedRow[] = rows.map((row, index) => {
      // Skip empty rows (check if all values are empty strings or null)
      const hasData = Object.values(row).some(
        (val) => val !== '' && val !== null && val !== undefined
      );
      if (!hasData) {
        return null;
      }

      // Normalize column names (handle snake_case, camelCase, etc.)
      const normalizedRow = normalizeRowData(row, entityType);

      return {
        rowNumber: index + 2, // +2 because Excel rows are 1-indexed and we skip header
        entityType,
        data: normalizedRow,
      };
    }).filter((row): row is ParsedRow => row !== null);

    // Assign to the correct property based on entity type
    if (entityType === 'account') {
      result.accounts = parsedRows;
    } else if (entityType === 'asset') {
      result.assets = parsedRows;
    } else if (entityType === 'liability') {
      result.liabilities = parsedRows;
    } else if (entityType === 'expense') {
      result.expenses = parsedRows;
    } else if (entityType === 'subscription') {
      result.subscriptions = parsedRows;
    } else if (entityType === 'income') {
      result.income = parsedRows;
    }
  });

  // Validate that at least some data was parsed
  const totalRows =
    result.accounts.length +
    result.assets.length +
    result.liabilities.length +
    result.expenses.length +
    result.subscriptions.length +
    result.income.length;

  if (totalRows === 0) {
    throw new Error(
      'No data found in Excel file. Please ensure you have filled in at least one sheet with data.'
    );
  }

  return result;
}

/**
 * Normalize row data based on entity type
 * Maps various column name formats to expected field names
 */
function normalizeRowData(
  row: Record<string, unknown>,
  entityType: EntityType
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  // Column name mappings for each entity type
  const columnMappings: Record<EntityType, Record<string, string>> = {
    account: {
      institution: 'institution',
      account_name: 'accountName',
      'account name': 'accountName',
      balance: 'balance',
      account_type: 'accountType',
      'account type': 'accountType',
      last_updated: 'lastUpdated',
      'last updated': 'lastUpdated',
      hidden: 'hidden',
    },
    asset: {
      name: 'name',
      type: 'type',
      value: 'value',
      date_added: 'dateAdded',
      'date added': 'dateAdded',
      ticker: 'ticker',
      symbol: 'ticker',
      exchange: 'exchange',
      quantity: 'quantity',
      purchase_price: 'purchasePrice',
      'purchase price': 'purchasePrice',
      purchase_date: 'purchaseDate',
      'purchase date': 'purchaseDate',
      change_1d: 'change1D',
      'change 1d': 'change1D',
      change_1w: 'change1W',
      'change 1w': 'change1W',
      institution: 'institution',
      notes: 'notes',
    },
    liability: {
      name: 'name',
      type: 'type',
      balance: 'balance',
      interest_rate: 'interestRate',
      'interest rate': 'interestRate',
      monthly_payment: 'monthlyPayment',
      'monthly payment': 'monthlyPayment',
      due_date: 'dueDate',
      'due date': 'dueDate',
      institution: 'institution',
    },
    subscription: {
      name: 'name',
      amount: 'amount',
      frequency: 'frequency',
      charge_date: 'chargeDate',
      'charge date': 'chargeDate',
      next_due_date: 'nextDueDate',
      'next due date': 'nextDueDate',
      category_name: 'categoryName',
      'category name': 'categoryName',
      category: 'categoryName',
      notes: 'notes',
    },
    expense: {
      name: 'name',
      amount: 'amount',
      frequency: 'frequency',
      charge_date: 'chargeDate',
      'charge date': 'chargeDate',
      next_due_date: 'nextDueDate',
      'next due date': 'nextDueDate',
      category_name: 'categoryName',
      'category name': 'categoryName',
      category: 'categoryName',
      notes: 'notes',
    },
    income: {
      name: 'name',
      source: 'source',
      amount: 'amount',
      frequency: 'frequency',
      next_payment_date: 'nextPaymentDate',
      'next payment date': 'nextPaymentDate',
      notes: 'notes',
    },
  };

  const mapping = columnMappings[entityType];

  // Define field types for each entity type
  const fieldTypes: Record<EntityType, Record<string, 'string' | 'number' | 'date' | 'boolean'>> = {
    account: {
      institution: 'string',
      accountName: 'string',
      balance: 'number',
      accountType: 'string',
      lastUpdated: 'date',
      hidden: 'boolean',
    },
    asset: {
      name: 'string',
      type: 'string',
      value: 'number',
      dateAdded: 'date',
      ticker: 'string',
      exchange: 'string',
      quantity: 'number',
      purchasePrice: 'number',
      purchaseDate: 'date',
      change1D: 'number',
      change1W: 'number',
      institution: 'string',
      notes: 'string',
    },
    liability: {
      name: 'string',
      type: 'string',
      balance: 'number',
      interestRate: 'number',
      monthlyPayment: 'number',
      dueDate: 'date',
      institution: 'string',
    },
    subscription: {
      name: 'string',
      amount: 'number',
      frequency: 'string',
      chargeDate: 'date',
      nextDueDate: 'date',
      categoryName: 'string',
      notes: 'string',
    },
    expense: {
      name: 'string',
      amount: 'number',
      frequency: 'string',
      chargeDate: 'date',
      nextDueDate: 'date',
      categoryName: 'string',
      notes: 'string',
    },
    income: {
      name: 'string',
      source: 'string',
      amount: 'number',
      frequency: 'string',
      nextPaymentDate: 'date',
      notes: 'string',
    },
  };

  const types = fieldTypes[entityType];

  // Normalize column names and values
  Object.entries(row).forEach(([key, value]) => {
    // Strip trailing asterisks from column names (used to indicate required fields in template)
    const normalizedColumnName = key.toLowerCase().trim().replace(/\*+$/, '');
    const normalizedKey = mapping[normalizedColumnName] || key;
    const fieldType = types[normalizedKey];
    
    // Convert empty strings to undefined for optional fields
    if (value === '' || value === null || value === undefined) {
      normalized[normalizedKey] = undefined;
      return;
    }

    // Convert value based on field type
    if (!fieldType) {
      // Unknown field, keep as-is
      normalized[normalizedKey] = value;
      return;
    }

    switch (fieldType) {
      case 'number':
        normalized[normalizedKey] = normalizeNumber(value);
        break;
      case 'date':
        {
          const parsed = parseDate(value as string | number | Date);
          normalized[normalizedKey] = parsed || undefined;
        }
        break;
      case 'boolean':
        normalized[normalizedKey] = normalizeBoolean(value);
        break;
      case 'string':
      default: {
        const normalizedValue = normalizeString(value);
        
        // Apply enum normalization for specific fields
        if (normalizedKey === 'frequency') {
          const normalizedFreq = normalizeFrequency(normalizedValue);
          normalized[normalizedKey] = normalizedFreq || normalizedValue;
        } else if (normalizedKey === 'type' && entityType === 'asset') {
          const normalizedType = normalizeAssetType(normalizedValue);
          normalized[normalizedKey] = normalizedType || normalizedValue;
        } else if (normalizedKey === 'type' && entityType === 'liability') {
          const normalizedType = normalizeLiabilityType(normalizedValue);
          normalized[normalizedKey] = normalizedType || normalizedValue;
        } else if (normalizedKey === 'source' && entityType === 'income') {
          const normalizedSource = normalizeIncomeSource(normalizedValue);
          normalized[normalizedKey] = normalizedSource || normalizedValue;
        } else {
          normalized[normalizedKey] = normalizedValue;
        }
        break;
      }
    }
  });

  return normalized;
}

/**
 * Validate file before parsing
 */
export function validateExcelFile(file: File): { valid: boolean; error?: string } {
  // Check file size (10MB limit)
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 10MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  // Check file type
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/vnd.oasis.opendocument.spreadsheet', // .ods
  ];

  const validExtensions = ['.xlsx', '.xls', '.ods'];

  const hasValidType = validTypes.includes(file.type);
  const hasValidExtension = validExtensions.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!hasValidType && !hasValidExtension) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload an Excel file (.xlsx, .xls, or .ods)',
    };
  }

  return { valid: true };
}

