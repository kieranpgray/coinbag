# Localization QA Review Report

## Summary
This report identifies hardcoded user-facing strings that should be translated but are currently missing from the translation files.

## Categories of Missing Translations

### 1. Accounts Page (`src/features/accounts/AccountsPage.tsx`)
- **Account Types Filter**: `'all'`, `'Bank Account'`, `'Savings'`, `'Credit Card'`, `'Loan'`, `'Other'`
- **Search Placeholder**: `"Search accounts..."`
- **Button Labels**: 
  - `"Back to Accounts"`
  - `"ADD NEW ACCOUNT"`
  - `"Try again"`
- **Error Messages**:
  - `"Account not found"`
  - `"The account you're looking for doesn't exist or has been deleted."`
  - `"Unable to load accounts"`
  - `"We couldn't load your accounts. Please try again."`
- **Empty States**:
  - `"No accounts found"`
  - `"All Types"` (for filter)
- **Table Headers**: `"Institution"`, `"Account Name"`, `"Account Type"`, `"Balance"`, `"Last Updated"`, `"Hidden"`, `"Actions"`
- **Labels**: `"Type"`, `"Balance"`, `"Last Updated"`
- **Aria Labels**: `"Delete account"`

### 2. Create Account Modal (`src/features/accounts/components/CreateAccountModal.tsx`)
- **Modal Titles**: 
  - `"Add New Account"`
  - `"Upload Statements"`
- **Descriptions**:
  - `"Create a new account to track your finances and import statements."`
  - `"Optionally upload statement files to import transactions."`

### 3. Transactions (`src/features/transactions/components/TransactionList.tsx`)
- **Page Title**: `"Transactions"`
- **Error Messages**:
  - `"Unable to load transactions"`
  - `"We couldn't load transactions for this account. Please try again."`
- **Empty State**:
  - `"No transactions yet"`
  - `"Transactions will appear here once they are imported or added for this account."`
- **Table Headers**: `"Date"`, `"Description"`, `"Category"`, `"Amount"`, `"Type"`
- **Transaction Types**: `"Income"`, `"Expense"`

### 4. Dashboard (`src/features/dashboard/DashboardPage.tsx`)
- **Page Title**: `"Dashboard"`
- **Error States**:
  - `"No data available"`
  - `"Get started by adding your first asset, liability, or account."`
- **Card Titles**: `"Investments"`, `"Superannuation"`, `"Total Cash"`, `"Total Debts"`
- **Empty State Text**:
  - `"Add investments to track your portfolio value."`
  - `"Add superannuation to track your retirement savings."`
  - `"Add investment"`, `"Add superannuation"`

### 5. Statement Import Review (`src/features/statementImport/components/ReviewScreen.tsx`)
- **Empty State**:
  - `"No transactions found"`
  - `"We couldn't find any transactions in this statement. Please check:"`
  - `"The statement format is supported"`
  - `"The file is readable and not corrupted"`
  - `"The statement contains transaction data"`
- **Button**: `"Go Back"`

### 6. Error Messages in Repositories (`src/data/subscriptions/supabaseRepo.ts`)
- `"An unexpected error occurred"`
- `"You do not have permission to access this subscription"`
- `"The selected category does not exist"`
- `"Invalid frequency value. Must be weekly, fortnightly, monthly, or yearly"`
- `"Invalid data provided"`
- `"Missing required field: ${field}"`
- `"A subscription with these details already exists"`
- `"Subscription not found"`
- `"Authentication required. Please sign in again"`
- `"Network error. Please check your connection and try again"`
- `"An error occurred while processing your request"`

### 7. File Upload (`src/components/shared/MultiStatementFileUpload.tsx`)
- **Error Messages**:
  - `"File size exceeds ${size}MB limit"`
  - `"Invalid file type. Please upload a PDF or image (JPEG/PNG)"`
  - `"Invalid file type. Please upload ${accept}"`
  - `"${file.name} is already in the queue"`
  - `"${file.name}: ${error}"`
  - `"Error"`, `"Upload failed"`

### 8. Aria Labels (Accessibility)
Multiple aria-label attributes throughout the codebase:
- `"Delete account"`
- `"Edit subscription"`, `"Delete subscription"`
- `"Open calendar"`
- `"Previous month"`, `"Next month"`
- `"Toggle between list view and card view"`
- `"Edit goal"`, `"Delete goal"`
- `"Dismiss"`
- `"Add asset"`, `"Add income source"`
- Various section labels: `"Assets section"`, `"Income section"`, `"Liabilities section"`

### 9. Import Validation (`src/features/import/ImportValidation.ts`)
- Error messages with suggestions:
  - `"Invalid frequency "${value}". Did you mean "${normalized}"? Valid values: weekly, fortnightly, monthly, quarterly, yearly"`
  - `"Invalid income source "${value}". Did you mean "${normalized}"? Valid values: Salary, Freelance, Business, Investments, Rental, Other"`

## Priority Classification

### High Priority (User-Facing, Frequently Seen)
1. Account types filter dropdown
2. Error messages (all categories)
3. Empty states
4. Button labels
5. Table headers
6. Page titles

### Medium Priority (User-Facing, Less Frequent)
1. Aria labels (accessibility)
2. Modal titles and descriptions
3. File upload error messages

### Low Priority (Technical/Developer-Facing)
1. Console error messages (can remain untranslated)
2. Internal validation messages (if not user-facing)

## Recommendations

1. **Create new translation keys** for all identified strings
2. **Update components** to use `useTranslation()` hook
3. **Add translation keys** to both en-US and en-AU translation files
4. **Test** locale switching to ensure all strings update correctly
5. **Consider** creating a translation key naming convention document for future additions

## Next Steps

1. Add missing keys to translation files
2. Update components to use translations
3. Test with both locales
4. Document translation key patterns for team

