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
  /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY or DD/MM/YYYY
  /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
  /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i, // DD MMM YYYY
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})/i, // MMM DD, YYYY
];

/**
 * Common amount patterns (handles various formats)
 */
const AMOUNT_PATTERNS = [
  /[\$]?([\d,]+\.?\d{0,2})/, // $1,234.56 or 1234.56
  /([\d,]+\.\d{2})/, // 1234.56
  /([\d,]+)/, // 1234
];

/**
 * Common transaction reference patterns
 */
const REFERENCE_PATTERNS = [
  /Ref[:\s]+([A-Z0-9]+)/i,
  /Reference[:\s]+([A-Z0-9]+)/i,
  /Txn[:\s]+([A-Z0-9]+)/i,
  /Transaction[:\s]+([A-Z0-9]+)/i,
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
  // Remove currency symbols and whitespace
  const cleaned = amountStr.replace(/[\$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Determine transaction type based on amount and context
 */
function determineTransactionType(amount: number, description: string): 'income' | 'expense' {
  // If amount is negative, it's typically an expense
  if (amount < 0) {
    return 'expense';
  }

  // Check description for common income keywords
  const incomeKeywords = ['salary', 'wage', 'deposit', 'credit', 'refund', 'interest', 'dividend', 'transfer in'];
  const lowerDesc = description.toLowerCase();
  if (incomeKeywords.some(keyword => lowerDesc.includes(keyword))) {
    return 'income';
  }

  // Default to expense for positive amounts (debits)
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

  // Split text into lines
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Look for transaction patterns
  // Common pattern: Date Description Amount
  // Example: "01/15/2024 GROCERY STORE $45.67"
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    // Skip header/footer lines
    if (line.match(/^(Statement|Account|Balance|Date|Description|Amount|Total)/i)) {
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
      continue; // Skip lines without dates
    }

    // Parse date
    const parsedDate = parseDate(dateStr, locale || 'en-US');
    if (!parsedDate) {
      warnings.push(`Could not parse date: ${dateStr} on line ${i + 1}`);
      continue;
    }

    // Try to find amount (usually at the end of the line)
    let amountMatch: RegExpMatchArray | null = null;
    let amountStr: string | null = null;
    
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

    if (!amountStr) {
      warnings.push(`Could not find amount on line ${i + 1}: ${line}`);
      continue;
    }

    // Parse amount
    const parsedAmount = parseAmount(amountStr);
    if (parsedAmount === null) {
      warnings.push(`Could not parse amount: ${amountStr} on line ${i + 1}`);
      continue;
    }

    // Extract description (everything between date and amount)
    const dateIndex = line.indexOf(dateStr);
    const amountIndex = line.indexOf(amountStr);
    let description = line.substring(dateIndex + dateStr.length, amountIndex).trim();
    
    // Clean up description
    description = description.replace(/\s+/g, ' ').trim();
    
    if (!description) {
      warnings.push(`Empty description on line ${i + 1}`);
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

    // Determine transaction type
    const type = determineTransactionType(parsedAmount, description);

    transactions.push({
      date: parsedDate,
      description,
      amount: parsedAmount,
      type,
      transactionReference,
    });
  }

  if (transactions.length === 0) {
    errors.push('No transactions found in statement text. The statement format may not be supported.');
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

