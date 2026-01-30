/**
 * Deterministic Parser for Bank Statements
 * 
 * Uses regex patterns and heuristics to extract transactions from statement text.
 * This is a fallback when OCR/AI parsing is not available or fails.
 */

import type { TransactionCreate } from '@/contracts/transactions';

export interface ParsedTransaction {
  date: string; // ISO date string (YYYY-MM-DD)
  description: string;
  amount: number; // Positive for credits, negative for debits
  type: 'income' | 'expense';
  transactionReference?: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  errors: string[];
  warnings: string[];
}

/**
 * Common date patterns found in bank statements
 */
const DATE_PATTERNS = [
  // Standard formats
  /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY or DD/MM/YYYY
  /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
  /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i, // DD MMM YYYY
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})/i, // MMM DD, YYYY

  // Additional formats
  /(\d{1,2})-(\d{1,2})-(\d{4})/, // MM-DD-YYYY or DD-MM-YYYY
  /(\d{1,2})\.(\d{1,2})\.(\d{4})/, // DD.MM.YYYY (European)
  /(\d{4})\/(\d{1,2})\/(\d{1,2})/, // YYYY/MM/DD

  // Short formats
  /(\d{1,2})\/(\d{1,2})\/(\d{2})/, // MM/DD/YY
  /(\d{1,2})-(\d{1,2})-(\d{2})/, // MM-DD-YY

  // Australian specific
  /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
];

/**
 * Common amount patterns (handles various formats)
 */
const AMOUNT_PATTERNS = [
  // Currency symbols with decimals
  /[\$£€¥₹₩₦₨₪₫₡₵₺₴₸₼₲₱₭₯₰₳₶₷₹₻₽₾₿]?([\d,]+\.?\d{0,2})/, // $1,234.56 or 1234.56
  /([\d,]+\.\d{2})/, // 1234.56 (no currency symbol)
  /([\d,]+\.\d{1})/, // 1234.5 (single decimal)

  // Whole numbers
  /[\$£€¥₹₩₦₨₪₫₡₵₺₴₸₼₲₱₭₯₰₳₶₷₹₻₽₾₿]?([\d,]+)/, // $1234 or 1234

  // Negative amounts (debits)
  /\(([\d,]+\.?\d{0,2})\)/, // (1234.56)
  /-([\d,]+\.?\d{0,2})/, // -1234.56
  /CR ([\d,]+\.?\d{0,2})/i, // CR 1234.56
  /DR ([\d,]+\.?\d{0,2})/i, // DR 1234.56
];

/**
 * Common transaction reference patterns
 */
const REFERENCE_PATTERNS = [
  /Ref[:\s]+([A-Z0-9-]+)/i,
  /Reference[:\s]+([A-Z0-9-]+)/i,
  /Txn[:\s]+([A-Z0-9-]+)/i,
  /Transaction[:\s]+([A-Z0-9-]+)/i,
  /ID[:\s]+([A-Z0-9-]+)/i,
  /Number[:\s]+([A-Z0-9-]+)/i,
  /Code[:\s]+([A-Z0-9-]+)/i,
];

/**
 * Bank-specific keywords for transaction type detection
 */
const INCOME_KEYWORDS = [
  'salary', 'wage', 'deposit', 'credit', 'refund', 'interest', 'dividend',
  'transfer in', 'payment received', 'income', 'bonus', 'commission',
  'pension', 'superannuation', 'government payment', 'tax refund',
  'direct deposit', 'payroll', 'reimbursement'
];

const EXPENSE_KEYWORDS = [
  'debit', 'withdrawal', 'payment', 'purchase', 'transfer out',
  'fee', 'charge', 'atm withdrawal', 'pos purchase', 'online purchase',
  'bill payment', 'subscription', 'insurance', 'utility', 'rent',
  'mortgage', 'loan payment', 'credit card payment'
];

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/**
 * Parse a date string into ISO format (YYYY-MM-DD)
 * 
 * @param dateStr - Date string to parse
 * @param locale - Locale code (e.g., 'en-US', 'en-AU') to determine date format preference
 */
function parseDate(dateStr: string, locale: string = 'en-US'): string | null {
  // Try MM/DD/YYYY or DD/MM/YYYY
  const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, part1, part2, year] = slashMatch;
    if (part1 && part2 && year) {
      // Use locale to determine format: en-US uses MM/DD/YYYY, en-AU uses DD/MM/YYYY
      const effectiveLocale = locale || 'en-US';
      const isUSFormat = effectiveLocale === 'en-US' || !effectiveLocale.startsWith('en-AU');
      const month = parseInt(isUSFormat ? part1 : part2, 10);
      const day = parseInt(isUSFormat ? part2 : part1, 10);
      if (!isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      }
    }
  }

  // Try YYYY-MM-DD
  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return dateStr; // Already in ISO format
  }

  // Try DD MMM YYYY
  const dayMonthMatch = dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
  if (dayMonthMatch) {
    const [, dayStr, monthName, year] = dayMonthMatch;
    if (dayStr && monthName && year) {
      const month = MONTH_NAMES[monthName.toLowerCase()];
      if (month) {
        return `${year}-${month.toString().padStart(2, '0')}-${dayStr.padStart(2, '0')}`;
      }
    }
  }

  // Try MMM DD, YYYY
  const monthDayMatch = dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})/i);
  if (monthDayMatch) {
    const [, monthName, dayStr, year] = monthDayMatch;
    if (monthName && dayStr && year) {
      const month = MONTH_NAMES[monthName.toLowerCase()];
      if (month) {
        return `${year}-${month.toString().padStart(2, '0')}-${dayStr.padStart(2, '0')}`;
      }
    }
  }

  return null;
}

/**
 * Parse an amount string into a number
 */
function parseAmount(amountStr: string): number | null {
  if (!amountStr) return null;

  // Handle various formats
  let cleaned = amountStr
    .replace(/[\$,£€¥₹₩₦₨₪₫₡₵₺₴₸₼₲₱₭₯₰₳₶₷₹₻₽₾₿\s]/g, '') // Remove currency symbols and whitespace
    .replace(/,/g, ''); // Remove commas

  // Handle negative indicators
  let isNegative = false;
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    // (1234.56) format
    isNegative = true;
    cleaned = cleaned.slice(1, -1);
  } else if (cleaned.startsWith('-')) {
    // -1234.56 format
    isNegative = true;
    cleaned = cleaned.slice(1);
  }

  // Handle CR/DR notation
  if (cleaned.toLowerCase().includes('dr')) {
    isNegative = true;
    cleaned = cleaned.replace(/dr/i, '');
  } else if (cleaned.toLowerCase().includes('cr')) {
    // CR is typically credit (positive)
    cleaned = cleaned.replace(/cr/i, '');
  }

  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) {
    return null;
  }

  return isNegative ? -parsed : parsed;
}

/**
 * Determine transaction type based on amount and context
 */
function determineTransactionType(amount: number, description: string): 'income' | 'expense' {
  const lowerDesc = description.toLowerCase();

  // Check for explicit income keywords first
  if (INCOME_KEYWORDS.some(keyword => lowerDesc.includes(keyword))) {
    return 'income';
  }

  // Check for explicit expense keywords
  if (EXPENSE_KEYWORDS.some(keyword => lowerDesc.includes(keyword))) {
    return 'expense';
  }

  // Amount-based heuristics (with some intelligence)
  if (amount < 0) {
    return 'expense'; // Negative amounts are typically expenses
  }

  // For positive amounts, use contextual clues
  // Large amounts (> $500) are more likely to be income
  if (amount > 500) {
    return 'income';
  }

  // Medium amounts ($50-$500) could be either, but check for expense patterns
  if (amount >= 50 && amount <= 500) {
    // Check for expense indicators in description
    const expenseIndicators = ['purchase', 'payment', 'fee', 'charge', 'withdrawal'];
    if (expenseIndicators.some(indicator => lowerDesc.includes(indicator))) {
      return 'expense';
    }
  }

  // Small amounts (< $50) are often expenses (tips, fees, etc.)
  if (amount < 50) {
    return 'expense';
  }

  // Default to expense for ambiguous cases
  return 'expense';
}

/**
 * Parse statement text into transactions
 * 
 * This is a basic implementation that looks for common patterns.
 * It can be enhanced with bank-specific parsers.
 * 
 * @param text - Statement text to parse
 * @param locale - Locale code (e.g., 'en-US', 'en-AU') for date format preference
 */
export function parseStatementText(text: string, locale: string = 'en-US'): ParseResult {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Split text into lines and clean them
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    // Remove very short lines (likely artifacts)
    .filter(line => line.length > 3)
    // Remove lines that are just numbers or symbols
    .filter(line => !line.match(/^[\d\s\.,\-+]+$|^[^\w\s]+$/));

  if (lines.length === 0) {
    errors.push('No usable text found in statement. The file may be corrupted or empty.');
    return { transactions, errors, warnings };
  }

  // Look for transaction patterns
  // Common pattern: Date Description Amount
  // Example: "01/15/2024 GROCERY STORE $45.67"

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Skip header/footer lines and page artifacts
    if (line.match(/^(Statement|Account|Balance|Date|Description|Amount|Total|Page|Generated|Report)/i)) {
      continue;
    }

    // Skip lines with mostly numbers or symbols
    if (line.match(/^[\d\s\/\-\.,]+$/) || line.match(/^\d+\s+of\s+\d+$/)) {
      continue;
    }

    // Try to find date in the line
    let dateStr: string | null = null;

    for (const pattern of DATE_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        dateStr = match[0];
        break;
      }
    }

    if (!dateStr) {
      continue; // Skip lines without recognizable dates
    }

    // Parse date
    const parsedDate = parseDate(dateStr, locale || 'en-US');
    if (!parsedDate) {
      warnings.push(`Could not parse date: ${dateStr} on line ${i + 1}`);
      continue;
    }

    // Try to find amount (usually at the end of the line)
    let amountStr: string | null = null;
    let amountMatch: RegExpMatchArray | null = null;
    let description: string;

    // Search for amounts from the end of the line backwards
    const words = line.split(/\s+/);
    for (let j = words.length - 1; j >= 0; j--) {
      const word = words[j];
      if (!word) continue; // Skip empty words
      for (const pattern of AMOUNT_PATTERNS) {
        const match = word.match(pattern);
        if (match) {
          amountStr = match[1] || match[0];
          amountMatch = match;
          break;
        }
      }
      if (amountStr) break;
    }

    // If no amount found at end, try searching the whole line
    if (!amountStr) {
      for (const pattern of AMOUNT_PATTERNS) {
        const matches = line.matchAll(new RegExp(pattern, 'g'));
        const allMatches = Array.from(matches);
        if (allMatches.length > 0) {
          // Take the last match (usually the transaction amount)
          const lastMatch = allMatches[allMatches.length - 1];
          if (lastMatch) {
            amountMatch = lastMatch;
            amountStr = amountMatch[1] || amountMatch[0];
            break;
          }
        }
      }
    }

    if (!amountStr) {
      warnings.push(`Could not find amount on line ${i + 1}: ${line}`);
      continue;
    }

    // Parse amount with better handling
    const parsedAmount = parseAmount(amountStr);
    if (parsedAmount === null) {
      warnings.push(`Could not parse amount: ${amountStr} on line ${i + 1}`);
      continue;
    }

    // Extract description (everything between date and amount)
    const dateIndex = line.indexOf(dateStr);
    const amountIndex = line.lastIndexOf(amountStr);

    if (amountIndex <= dateIndex) {
      // Amount appears before date, try alternative extraction
      const parts = line.split(/\s+/);
      const datePartIndex = parts.findIndex(part => part.includes(dateStr));
      const amountPartIndex = parts.findIndex(part => part.includes(amountStr));

      if (datePartIndex >= 0 && amountPartIndex >= 0 && datePartIndex < amountPartIndex) {
        const descParts = parts.slice(datePartIndex + 1, amountPartIndex);
        description = descParts.join(' ').trim();
      } else {
        description = line.substring(dateIndex + dateStr.length).replace(amountStr, '').trim();
      }
    } else {
      description = line.substring(dateIndex + dateStr.length, amountIndex).trim();
    }

    // Clean up description
    description = description
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^[\s\-–—]+|[\s\-–—]+$/g, '') // Remove leading/trailing dashes
      .trim();

    if (!description || description.length < 2) {
      warnings.push(`Empty or too short description on line ${i + 1}: "${description}"`);
      continue;
    }

    // Try to find transaction reference
    let transactionReference: string | undefined;
    for (const pattern of REFERENCE_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        transactionReference = match[1];
        break;
      }
    }

    // Determine transaction type with improved logic
    const type = determineTransactionType(parsedAmount, description);

    // Check for duplicates (same date, description, and amount)
    const isDuplicate = transactions.some(t =>
      t.date === parsedDate &&
      t.description.toLowerCase() === description.toLowerCase() &&
      Math.abs(t.amount - parsedAmount) < 0.01 // Allow small floating point differences
    );

    if (isDuplicate) {
      warnings.push(`Duplicate transaction found and skipped: ${parsedDate} ${description} ${parsedAmount}`);
      continue;
    }

    transactions.push({
      date: parsedDate,
      description,
      amount: parsedAmount,
      type,
      transactionReference,
    });
  }

  if (transactions.length === 0) {
    errors.push('No transactions found in statement text. The statement format may not be supported, or the OCR quality may be poor.');
  } else {
    // Sort transactions by date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  return {
    transactions,
    errors,
    warnings,
  };
}

/**
 * Convert parsed transactions to TransactionCreate format
 */
export function convertToTransactionCreate(
  parsed: ParsedTransaction[],
  accountId: string,
  statementImportId?: string
): TransactionCreate[] {
  return parsed.map((txn) => ({
    accountId,
    date: txn.date,
    description: txn.description,
    amount: txn.amount,
    type: txn.type,
    category: undefined, // Will be set by user or categorization logic
    transactionReference: txn.transactionReference,
    statementImportId,
  }));
}

