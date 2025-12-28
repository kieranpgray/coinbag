import * as XLSX from 'xlsx';

/**
 * Generate Excel template file for data import
 */
export function generateImportTemplate(): Blob {
  const workbook = XLSX.utils.book_new();

  // Create Instructions sheet
  const instructionsSheet = createInstructionsSheet();
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  // Create Accounts sheet
  const accountsSheet = createAccountsSheet();
  XLSX.utils.book_append_sheet(workbook, accountsSheet, 'Accounts');

  // Create Assets sheet
  const assetsSheet = createAssetsSheet();
  XLSX.utils.book_append_sheet(workbook, assetsSheet, 'Assets');

  // Create Liabilities sheet
  const liabilitiesSheet = createLiabilitiesSheet();
  XLSX.utils.book_append_sheet(workbook, liabilitiesSheet, 'Liabilities');

  // Create Subscriptions sheet
  const subscriptionsSheet = createSubscriptionsSheet();
  XLSX.utils.book_append_sheet(workbook, subscriptionsSheet, 'Subscriptions');

  // Create Income sheet
  const incomeSheet = createIncomeSheet();
  XLSX.utils.book_append_sheet(workbook, incomeSheet, 'Income');

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
    cellStyles: true,
  });

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Create Instructions sheet
 */
function createInstructionsSheet(): XLSX.WorkSheet {
  const instructions = [
    ['Moneybags Import Template - Instructions'],
    [],
    ['QUICK START'],
    ['1. Fill in data in the appropriate sheets (Accounts, Assets, Liabilities, Subscriptions, Income)'],
    ['2. Leave sheets empty if you don\'t have data for that type'],
    ['3. Required fields are marked with an asterisk (*)'],
    ['4. Save this file and upload it in the Import section'],
    [],
    ['FIELD DESCRIPTIONS'],
    [],
    ['ACCOUNTS'],
    ['- institution*: Bank or financial institution name (e.g., "Chase Bank")'],
    ['- account_name*: Display name of the account (e.g., "Checking Account")'],
    ['- balance*: Current account balance (can be negative for credit cards)'],
    ['- available_balance*: Available balance after holds'],
    ['- account_type*: Type of account (e.g., "Checking", "Savings", "Credit Card")'],
    ['- last_updated*: Last update date (YYYY-MM-DD format)'],
    ['- hidden: Whether account is hidden (true/false, optional)'],
    [],
    ['ASSETS'],
    ['- name*: Asset name (e.g., "House", "Tesla Model 3")'],
    ['- type*: Asset type - must be one of: Real Estate, Investments, Vehicles, Crypto, Cash, Other'],
    ['- value*: Asset value (must be positive)'],
    ['- date_added*: Date added (YYYY-MM-DD format)'],
    ['- change_1d: 1-day change percentage (optional)'],
    ['- change_1w: 1-week change percentage (optional)'],
    ['- institution: Institution name (optional)'],
    ['- notes: Additional notes (optional)'],
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
    ['SUBSCRIPTIONS'],
    ['- name*: Subscription name (e.g., "Netflix", "Spotify")'],
    ['- amount*: Subscription amount (must be between $1-$100,000)'],
    ['- frequency*: Billing frequency - must be one of: weekly, fortnightly, monthly, yearly'],
    ['- charge_date*: Next charge date (YYYY-MM-DD format)'],
    ['- next_due_date*: Next due date (YYYY-MM-DD format, must be >= charge_date)'],
    ['- category_name*: Category name (will be created if it doesn\'t exist)'],
    ['- notes: Additional notes (optional)'],
    [],
    ['INCOME'],
    ['- name*: Income source name (e.g., "Salary", "Freelance Work")'],
    ['- source*: Income source type - must be one of: Salary, Freelance, Business, Investments, Rental, Other'],
    ['- amount*: Income amount (must be positive)'],
    ['- frequency*: Payment frequency - must be one of: weekly, fortnightly, monthly, yearly'],
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

  const ws = XLSX.utils.aoa_to_sheet(instructions);
  
  // Set column widths
  ws['!cols'] = [{ wch: 80 }];
  
  return ws;
}

/**
 * Create Accounts sheet with headers and example row
 */
function createAccountsSheet(): XLSX.WorkSheet {
  const headers = [
    'institution*',
    'account_name*',
    'balance*',
    'available_balance*',
    'account_type*',
    'last_updated*',
    'hidden',
  ];

  const exampleRow = [
    'Chase Bank',
    'Checking Account',
    5000.00,
    5000.00,
    'Checking',
    '2024-12-31',
    false,
  ];

  const data = [headers, exampleRow];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // institution
    { wch: 25 }, // account_name
    { wch: 15 }, // balance
    { wch: 18 }, // available_balance
    { wch: 15 }, // account_type
    { wch: 15 }, // last_updated
    { wch: 10 }, // hidden
  ];

  return ws;
}

/**
 * Create Assets sheet with headers and example row
 */
function createAssetsSheet(): XLSX.WorkSheet {
  const headers = [
    'name*',
    'type*',
    'value*',
    'date_added*',
    'change_1d',
    'change_1w',
    'institution',
    'notes',
  ];

  const exampleRow = [
    'House',
    'Real Estate',
    500000.00,
    '2024-01-15',
    0.5,
    2.3,
    'Real Estate Co',
    'Primary residence',
  ];

  const data = [headers, exampleRow];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // name
    { wch: 15 }, // type
    { wch: 15 }, // value
    { wch: 15 }, // date_added
    { wch: 12 }, // change_1d
    { wch: 12 }, // change_1w
    { wch: 20 }, // institution
    { wch: 30 }, // notes
  ];

  return ws;
}

/**
 * Create Liabilities sheet with headers and example row
 */
function createLiabilitiesSheet(): XLSX.WorkSheet {
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
    'Loans',
    250000.00,
    3.5,
    1500.00,
    '2025-01-15',
    'Bank of America',
  ];

  const data = [headers, exampleRow];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // name
    { wch: 15 }, // type
    { wch: 15 }, // balance
    { wch: 15 }, // interest_rate
    { wch: 15 }, // monthly_payment
    { wch: 15 }, // due_date
    { wch: 20 }, // institution
  ];

  return ws;
}

/**
 * Create Subscriptions sheet with headers and example row
 */
function createSubscriptionsSheet(): XLSX.WorkSheet {
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
    'Netflix',
    15.99,
    'monthly',
    '2024-12-15',
    '2025-01-15',
    'Entertainment',
    'Streaming service',
  ];

  const data = [headers, exampleRow];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // name
    { wch: 12 }, // amount
    { wch: 15 }, // frequency
    { wch: 15 }, // charge_date
    { wch: 15 }, // next_due_date
    { wch: 20 }, // category_name
    { wch: 30 }, // notes
  ];

  return ws;
}

/**
 * Create Income sheet with headers and example row
 */
function createIncomeSheet(): XLSX.WorkSheet {
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

  const data = [headers, exampleRow];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // name
    { wch: 15 }, // source
    { wch: 15 }, // amount
    { wch: 15 }, // frequency
    { wch: 18 }, // next_payment_date
    { wch: 30 }, // notes
  ];

  return ws;
}

