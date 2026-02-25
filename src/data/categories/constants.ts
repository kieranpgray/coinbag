// src/data/categories/constants.ts
export const DEFAULT_CATEGORY_NAMES = [
  'Uncategorised',
  'Streaming', 'Entertainment', 'Software', 'Cloud Storage', 'Gym Membership', 'News & Media',
  'Utilities', 'Electricity', 'Gas', 'Water', 'Phone / Internet', 'Insurance', 'Rent', 'Mortgage',
  'Credit Card', 'Student Loan', 'Personal Loan', 'Car Loan', 'Home Loan', 'Loan Repayments', 'Credit Card Payments',
  'Savings', 'Emergency Fund', 'Investment', 'Retirement / Superannuation / 401k',
  'Groceries', 'Food', 'Transportation', 'Public Transport', 'Fuel', 'Health', 'Medical', 'Pharmacy', 'Education', 'Childcare / School Fees',
  'Dining Out', 'Coffee', 'Shopping', 'Clothing', 'Hobbies', 'Travel', 'Personal Care', 'Medicine / Pharmacy', 'Technology & Gadgets', 'Home Maintenance', 'Big Purchase', 'Gifts', 'Donations', 'Miscellaneous', 'Cash Withdrawals',
] as const;

export type DefaultCategoryName = typeof DEFAULT_CATEGORY_NAMES[number];