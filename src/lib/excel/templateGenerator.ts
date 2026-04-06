import ExcelJS from 'exceljs';
import { DEFAULT_CATEGORY_NAMES } from '@/data/categories/constants';

/**
 * Generate Excel template file for data import
 */
export function generateImportTemplate(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const workbook = new ExcelJS.Workbook();

    try {
      // Create Instructions sheet
      const instructionsSheet = createInstructionsSheet(workbook);
      instructionsSheet.state = 'visible';

      // Create Categories sheet (must be created before Expenses for data validation reference)
      const categoriesSheet = createCategoriesSheet(workbook);
      categoriesSheet.state = 'hidden';

      // Create Accounts sheet
      const accountsSheet = createAccountsSheet(workbook);
      accountsSheet.state = 'visible';

      // Create Assets sheet
      const assetsSheet = createAssetsSheet(workbook);
      assetsSheet.state = 'visible';

      // Create Liabilities sheet
      const liabilitiesSheet = createLiabilitiesSheet(workbook);
      liabilitiesSheet.state = 'visible';

      // Create Expenses sheet with data validation
      const expensesSheet = createExpensesSheet(workbook);
      expensesSheet.state = 'visible';

      // Create Income sheet
      const incomeSheet = createIncomeSheet(workbook);
      incomeSheet.state = 'visible';

      // Generate Excel file
      workbook.xlsx.writeBuffer().then(buffer => {
        resolve(new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }));
      }).catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Create Categories sheet with all available expense categories
 */
function createCategoriesSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const worksheet = workbook.addWorksheet('Categories');

  // Set column width
  worksheet.getColumn(1).width = 35;

  // Add header
  worksheet.addRow(['Available Categories']);

  // Add all categories
  DEFAULT_CATEGORY_NAMES.forEach(category => {
    worksheet.addRow([category]);
  });

  return worksheet;
}

/**
 * Create Instructions sheet
 */
function createInstructionsSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const worksheet = workbook.addWorksheet('Instructions');

  const instructions = [
    ['Supafolio Import Template - Instructions'],
    [],
    ['QUICK START'],
    ['1. Fill in data in the appropriate sheets (Accounts, Assets, Liabilities, Expenses, Income)'],
    ['2. Leave sheets empty if you don\'t have data for that type'],
    ['3. Required fields are marked with an asterisk (*)'],
    ['4. Save this file and upload it in the Import section'],
    [],
    ['FIELD DESCRIPTIONS'],
    [],
    ['CATEGORIES'],
    ['- Reference sheet listing all supported expense categories'],
    ['- Use the dropdown in the Expenses sheet to select; do not type category names manually'],
    [],
    ['ACCOUNTS'],
    ['- institution: Bank or financial institution name (optional, e.g., "Chase Bank")'],
    ['- account_name*: Display name of the account (e.g., "Bank Account")'],
    ['- balance*: Current account balance (can be negative for credit cards)'],
    ['- account_type*: Type of account (e.g., "Bank Account", "Savings", "Credit Card")'],
    ['- last_updated*: Last update date (YYYY-MM-DD format)'],
    ['- hidden: Whether account is hidden (true/false, optional)'],
    [],
    ['ASSETS'],
    ['- name*: Asset name (e.g., "House", "Tesla Model 3"). For Crypto/Shares lots, can be omitted; ticker is used.'],
    ['- type*: Asset type - must be one of: Property, Other asset, Vehicle, Crypto, Cash, Super, Shares, RSUs'],
    ['- value*: Asset value (must be positive). For Crypto/Shares: current value of the holding.'],
    ['- date_added*: Date added (YYYY-MM-DD format)'],
    ['- ticker: Share ticker or crypto symbol (e.g., AAPL, BTC). Use for Crypto and Shares; name can be omitted.'],
    ['- exchange: Exchange (e.g., NASDAQ, NYSE, ASX). Optional for Shares.'],
    ['- quantity: Number of shares or units. For Crypto/Shares lots.'],
    ['- purchase_price: Price per share/unit at purchase. Optional for Crypto/Shares.'],
    ['- purchase_date: Date of purchase (YYYY-MM-DD). Optional for Crypto/Shares.'],
    ['- change_1d: 1-day change percentage (optional)'],
    ['- change_1w: 1-week change percentage (optional)'],
    ['- institution: Institution name (optional)'],
    ['- notes: Additional notes (optional)'],
    ['Multiple rows for Crypto or Shares: Add one row per purchase (lot); each row creates one asset. E.g. two BTC buys = two rows.'],
    [],
    ['LIABILITIES'],
    ['- name*: Liability name (e.g., "Mortgage", "Credit Card")'],
    ['- type*: Liability type - must be one of: Loans, Credit Cards, Other'],
    ['- balance*: Current balance owed (must be positive)'],
    ['- interest_rate: Interest rate percentage (0-100, optional)'],
    ['- monthly_payment: Monthly payment amount (optional)'],
    ['- due_date: Due date (YYYY-MM-DD format, optional)'],
    ['- institution: Institution name (optional)'],
    [],
    ['EXPENSES'],
    ['- name*: Expense name (e.g., "Netflix", "Rent", "Groceries")'],
    ['- amount*: Expense amount (must be between $1-$100,000)'],
    ['- frequency*: Billing frequency - must be one of: weekly, fortnightly, monthly, quarterly, yearly'],
    ['- charge_date*: Next charge date (YYYY-MM-DD format)'],
    ['- next_due_date*: Next due date (YYYY-MM-DD format, must be >= charge_date)'],
    ['- category_name*: Select from the dropdown list (matches supported categories)'],
    ['- notes: Additional notes (optional)'],
    [],
    ['INCOME'],
    ['- name*: Income source name (e.g., "Salary", "Freelance Work")'],
    ['- source*: Income source type - must be one of: Salary, Freelance, Business, Investments, Rental, Other'],
    ['- amount*: Income amount (must be positive)'],
    ['- frequency*: Payment frequency - must be one of: weekly, fortnightly, monthly, quarterly, yearly'],
    ['- next_payment_date*: Next payment date (YYYY-MM-DD format)'],
    ['- notes: Additional notes (optional)'],
    [],
    ['DATE FORMATS'],
    ['All dates should be in YYYY-MM-DD format (e.g., 2024-12-31)'],
    ['Alternative formats accepted: MM/DD/YYYY, DD/MM/YYYY'],
    [],
    ['COMMON ERRORS'],
    ['- Invalid date format: Use YYYY-MM-DD format'],
    ['- Missing required fields: All fields marked with * are required'],
    ['- Invalid enum values: Use only the values listed in field descriptions'],
    ['- Negative values: Asset values and liability balances must be positive'],
    ['- Amount ranges: Subscription amounts must match frequency ranges'],
    [],
    ['SUPPORT'],
    ['For help, visit the Import section in Settings or contact support.'],
  ];

  instructions.forEach(row => {
    worksheet.addRow(row);
  });

  // Set column width
  worksheet.getColumn(1).width = 80;

  return worksheet;
}

/**
 * Create Accounts sheet with headers and example row
 */
function createAccountsSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const worksheet = workbook.addWorksheet('Accounts');

  const headers = [
    'institution',
    'account_name*',
    'balance*',
    'account_type*',
    'last_updated*',
    'hidden',
  ];

  const exampleRow = [
    'Chase Bank',
    'Bank Account',
    5000.00,
    'Bank Account',
    '2024-12-31',
    false,
  ];

  worksheet.addRow(headers);
  worksheet.addRow(exampleRow);

  // Set column widths
  worksheet.getColumn(1).width = 20; // institution
  worksheet.getColumn(2).width = 25; // account_name
  worksheet.getColumn(3).width = 15; // balance
  worksheet.getColumn(4).width = 15; // account_type
  worksheet.getColumn(5).width = 15; // last_updated
  worksheet.getColumn(6).width = 10; // hidden

  return worksheet;
}

/**
 * Create Assets sheet with headers and example row
 */
function createAssetsSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const worksheet = workbook.addWorksheet('Assets');

  const headers = [
    'name*',
    'type*',
    'value*',
    'date_added*',
    'ticker',
    'exchange',
    'quantity',
    'purchase_price',
    'purchase_date',
    'change_1d',
    'change_1w',
    'institution',
    'notes',
  ];

  const exampleRow = [
    'House',
    'Property',
    500000.00,
    '2024-01-15',
    '',
    '',
    '',
    '',
    '',
    0.5,
    2.3,
    'Real Estate Co',
    'Primary residence',
  ];

  worksheet.addRow(headers);
  worksheet.addRow(exampleRow);

  // Set column widths
  worksheet.getColumn(1).width = 20; // name
  worksheet.getColumn(2).width = 15; // type
  worksheet.getColumn(3).width = 15; // value
  worksheet.getColumn(4).width = 15; // date_added
  worksheet.getColumn(5).width = 12; // ticker
  worksheet.getColumn(6).width = 12; // exchange
  worksheet.getColumn(7).width = 12; // quantity
  worksheet.getColumn(8).width = 14; // purchase_price
  worksheet.getColumn(9).width = 14; // purchase_date
  worksheet.getColumn(10).width = 12; // change_1d
  worksheet.getColumn(11).width = 12; // change_1w
  worksheet.getColumn(12).width = 20; // institution
  worksheet.getColumn(13).width = 30; // notes

  return worksheet;
}

/**
 * Create Liabilities sheet with headers and example row
 */
function createLiabilitiesSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const worksheet = workbook.addWorksheet('Liabilities');

  const headers = [
    'name*',
    'type*',
    'balance*',
    'interest_rate',
    'monthly_payment',
    'due_date',
    'institution',
  ];

  const exampleRow = [
    'Mortgage',
    'Home loan',
    250000.00,
    3.5,
    1500.00,
    '2025-01-15',
    'Bank of America',
  ];

  worksheet.addRow(headers);
  worksheet.addRow(exampleRow);

  // Set column widths
  worksheet.getColumn(1).width = 20; // name
  worksheet.getColumn(2).width = 15; // type
  worksheet.getColumn(3).width = 15; // balance
  worksheet.getColumn(4).width = 15; // interest_rate
  worksheet.getColumn(5).width = 15; // monthly_payment
  worksheet.getColumn(6).width = 15; // due_date
  worksheet.getColumn(7).width = 20; // institution

  return worksheet;
}

/**
 * Create Expenses sheet with headers, example row, and data validation
 */
function createExpensesSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const worksheet = workbook.addWorksheet('Expenses');

  const headers = [
    'name*',
    'amount*',
    'frequency*',
    'charge_date*',
    'next_due_date*',
    'category_name*',
    'notes',
  ];

  const exampleRow = [
    'Weekly Groceries',
    120.00,
    'weekly',
    '2024-12-15',
    '2024-12-22',
    'Groceries',
    'Weekly food shopping',
  ];

  worksheet.addRow(headers);
  worksheet.addRow(exampleRow);

  // Set column widths
  worksheet.getColumn(1).width = 20; // name
  worksheet.getColumn(2).width = 12; // amount
  worksheet.getColumn(3).width = 15; // frequency
  worksheet.getColumn(4).width = 15; // charge_date
  worksheet.getColumn(5).width = 15; // next_due_date
  worksheet.getColumn(6).width = 20; // category_name
  worksheet.getColumn(7).width = 30; // notes

  // TODO: Add data validation to category_name column (column F, starting from row 2)
  // const lastCategoryRow = DEFAULT_CATEGORY_NAMES.length + 1;
  // (worksheet as any).dataValidations.add('F2:F1000', {
  //   type: 'list',
  //   allowBlank: false,
  //   formulae: [`=Categories!$A$2:$A$${lastCategoryRow}`],
  //   showErrorMessage: true,
  //   errorTitle: 'Invalid Category',
  //   error: 'Please select a category from the dropdown list.',
  //   showInputMessage: true,
  //   promptTitle: 'Select Category',
  //   prompt: 'Choose from the predefined categories.',
  // });

  return worksheet;
}

/**
 * Create Income sheet with headers and example row
 */
function createIncomeSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const worksheet = workbook.addWorksheet('Income');

  const headers = [
    'name*',
    'source*',
    'amount*',
    'frequency*',
    'next_payment_date*',
    'notes',
  ];

  const exampleRow = [
    'Salary',
    'Salary',
    5000.00,
    'monthly',
    '2025-01-01',
    'Monthly salary',
  ];

  worksheet.addRow(headers);
  worksheet.addRow(exampleRow);

  // Set column widths
  worksheet.getColumn(1).width = 20; // name
  worksheet.getColumn(2).width = 15; // source
  worksheet.getColumn(3).width = 15; // amount
  worksheet.getColumn(4).width = 15; // frequency
  worksheet.getColumn(5).width = 18; // next_payment_date
  worksheet.getColumn(6).width = 30; // notes

  return worksheet;
}

