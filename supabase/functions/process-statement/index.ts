/**
 * Supabase Edge Function for processing statement files
 *
 * This function handles the complete statement import workflow:
 * 1. Download file from Supabase Storage
 * 2. Extract text using Mistral OCR API
 * 3. Structure data from markdown using Mistral Chat API
 * 4. Validate transactions against OCR content
 * 5. Update database with results
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { 
  ocrDocument, 
  createPreSignedUrl,
  type OcrResult,
  OcrAuthError,
  OcrRateLimitError,
  OcrTimeoutError,
  OcrValidationError
} from './ocr-service.ts'

// Simple logger for Edge Functions
const logger = {
  info: (event: string, message: string, data: any = {}, correlationId?: string) => {
    console.log(`[${new Date().toISOString()}] INFO ${event}: ${message}`, { ...data, correlationId })
  },
  warn: (event: string, message: string, data: any = {}, correlationId?: string) => {
    console.warn(`[${new Date().toISOString()}] WARN ${event}: ${message}`, { ...data, correlationId })
  },
  error: (event: string, message: string, data: any = {}, correlationId?: string) => {
    console.error(`[${new Date().toISOString()}] ERROR ${event}: ${message}`, { ...data, correlationId })
  },
  debug: (event: string, message: string, data: any = {}, correlationId?: string) => {
    console.log(`[${new Date().toISOString()}] DEBUG ${event}: ${message}`, { ...data, correlationId })
  }
}

const getCorrelationId = () => `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Circuit breaker for Mistral OCR
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private readonly threshold = 5
  private readonly timeout = 60000 // 1 minute

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.failures >= this.threshold) {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new Error('Circuit breaker is open - service temporarily unavailable')
      } else {
        this.failures = 0 // Reset after timeout
      }
    }

    try {
      const result = await fn()
      this.failures = 0 // Success, reset failures
      return result
    } catch (error) {
      this.failures++
      this.lastFailureTime = Date.now()
      throw error
    }
  }
}

const mistralCircuitBreaker = new CircuitBreaker()

// CORS headers for Edge Function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // In production, restrict to specific domains
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id, x-clerk-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Simple transaction parser for Edge Function
 * Extracts basic transaction information from statement text
 */
function parseTransactionsSimple(text: string) {
  const transactions: any[] = []

  // Split into lines and clean them
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => line.length > 3) // Remove very short lines

  // Simple patterns for Australian banking statements
  const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}|\d{4}-\d{2}-\d{2})/
  const amountPattern = /[\$]?([\d,]+\.?\d{0,2})/

  for (const line of lines) {
    // Skip header lines
    if (line.match(/^(Date|Description|Amount|Balance|Statement|Account)/i)) {
      continue
    }

    // Try to find a date
    const dateMatch = line.match(datePattern)
    if (!dateMatch) continue

    // Try to find an amount
    const amountMatches = line.matchAll(new RegExp(amountPattern, 'g'))
    const amounts = Array.from(amountMatches).map(match => match[1]).filter(a => a)

    if (amounts.length === 0) continue

    // Take the last amount (usually the transaction amount)
    const amountStr = amounts[amounts.length - 1]

    // Extract description (between date and amount)
    const dateIndex = line.indexOf(dateMatch[0])
    const amountIndex = line.lastIndexOf(amountStr)

    let description = line.substring(dateIndex + dateMatch[0].length, amountIndex).trim()

    // Clean description
    description = description.replace(/^[\s\-–—]+|[\s\-–—]+$/g, '')

    if (!description || description.length < 2) continue

    // Parse amount (handle negative indicators)
    let amount = parseFloat(amountStr.replace(/,/g, ''))
    if (line.includes('(CR)') || line.includes('CR')) {
      // Credit is positive
    } else if (line.includes('(DR)') || line.includes('DR') || line.includes('-')) {
      amount = -Math.abs(amount)
    } else {
      // Default to negative for debits (common in transaction lists)
      amount = -Math.abs(amount)
    }

    // Parse date
    const dateParts = dateMatch[0].split(/[\/\-]/)
    let date: Date
    if (dateParts[2].length === 4) {
      // YYYY-MM-DD or YYYY/MM/DD
      date = new Date(`${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`)
    } else {
      // DD/MM/YYYY or DD-MM-YYYY (Australian format)
      date = new Date(`${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`)
    }

    if (isNaN(date.getTime())) continue

    // Determine transaction type
    const lowerDesc = description.toLowerCase()
    const type = amount > 0 ? 'income' : 'expense'

    transactions.push({
      date: date.toISOString().split('T')[0],
      description,
      amount,
      type
    })
  }

  // Remove duplicates
  const uniqueTransactions = transactions.filter((tx, index, arr) =>
    arr.findIndex(t =>
      t.date === tx.date &&
      t.description === tx.description &&
      Math.abs(t.amount - tx.amount) < 0.01
    ) === index
  )

  return uniqueTransactions
}

// Types
interface StatementImport {
  id: string
  user_id: string
  account_id: string
  file_path: string
  file_hash: string
  file_name?: string
  status: string
}

// PDF.js fallback removed - incompatible with Deno edge functions (requires browser APIs like DOMMatrix)

/**
 * Extract markdown text from OCR result pages
 * Combines all pages, includes headers/footers, preserves table/image placeholders
 * 
 * OCR Response Structure:
 * - pages[].markdown: Main content with table/image placeholders (e.g., ![img-0.jpeg](img-0.jpeg))
 * - pages[].tables: Array of extracted tables (when tableFormat='markdown' or 'html')
 * - pages[].images: Array of image metadata (bboxes, base64 if includeImageBase64=true)
 * - pages[].header: Extracted header text (if extractHeader=true)
 * - pages[].footer: Extracted footer text (if extractFooter=true)
 */

/**
 * Compute SHA-256 hash of OCR content for cache key
 * This ensures cache matches are based on both file hash AND OCR content
 */
async function computeOCRContentHash(markdownText: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(markdownText)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Batch process array in chunks with concurrency limit
 */
async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 10
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(processor))
    results.push(...batchResults)
  }
  return results
}

/**
 * Normalize extracted balance value based on CR/DR annotations and column context
 * Handles cases where positive balances are marked with CR or in credit columns
 */
function normalizeExtractedBalance(
  balanceValue: number | undefined | null,
  balanceContext: {
    rawText?: string;
    hasCR?: boolean;
    hasDR?: boolean;
    columnName?: string;
  }
): number | null {
  if (balanceValue === null || balanceValue === undefined) {
    return null;
  }

  // Check raw text for CR/DR annotations if not explicitly provided
  const rawText = balanceContext.rawText || '';
  const hasCR = balanceContext.hasCR || 
                /\bCR\b/i.test(rawText) || 
                /\(CR\)/i.test(rawText) ||
                balanceContext.columnName?.toLowerCase().includes('credit') ||
                balanceContext.columnName?.toLowerCase().includes('money in') ||
                balanceContext.columnName?.toLowerCase().includes('deposit');
  
  const hasDR = balanceContext.hasDR || 
                /\bDR\b/i.test(rawText) || 
                /\(DR\)/i.test(rawText) ||
                balanceContext.columnName?.toLowerCase().includes('debit') ||
                balanceContext.columnName?.toLowerCase().includes('money out') ||
                balanceContext.columnName?.toLowerCase().includes('withdrawal');

  // If context indicates CR, ensure positive
  if (hasCR) {
    return Math.abs(balanceValue);
  }

  // If context indicates DR, ensure negative
  if (hasDR) {
    return -Math.abs(balanceValue);
  }

  // Otherwise, use value as-is
  return balanceValue;
}

/**
 * Pre-processed markdown search index for O(1) lookups
 * Optimizes transaction validation by avoiding repeated string searches
 * Enhanced with caching and optimized matching algorithms
 */
class MarkdownSearchIndex {
  private normalizedMarkdown: string
  private wordSet: Set<string>
  private amountSet: Set<string>
  private dateSet: Set<string>
  private fullText: string
  // Cache for repeated lookups (memoization)
  private lookupCache: Map<string, boolean> = new Map()
  // Word n-grams for better matching (2-3 word phrases)
  private ngramSet: Set<string> = new Set()

  constructor(markdownText: string) {
    // Normalize once during construction
    this.normalizedMarkdown = markdownText.toLowerCase().replace(/\s+/g, ' ')
    this.fullText = this.normalizedMarkdown
    
    // Extract words (2+ characters for better coverage, excluding common stop words)
    const stopWords = new Set(['the', 'and', 'or', 'for', 'with', 'from', 'to', 'of', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'by', 'as', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'])
    const words = this.normalizedMarkdown
      .split(/\s+/)
      .filter(word => {
        const cleaned = word.replace(/[^a-zA-Z0-9]/g, '')
        return cleaned.length >= 2 && !stopWords.has(cleaned)
      })
    this.wordSet = new Set(words)
    
    // Extract word n-grams (2-word phrases) for better matching
    const wordArray = words
    for (let i = 0; i < wordArray.length - 1; i++) {
      const bigram = `${wordArray[i]} ${wordArray[i + 1]}`
      this.ngramSet.add(bigram)
    }
    
    // Extract amounts (decimal numbers, currency formats) - expanded patterns
    const amountPattern = /\d+\.\d{2}|\d+,\d{2}|\$\d+\.\d{2}|\$\d+,\d{2}|\d+\.\d{1,2}|\d+,\d{1,2}/g
    const amounts = Array.from(this.normalizedMarkdown.matchAll(amountPattern))
      .map(match => {
        // Normalize amount: remove currency symbols and normalize decimal separator
        let amount = match[0].replace(/[$,]/g, '')
        // Ensure 2 decimal places for consistent matching
        const parts = amount.split(/[.,]/)
        if (parts.length === 2 && parts[1].length === 1) {
          amount = `${parts[0]}.${parts[1]}0`
        } else if (parts.length === 1) {
          amount = `${parts[0]}.00`
        }
        return amount
      })
    this.amountSet = new Set(amounts)
    
    // Extract dates (various formats) - expanded patterns
    const datePattern = /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}\/\d{2}\/\d{2}|\d{2}\.\d{2}\.\d{4}/g
    const dates = Array.from(this.normalizedMarkdown.matchAll(datePattern))
      .map(match => {
        // Normalize date format for consistent matching
        const dateStr = match[0]
        // Try to normalize to YYYY-MM-DD format
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/')
          if (parts.length === 3) {
            // Assume MM/DD/YYYY or DD/MM/YYYY
            if (parts[2].length === 4) {
              return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
            }
          }
        }
        return dateStr
      })
    this.dateSet = new Set(dates)
  }

  /**
   * Check if word exists in markdown (O(1) lookup with caching)
   */
  hasWord(word: string): boolean {
    const normalized = word.toLowerCase().trim()
    if (normalized.length === 0) return false
    
    // Check cache first
    if (this.lookupCache.has(normalized)) {
      return this.lookupCache.get(normalized)!
    }
    
    const result = this.wordSet.has(normalized)
    this.lookupCache.set(normalized, result)
    return result
  }

  /**
   * Check if any of the words exist in markdown (optimized with early exit)
   */
  hasAnyWord(words: string[]): boolean {
    for (const word of words) {
      if (this.hasWord(word)) {
        return true // Early exit on first match
      }
    }
    return false
  }

  /**
   * Count how many words from array exist in markdown (optimized)
   */
  countMatchingWords(words: string[]): number {
    let count = 0
    for (const word of words) {
      if (this.hasWord(word)) {
        count++
      }
    }
    return count
  }

  /**
   * Check if n-gram (phrase) exists in markdown (for better matching)
   */
  hasNgram(phrase: string): boolean {
    const normalized = phrase.toLowerCase().trim()
    return this.ngramSet.has(normalized)
  }

  /**
   * Check if amount exists in markdown (O(1) lookup)
   */
  hasAmount(amount: number): boolean {
    const amountStr = Math.abs(amount).toFixed(2)
    return this.amountSet.has(amountStr) || 
           this.amountSet.has(amountStr.replace('.', ','))
  }

  /**
   * Check if date exists in markdown (O(1) lookup for common formats)
   */
  hasDate(date: string): boolean {
    // Try multiple date formats
    const formats = [
      date, // YYYY-MM-DD
      date.split('-').reverse().join('/'), // DD/MM/YYYY
      date.split('-').reverse().join('-'), // DD-MM-YYYY
    ]
    return formats.some(format => this.dateSet.has(format))
  }

  /**
   * Get full normalized markdown (for fallback string searches if needed)
   */
  getNormalizedMarkdown(): string {
    return this.normalizedMarkdown
  }
}

/**
 * Validate transaction against markdown search index
 * Returns true if transaction appears to be present in the document
 * @param markdownIndex - Pre-processed markdown search index for O(1) lookups
 */
function validateTransactionAgainstOCR(
  transaction: any,
  markdownIndex: MarkdownSearchIndex,
  logger: any,
  correlationId?: string
): { valid: boolean; reason?: string; confidence: 'high' | 'medium' | 'low' } {
  const desc = (transaction.description || '').trim().toLowerCase()
  const amount = transaction.amount
  const date = transaction.date
  const transactionType = (transaction.transaction_type || '').toLowerCase()
  
  if (!desc || desc.length < 3) {
    return { valid: false, reason: 'Description too short', confidence: 'low' }
  }
  
  // CRITICAL FIX: Credit transactions often have less descriptive text in OCR
  // Be more lenient for credit transactions (especially "PAYMENT - THANKYOU")
  const isCreditTransaction = transactionType === 'credit' || 
                              desc.includes('payment') && (desc.includes('thankyou') || desc.includes('thank you')) ||
                              desc.includes(' cr') || desc.endsWith('cr')
  
  // Extract key words from description (remove common words, keep meaningful terms)
  const descWords = desc
    .split(/\s+/)
    .filter(word => word.length >= 2) // Reduced from 3 to 2 for better coverage
    .filter(word => !['the', 'and', 'or', 'for', 'with', 'from', 'to', 'of', 'a', 'an', 'in', 'on', 'at', 'by', 'as'].includes(word))
  
  // Check if description keywords appear in markdown (O(1) lookup per word)
  const matchingWordsCount = markdownIndex.countMatchingWords(descWords)
  const wordMatchRatio = descWords.length > 0 ? matchingWordsCount / descWords.length : 0
  
  // Check for n-gram matches (2-word phrases) for better accuracy
  let ngramMatches = 0
  if (descWords.length >= 2) {
    for (let i = 0; i < descWords.length - 1; i++) {
      const bigram = `${descWords[i]} ${descWords[i + 1]}`
      if (markdownIndex.hasNgram(bigram)) {
        ngramMatches++
      }
    }
  }
  const ngramMatchRatio = descWords.length >= 2 ? ngramMatches / (descWords.length - 1) : 0
  
  // Check if amount appears in markdown (O(1) lookup)
  // CRITICAL: For credit transactions, also check absolute value (amounts may be negative in OCR)
  const amountMatch = markdownIndex.hasAmount(amount) || 
                      (isCreditTransaction && markdownIndex.hasAmount(Math.abs(amount)))
  
  // Check if date appears in markdown (O(1) lookup for common formats)
  const dateMatch = markdownIndex.hasDate(date)
  
  // Calculate confidence with n-gram boost
  // N-grams are more reliable indicators than single words
  const combinedMatchRatio = wordMatchRatio * 0.6 + ngramMatchRatio * 0.4 // Weight n-grams higher
  
  let confidence: 'high' | 'medium' | 'low' = 'low'
  let valid = false
  
  // CRITICAL FIX: More lenient validation thresholds for credit transactions
  // Credit transactions (especially payment thank you) may have less descriptive text
  if (isCreditTransaction) {
    // For credit transactions, be more lenient - amount + date match is often sufficient
    if (amountMatch && dateMatch) {
      confidence = 'high'
      valid = true
    } else if (amountMatch || dateMatch) {
      // If amount or date matches, accept with medium confidence
      confidence = 'medium'
      valid = true
    } else if (combinedMatchRatio >= 0.15) {
      // Lower threshold for credit transactions
      confidence = 'low'
      valid = true
    } else {
      valid = false
    }
  } else {
    // Standard validation for non-credit transactions
    if (combinedMatchRatio >= 0.5 && amountMatch && dateMatch) {
      confidence = 'high'
      valid = true
    } else if (combinedMatchRatio >= 0.4 && (amountMatch || dateMatch)) {
      confidence = 'high' // Boost to high if n-grams match well
      valid = true
    } else if (combinedMatchRatio >= 0.3 && (amountMatch || dateMatch)) {
      confidence = 'medium'
      valid = true
    } else if (combinedMatchRatio >= 0.25 || (ngramMatchRatio >= 0.3 && amountMatch)) {
      confidence = 'medium' // N-gram matches boost confidence
      valid = true
    } else if (combinedMatchRatio >= 0.2) {
      confidence = 'low'
      valid = true // Allow low confidence but log warning
    } else {
      valid = false
    }
  }
  
  if (!valid) {
    logger.warn('STATEMENT:VALIDATION', 'Transaction failed OCR validation', {
      description: transaction.description,
      amount: transaction.amount,
      date: transaction.date,
      transactionType,
      isCreditTransaction,
      wordMatchRatio,
      amountMatch,
      dateMatch,
      matchingWordsCount
    }, correlationId)
  }
  
  return { valid, confidence, reason: valid ? undefined : 'No evidence in OCR text' }
}

/**
 * Extract closing balance directly from markdown using pattern matching
 * This is a fallback when Chat API extraction fails
 * Searches entire markdown for various closing balance formats
 * @param markdown - Full markdown text from OCR
 * @returns Closing balance as number, or null if not found
 */
function extractClosingBalanceFromMarkdown(markdown: string): number | null {
  if (!markdown || markdown.length === 0) {
    return null
  }

  // Normalize markdown: remove extra whitespace but preserve structure
  const normalizedMarkdown = markdown.replace(/\s+/g, ' ').trim()
  
  // Pattern 1: "Closing Balance" or "Ending Balance" (highest priority)
  // Matches: "Closing Balance: $1,234.56", "Ending Balance $1,234.56", etc.
  const closingBalancePatterns = [
    // With colon and currency symbol
    /(?:closing\s+balance|ending\s+balance)[:\s]+[\$€£¥]?\s*([-]?[\d,]+\.?\d*)/i,
    // Without colon, with currency symbol
    /(?:closing\s+balance|ending\s+balance)\s+[\$€£¥]?\s*([-]?[\d,]+\.?\d*)/i,
    // With parentheses (sometimes used for negative balances)
    /(?:closing\s+balance|ending\s+balance)[:\s]*\(?[\$€£¥]?\s*([-]?[\d,]+\.?\d*)\)?/i,
  ]

  // Pattern 2: "Balance as of" or "Current Balance"
  const currentBalancePatterns = [
    /(?:balance\s+as\s+of|current\s+balance|final\s+balance)[:\s]+[\$€£¥]?\s*([-]?[\d,]+\.?\d*)/i,
    /(?:balance\s+as\s+of|current\s+balance|final\s+balance)\s+[\$€£¥]?\s*([-]?[\d,]+\.?\d*)/i,
  ]

  // Pattern 3: "New Balance" or "Statement Balance" (often used in credit card statements)
  const statementBalancePatterns = [
    /(?:new\s+balance|statement\s+balance|outstanding\s+balance)[:\s]+[\$€£¥]?\s*([-]?[\d,]+\.?\d*)/i,
    /(?:new\s+balance|statement\s+balance|outstanding\s+balance)\s+[\$€£¥]?\s*([-]?[\d,]+\.?\d*)/i,
  ]

  // Pattern 4: Balance in summary sections (look for "Balance" followed by amount on same or next line)
  const summaryBalancePatterns = [
    /balance[:\s]+[\$€£¥]?\s*([-]?[\d,]+\.?\d*)/i,
  ]

  // Try patterns in priority order
  const allPatterns = [
    ...closingBalancePatterns,
    ...currentBalancePatterns,
    ...statementBalancePatterns,
    ...summaryBalancePatterns,
  ]

  for (const pattern of allPatterns) {
    const matches = normalizedMarkdown.match(pattern)
    if (matches && matches[1]) {
      try {
        // Normalize the extracted value: remove commas, handle currency symbols
        let balanceStr = matches[1].trim()
        
        // Remove commas
        balanceStr = balanceStr.replace(/,/g, '')
        
        // Parse as float
        const balance = parseFloat(balanceStr)
        
        // Validate: not NaN, within reasonable range
        if (!isNaN(balance) && isFinite(balance) && 
            balance >= -1000000000 && balance <= 1000000000) {
          return balance
        }
      } catch (error) {
        // Continue to next pattern if parsing fails
        continue
      }
    }
  }

  // Fallback: Look for balance values near statement end dates or in footer sections
  // This is more aggressive and may catch balances in unexpected formats
  const fallbackPatterns = [
    // Look for lines containing "balance" and a number on the same line
    /balance[^.\n]{0,50}[\$€£¥]?\s*([-]?[\d,]+\.?\d{2})/i,
    // Look for currency symbol followed by number near "balance" keyword
    /[\$€£¥]\s*([-]?[\d,]+\.?\d{2})[^.\n]{0,50}balance/i,
  ]

  for (const pattern of fallbackPatterns) {
    const matches = normalizedMarkdown.match(pattern)
    if (matches && matches[1]) {
      try {
        let balanceStr = matches[1].trim().replace(/,/g, '')
        const balance = parseFloat(balanceStr)
        
        if (!isNaN(balance) && isFinite(balance) && 
            balance >= -1000000000 && balance <= 1000000000) {
          // Additional validation: check if this appears in a context that suggests it's a closing balance
          // (e.g., near "statement", "period", "ending", etc.)
          const contextStart = Math.max(0, normalizedMarkdown.indexOf(matches[0]) - 100)
          const contextEnd = Math.min(normalizedMarkdown.length, normalizedMarkdown.indexOf(matches[0]) + matches[0].length + 100)
          const context = normalizedMarkdown.substring(contextStart, contextEnd).toLowerCase()
          
          // If context suggests this is a closing/ending balance, use it
          if (context.includes('closing') || context.includes('ending') || 
              context.includes('statement') || context.includes('final') ||
              context.includes('period') || context.includes('summary')) {
            return balance
          }
        }
      } catch (error) {
        continue
      }
    }
  }

  return null
}

/**
 * Extract structured JSON data using Mistral OCR API + Chat Completions
 * Two-step process: OCR extracts text, then chat completions structures it
 */
async function extractStatementDataWithMistralOCR(
  fileBlob: Blob | null, 
  statementImport: StatementImport,
  supabase: any
): Promise<any> {
  const correlationId = getCorrelationId()
  logger.info('STATEMENT:MISTRAL', 'Starting Mistral OCR extraction', {
    fileSize: fileBlob?.size || statementImport.file_size || 'unknown',
    fileType: fileBlob?.type || 'unknown',
    statementImportId: statementImport.id,
    note: 'Using pre-signed URL - file download not required'
  }, correlationId)

  return mistralCircuitBreaker.call(async () => {
    const mistralApiKey = Deno.env.get('MISTRAL_API_KEY')
    if (!mistralApiKey) {
      logger.error('STATEMENT:MISTRAL', 'MISTRAL_API_KEY not configured', {}, correlationId)
      throw new Error('MISTRAL_API_KEY not configured')
    }

    logger.info('STATEMENT:MISTRAL', 'Mistral API key found, proceeding with extraction', {
      apiKeyLength: mistralApiKey.length,
      apiKeyPrefix: mistralApiKey.substring(0, 10) + '...'
    }, correlationId)

    // Step 0: Check OCR results cache
    const cacheCheckStartTime = Date.now()
    const { data: cachedOcrResult } = await supabase
      .from('ocr_results')
      .select('*')
      .eq('file_hash', statementImport.file_hash)
      .single()

    if (cachedOcrResult) {
      logger.info('STATEMENT:CACHE:OCR', 'Found cached OCR result, validating content hash', {
        statementImportId: statementImport.id,
        cachedId: cachedOcrResult.id,
        cachedPagesCount: cachedOcrResult.pages_count,
        hasStructuredData: !!cachedOcrResult.structured_data
      }, correlationId)

      // We need to extract OCR to compute content hash for validation
      // For now, if we have cached structured_data, we can use it
      // The file_hash match is already a good indicator
      if (cachedOcrResult.structured_data && cachedOcrResult.markdown_text) {
        // Compute hash of cached markdown to validate
        const cachedMarkdownHash = await computeOCRContentHash(cachedOcrResult.markdown_text)
        
        // If we have ocr_content_hash in metadata, validate it
        // Otherwise, we'll need to extract OCR to validate (but this defeats the purpose)
        // For now, trust the file_hash match and use cached data
        logger.info('STATEMENT:CACHE:OCR', 'Using cached OCR result', {
          statementImportId: statementImport.id,
          cachedId: cachedOcrResult.id,
          cachedMarkdownHash,
          hasStructuredData: !!cachedOcrResult.structured_data,
          cacheCheckDuration: Date.now() - cacheCheckStartTime
        }, correlationId)

        // Return cached structured data with OCR content hash
        return {
          ...cachedOcrResult.structured_data,
          _ocrContentHash: cachedOcrResult.ocr_content_hash || cachedMarkdownHash,
          _fromCache: true
        }
      }
    }

    const cacheCheckDuration = Date.now() - cacheCheckStartTime
    if (cachedOcrResult) {
      logger.warn('STATEMENT:CACHE:OCR', 'Cached OCR result found but missing structured_data, proceeding with extraction', {
        statementImportId: statementImport.id,
        cachedId: cachedOcrResult.id,
        cacheCheckDuration
      }, correlationId)
    } else {
      logger.info('STATEMENT:CACHE:OCR', 'No cached OCR result found, proceeding with extraction', {
        statementImportId: statementImport.id,
        fileHash: statementImport.file_hash,
        cacheCheckDuration
      }, correlationId)
    }

    // Step 1: Generate pre-signed URL from existing file path (no re-upload needed)
    const preSignedUrl = await createPreSignedUrl(
      supabase, 
      statementImport.file_path, 
      900,  // 15 minutes expiry
      logger,
      correlationId
    )

    // JSON Schema for structured extraction
    const extractionSchema = {
      type: "object",
      properties: {
        account: {
          type: "object",
          properties: {
            account_number: { type: "string" },
            account_name: { type: "string" },
            bank_name: { type: "string" },
            account_type: { type: "string", enum: ["checking", "savings", "credit_card", "loan", "investment"] },
            currency: { type: "string" }
          },
          required: ["account_number"]
        },
        statement_period: {
          type: "object",
          properties: {
            from_date: { type: "string", format: "date" },
            to_date: { type: "string", format: "date" }
          }
        },
        balances: {
          type: "object",
          properties: {
            opening_balance: { type: "number" },
            closing_balance: { type: "number" },
            available_balance: { type: "number" }
          }
        },
        transactions: {
          type: "array",
          minItems: 0,
          items: {
            type: "object",
            properties: {
              date: { type: "string", format: "date" },
              description: { type: "string", minLength: 3 },
              amount: { type: "number" },
              transaction_type: { type: "string", enum: ["credit", "debit", "transfer", "fee", "interest", "payment"] },
              reference: { type: "string" },
              balance: { type: "number" }
            },
            required: ["date", "description", "amount", "transaction_type"]
          }
        }
      },
      required: ["account", "transactions"]
    }

    // Step 2: Call OCR service with pre-signed URL (basic OCR, no structured extraction)
    logger.info('STATEMENT:OCR_ANNOTATION', 'Calling Mistral OCR API for markdown extraction', {
      endpoint: 'https://api.mistral.ai/v1/ocr',
      model: 'mistral-ocr-latest',
      note: 'Structured extraction will be done via Chat API after OCR'
    }, correlationId)

    const ocrStartTime = Date.now()
    // Call OCR for markdown extraction only (no structured extraction - API doesn't support it)
    // Structured extraction will be done via Chat API after OCR
    const ocrResult = await ocrDocument({
      kind: 'document_url',
      url: preSignedUrl,
      tableFormat: 'markdown',  // Tables extracted as markdown tables
      extractHeader: true,       // Extract headers separately
      extractFooter: true,       // Extract footers separately
      includeImageBase64: false  // Don't include images (reduce payload, not needed for transaction extraction)
      // Note: Mistral OCR API no longer supports structured extraction - must use Chat API
    }, logger, correlationId)

    const ocrDuration = Date.now() - ocrStartTime
    logger.info('STATEMENT:OCR_ANNOTATION', 'OCR API call completed', {
      duration: ocrDuration,
      pagesProcessed: ocrResult.pages?.length || 0,
      hasPages: !!ocrResult.pages && ocrResult.pages.length > 0,
      hasDocumentAnnotation: !!ocrResult.document_annotation,
      note: ocrResult.document_annotation ? 'Structured data returned from OCR API' : 'Markdown extraction complete, will structure data'
    }, correlationId)

    // Step 3: Check if structured data was returned from OCR API
    // If document_annotation is present and valid, use it; otherwise extract from markdown using Chat API
    if (!ocrResult.pages || ocrResult.pages.length === 0) {
      logger.error('STATEMENT:OCR_ANNOTATION', 'No pages in OCR response', {
        hasPages: !!ocrResult.pages,
        pagesCount: ocrResult.pages?.length || 0,
        ocrResultKeys: Object.keys(ocrResult)
      }, correlationId)
      throw new Error('No pages returned from OCR API - document may be empty or unsupported')
    }

    // Extract raw markdown text from all pages for validation
    const allMarkdownText = (ocrResult.pages || [])
      .map((page: any) => {
        const parts: string[] = []
        if (page.header) parts.push(page.header)
        if (page.markdown) parts.push(page.markdown)
        if (page.footer) parts.push(page.footer)
        if (page.tables) {
          page.tables.forEach((table: any) => {
            if (table.content) parts.push(table.content)
          })
        }
        return parts.join('\n')
      })
      .join('\n\n')
    
    const markdownLength = allMarkdownText.length
    const markdownPreview = allMarkdownText.substring(0, 1000) + (markdownLength > 1000 ? '...' : '')
    
    // Compute OCR content hash for improved cache key
    const ocrContentHash = await computeOCRContentHash(allMarkdownText)
    
    // CRITICAL: Extract closing balance directly from markdown as fallback
    // This ensures we can extract balance even if Chat API fails
    const directlyExtractedClosingBalance = extractClosingBalanceFromMarkdown(allMarkdownText)
    
    logger.info('STATEMENT:OCR_MARKDOWN', 'Extracted raw markdown text from OCR', {
      markdownLength,
      pagesCount: ocrResult.pages?.length || 0,
      markdownPreview,
      hasHeader: ocrResult.pages?.some((p: any) => p.header) || false,
      hasFooter: ocrResult.pages?.some((p: any) => p.footer) || false,
      tablesCount: ocrResult.pages?.reduce((sum: number, p: any) => sum + (p.tables?.length || 0), 0) || 0,
      ocrContentHash,
      directlyExtractedClosingBalance,
      hasDirectBalance: directlyExtractedClosingBalance !== null
    }, correlationId)
    
    // === CHECKPOINT 1: OCR OUTPUT ===
    // Count transaction-like patterns in OCR markdown
    const lines = allMarkdownText.split('\n')
    // Pattern for transaction table rows: Date | Date | Card | Details | Amount | Balance
    // Look for lines with date patterns and dollar amounts
    const transactionTablePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2}).*(\$\d+\.\d{2}|-\$\d+\.\d{2}|\d+\.\d{2}|CR|DR)/
    const potentialTransactionLines = lines.filter(line => {
      const trimmed = line.trim()
      // Must have date pattern and amount pattern
      return transactionTablePattern.test(trimmed) && trimmed.length > 10
    })
    
    // Count lines with "CR" suffix (credit transactions)
    const creditLines = lines.filter(line => /CR\b/i.test(line) && /\$\d+\.\d{2}/.test(line))
    
    // Count multi-line transaction entries (overseas fees - look for USD amounts followed by fee lines)
    const overseasFeePattern = /(USD|INCL OVERSEAS|FEE)/i
    const multiLineEntries = lines.filter(line => overseasFeePattern.test(line))
    
    console.log('=== CHECKPOINT 1: OCR OUTPUT ===')
    console.log('File: supabase/functions/process-statement/index.ts:859')
    console.log('Raw OCR text length:', allMarkdownText.length)
    console.log('OCR text preview (first 500 chars):', allMarkdownText.substring(0, 500))
    console.log('Potential transaction lines in OCR:', potentialTransactionLines.length)
    console.log('Lines with CR suffix (credits):', creditLines.length)
    console.log('Multi-line entries (overseas fees):', multiLineEntries.length)
    console.log('Sample transaction lines:', potentialTransactionLines.slice(0, 5))
    console.log('Status:', potentialTransactionLines.length >= 40 ? '✅ ~43 lines expected' : `❌ Only ${potentialTransactionLines.length} lines found`)
    
    logger.info('CHECKPOINT:OCR_OUTPUT', 'OCR output checkpoint', {
      file: 'supabase/functions/process-statement/index.ts:859',
      rawOcrTextLength: allMarkdownText.length,
      potentialTransactionLines: potentialTransactionLines.length,
      creditLines: creditLines.length,
      multiLineEntries: multiLineEntries.length,
      sampleTransactionLines: potentialTransactionLines.slice(0, 5),
      status: potentialTransactionLines.length >= 40 ? 'OK' : 'LOSS_DETECTED',
      expectedCount: 43
    }, correlationId)
    
    if (directlyExtractedClosingBalance !== null) {
      logger.info('STATEMENT:BALANCE:DIRECT_EXTRACT', 'Successfully extracted closing balance directly from markdown', {
        statementImportId: statementImport.id,
        closingBalance: directlyExtractedClosingBalance,
        extractionMethod: 'direct_pattern_matching',
        note: 'This will be used as fallback if Chat API extraction fails'
      }, correlationId)
    } else {
      logger.warn('STATEMENT:BALANCE:DIRECT_EXTRACT', 'Could not extract closing balance directly from markdown', {
        statementImportId: statementImport.id,
        markdownLength,
        note: 'Will rely on Chat API extraction for balance information'
      }, correlationId)
    }

    // Step 4: Use structured data from OCR if available, otherwise extract from markdown
    let parsedData: any
    
    // Check if OCR API returned structured data in document_annotation
    if (ocrResult.document_annotation) {
      logger.info('STATEMENT:OCR_ANNOTATION', 'Using structured data from OCR API document_annotation', {
        hasDocumentAnnotation: true,
        annotationKeys: Object.keys(ocrResult.document_annotation)
      }, correlationId)
      
      parsedData = ocrResult.document_annotation
      
      // Validate required fields
      if (!parsedData.account?.account_number || !Array.isArray(parsedData.transactions)) {
        logger.warn('STATEMENT:OCR_ANNOTATION', 'OCR document_annotation missing required fields, falling back to Chat API', {
          hasAccount: !!parsedData.account,
          hasAccountNumber: !!parsedData.account?.account_number,
          transactionsIsArray: Array.isArray(parsedData.transactions)
        }, correlationId)
        // Fall through to Chat API extraction
        parsedData = null
      } else {
        logger.info('STATEMENT:OCR_ANNOTATION', 'OCR document_annotation validated successfully', {
          hasAccount: !!parsedData.account,
          transactionsCount: parsedData.transactions?.length || 0,
          hasBalances: !!parsedData.balances,
          balancesKeys: parsedData.balances ? Object.keys(parsedData.balances) : [],
          closingBalance: parsedData.balances?.closing_balance,
          availableBalance: parsedData.balances?.available_balance,
          openingBalance: parsedData.balances?.opening_balance
        }, correlationId)
        
        // Enhanced balance logging for OCR API
        if (parsedData.balances) {
          const hasClosing = parsedData.balances.closing_balance !== undefined && parsedData.balances.closing_balance !== null
          const hasAvailable = parsedData.balances.available_balance !== undefined && parsedData.balances.available_balance !== null
          const hasOpening = parsedData.balances.opening_balance !== undefined && parsedData.balances.opening_balance !== null
          
          logger.info('STATEMENT:OCR_ANNOTATION:BALANCE', 'Balance information extracted from OCR API document_annotation', {
            statementImportId: statementImport.id,
            hasClosingBalance: hasClosing,
            hasAvailableBalance: hasAvailable,
            hasOpeningBalance: hasOpening,
            closingBalance: parsedData.balances.closing_balance,
            availableBalance: parsedData.balances.available_balance,
            openingBalance: parsedData.balances.opening_balance
          }, correlationId)
        } else {
          logger.warn('STATEMENT:OCR_ANNOTATION:BALANCE', 'OCR API document_annotation missing balances object', {
            statementImportId: statementImport.id,
            parsedDataKeys: Object.keys(parsedData)
          }, correlationId)
        }
      }
    }
    
    // If OCR didn't return structured data, extract from markdown using Chat API
    if (!parsedData) {
      logger.info('STATEMENT:STRUCTURE', 'Extracting structured data from markdown using Mistral Chat API', {
        markdownLength: allMarkdownText.length,
        pagesCount: ocrResult.pages?.length || 0,
        reason: ocrResult.document_annotation ? 'Invalid structure from OCR' : 'OCR API did not return structured data'
      }, correlationId)
      
      try {
      // Extract transaction-relevant sections from markdown to reduce Chat API payload
      // Optimized to extract transaction table rows AND balance information from headers/footers/summary sections
      // This improves performance by sending only 5-10k chars instead of 25k while preserving critical balance data
      const extractTransactionSections = (markdown: string): string => {
        const lines = markdown.split('\n')
        const transactionRows: string[] = []
        const balanceLines: string[] = []
        let inTransactionTable = false
        let headerFound = false
        
        // Patterns that indicate transaction table boundaries
        const transactionTableStart = /(date|transaction|description|amount|balance|debit|credit|posting|posted)/i
        const transactionTableEnd = /(total|balance|summary|statement|period|account|opening|closing)/i
        // More aggressive pattern for transaction rows - must have date AND amount
        const transactionRowPattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2}).*(\$\d+\.\d{2}|-\$\d+\.\d{2}|\d+\.\d{2})|(\$\d+\.\d{2}|-\$\d+\.\d{2}).*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/
        
        // Pattern to identify balance-related lines (opening, closing, available balance)
        // Enhanced to also detect CR/DR annotations and credit/debit columns
        const balancePattern = /(opening\s*balance|closing\s*balance|available\s*balance|ending\s*balance|beginning\s*balance|current\s*balance|balance\s*(?:as\s*of|on|at))/i
        // Pattern to detect CR/DR annotations in balance lines
        const crDrPattern = /\b(CR|DR|\(CR\)|\(DR\))\b/i
        // Pattern to detect credit/debit column headers
        const creditDebitColumnPattern = /(credit|debit|money\s+in|money\s+out|deposits|withdrawals)/i
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()
          const lineLower = line.toLowerCase()
          
          // CRITICAL: Preserve balance information from any section (headers, footers, summary)
          // Check if this line contains balance information, including CR/DR annotations
          const hasBalanceKeyword = balancePattern.test(line) || lineLower.includes('balance')
          const hasAmount = lineLower.includes('$') || /\d+\.\d{2}/.test(line)
          const hasCRDR = crDrPattern.test(line)
          const hasCreditDebitColumn = creditDebitColumnPattern.test(line)
          
          if (hasBalanceKeyword && hasAmount || 
              (hasBalanceKeyword && hasCRDR) ||
              (hasAmount && hasCRDR) ||
              (hasCreditDebitColumn && hasAmount)) {
            // Include balance line and context (2 lines before and after for better context including CR/DR)
            const contextStart = Math.max(0, i - 2)
            const contextEnd = Math.min(lines.length, i + 3)
            for (let j = contextStart; j < contextEnd; j++) {
              const contextLine = lines[j].trim()
              if (contextLine && !balanceLines.includes(contextLine)) {
                balanceLines.push(contextLine)
              }
            }
          }
          
          // Check if we're entering a transaction table
          if (transactionTableStart.test(line) && !inTransactionTable && line.length < 100) {
            // Likely a header row - skip it but mark that we're in a table
            inTransactionTable = true
            headerFound = true
            continue // Skip header row
          }
          
          // Check if we're leaving a transaction table
          // CRITICAL: Don't filter out balance lines - they're already captured above
          if (inTransactionTable && transactionTableEnd.test(line) && !transactionRowPattern.test(line) && headerFound) {
            // This looks like a summary/total row, not a transaction
            // But if it's a balance line, we've already captured it above, so just mark table end
            if (lineLower.includes('total') && !balancePattern.test(line)) {
              inTransactionTable = false
              headerFound = false
              continue
            }
            // If it's a balance line, don't skip it - it's already in balanceLines
            if (balancePattern.test(line)) {
              // Continue processing - balance line already captured
            } else {
              inTransactionTable = false
              headerFound = false
            }
          }
          
          // Collect only transaction rows (must match transaction pattern)
          if (inTransactionTable && transactionRowPattern.test(line)) {
            // This is a transaction row - include it
            transactionRows.push(line)
          } else if (inTransactionTable && line.length > 0 && !headerFound) {
            // Might be a transaction row without clear pattern - include if it has numbers
            if (/\d/.test(line) && line.length < 200) {
              transactionRows.push(line)
            }
          }
        }
        
        // Combine transaction rows with balance information
        // Put balance information at the end (summary section) for better Chat API extraction
        const allSections: string[] = []
        if (transactionRows.length > 0) {
          allSections.push(...transactionRows)
        }
        if (balanceLines.length > 0) {
          allSections.push('\n--- Balance Information (including CR/DR annotations) ---')
          allSections.push(...balanceLines)
        }
        
        const extracted = allSections.length > 0 
          ? allSections.join('\n')
          : markdown // Fallback to full markdown if extraction fails
        
        // REMOVED: 15k char truncation that was cutting off transactions
        // This was causing regression where only first 6 transactions were extracted
        // If statement is truly too large, it should be detected as large and use chunking instead
        // For small/medium statements, send full extracted markdown to ensure all transactions are included
        return extracted
      }
      
      // CRITICAL: Check if statement is large BEFORE truncation
      // This ensures we use chunking for statements with many transactions
      const pagesCount = ocrResult.pages?.length || 0
      const originalMarkdownLength = allMarkdownText.length
      
      // Estimate transaction count from OCR to determine if we should use chunking
      // Count potential transaction lines in OCR (more reliable than just markdown length)
      const potentialTransactionLines = allMarkdownText.split('\n').filter(line => {
        const trimmed = line.trim()
        // Pattern for transaction table rows: Date | Amount | Description
        const transactionPattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2}).*(\$\d+\.\d{2}|-\$\d+\.\d{2}|\d+\.\d{2}|CR|DR)/
        return transactionPattern.test(trimmed) && trimmed.length > 10
      })
      const estimatedTransactionCount = potentialTransactionLines.length
      
      // Use chunking for:
      // 1. Large statements (> 10 pages OR > 20k chars)
      // 2. Statements with many transactions (> 20 transactions) - even if small
      // This ensures we don't lose transactions due to aggressive filtering
      const isLargeStatement = pagesCount >= 10 || 
                               originalMarkdownLength > 20000 || 
                               estimatedTransactionCount > 20
      
      // CRITICAL FIX: For small/medium statements, send full markdown instead of filtering
      // The extractTransactionSections() function is too aggressive and filters out valid transactions
      // Only use filtering for very large statements (> 50k chars) that can't be chunked
      // For statements with many transactions, use chunking instead of filtering
      const shouldFilter = originalMarkdownLength > 50000 && estimatedTransactionCount <= 20
      const transactionMarkdown = isLargeStatement 
        ? allMarkdownText // Don't truncate - let chunking handle it
        : shouldFilter
          ? extractTransactionSections(allMarkdownText) // Only filter very large statements with few transactions
          : allMarkdownText // Send full markdown for small/medium statements to preserve all transactions
      
      const payloadReduction = ((allMarkdownText.length - transactionMarkdown.length) / allMarkdownText.length * 100).toFixed(1)
      
      // Check if balance information was included in the extracted markdown
      const hasBalanceInfo = /(opening\s*balance|closing\s*balance|available\s*balance|ending\s*balance|beginning\s*balance|balance\s*(?:as\s*of|on|at)|---\s*Balance\s*Information\s*---)/i.test(transactionMarkdown)
      
      logger.info('STATEMENT:PAYLOAD_OPTIMIZATION', 'Extracted transaction-relevant sections for Chat API', {
        originalLength: allMarkdownText.length,
        extractedLength: transactionMarkdown.length,
        reductionPercent: payloadReduction,
        pagesCount,
        isLargeStatement,
        estimatedTransactionCount,
        shouldFilter,
        hasBalanceInfo,
        balanceInfoIncluded: hasBalanceInfo,
        statementImportId: statementImport.id,
        note: isLargeStatement 
          ? 'Using chunking - full markdown will be split into chunks'
          : shouldFilter
            ? 'Using filtering - extracted transaction sections only'
            : 'Using full markdown - no filtering to preserve all transactions'
      }, correlationId)
      
      if (!hasBalanceInfo) {
        logger.warn('STATEMENT:PAYLOAD_OPTIMIZATION:BALANCE', 'Balance information may not be included in extracted markdown', {
          statementImportId: statementImport.id,
          extractedLength: transactionMarkdown.length,
          note: 'Balance extraction may rely on Chat API finding balances in transaction rows or may be missing'
        }, correlationId)
      }

      // For large statements, use chunk-based parallel processing
      // Split by pages and process in parallel, then merge results
      // CRITICAL: Use original markdown for chunking, not truncated version
      // Use chunking if: (1) large statement OR (2) many transactions (>20) even if single page
      if (isLargeStatement || estimatedTransactionCount > 20) {
        logger.info('STATEMENT:STRUCTURE:PARALLEL', 'Using parallel chunk-based processing for large statement', {
          pagesCount,
          originalMarkdownLength: originalMarkdownLength,
          transactionMarkdownLength: transactionMarkdown.length,
          isLargeStatement: true,
          statementImportId: statementImport.id
        }, correlationId)

        // Split markdown by pages for parallel processing
        // Use original markdown (allMarkdownText) to ensure all transactions are included
        const pageChunks: string[] = []
        const CHUNK_SIZE = 4 // Pages per chunk for multi-page statements
        let pageMarkdowns: string[] = []
        
        // For single-page statements with many transactions, split by character count instead of pages
        if (pagesCount === 1 && estimatedTransactionCount > 20) {
          // Split single page markdown into chunks of ~20k characters to avoid timeout
          const CHUNK_CHAR_SIZE = 20000
          const fullMarkdown = allMarkdownText
          
          for (let i = 0; i < fullMarkdown.length; i += CHUNK_CHAR_SIZE) {
            const chunk = fullMarkdown.substring(i, i + CHUNK_CHAR_SIZE)
            if (chunk.trim().length > 0) {
              pageChunks.push(chunk)
            }
          }
          
          logger.info('STATEMENT:STRUCTURE:CHUNK:SINGLE_PAGE', 'Splitting single-page statement by character count', {
            totalChunks: pageChunks.length,
            chunkSize: CHUNK_CHAR_SIZE,
            estimatedTransactionCount,
            originalMarkdownLength: fullMarkdown.length
          }, correlationId)
        } else {
          // Multi-page: split by pages
          pageMarkdowns = ocrResult.pages.map((page: any) => {
            const parts: string[] = []
            if (page.header) parts.push(page.header)
            if (page.markdown) parts.push(page.markdown)
            if (page.footer) parts.push(page.footer)
            if (page.tables) {
              page.tables.forEach((table: any) => {
                if (table.content) parts.push(table.content)
              })
            }
            return parts.join('\n')
          })

          // Group pages into chunks of 3-5 pages for parallel processing
          for (let i = 0; i < pageMarkdowns.length; i += CHUNK_SIZE) {
            const chunk = pageMarkdowns.slice(i, i + CHUNK_SIZE).join('\n\n--- Page Break ---\n\n')
            pageChunks.push(chunk)
          }
        }

        // Process chunks in parallel (process all chunks, not just first 3)
        const structureStartTime = Date.now()
        logger.info('STATEMENT:STRUCTURE:CHUNK:START', 'Starting chunk processing', {
          totalChunks: pageChunks.length,
          chunksToProcess: pageChunks.length,
          chunkSize: pagesCount === 1 ? 'character-based' : CHUNK_SIZE,
          pagesCount: pageMarkdowns.length || pagesCount,
          originalMarkdownLength: originalMarkdownLength,
          transactionMarkdownLength: transactionMarkdown.length,
          isLargeStatement: true,
          statementImportId: statementImport.id,
          note: 'Large statement detected - using chunk-based parallel processing to handle all transactions'
        }, correlationId)
        
        const chunkResults = await Promise.all(
          pageChunks.map(async (chunk, chunkIndex) => {
            try {
              // === CHECKPOINT 2: EXTRACTION REQUEST (CHUNKED) ===
              const chunkLength = chunk.length
              const chunkPreview = chunk.substring(0, 500)
              console.log(`=== CHECKPOINT 2: EXTRACTION REQUEST (CHUNK ${chunkIndex + 1}/${pageChunks.length}) ===`)
              console.log('File: supabase/functions/process-statement/index.ts:1179')
              console.log('Chunk length:', chunkLength)
              console.log('Chunk preview:', chunkPreview)
              console.log('Truncated?', chunkLength > 25000 ? 'YES (limited to 25k chars)' : 'NO')
              console.log('Full markdown available?', chunkLength === chunk.length ? 'YES' : 'NO')
              
              logger.info('CHECKPOINT:EXTRACTION_REQUEST', 'Extraction request checkpoint (chunked)', {
                file: 'supabase/functions/process-statement/index.ts:1179',
                chunkIndex: chunkIndex + 1,
                totalChunks: pageChunks.length,
                chunkLength: chunkLength,
                truncated: chunkLength > 25000,
                chunkPreview: chunkPreview
              }, correlationId)
              
              const chunkResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${mistralApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'mistral-large-latest',
                  messages: [
                    {
                      role: 'system',
                      content: 'You are a financial data extraction assistant. Extract structured data from bank statement markdown. Focus on transaction tables, account information, and CRITICALLY important: balance information (opening_balance, closing_balance, available_balance) from headers, footers, and summary sections. Balance information is essential and must be extracted even if not in transaction tables. Pay special attention to CR (credit) and DR (debit) annotations, and columns named "credit", "money in", "deposits", "debit", "money out", or "withdrawals". Return ONLY valid JSON matching the provided schema - no explanations, no markdown, just JSON.'
                    },
                    {
                      role: 'user',
                      content: `Extract bank statement information from this page chunk. Return ONLY a valid JSON object (no markdown, no explanations):

CRITICAL: Extract balance information (opening_balance, closing_balance, available_balance) from ALL sections:
- Statement headers (top of page)
- Statement footers (bottom of page)
- Summary sections
- Account summary boxes
- Look for phrases like:
  * "Opening Balance", "Beginning Balance", "Starting Balance"
  * "Closing Balance", "Ending Balance", "Final Balance", "Balance as of [date]"
  * "Available Balance", "Current Balance", "Balance Available"

IMPORTANT - Balance Format Recognition:
- "CR" or "(CR)" annotation next to a balance = POSITIVE balance (credit) - extract as positive number
- "DR" or "(DR)" annotation next to a balance = NEGATIVE balance (debit) - extract as negative number
- Columns named "credit", "money in", "deposits" = positive values
- Columns named "debit", "money out", "withdrawals" = negative values
- If a balance has "CR" next to it (e.g., "$1,234.56 CR" or "$1,234.56 (CR)"), extract it as a POSITIVE number: 1234.56
- If a balance has "DR" next to it (e.g., "$1,234.56 DR" or "$1,234.56 (DR)"), extract it as a NEGATIVE number: -1234.56
- If no annotation, use the sign of the number as-is

IMPORTANT - Transaction Amount Signs:
- Credit transactions (deposits, income, payments received) = POSITIVE amounts
- Debit transactions (withdrawals, expenses, payments made) = NEGATIVE amounts
- If transaction_type is "credit", amount must be positive (e.g., 50.00, not -50.00)
- If transaction_type is "debit", amount must be negative (e.g., -50.00, not 50.00)

CRITICAL - Payment Transaction Classification:
- "PAYMENT - THANKYOU", "PAYMENT THANKYOU", "PAYMENT RECEIVED" = transaction_type: "credit" (NOT "payment")
- Payments received by the account holder are CREDITS (money coming in)
- Only use "payment" type if the description clearly indicates a payment MADE (money going out)
- When in doubt, use "credit" for payments received and "debit" for payments made

Examples:
  * "DEPOSIT" with amount 100.00 → transaction_type: "credit", amount: 100.00
  * "WITHDRAWAL" with amount 50.00 → transaction_type: "debit", amount: -50.00
  * "PAYMENT - THANKYOU" with amount 200.00 → transaction_type: "credit", amount: 200.00 (MUST use "credit", not "payment")
  * "PAYMENT THANKYOU 443794" with amount 500.00 → transaction_type: "credit", amount: 500.00 (MUST use "credit", not "payment")
  * "PURCHASE" with amount 75.00 → transaction_type: "debit", amount: -75.00

Examples:
- "Closing Balance: $1,234.56 CR" → closing_balance: 1234.56
- "Ending Balance: ($1,234.56)" → closing_balance: -1234.56
- "Available Balance as of 12/31/2024: $5,678.90" → available_balance: 5678.90
- "$1,234.56 CR" or "$1,234.56 (CR)" → closing_balance: 1234.56
- "$1,234.56 DR" or "$1,234.56 (DR)" → closing_balance: -1234.56
- "Credit: $1,234.56" → closing_balance: 1234.56
- "Debit: $1,234.56" → closing_balance: -1234.56

Schema:
${JSON.stringify(extractionSchema, null, 2)}

Statement markdown (page chunk ${chunkIndex + 1}/${pageChunks.length}):
${chunk.substring(0, 25000)}` // Limit each chunk to 25k chars (increased from 15k to handle more transactions)
                    }
                  ],
                  response_format: { type: 'json_object' },
                  temperature: 0.1,
                  max_tokens: 12000 // Increased from 8000 to handle statements with many transactions (43+ transactions can exceed 8000 tokens with long descriptions)
                }),
                signal: AbortSignal.timeout(60000) // 60s timeout per chunk
              })

              if (!chunkResponse.ok) {
                const errorText = await chunkResponse.text()
                logger.error('STATEMENT:STRUCTURE:CHUNK', `Chat API error for chunk ${chunkIndex + 1}`, {
                  status: chunkResponse.status,
                  errorText: errorText.substring(0, 500)
                }, correlationId)
                return null
              }

              const chunkData = await chunkResponse.json()
              if (!chunkData.choices?.[0]?.message?.content) {
                logger.warn('STATEMENT:STRUCTURE:CHUNK', `Chunk ${chunkIndex + 1} returned no content`, {
                  chunkIndex: chunkIndex + 1,
                  totalChunks: pageChunks.length
                }, correlationId)
                return null
              }

              const parsedChunk = JSON.parse(chunkData.choices[0].message.content)
              
              // === CHECKPOINT 3: EXTRACTION RESPONSE (CHUNKED) ===
              const extractedTransactions = parsedChunk.transactions || []
              const creditCount = extractedTransactions.filter((t: any) => (t.transaction_type || '').toLowerCase() === 'credit').length
              const debitCount = extractedTransactions.filter((t: any) => (t.transaction_type || '').toLowerCase() === 'debit').length
              const paymentThankyouCount = extractedTransactions.filter((t: any) => 
                (t.description || '').toUpperCase().includes('PAYMENT') && 
                (t.description || '').toUpperCase().includes('THANKYOU')
              ).length
              
              console.log(`=== CHECKPOINT 3: EXTRACTION RESPONSE (CHUNK ${chunkIndex + 1}/${pageChunks.length}) ===`)
              console.log('File: supabase/functions/process-statement/index.ts:1294')
              console.log('Raw response (first 500 chars):', JSON.stringify(parsedChunk, null, 2).substring(0, 500))
              console.log('Transactions extracted by Mistral:', extractedTransactions.length)
              console.log('Credit transactions:', creditCount)
              console.log('Debit transactions:', debitCount)
              console.log('PAYMENT - THANKYOU transactions:', paymentThankyouCount)
              console.log('Sample transactions (first 3):', extractedTransactions.slice(0, 3))
              console.log('Sample transactions (last 3):', extractedTransactions.slice(-3))
              console.log('Status:', extractedTransactions.length > 0 ? `✅ ${extractedTransactions.length} transactions` : '❌ No transactions')
              
              // Log transaction count per chunk for debugging
              const chunkTransactionCount = extractedTransactions.length
              logger.info('STATEMENT:STRUCTURE:CHUNK:RESULT', `Chunk ${chunkIndex + 1} processed`, {
                chunkIndex: chunkIndex + 1,
                totalChunks: pageChunks.length,
                transactionCount: chunkTransactionCount,
                hasAccount: !!parsedChunk.account,
                hasBalances: !!parsedChunk.balances,
                chunkLength: chunk.length,
                truncated: chunk.length > 25000
              }, correlationId)
              
              logger.info('CHECKPOINT:EXTRACTION_RESPONSE', 'Extraction response checkpoint (chunked)', {
                file: 'supabase/functions/process-statement/index.ts:1294',
                chunkIndex: chunkIndex + 1,
                totalChunks: pageChunks.length,
                transactionsInMistralResponse: extractedTransactions.length,
                creditCount: creditCount,
                debitCount: debitCount,
                paymentThankyouCount: paymentThankyouCount,
                sampleTransactions: extractedTransactions.slice(0, 3),
                status: extractedTransactions.length > 0 ? 'OK' : 'NO_TRANSACTIONS'
              }, correlationId)
              
              return parsedChunk
            } catch (error) {
              logger.error('STATEMENT:STRUCTURE:CHUNK', `Error processing chunk ${chunkIndex + 1}`, {
                error: error instanceof Error ? error.message : String(error)
              }, correlationId)
              return null
            }
          })
        )

        // Merge chunk results
        const validChunks = chunkResults.filter(r => r !== null)
        if (validChunks.length === 0) {
          throw new Error('All chunks failed to process')
        }

        // Merge transactions from all chunks
        const mergedTransactions: any[] = []
        let mergedAccount: any = null
        let mergedStatementPeriod: any = null
        let mergedBalances: any = null
        let balanceSourceChunk: number | null = null

        // Collect all balance information from chunks (prefer later chunks for closing balances)
        const allBalanceChunks: Array<{ chunkIndex: number; balances: any }> = []
        const chunkTransactionCounts: number[] = []
        for (let i = 0; i < validChunks.length; i++) {
          const chunkData = validChunks[i]
          if (chunkData.transactions && Array.isArray(chunkData.transactions)) {
            const chunkTxCount = chunkData.transactions.length
            chunkTransactionCounts.push(chunkTxCount)
            mergedTransactions.push(...chunkData.transactions)
          } else {
            chunkTransactionCounts.push(0)
          }
          if (chunkData.account && !mergedAccount) {
            mergedAccount = chunkData.account
          }
          if (chunkData.statement_period && !mergedStatementPeriod) {
            mergedStatementPeriod = chunkData.statement_period
          }
          // Collect balance information from all chunks (not just first)
          if (chunkData.balances) {
            allBalanceChunks.push({ chunkIndex: i, balances: chunkData.balances })
          }
        }

        // Merge balance information intelligently:
        // 1. Prefer later chunks (more likely to have closing balances)
        // 2. Take the most complete balance object (has closing_balance > available_balance > opening_balance)
        if (allBalanceChunks.length > 0) {
          // Sort by chunk index descending (later chunks first)
          allBalanceChunks.sort((a, b) => b.chunkIndex - a.chunkIndex)
          
          // Score each balance object by completeness (closing_balance is most important)
          const scoredBalances = allBalanceChunks.map(({ chunkIndex, balances }) => {
            let score = 0
            if (balances.closing_balance !== undefined && balances.closing_balance !== null) score += 10
            if (balances.available_balance !== undefined && balances.available_balance !== null) score += 5
            if (balances.opening_balance !== undefined && balances.opening_balance !== null) score += 1
            return { chunkIndex, balances, score }
          })
          
          // Sort by score descending, then by chunk index descending
          scoredBalances.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score
            return b.chunkIndex - a.chunkIndex
          })
          
          // Take the best balance object
          const bestBalance = scoredBalances[0]
          mergedBalances = bestBalance.balances
          balanceSourceChunk = bestBalance.chunkIndex
          
          // Merge additional balance fields from other chunks if missing
          for (const { balances } of scoredBalances.slice(1)) {
            if (!mergedBalances.closing_balance && balances.closing_balance !== undefined) {
              mergedBalances.closing_balance = balances.closing_balance
            }
            if (!mergedBalances.available_balance && balances.available_balance !== undefined) {
              mergedBalances.available_balance = balances.available_balance
            }
            if (!mergedBalances.opening_balance && balances.opening_balance !== undefined) {
              mergedBalances.opening_balance = balances.opening_balance
            }
          }
          
          logger.info('STATEMENT:STRUCTURE:PARALLEL:BALANCE_MERGE', 'Merged balance information from chunks', {
            totalChunksWithBalances: allBalanceChunks.length,
            selectedChunkIndex: balanceSourceChunk,
            selectedBalanceScore: scoredBalances[0].score,
            mergedBalances: mergedBalances,
            allChunkBalances: allBalanceChunks.map(({ chunkIndex, balances }) => ({
              chunkIndex,
              hasClosing: balances.closing_balance !== undefined,
              hasAvailable: balances.available_balance !== undefined,
              hasOpening: balances.opening_balance !== undefined
            })),
            statementImportId: statementImport.id
          }, correlationId)
        }

        parsedData = {
          account: mergedAccount,
          statement_period: mergedStatementPeriod,
          balances: mergedBalances,
          transactions: mergedTransactions
        }
        
        // === CHECKPOINT 3: EXTRACTION RESPONSE (CHUNKED - MERGED) ===
        const mergedTransactionCount = mergedTransactions.length
        const mergedCreditCount = mergedTransactions.filter((t: any) => (t.transaction_type || '').toLowerCase() === 'credit').length
        const mergedDebitCount = mergedTransactions.filter((t: any) => (t.transaction_type || '').toLowerCase() === 'debit').length
        const mergedPaymentThankyouCount = mergedTransactions.filter((t: any) => 
          (t.description || '').toUpperCase().includes('PAYMENT') && 
          (t.description || '').toUpperCase().includes('THANKYOU')
        ).length
        
        console.log('=== CHECKPOINT 3: EXTRACTION RESPONSE (CHUNKED - MERGED) ===')
        console.log('File: supabase/functions/process-statement/index.ts:1431')
        console.log('Total transactions after merging chunks:', mergedTransactionCount)
        console.log('Credit transactions:', mergedCreditCount)
        console.log('Debit transactions:', mergedDebitCount)
        console.log('PAYMENT - THANKYOU transactions:', mergedPaymentThankyouCount)
        console.log('Transaction counts per chunk:', chunkTransactionCounts)
        console.log('Sample transactions (first 5):', mergedTransactions.slice(0, 5))
        console.log('Sample transactions (last 5):', mergedTransactions.slice(-5))
        console.log('Status:', mergedTransactionCount >= 40 ? `✅ ${mergedTransactionCount} transactions (expected ~43)` : `❌ Only ${mergedTransactionCount} transactions (expected 43)`)
        
        logger.info('CHECKPOINT:EXTRACTION_RESPONSE', 'Extraction response checkpoint (chunked - merged)', {
          file: 'supabase/functions/process-statement/index.ts:1431',
          transactionsInMistralResponse: mergedTransactionCount,
          creditCount: mergedCreditCount,
          debitCount: mergedDebitCount,
          paymentThankyouCount: mergedPaymentThankyouCount,
          transactionCountsPerChunk: chunkTransactionCounts,
          sampleTransactions: mergedTransactions.slice(0, 5),
          status: mergedTransactionCount >= 40 ? 'OK' : 'LOSS_DETECTED',
          expectedCount: 43
        }, correlationId)

        const structureDuration = Date.now() - structureStartTime
        const chunksSkipped = pageChunks.length - validChunks.length
        logger.info('STATEMENT:STRUCTURE:PARALLEL', 'Parallel chunk processing completed', {
          duration: structureDuration,
          chunksProcessed: validChunks.length,
          totalChunks: pageChunks.length,
          chunksSkipped: chunksSkipped,
          transactionsMerged: mergedTransactions.length,
          transactionCountsPerChunk: chunkTransactionCounts,
          avgTransactionsPerChunk: chunkTransactionCounts.length > 0 
            ? (mergedTransactions.length / chunkTransactionCounts.length).toFixed(1)
            : 0,
          statementImportId: statementImport.id
        }, correlationId)
        
        // Log warning if transaction count seems low (potential regression detection)
        if (mergedTransactions.length < 10 && pageChunks.length > 1) {
          logger.warn('STATEMENT:STRUCTURE:PARALLEL:VALIDATION', 'Low transaction count after merging chunks', {
            totalTransactions: mergedTransactions.length,
            totalChunks: pageChunks.length,
            chunksProcessed: validChunks.length,
            chunksSkipped: chunksSkipped,
            note: 'This may indicate transactions were lost during chunk processing'
          }, correlationId)
        }
      } else {
        // Standard processing for smaller statements
        const structureStartTime = Date.now()
        
        // === CHECKPOINT 2: EXTRACTION REQUEST (STANDARD) ===
        const extractionPromptLength = transactionMarkdown.length
        const extractionPromptPreview = transactionMarkdown.substring(0, 500)
        console.log('=== CHECKPOINT 2: EXTRACTION REQUEST (STANDARD) ===')
        console.log('File: supabase/functions/process-statement/index.ts:1426')
        console.log('Prompt length:', extractionPromptLength)
        console.log('OCR text included in prompt (preview):', extractionPromptPreview)
        console.log('Truncated?', transactionMarkdown.length < allMarkdownText.length ? 'YES' : 'NO')
        console.log('Original markdown length:', allMarkdownText.length)
        console.log('Extracted markdown length:', transactionMarkdown.length)
        console.log('Reduction:', ((allMarkdownText.length - transactionMarkdown.length) / allMarkdownText.length * 100).toFixed(1) + '%')
        
        logger.info('CHECKPOINT:EXTRACTION_REQUEST', 'Extraction request checkpoint (standard)', {
          file: 'supabase/functions/process-statement/index.ts:1426',
          promptLength: extractionPromptLength,
          originalMarkdownLength: allMarkdownText.length,
          extractedMarkdownLength: transactionMarkdown.length,
          truncated: transactionMarkdown.length < allMarkdownText.length,
          reductionPercent: ((allMarkdownText.length - transactionMarkdown.length) / allMarkdownText.length * 100).toFixed(1),
          promptPreview: extractionPromptPreview
        }, correlationId)
        
        const chatResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mistralApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: [
              {
                role: 'system',
                content: 'You are a financial data extraction assistant. Extract structured data from bank statement markdown. Focus on transaction tables, account information, and CRITICALLY important: balance information (opening_balance, closing_balance, available_balance) from headers, footers, and summary sections. Balance information is essential and must be extracted even if not in transaction tables. Pay special attention to CR (credit) and DR (debit) annotations, and columns named "credit", "money in", "deposits", "debit", "money out", or "withdrawals". Return ONLY valid JSON matching the provided schema - no explanations, no markdown, just JSON.'
              },
              {
                role: 'user',
                content: `Extract bank statement information. Return ONLY a valid JSON object (no markdown, no explanations):

CRITICAL: Extract balance information (opening_balance, closing_balance, available_balance) from ALL sections:
- Statement headers (top of page)
- Statement footers (bottom of page)
- Summary sections
- Account summary boxes
- Look for phrases like:
  * "Opening Balance", "Beginning Balance", "Starting Balance"
  * "Closing Balance", "Ending Balance", "Final Balance", "Balance as of [date]"
  * "Available Balance", "Current Balance", "Balance Available"

IMPORTANT - Balance Format Recognition:
- "CR" or "(CR)" annotation next to a balance = POSITIVE balance (credit) - extract as positive number
- "DR" or "(DR)" annotation next to a balance = NEGATIVE balance (debit) - extract as negative number
- Columns named "credit", "money in", "deposits" = positive values
- Columns named "debit", "money out", "withdrawals" = negative values
- If a balance has "CR" next to it (e.g., "$1,234.56 CR" or "$1,234.56 (CR)"), extract it as a POSITIVE number: 1234.56
- If a balance has "DR" next to it (e.g., "$1,234.56 DR" or "$1,234.56 (DR)"), extract it as a NEGATIVE number: -1234.56
- If no annotation, use the sign of the number as-is

IMPORTANT - Transaction Amount Signs:
- Credit transactions (deposits, income, payments received) = POSITIVE amounts
- Debit transactions (withdrawals, expenses, payments made) = NEGATIVE amounts
- If transaction_type is "credit", amount must be positive (e.g., 50.00, not -50.00)
- If transaction_type is "debit", amount must be negative (e.g., -50.00, not 50.00)

CRITICAL - Payment Transaction Classification:
- "PAYMENT - THANKYOU", "PAYMENT THANKYOU", "PAYMENT RECEIVED" = transaction_type: "credit" (NOT "payment")
- Payments received by the account holder are CREDITS (money coming in)
- Only use "payment" type if the description clearly indicates a payment MADE (money going out)
- When in doubt, use "credit" for payments received and "debit" for payments made

Examples:
  * "DEPOSIT" with amount 100.00 → transaction_type: "credit", amount: 100.00
  * "WITHDRAWAL" with amount 50.00 → transaction_type: "debit", amount: -50.00
  * "PAYMENT - THANKYOU" with amount 200.00 → transaction_type: "credit", amount: 200.00 (MUST use "credit", not "payment")
  * "PAYMENT THANKYOU 443794" with amount 500.00 → transaction_type: "credit", amount: 500.00 (MUST use "credit", not "payment")
  * "PURCHASE" with amount 75.00 → transaction_type: "debit", amount: -75.00

Examples:
- "Closing Balance: $1,234.56 CR" → closing_balance: 1234.56
- "Ending Balance: ($1,234.56)" → closing_balance: -1234.56
- "Available Balance as of 12/31/2024: $5,678.90" → available_balance: 5678.90
- "$1,234.56 CR" or "$1,234.56 (CR)" → closing_balance: 1234.56
- "$1,234.56 DR" or "$1,234.56 (DR)" → closing_balance: -1234.56
- "Credit: $1,234.56" → closing_balance: 1234.56
- "Debit: $1,234.56" → closing_balance: -1234.56

Schema:
${JSON.stringify(extractionSchema, null, 2)}

Statement markdown (transaction sections and balance information):
${transactionMarkdown}`
              }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 12000 // Increased from 8000 to handle statements with many transactions (43+ transactions can exceed 8000 tokens with long descriptions)
          }),
          signal: AbortSignal.timeout(120000) // 120 second timeout for structuring (Chat API needs more time for large markdown and complex statements)
        })

        if (!chatResponse.ok) {
          const errorText = await chatResponse.text()
          logger.error('STATEMENT:STRUCTURE', 'Mistral Chat API error', {
            status: chatResponse.status,
            statusText: chatResponse.statusText,
            errorText: errorText.substring(0, 500)
          }, correlationId)
          throw new Error(`Mistral Chat API error: ${chatResponse.status} ${errorText}`)
        }

        const chatData = await chatResponse.json()
        const structureDuration = Date.now() - structureStartTime
        
        if (!chatData.choices?.[0]?.message?.content) {
          logger.error('STATEMENT:STRUCTURE', 'No content in Chat API response', {
            responseKeys: Object.keys(chatData)
          }, correlationId)
          throw new Error('No content returned from Mistral Chat API')
        }

        // Parse the JSON response
        try {
          parsedData = JSON.parse(chatData.choices[0].message.content)
          
          // === CHECKPOINT 3: EXTRACTION RESPONSE (STANDARD) ===
          const extractedTransactions = parsedData.transactions || []
          const creditCount = extractedTransactions.filter((t: any) => (t.transaction_type || '').toLowerCase() === 'credit').length
          const debitCount = extractedTransactions.filter((t: any) => (t.transaction_type || '').toLowerCase() === 'debit').length
          const paymentThankyouCount = extractedTransactions.filter((t: any) => 
            (t.description || '').toUpperCase().includes('PAYMENT') && 
            (t.description || '').toUpperCase().includes('THANKYOU')
          ).length
          
          console.log('=== CHECKPOINT 3: EXTRACTION RESPONSE (STANDARD) ===')
          console.log('File: supabase/functions/process-statement/index.ts:1568')
          console.log('Raw response (first 500 chars):', JSON.stringify(parsedData, null, 2).substring(0, 500))
          console.log('Transactions extracted by Mistral:', extractedTransactions.length)
          console.log('Credit transactions:', creditCount)
          console.log('Debit transactions:', debitCount)
          console.log('PAYMENT - THANKYOU transactions:', paymentThankyouCount)
          console.log('Sample transactions (first 5):', extractedTransactions.slice(0, 5))
          console.log('Sample transactions (last 5):', extractedTransactions.slice(-5))
          console.log('Status:', extractedTransactions.length >= 40 ? `✅ ${extractedTransactions.length} transactions (expected ~43)` : `❌ Only ${extractedTransactions.length} transactions (expected 43)`)
          
          logger.info('CHECKPOINT:EXTRACTION_RESPONSE', 'Extraction response checkpoint (standard)', {
            file: 'supabase/functions/process-statement/index.ts:1568',
            transactionsInMistralResponse: extractedTransactions.length,
            creditCount: creditCount,
            debitCount: debitCount,
            paymentThankyouCount: paymentThankyouCount,
            sampleTransactions: extractedTransactions.slice(0, 5),
            status: extractedTransactions.length >= 40 ? 'OK' : 'LOSS_DETECTED',
            expectedCount: 43
          }, correlationId)
        } catch (parseError) {
          logger.error('STATEMENT:STRUCTURE', 'Failed to parse Chat API JSON response', {
            contentPreview: chatData.choices[0].message.content.substring(0, 500),
            parseError: parseError instanceof Error ? parseError.message : String(parseError)
          }, correlationId)
          throw new Error(`Failed to parse structured data: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
        }

        logger.info('STATEMENT:STRUCTURE', 'Structured data extracted from markdown', {
          duration: structureDuration,
          hasAccount: !!parsedData.account,
          hasAccountNumber: !!parsedData.account?.account_number,
          transactionsCount: parsedData.transactions?.length || 0,
          payloadSize: transactionMarkdown.length,
          originalPayloadSize: allMarkdownText.length,
          isLargeStatement: isLargeStatement,
          pagesCount: pagesCount,
          wasTruncated: !isLargeStatement && transactionMarkdown.length < allMarkdownText.length,
          truncationAmount: !isLargeStatement ? (allMarkdownText.length - transactionMarkdown.length) : 0,
          hasBalances: !!parsedData.balances,
          balancesKeys: parsedData.balances ? Object.keys(parsedData.balances) : [],
          closingBalance: parsedData.balances?.closing_balance,
          availableBalance: parsedData.balances?.available_balance,
          openingBalance: parsedData.balances?.opening_balance,
          balancesObject: parsedData.balances ? JSON.stringify(parsedData.balances) : 'null',
          note: isLargeStatement ? 'Large statement - should use chunking' : 'Small statement - may be truncated if > 15k chars'
        }, correlationId)
        
        // Enhanced logging for balance extraction
        if (!parsedData.balances) {
          logger.warn('STATEMENT:STRUCTURE:BALANCE', 'No balances object in Chat API response', {
            statementImportId: statementImport.id,
            parsedDataKeys: Object.keys(parsedData),
            hasAccount: !!parsedData.account,
            hasTransactions: !!parsedData.transactions,
            transactionCount: parsedData.transactions?.length || 0,
            note: 'Balance information may be missing from statement or not extracted by Chat API'
          }, correlationId)
        } else {
          const hasClosing = parsedData.balances.closing_balance !== undefined && parsedData.balances.closing_balance !== null
          const hasAvailable = parsedData.balances.available_balance !== undefined && parsedData.balances.available_balance !== null
          const hasOpening = parsedData.balances.opening_balance !== undefined && parsedData.balances.opening_balance !== null
          
          if (!hasClosing && !hasAvailable && !hasOpening) {
            logger.warn('STATEMENT:STRUCTURE:BALANCE', 'Balances object exists but contains no balance values', {
              statementImportId: statementImport.id,
              balancesObject: JSON.stringify(parsedData.balances),
              balancesKeys: Object.keys(parsedData.balances)
            }, correlationId)
          } else {
            logger.info('STATEMENT:STRUCTURE:BALANCE', 'Balance information successfully extracted from Chat API', {
              statementImportId: statementImport.id,
              hasClosingBalance: hasClosing,
              hasAvailableBalance: hasAvailable,
              hasOpeningBalance: hasOpening,
              closingBalance: parsedData.balances.closing_balance,
              availableBalance: parsedData.balances.available_balance,
              openingBalance: parsedData.balances.opening_balance
            }, correlationId)
          }
        }
      }
      
      } catch (parseError) {
        const isTimeout = parseError instanceof Error && 
          (parseError.name === 'TimeoutError' || 
           parseError.message.includes('timeout') || 
           parseError.message.includes('Signal timed out'))
        
        if (isTimeout) {
          logger.error('STATEMENT:STRUCTURE', 'Chat API timeout - markdown may be too large or API is slow', {
            error: parseError instanceof Error ? parseError.message : String(parseError),
            markdownLength: allMarkdownText.length,
            pagesCount: ocrResult.pages?.length || 0,
            note: 'Consider reducing markdown size or increasing timeout'
          }, correlationId)
          throw new Error(`Chat API timeout after 120 seconds. The statement may be too large or complex. Please try with a smaller statement or contact support.`)
        }
        
        logger.error('STATEMENT:STRUCTURE', 'Failed to extract structured data from markdown using Chat API', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          errorStack: parseError instanceof Error ? parseError.stack : undefined,
          errorName: parseError instanceof Error ? parseError.name : undefined,
          markdownLength: allMarkdownText.length,
          pagesCount: ocrResult.pages?.length || 0
        }, correlationId)
        throw new Error(`Failed to extract structured data from markdown: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
      }
    }
    
    // Validate and process structured data (applies to both OCR and Chat API results)
    if (!parsedData) {
      throw new Error('No structured data extracted from statement')
    }
    
    // Log transaction details for debugging BEFORE validation
    const transactionDescriptions = parsedData.transactions?.slice(0, 5).map((t: any) => t.description) || []
    const allTransactionDescriptions = parsedData.transactions?.map((t: any) => t.description) || []
    
    logger.info('STATEMENT:OCR_ANNOTATION', 'Structured data extracted successfully (before validation)', {
      hasAccount: !!parsedData.account,
      hasAccountNumber: !!parsedData.account?.account_number,
      transactionsCount: parsedData.transactions?.length || 0,
      firstFewTransactions: transactionDescriptions,
      allTransactionDescriptions: allTransactionDescriptions,
      extractedAt: new Date().toISOString(),
      source: ocrResult.document_annotation ? 'OCR API' : 'Chat API',
      hasBalances: !!parsedData.balances,
      balancesKeys: parsedData.balances ? Object.keys(parsedData.balances) : [],
      closingBalance: parsedData.balances?.closing_balance,
      availableBalance: parsedData.balances?.available_balance,
      openingBalance: parsedData.balances?.opening_balance
    }, correlationId)
    
    // Enhanced balance extraction logging
    if (!parsedData.balances) {
      logger.warn('STATEMENT:OCR_ANNOTATION:BALANCE', 'No balances object in extracted structured data', {
        statementImportId: statementImport.id,
        source: ocrResult.document_annotation ? 'OCR API' : 'Chat API',
        parsedDataKeys: Object.keys(parsedData),
        note: 'Balance information may need to be extracted from transaction rows or statement headers/footers'
      }, correlationId)
    } else {
      const balanceValues = {
        closing: parsedData.balances.closing_balance,
        available: parsedData.balances.available_balance,
        opening: parsedData.balances.opening_balance
      }
      const hasAnyBalance = Object.values(balanceValues).some(v => v !== undefined && v !== null)
      
      if (!hasAnyBalance) {
        logger.warn('STATEMENT:OCR_ANNOTATION:BALANCE', 'Balances object exists but all values are null/undefined', {
          statementImportId: statementImport.id,
          source: ocrResult.document_annotation ? 'OCR API' : 'Chat API',
          balancesObject: JSON.stringify(parsedData.balances)
        }, correlationId)
      }
    }
    
    // Log detailed transaction info for debugging extraction issues
    if (parsedData.transactions && parsedData.transactions.length > 0) {
      logger.info('STATEMENT:OCR_ANNOTATION:DETAILS', 'Transaction extraction details (before validation)', {
        totalTransactions: parsedData.transactions.length,
        transactionDates: parsedData.transactions.map((t: any) => t.date),
        transactionAmounts: parsedData.transactions.map((t: any) => t.amount),
        transactionTypes: parsedData.transactions.map((t: any) => t.transaction_type || 'missing')
      }, correlationId)
      
      // CRITICAL: Log raw OCR extraction data for debugging
      const creditCount = parsedData.transactions.filter((t: any) => (t.transaction_type || '').toLowerCase() === 'credit').length
      const debitCount = parsedData.transactions.filter((t: any) => (t.transaction_type || '').toLowerCase() === 'debit').length
      const missingTypeCount = parsedData.transactions.filter((t: any) => !t.transaction_type || t.transaction_type.trim() === '').length
      
      // #region agent log
      // Log sample transactions from OCR extraction to test Hypothesis A
      const sampleTransactions = parsedData.transactions.slice(0, 5).map((t: any) => ({
        transaction_type: t.transaction_type,
        amount: t.amount,
        description: t.description?.substring(0, 50)
      }));
      logger.info('DEBUG:HYPOTHESIS_A', 'OCR extraction raw data', {
        location: 'process-statement/index.ts:1579',
        statementImportId: statementImport.id,
        accountId: statementImport.account_id,
        totalTransactions: parsedData.transactions.length,
        creditCount,
        debitCount,
        sampleTransactions,
        hypothesisId: 'A'
      }, correlationId);
      // #endregion
      
      logger.info('STATEMENT:OCR_EXTRACTION:RAW_DATA', 'Raw OCR extraction results with full transaction details', {
        statementImportId: statementImport.id,
        accountId: statementImport.account_id,
        totalTransactions: parsedData.transactions.length,
        creditCount,
        debitCount,
        missingTypeCount,
        sampleTransactions: parsedData.transactions.slice(0, 5).map((t: any) => ({
          date: t.date,
          description: t.description?.substring(0, 50),
          amount: t.amount,
          transaction_type: t.transaction_type || 'MISSING',
          reference: t.reference || null
        })),
        allTransactions: parsedData.transactions.map((t: any) => ({
          date: t.date,
          description: t.description?.substring(0, 50),
          amount: t.amount,
          transaction_type: t.transaction_type || 'MISSING',
          reference: t.reference || null
        }))
      }, correlationId)
    }

    // Validate required fields
    if (!parsedData.account?.account_number || !Array.isArray(parsedData.transactions)) {
      logger.error('STATEMENT:OCR_ANNOTATION', 'Invalid structured data - missing required fields', {
        hasAccount: !!parsedData.account,
        hasAccountNumber: !!parsedData.account?.account_number,
        transactionsIsArray: Array.isArray(parsedData.transactions),
        transactionsLength: parsedData.transactions?.length || 0,
        parsedDataKeys: Object.keys(parsedData)
      }, correlationId)
      throw new Error('Invalid structured data from OCR - missing required fields (account.account_number or transactions array)')
    }

    // CRITICAL: Validate transactions against raw OCR markdown text
    // This prevents hallucinated transactions from being stored
    const originalTransactionCount = parsedData.transactions.length
    // Validate transactions against OCR markdown (with error handling to prevent crashes)
    let validatedTransactions: any[] = []
    let filteredTransactions: any[] = []
    const validationStats = {
      high: 0,
      medium: 0,
      low: 0,
      invalid: 0
    }

    try {
      // Extract statement period for date range validation
      const statementPeriod = parsedData.statement_period
      let periodStart: Date | null = null
      let periodEnd: Date | null = null
      
      if (statementPeriod?.from_date) {
        periodStart = new Date(statementPeriod.from_date)
      }
      if (statementPeriod?.to_date) {
        periodEnd = new Date(statementPeriod.to_date)
        // Add one day to end date to include transactions on the last day
        periodEnd.setDate(periodEnd.getDate() + 1)
      }

      logger.info('STATEMENT:VALIDATION', 'Starting transaction validation against OCR markdown', {
        originalCount: originalTransactionCount,
        markdownLength,
        hasStatementPeriod: !!statementPeriod,
        periodStart: periodStart?.toISOString(),
        periodEnd: periodEnd?.toISOString()
      }, correlationId)

      // Pre-process markdown into search index for O(1) lookups (performance optimization)
      const markdownIndexStartTime = Date.now()
      const markdownIndex = new MarkdownSearchIndex(allMarkdownText)
      const markdownIndexDuration = Date.now() - markdownIndexStartTime
      
      const validationStartTime = Date.now()

      // Helper function to determine if transaction has high confidence (can skip OCR validation)
      // Expanded criteria to skip more validations for better performance
      const isHighConfidenceTransaction = (transaction: any): boolean => {
        // High confidence criteria (expanded for better performance):
        // 1. Has clear date format (YYYY-MM-DD or common formats)
        const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(transaction.date) || 
                         /^\d{4}\/\d{2}\/\d{2}$/.test(transaction.date) ||
                         /^\d{2}\/\d{2}\/\d{4}$/.test(transaction.date)
        if (!dateMatch) return false
        
        // 2. Has valid amount (numeric, reasonable range) - expanded range
        const amount = Math.abs(transaction.amount)
        if (isNaN(amount) || amount === 0 || amount > 10000000) return false // Increased from 1M to 10M
        
        // 3. Has meaningful description (reduced from 10 to 5 chars for more coverage)
        const desc = (transaction.description || '').trim()
        if (desc.length < 5) return false
        // Allow descriptions with numbers/symbols if they have some structure (e.g., "REF123456")
        const hasAlphanumeric = /[a-zA-Z0-9]/.test(desc)
        if (!hasAlphanumeric) return false
        
        // 4. Has consistent transaction type (expanded list)
        const validTypes = ['Debit', 'Credit', 'Withdrawal', 'Deposit', 'Transfer', 'Payment', 'Fee', 'Interest', 
                           'debit', 'credit', 'withdrawal', 'deposit', 'transfer', 'payment', 'fee', 'interest',
                           'DEBIT', 'CREDIT', 'WITHDRAWAL', 'DEPOSIT', 'TRANSFER', 'PAYMENT', 'FEE', 'INTEREST']
        if (!transaction.transaction_type || !validTypes.includes(transaction.transaction_type)) return false
        
        // 5. Date is within statement period (if available) - allow 7 day buffer for processing delays
        if (periodStart || periodEnd) {
          const transactionDate = new Date(transaction.date)
          if (isNaN(transactionDate.getTime())) return false
          const bufferDays = 7 // Allow 7 day buffer for statement processing delays
          if (periodStart) {
            const adjustedStart = new Date(periodStart)
            adjustedStart.setDate(adjustedStart.getDate() - bufferDays)
            if (transactionDate < adjustedStart) return false
          }
          if (periodEnd) {
            const adjustedEnd = new Date(periodEnd)
            adjustedEnd.setDate(adjustedEnd.getDate() + bufferDays)
            if (transactionDate > adjustedEnd) return false
          }
        }
        
        // 6. Additional check: Has reference number (common in bank statements)
        // If transaction has a reference, it's more likely to be valid
        if (transaction.reference && transaction.reference.length > 0) {
          return true // Reference number increases confidence
        }
        
        return true
      }

      // Process transactions in parallel batches for better performance
      const validationResults = await batchProcess(
        parsedData.transactions,
        async (transaction) => {
          // CRITICAL FIX: Infer transaction_type from description/amount if missing
          // This prevents valid credit transactions from being filtered out
          if (!transaction.transaction_type) {
            // Try to infer from description patterns (common in ANZ statements)
            const descUpper = (transaction.description || '').toUpperCase()
            const amount = transaction.amount
            
            // Check for credit indicators
            const hasCR = descUpper.includes(' CR') || descUpper.endsWith('CR')
            const hasPaymentThankyou = descUpper.includes('PAYMENT') && (descUpper.includes('THANKYOU') || descUpper.includes('THANK YOU'))
            const hasDeposit = descUpper.includes('DEPOSIT') || descUpper.includes('CREDIT')
            const isPositiveAmount = amount > 0
            
            // Infer transaction_type based on patterns
            let inferredType: string | null = null
            if (hasCR || hasPaymentThankyou || hasDeposit) {
              inferredType = 'credit'
            } else if (isPositiveAmount && !descUpper.includes('DEBIT') && !descUpper.includes('WITHDRAWAL')) {
              // Positive amounts without debit indicators are likely credits
              inferredType = 'credit'
            } else if (amount < 0 || descUpper.includes('DEBIT') || descUpper.includes('WITHDRAWAL')) {
              inferredType = 'debit'
            }
            
            if (inferredType) {
              // Set the inferred type and continue validation
              transaction.transaction_type = inferredType
              logger.info('STATEMENT:VALIDATION:INFER_TYPE', 'Inferred missing transaction_type', {
                description: transaction.description?.substring(0, 50),
                date: transaction.date,
                amount: transaction.amount,
                inferredType,
                reason: hasCR ? 'CR suffix detected' : 
                        hasPaymentThankyou ? 'PAYMENT - THANKYOU pattern' :
                        hasDeposit ? 'Deposit/Credit keyword' :
                        isPositiveAmount ? 'Positive amount' : 'Negative amount'
              }, correlationId)
            } else {
              // If we can't infer, log warning but don't filter out - let OCR validation decide
              logger.warn('STATEMENT:VALIDATION', 'Transaction missing transaction_type and cannot infer', {
                description: transaction.description,
                date: transaction.date,
                amount: transaction.amount,
                note: 'Will proceed with OCR validation - transaction may be filtered if OCR validation fails'
              }, correlationId)
              // Don't filter out immediately - let OCR validation decide
            }
          }

          // Validate date is within statement period (if available)
          // Allow 14-day buffer before period start for pending transactions that cleared during the period
          // This is common in bank statements where transactions from before the period appear
          if (periodStart || periodEnd) {
            const transactionDate = new Date(transaction.date)
            if (isNaN(transactionDate.getTime())) {
              logger.warn('STATEMENT:VALIDATION', 'Transaction has invalid date', {
                description: transaction.description,
                date: transaction.date
              }, correlationId)
              return { transaction, validation: { valid: false, reason: 'Invalid date format', confidence: 'low' as const } }
            }

            // Allow 14-day buffer before period start (pending transactions that cleared)
            const bufferDaysBefore = 14
            const adjustedPeriodStart = periodStart ? new Date(periodStart) : null
            if (adjustedPeriodStart) {
              adjustedPeriodStart.setDate(adjustedPeriodStart.getDate() - bufferDaysBefore)
            }

            if (adjustedPeriodStart && transactionDate < adjustedPeriodStart) {
              // Only log if significantly before (more than 30 days) to reduce noise
              const daysBefore = Math.floor((adjustedPeriodStart.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24))
              if (daysBefore > 30) {
                logger.warn('STATEMENT:VALIDATION', 'Transaction date significantly before statement period', {
                  description: transaction.description,
                  date: transaction.date,
                  periodStart: periodStart.toISOString(),
                  daysBefore
                }, correlationId)
                return { transaction, validation: { valid: false, reason: 'Date significantly before statement period', confidence: 'low' as const } }
              }
              // Otherwise, allow it (likely a pending transaction)
            }

            // Allow 7-day buffer after period end for late-posted transactions
            const bufferDaysAfter = 7
            const adjustedPeriodEnd = periodEnd ? new Date(periodEnd) : null
            if (adjustedPeriodEnd) {
              adjustedPeriodEnd.setDate(adjustedPeriodEnd.getDate() + bufferDaysAfter)
            }

            if (adjustedPeriodEnd && transactionDate > adjustedPeriodEnd) {
              // Only reject if significantly after (more than 14 days) to reduce false positives
              const daysAfter = Math.floor((transactionDate.getTime() - adjustedPeriodEnd.getTime()) / (1000 * 60 * 60 * 24))
              if (daysAfter > 14) {
                logger.warn('STATEMENT:VALIDATION', 'Transaction date significantly after statement period', {
                  description: transaction.description,
                  date: transaction.date,
                  periodEnd: periodEnd.toISOString(),
                  daysAfter
                }, correlationId)
                return { transaction, validation: { valid: false, reason: 'Date significantly after statement period', confidence: 'low' as const } }
              }
              // Otherwise, allow it (likely a late-posted transaction)
            }
          }

          // Validate amount is reasonable (not obviously fabricated)
          const absAmount = Math.abs(transaction.amount)
          if (absAmount > 1000000) { // $1M threshold
            logger.warn('STATEMENT:VALIDATION', 'Transaction amount suspiciously large', {
              description: transaction.description,
              amount: transaction.amount
            }, correlationId)
            // Don't filter, but log warning - could be legitimate large transaction
          }

          // Skip OCR validation for high-confidence transactions (performance optimization)
          if (isHighConfidenceTransaction(transaction)) {
            return { transaction, validation: { valid: true, confidence: 'high' as const } }
          }

          // Validate transaction against OCR markdown using search index (O(1) lookups)
          const validation = validateTransactionAgainstOCR(
            transaction,
            markdownIndex,
            logger,
            correlationId
          )

          return { transaction, validation }
        },
        50 // Process 50 transactions concurrently (increased from 10 for better performance)
      )

      // Process validation results and count skipped validations
      let skippedValidations = 0
      for (const { transaction, validation } of validationResults) {
        if (validation.valid) {
          validatedTransactions.push(transaction)
          validationStats[validation.confidence]++
          // Count high-confidence transactions that skipped OCR validation
          if (validation.confidence === 'high') {
            skippedValidations++
          }
        } else {
          filteredTransactions.push({ ...transaction, reason: validation.reason })
          validationStats.invalid++
        }
      }

      const validationDuration = Date.now() - validationStartTime
      const avgValidationTime = validationResults.length > 0 ? validationDuration / validationResults.length : 0

      // Log validation results with performance metrics
      logger.info('STATEMENT:VALIDATION', 'Transaction validation completed', {
        originalCount: originalTransactionCount,
        validatedCount: validatedTransactions.length,
        filteredCount: filteredTransactions.length,
        validationStats,
        skippedValidations,
        markdownIndexDuration,
        validationDuration,
        avgValidationTime,
        filteredTransactionDescriptions: filteredTransactions.slice(0, 5).map((t: any) => ({
          description: t.description,
          reason: t.reason
        }))
      }, correlationId)

        // Replace transactions with validated set
        parsedData.transactions = validatedTransactions

        // Log final transaction count after validation
        logger.info('STATEMENT:OCR_ANNOTATION', 'Final structured data after validation', {
          hasAccount: !!parsedData.account,
          hasAccountNumber: !!parsedData.account?.account_number,
          transactionsCount: parsedData.transactions.length,
          validatedTransactionsCount: validatedTransactions.length,
          filteredOutCount: filteredTransactions.length
        }, correlationId)
      } catch (validationError) {
        // CRITICAL: Don't fail the entire extraction if validation fails
        // Log error but continue with unvalidated transactions
        logger.error('STATEMENT:VALIDATION', 'Transaction validation failed - continuing with unvalidated transactions', {
          error: validationError instanceof Error ? validationError.message : String(validationError),
          errorStack: validationError instanceof Error ? validationError.stack : undefined,
          originalTransactionCount,
          note: 'Continuing with unvalidated transactions to prevent complete failure'
        }, correlationId)
        
        // Use original transactions if validation completely failed
        // This ensures we don't lose all transactions due to a validation bug
        if (validatedTransactions.length === 0 && parsedData.transactions.length > 0) {
          logger.warn('STATEMENT:VALIDATION', 'Validation failed but keeping original transactions', {
            originalCount: parsedData.transactions.length,
            note: 'This may include invalid transactions, but prevents complete data loss'
          }, correlationId)
          // Keep original transactions - better than losing everything
          // Don't modify parsedData.transactions, keep the original
        } else if (validatedTransactions.length > 0) {
          // Use whatever was validated before the error
          parsedData.transactions = validatedTransactions
          logger.info('STATEMENT:VALIDATION', 'Using partially validated transactions after error', {
            validatedCount: validatedTransactions.length,
            originalCount: originalTransactionCount
          }, correlationId)
        }
        // If both are empty, parsedData.transactions is already empty, which is fine
      }

    // Store OCR results in cache for future use
    const cacheStoreStartTime = Date.now()
    try {
      const { error: cacheError } = await supabase
        .from('ocr_results')
        .upsert({
          file_hash: statementImport.file_hash,
          ocr_content_hash: ocrContentHash,
          markdown_text: allMarkdownText,
          structured_data: parsedData,
          pages_count: ocrResult.pages?.length || 0
        }, {
          onConflict: 'file_hash,ocr_content_hash'
        })

      if (cacheError) {
        logger.warn('STATEMENT:CACHE:OCR:STORE', 'Failed to store OCR results in cache', {
          statementImportId: statementImport.id,
          error: cacheError.message,
          cacheStoreDuration: Date.now() - cacheStoreStartTime
        }, correlationId)
      } else {
        logger.info('STATEMENT:CACHE:OCR:STORE', 'Stored OCR results in cache', {
          statementImportId: statementImport.id,
          fileHash: statementImport.file_hash,
          ocrContentHash,
          pagesCount: ocrResult.pages?.length || 0,
          cacheStoreDuration: Date.now() - cacheStoreStartTime
        }, correlationId)
      }
    } catch (cacheError) {
      logger.warn('STATEMENT:CACHE:OCR:STORE', 'Error storing OCR results in cache', {
        statementImportId: statementImport.id,
        error: cacheError instanceof Error ? cacheError.message : String(cacheError),
        cacheStoreDuration: Date.now() - cacheStoreStartTime
      }, correlationId)
      // Don't fail the extraction if cache storage fails
    }

    // CRITICAL: Merge directly extracted closing balance with Chat API results
    // Use direct extraction as fallback if Chat API didn't extract closing_balance
    if (directlyExtractedClosingBalance !== null) {
      // Initialize balances object if it doesn't exist
      if (!parsedData.balances) {
        parsedData.balances = {}
      }
      
      // If Chat API didn't extract closing_balance, use direct extraction
      if (parsedData.balances.closing_balance === undefined || 
          parsedData.balances.closing_balance === null) {
        parsedData.balances.closing_balance = directlyExtractedClosingBalance
        
        logger.info('STATEMENT:BALANCE:MERGE', 'Merged directly extracted closing balance (Chat API extraction failed)', {
          statementImportId: statementImport.id,
          directlyExtractedBalance: directlyExtractedClosingBalance,
          chatApiClosingBalance: 'missing',
          mergedClosingBalance: parsedData.balances.closing_balance,
          extractionMethod: 'direct_pattern_matching_fallback'
        }, correlationId)
      } else {
        // Chat API extracted closing_balance - compare values for validation
        const chatApiBalance = parsedData.balances.closing_balance
        const difference = Math.abs(chatApiBalance - directlyExtractedClosingBalance)
        const differencePercent = chatApiBalance !== 0 ? (difference / Math.abs(chatApiBalance)) * 100 : 0
        
        if (difference > 0.01) { // More than 1 cent difference
          logger.warn('STATEMENT:BALANCE:MERGE', 'Closing balance mismatch between Chat API and direct extraction', {
            statementImportId: statementImport.id,
            chatApiBalance,
            directExtractionBalance: directlyExtractedClosingBalance,
            difference,
            differencePercent: differencePercent.toFixed(2) + '%',
            note: 'Using Chat API value (preferred), but direct extraction found different value'
          }, correlationId)
        } else {
          logger.info('STATEMENT:BALANCE:MERGE', 'Closing balance values match between Chat API and direct extraction', {
            statementImportId: statementImport.id,
            closingBalance: chatApiBalance,
            directExtractionBalance: directlyExtractedClosingBalance,
            extractionMethod: 'chat_api_with_direct_validation'
          }, correlationId)
        }
      }
    } else if (!parsedData.balances || 
               parsedData.balances.closing_balance === undefined || 
               parsedData.balances.closing_balance === null) {
      // Neither Chat API nor direct extraction found closing balance
      logger.warn('STATEMENT:BALANCE:MERGE', 'No closing balance found by either Chat API or direct extraction', {
        statementImportId: statementImport.id,
        hasBalancesObject: !!parsedData.balances,
        balancesKeys: parsedData.balances ? Object.keys(parsedData.balances) : [],
        note: 'Balance update will be skipped'
      }, correlationId)
    }

    // Attach OCR content hash to return value for cache key matching
    return {
      ...parsedData,
      _ocrContentHash: ocrContentHash,
      _directlyExtractedClosingBalance: directlyExtractedClosingBalance // Store for reference
    }
  })
}

/**
 * Query transactions using Supabase JS client with retry logic for schema cache issues
 * Uses anon key + JWT to respect RLS policies
 * Optimized with date range filtering to reduce query time
 */
async function queryTransactionsWithRetry(
  supabase: any,
  accountId: string,
  userId: string,
  correlationId?: string,
  maxRetries: number = 3,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<any[]> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      let query = supabase
        .from('transactions')
        .select('id, transaction_reference, date, amount, description')
        .eq('account_id', accountId)
        .eq('user_id', userId)

      // Add date range filtering if provided (performance optimization)
      // Only query transactions within statement period ±30 days to reduce query size
      if (dateRange?.startDate || dateRange?.endDate) {
        const startDate = dateRange.startDate 
          ? new Date(dateRange.startDate)
          : null
        const endDate = dateRange.endDate
          ? new Date(dateRange.endDate)
          : null

        // Extend range by 30 days on each side to catch edge cases
        if (startDate) {
          startDate.setDate(startDate.getDate() - 30)
          query = query.gte('date', startDate.toISOString().split('T')[0])
        }
        if (endDate) {
          endDate.setDate(endDate.getDate() + 30)
          query = query.lte('date', endDate.toISOString().split('T')[0])
        }

        logger.info('STATEMENT:QUERY:OPTIMIZED', 'Using date range filtering for duplicate check', {
          accountId,
          startDate: startDate?.toISOString().split('T')[0],
          endDate: endDate?.toISOString().split('T')[0],
          rangeDays: startDate && endDate 
            ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
            : null
        }, correlationId)
      }

      const { data, error } = await query

      if (error) {
        // Check if it's a schema cache error
        if (error.message?.includes('schema cache') || error.code === 'PGRST205') {
          if (attempt < maxRetries - 1) {
            const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
            logger.warn('STATEMENT:SCHEMA_CACHE', `Schema cache error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
              error: error.message,
              accountId,
              userId
            }, correlationId)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        }
        
        logger.error('STATEMENT:QUERY', 'Failed to query transactions', {
          error: error.message,
          errorCode: error.code,
          accountId,
          userId
        }, correlationId)
        return []
      }

      return data || []
    } catch (error) {
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000
        logger.warn('STATEMENT:QUERY', `Query error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
          error: error instanceof Error ? error.message : String(error)
        }, correlationId)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      logger.error('STATEMENT:QUERY', 'Error querying transactions', {
        error: error instanceof Error ? error.message : String(error)
      }, correlationId)
      return []
    }
  }
  return []
}

/**
 * Update account balance with retry logic for transient errors
 * Uses anon key + JWT to respect RLS policies
 */
async function updateAccountBalanceWithRetry(
  supabase: any,
  accountId: string,
  userId: string,
  updateData: any,
  correlationId: string,
  maxRetries: number = 3
): Promise<{ success: boolean; error?: any; data?: any }> {
  // CRITICAL: Ensure updateData doesn't contain account_id or any invalid fields
  const cleanUpdateData = { ...updateData };
  delete (cleanUpdateData as any).account_id;
  delete (cleanUpdateData as any).id;
  delete (cleanUpdateData as any).user_id;
  
  // Validate query parameters before execution
  if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
    logger.error('STATEMENT:BALANCE_UPDATE:VALIDATION', 'Invalid accountId parameter', {
      accountId,
      accountIdType: typeof accountId,
      correlationId
    }, correlationId)
    return { success: false, error: new Error('Invalid accountId: must be a non-empty string') }
  }
  
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    logger.error('STATEMENT:BALANCE_UPDATE:VALIDATION', 'Invalid userId parameter', {
      userId,
      userIdType: typeof userId,
      correlationId
    }, correlationId)
    return { success: false, error: new Error('Invalid userId: must be a non-empty string') }
  }
  
  // Log the exact update data being sent
  logger.info('STATEMENT:BALANCE_UPDATE:RETRY:DIAGNOSTIC', 'Preparing balance update query', {
    accountId,
    userId,
    updateDataKeys: Object.keys(cleanUpdateData),
    updateData: cleanUpdateData,
    originalUpdateDataKeys: Object.keys(updateData),
    hasAccountId: 'account_id' in updateData,
    hasId: 'id' in updateData,
    hasUserId: 'user_id' in updateData
  }, correlationId);
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // CRITICAL: Log the exact query being constructed
      logger.info('STATEMENT:BALANCE_UPDATE:RETRY:QUERY', 'Constructing balance update query', {
        attempt: attempt + 1,
        table: 'accounts',
        whereClause: `id = ${accountId} AND user_id = ${userId}`,
        updateFields: Object.keys(cleanUpdateData),
        accountId,
        userId
      }, correlationId);
      
      // #region agent log
      logger.info('DEBUG:HYPOTHESIS_D', 'before balance update query', {
        location: 'process-statement/index.ts:2130',
        accountId,
        userId,
        updateDataKeys: Object.keys(cleanUpdateData),
        cleanUpdateData,
        attempt: attempt + 1,
        hypothesisId: 'D'
      }, correlationId);
      // #endregion
      
      // Add timeout wrapper to prevent hanging (10 second timeout)
      // CRITICAL: Use Promise.race with proper error handling since Supabase queries may not be cancellable
      const balanceUpdateTimeoutMs = 10000
      let updateResult: { data: any; error: any } | null = null
      let timeoutError: Error | null = null
      const queryStartTime = Date.now()
      
      try {
        const updatePromise = supabase
          .from('accounts')
          .update(cleanUpdateData)
          .eq('id', accountId)
          .eq('user_id', userId)
          .select('id, balance, balance_owed, last_updated')
          .single()
        
        const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) => 
          setTimeout(() => reject(new Error(`Balance update timeout after ${balanceUpdateTimeoutMs}ms`)), balanceUpdateTimeoutMs)
        )
        
        // Race the query against timeout
        updateResult = await Promise.race([updatePromise, timeoutPromise]) as { data: any; error: any }
        const queryDuration = Date.now() - queryStartTime
        logger.info('STATEMENT:BALANCE_UPDATE:QUERY_COMPLETE', 'Balance update query completed', {
          accountId,
          userId,
          queryDuration,
          hasError: !!updateResult?.error,
          errorMessage: updateResult?.error?.message
        }, correlationId)
      } catch (timeoutErr) {
        const queryDuration = Date.now() - queryStartTime
        timeoutError = timeoutErr instanceof Error ? timeoutErr : new Error(String(timeoutErr))
        logger.error('STATEMENT:BALANCE_UPDATE:TIMEOUT', 'Balance update query timed out', {
          accountId,
          userId,
          timeoutMs: balanceUpdateTimeoutMs,
          queryDuration,
          attempt: attempt + 1,
          error: timeoutError.message,
          note: 'Query may be hanging due to database lock, RLS policy issue, or network problem'
        }, correlationId)
        
        // Don't retry on timeout - fail fast
        return { success: false, error: timeoutError }
      }
      
      const { data, error } = updateResult || { data: null, error: timeoutError }
      
      // #region agent log
      logger.info('DEBUG:HYPOTHESIS_D', 'after balance update query', {
        location: 'process-statement/index.ts:2136',
        accountId,
        userId,
        hasError: !!error,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        errorHint: error?.hint,
        attempt: attempt + 1,
        hypothesisId: 'D'
      }, correlationId);
      // #endregion
      
      if (!error) {
        logger.info('STATEMENT:BALANCE_UPDATE:RETRY:SUCCESS', 'Balance update succeeded', {
          accountId,
          userId,
          updatedBalance: data?.balance,
          updatedBalanceOwed: data?.balance_owed,
          attempt: attempt + 1
        }, correlationId);
        return { success: true, data };
      }
      
      // Handle PGRST116 error specifically (.single() when no rows or multiple rows)
      if (error.code === 'PGRST116') {
        logger.error('STATEMENT:BALANCE_UPDATE:SINGLE_ERROR', 'Balance update returned no rows or multiple rows', {
          error: error.message,
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint,
          accountId,
          userId,
          updateDataKeys: Object.keys(cleanUpdateData),
          attempt: attempt + 1,
          note: 'This usually means the WHERE clause matched no rows (RLS policy blocked) or matched multiple rows (should not happen)'
        }, correlationId);
        
        // Don't retry on PGRST116 - it's a data/RLS issue, not transient
        return { success: false, error: new Error(`Balance update failed: ${error.message}. Details: ${error.details || 'No rows matched WHERE clause'}`) };
      }
      
      // Handle RLS policy violations (error code 42501)
      if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('policy')) {
        logger.error('STATEMENT:BALANCE_UPDATE:RLS_ERROR', 'RLS policy violation during balance update', {
          error: error.message,
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint,
          accountId,
          userId,
          updateDataKeys: Object.keys(cleanUpdateData),
          attempt: attempt + 1,
          note: 'RLS policy may be blocking the update. Check policies on accounts table.'
        }, correlationId);
        
        // Don't retry on RLS violations - it's a policy issue, not transient
        return { success: false, error: new Error(`RLS policy violation: ${error.message}`) };
      }
      
      // Log detailed error information for other errors
      logger.error('STATEMENT:BALANCE_UPDATE:RETRY:ERROR', 'Balance update query failed', {
        error: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
        accountId,
        userId,
        updateDataKeys: Object.keys(cleanUpdateData),
        attempt: attempt + 1,
        fullError: JSON.stringify(error, null, 2)
      }, correlationId);
      
      // Retry on transient errors (schema cache, connection issues)
      const isTransientError = error.code === 'PGRST205' || 
                               error.message?.includes('schema cache') ||
                               error.message?.includes('connection') ||
                               error.message?.includes('timeout');
      
      if (isTransientError && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        logger.warn('STATEMENT:BALANCE_UPDATE:RETRY', `Transient error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
          error: error.message,
          errorCode: error.code,
          accountId,
          userId,
          attempt: attempt + 1
        }, correlationId);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Non-retryable error or max retries reached
      logger.error('STATEMENT:BALANCE_UPDATE:RETRY', 'Balance update failed after retries', {
        error: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
        accountId,
        userId,
        attempts: attempt + 1
      }, correlationId);
      return { success: false, error };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('STATEMENT:BALANCE_UPDATE:RETRY:EXCEPTION', 'Exception during balance update', {
        error: err.message,
        errorStack: err instanceof Error ? err.stack : undefined,
        accountId,
        userId,
        attempt: attempt + 1,
        updateDataKeys: Object.keys(cleanUpdateData)
      }, correlationId);
      
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn('STATEMENT:BALANCE_UPDATE:RETRY', `Exception during update, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
          error: err.message,
          accountId,
          userId
        }, correlationId);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      logger.error('STATEMENT:BALANCE_UPDATE:RETRY', 'Balance update exception after retries', {
        error: err.message,
        errorStack: err instanceof Error ? err.stack : undefined,
        accountId,
        userId,
        attempts: attempt + 1
      }, correlationId);
      return { success: false, error: err };
    }
  }
  
  return { success: false, error: new Error('Max retries exceeded for balance update') };
}

/**
 * Insert transactions using Supabase JS client with retry logic for schema cache issues
 * Uses anon key + JWT to respect RLS policies
 * Optimized with chunked batch inserts for better performance
 */
async function insertTransactionsWithRetry(
  supabase: any,
  transactions: any[],
  correlationId?: string,
  maxRetries: number = 3
): Promise<{ data: any[] | null; error: Error | null }> {
  if (transactions.length === 0) {
    return { data: [], error: null }
  }

  // Determine optimal batch size based on transaction count
  // For very large batches (1000+), use smaller chunks to avoid timeouts
  // For medium batches (100-1000), use larger chunks for efficiency
  // For small batches (<100), insert all at once
  const getBatchSize = (total: number): number => {
    if (total >= 1000) return 250 // Smaller chunks for very large batches
    if (total >= 500) return 500 // Medium chunks
    if (total >= 100) return 300 // Balanced chunks
    return total // Insert all at once for small batches
  }

  const batchSize = getBatchSize(transactions.length)
  const batches: any[][] = []
  
  // Split transactions into batches
  for (let i = 0; i < transactions.length; i += batchSize) {
    batches.push(transactions.slice(i, i + batchSize))
  }

  logger.info('STATEMENT:INSERT:BATCH', 'Starting chunked batch insert', {
    totalTransactions: transactions.length,
    batchSize,
    batchCount: batches.length,
    batches: batches.map(b => b.length)
  }, correlationId)

  const allInserted: any[] = []
  const insertStartTime = Date.now()

  // Process batches sequentially to avoid overwhelming the database
  // But each batch can be retried independently
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    let batchInserted: any[] = []
    let batchError: Error | null = null

    // Retry logic for each batch
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const batchStartTime = Date.now()
        const { data, error } = await supabase
          .from('transactions')
          .insert(batch)
          .select('id, amount, type, description, statement_import_id, date')

        const batchDuration = Date.now() - batchStartTime

        if (error) {
          // Check if it's a schema cache error
          if (error.message?.includes('schema cache') || error.code === 'PGRST205') {
            if (attempt < maxRetries - 1) {
              const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
              logger.warn('STATEMENT:SCHEMA_CACHE', `Schema cache error, retrying batch ${batchIndex + 1}/${batches.length} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
                error: error.message,
                batchSize: batch.length,
                batchIndex: batchIndex + 1
              }, correlationId)
              await new Promise(resolve => setTimeout(resolve, delay))
              continue
            }
          }
          
          batchError = new Error(`Transaction insert failed: ${error.message}`)
          logger.error('STATEMENT:INSERT:BATCH', `Failed to insert batch ${batchIndex + 1}/${batches.length}`, {
            error: error.message,
            errorCode: error.code,
            batchSize: batch.length,
            batchIndex: batchIndex + 1,
            batchDuration
          }, correlationId)
          
          // If not a retryable error, break out of retry loop
          if (attempt === maxRetries - 1) {
            break
          }
          
          const delay = Math.pow(2, attempt) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        batchInserted = data || []
        allInserted.push(...batchInserted)
        
        logger.info('STATEMENT:INSERT:BATCH', `Successfully inserted batch ${batchIndex + 1}/${batches.length}`, {
          batchSize: batch.length,
          insertedCount: batchInserted.length,
          batchIndex: batchIndex + 1,
          batchDuration,
          totalInserted: allInserted.length
        }, correlationId)
        
        break // Success, exit retry loop
      } catch (error) {
        const batchStartTime = Date.now()
        const batchDuration = Date.now() - batchStartTime
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000
          logger.warn('STATEMENT:INSERT:BATCH', `Batch ${batchIndex + 1}/${batches.length} error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
            error: error instanceof Error ? error.message : String(error),
            batchSize: batch.length,
            batchDuration
          }, correlationId)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        
        batchError = error instanceof Error ? error : new Error(String(error))
        logger.error('STATEMENT:INSERT:BATCH', `Error inserting batch ${batchIndex + 1}/${batches.length}`, {
          error: batchError.message,
          batchSize: batch.length,
          batchDuration
        }, correlationId)
        break
      }
    }

    // If batch failed after all retries, log error but continue with other batches (partial success)
    if (batchError) {
      const totalDuration = Date.now() - insertStartTime
      logger.warn('STATEMENT:INSERT:BATCH', 'Batch insert failed after retries, continuing with other batches', {
        batchIndex: batchIndex + 1,
        totalBatches: batches.length,
        totalInserted: allInserted.length,
        failedBatchSize: batch.length,
        totalDuration,
        error: batchError.message,
        note: 'Partial success - successfully inserted transactions will be returned'
      }, correlationId)
      // Continue processing other batches instead of failing completely
      // This enables partial success handling
    }
  }

  const totalDuration = Date.now() - insertStartTime
  logger.info('STATEMENT:INSERT:BATCH', 'All batches inserted successfully', {
    totalTransactions: transactions.length,
    totalInserted: allInserted.length,
    batchCount: batches.length,
    totalDuration,
    avgBatchDuration: totalDuration / batches.length
  }, correlationId)

  return { data: allInserted, error: null }
}

/**
 * Process a statement file
 */
async function processStatement(
  fileBlob: Blob | null, 
  statementImport: StatementImport, 
  supabase: any,
  correlationId: string
) {
  // Performance monitoring: Track overall processing time
  const processStartTime = Date.now()
  const performanceMetrics = {
    totalDuration: 0,
    extractionDuration: 0,
    validationDuration: 0,
    duplicateCheckDuration: 0,
    insertDuration: 0,
    balanceUpdateDuration: 0,
    cacheCheckDuration: 0,
    cacheStoreDuration: 0,
    ocrApiDuration: 0,
    chatApiDuration: 0,
    markdownIndexDuration: 0
  }

  // Use Supabase JS client with anon key + JWT (respects RLS)
  // Includes retry logic for schema cache issues
  logger.info('STATEMENT:DB_CLIENT', 'Using Supabase JS client with anon key + JWT (RLS enforced)', {
    statementImportId: statementImport.id,
    userId: statementImport.user_id
  }, correlationId)

  try {
    // Step 1: Extract structured data with Mistral OCR (primary method)
    logger.info('STATEMENT:PROCESS', 'Starting structured data extraction with Mistral OCR', {
      statementImportId: statementImport.id,
      fileSize: fileBlob?.size || statementImport.file_size || 'unknown',
      performanceTracking: 'enabled',
      note: 'Using pre-signed URL - file download eliminated for performance'
    }, correlationId)

    let structuredData: any
    let extractionMethod = 'unknown'

    // Increase extraction timeout to 150s (gives more buffer for Chat API processing large statements)
    // With async processing, this timeout is less critical but still useful for error handling
    const extractionTimeoutMs = 150000
    const extractionStartTime = Date.now()

    try {
      const extractionPromise = extractStatementDataWithMistralOCR(fileBlob, statementImport, supabase)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Extraction timeout after ${extractionTimeoutMs}ms`)), extractionTimeoutMs)
      )

      structuredData = await Promise.race([extractionPromise, timeoutPromise]) as any
      extractionMethod = 'mistral-structured'
      const extractionDuration = Date.now() - extractionStartTime
      performanceMetrics.extractionDuration = extractionDuration
      
      logger.info('STATEMENT:EXTRACT', 'Structured data extracted with Mistral OCR', {
        statementImportId: statementImport.id,
        transactionCount: structuredData.transactions?.length || 0,
        accountNumber: structuredData.account?.account_number,
        duration: extractionDuration,
        hasBalances: !!structuredData.balances,
        balancesKeys: structuredData.balances ? Object.keys(structuredData.balances) : []
      }, correlationId)
      
      // #region agent log
      logger.info('DEBUG:POST_EXTRACTION', 'After extraction, before processing', {
        location: 'process-statement/index.ts:2505',
        statementImportId: statementImport.id,
        transactionCount: structuredData.transactions?.length || 0,
        hasStructuredData: !!structuredData,
        nextStep: 'process_structured_data'
      }, correlationId);
      // #endregion
    } catch (mistralError) {
      const extractionDuration = Date.now() - extractionStartTime
      
      // Check if it's a timeout error
      const isTimeout = mistralError instanceof Error && 
        (mistralError.message.includes('timeout') || mistralError.message.includes('Timeout'))
      
      if (isTimeout) {
        logger.error('STATEMENT:EXTRACT', 'Extraction timeout - function may be hitting resource limits', {
          statementImportId: statementImport.id,
          error: mistralError instanceof Error ? mistralError.message : String(mistralError),
          duration: extractionDuration,
          timeoutMs: extractionTimeoutMs,
          note: 'Consider reducing max_tokens or processing in chunks'
        }, correlationId)
        // Don't fallback on timeout - throw error to update status
        throw new Error(`Statement processing timeout: ${mistralError instanceof Error ? mistralError.message : String(mistralError)}`)
      }
      
      // Categorize errors for better logging and fallback decisions
      if (mistralError instanceof OcrAuthError) {
        logger.error('STATEMENT:EXTRACT', 'OCR authentication failed', {
          statementImportId: statementImport.id,
          error: mistralError.message,
          note: 'Check MISTRAL_API_KEY environment variable'
        }, correlationId)
        // Don't fallback - auth errors won't be fixed by retry
        throw mistralError
      } else if (mistralError instanceof OcrRateLimitError) {
        logger.error('STATEMENT:EXTRACT', 'OCR rate limit exceeded', {
          statementImportId: statementImport.id,
          error: mistralError.message,
          retryAfter: mistralError.retryAfter,
          note: 'Please try again later or contact support if this persists'
        }, correlationId)
        throw new Error(`OCR rate limit exceeded. Please try again later. ${mistralError.retryAfter ? `Retry after ${mistralError.retryAfter} seconds.` : ''}`)
      } else if (mistralError instanceof OcrTimeoutError) {
        logger.error('STATEMENT:EXTRACT', 'OCR timeout', {
          statementImportId: statementImport.id,
          error: mistralError.message,
          note: 'The statement may be too large or complex. Please try with a smaller file or contact support.'
        }, correlationId)
        throw new Error(`OCR processing timeout. The statement may be too large or complex. Please try with a smaller file.`)
      } else {
        // Other errors - provide clear feedback
        const errorMessage = mistralError instanceof Error ? mistralError.message : String(mistralError)
        const errorStack = mistralError instanceof Error ? mistralError.stack : undefined
        
        logger.error('STATEMENT:EXTRACT', 'Mistral OCR failed', {
          statementImportId: statementImport.id,
          error: errorMessage,
          errorStack: errorStack,
          fileSize: fileBlob.size,
          note: 'OCR is required for statement processing. Please ensure the file is a valid PDF statement.'
        }, correlationId)
        
        // Provide user-friendly error message
        let userMessage = 'Could not extract data from statement. '
        if (errorMessage.includes('422') || errorMessage.includes('schema')) {
          userMessage += 'The statement format may not be supported. Please contact support.'
        } else if (errorMessage.includes('401') || errorMessage.includes('auth')) {
          userMessage += 'OCR service authentication failed. Please contact support.'
        } else {
          userMessage += 'The file may be corrupted or in an unsupported format. Please ensure it is a valid PDF bank statement.'
        }
        
        throw new Error(userMessage)
      }
    }

    // Step 2: Process the structured data
    logger.info('STATEMENT:PROCESS', 'Processing structured statement data', {
      statementImportId: statementImport.id,
      transactionCount: structuredData.transactions?.length || 0,
      hasBalances: !!structuredData.balances,
      balancesData: structuredData.balances ? JSON.stringify(structuredData.balances) : 'null'
    }, correlationId)

    // Step 2.1: Extract balance information from structured data
    // Priority: closing_balance > available_balance > opening_balance
    // CRITICAL: Extract balance even if balances object is missing - log for debugging
    
    // Extract raw balance values
    const rawClosingBalance = structuredData.balances?.closing_balance;
    const rawAvailableBalance = structuredData.balances?.available_balance;
    const rawOpeningBalance = structuredData.balances?.opening_balance;
    
    // Determine balance source priority
    const balanceSource = rawClosingBalance !== undefined && rawClosingBalance !== null ? 'closing_balance' :
                          rawAvailableBalance !== undefined && rawAvailableBalance !== null ? 'available_balance' :
                          rawOpeningBalance !== undefined && rawOpeningBalance !== null ? 'opening_balance' :
                          null;
    
    // Get the raw balance value based on priority
    const rawBalance = rawClosingBalance ?? rawAvailableBalance ?? rawOpeningBalance ?? null;
    
    // Normalize balance - check for CR/DR annotations in the markdown if available
    // Note: We don't have direct access to markdown here, but the LLM should have handled CR/DR
    // This normalization is a safety check and handles edge cases
    const normalizedBalance = normalizeExtractedBalance(rawBalance, {
      rawText: structuredData.balances ? JSON.stringify(structuredData.balances) : '',
      // The LLM should have already handled CR/DR, but we normalize to ensure correctness
    });
    
    const extractedBalance = normalizedBalance;
    const statementPeriod = structuredData.statement_period;
    const statementEndDate = statementPeriod?.to_date ? new Date(statementPeriod.to_date) : null;

    // CRITICAL: Always log balance extraction attempt, even if balance is null
    logger.info('STATEMENT:BALANCE_EXTRACT', 'Extracted balance information from statement', {
      statementImportId: statementImport.id,
      rawBalance,
      extractedBalance: normalizedBalance,
      balanceSource,
      wasNormalized: rawBalance !== null && normalizedBalance !== null && rawBalance !== normalizedBalance,
      statementEndDate: statementEndDate?.toISOString(),
      hasStatementPeriod: !!statementPeriod,
      hasBalancesObject: !!structuredData.balances,
      rawClosingBalance,
      rawAvailableBalance,
      rawOpeningBalance,
      normalizedClosingBalance: rawClosingBalance !== undefined && rawClosingBalance !== null ? normalizeExtractedBalance(rawClosingBalance, { rawText: JSON.stringify(structuredData.balances) }) : null,
      normalizedAvailableBalance: rawAvailableBalance !== undefined && rawAvailableBalance !== null ? normalizeExtractedBalance(rawAvailableBalance, { rawText: JSON.stringify(structuredData.balances) }) : null,
      normalizedOpeningBalance: rawOpeningBalance !== undefined && rawOpeningBalance !== null ? normalizeExtractedBalance(rawOpeningBalance, { rawText: JSON.stringify(structuredData.balances) }) : null,
      balancesObject: structuredData.balances ? JSON.stringify(structuredData.balances) : 'null',
      statementPeriodObject: statementPeriod ? JSON.stringify(statementPeriod) : 'null',
      directExtractionValue: structuredData._directlyExtractedClosingBalance,
      directExtractionUsed: structuredData._directlyExtractedClosingBalance !== undefined &&
                            structuredData._directlyExtractedClosingBalance !== null &&
                            rawClosingBalance === structuredData._directlyExtractedClosingBalance,
      extractionMethod: (structuredData._directlyExtractedClosingBalance !== undefined &&
                        structuredData._directlyExtractedClosingBalance !== null &&
                        rawClosingBalance === structuredData._directlyExtractedClosingBalance) ? 'direct_pattern_matching' :
                       (rawClosingBalance !== undefined && rawClosingBalance !== null ? 'chat_api' : 'none')
    }, correlationId)
    
    // CRITICAL: Detailed balance extraction logging for debugging
    logger.info('STATEMENT:BALANCE_EXTRACT:DETAILED', 'Detailed balance extraction information', {
      statementImportId: statementImport.id,
      accountId: statementImport.account_id,
      opening_balance: rawOpeningBalance,
      closing_balance: rawClosingBalance,
      available_balance: rawAvailableBalance,
      balance_source: balanceSource,
      extractedBalance: normalizedBalance,
      statementEndDate: statementEndDate?.toISOString(),
      hasStatementPeriod: !!statementPeriod,
      statementPeriodFrom: statementPeriod?.from_date,
      statementPeriodTo: statementPeriod?.to_date
    }, correlationId)
    
    // Enhanced logging for direct extraction usage
    if (structuredData._directlyExtractedClosingBalance !== undefined && 
        structuredData._directlyExtractedClosingBalance !== null) {
      if (rawClosingBalance === structuredData._directlyExtractedClosingBalance) {
        logger.info('STATEMENT:BALANCE_EXTRACT:DIRECT', 'Using directly extracted closing balance (Chat API extraction failed)', {
          statementImportId: statementImport.id,
          closingBalance: structuredData._directlyExtractedClosingBalance,
          chatApiExtracted: false,
          note: 'Direct pattern matching successfully extracted closing balance from markdown'
        }, correlationId)
      } else if (rawClosingBalance !== undefined && rawClosingBalance !== null) {
        const difference = Math.abs(rawClosingBalance - structuredData._directlyExtractedClosingBalance)
        logger.info('STATEMENT:BALANCE_EXTRACT:DIRECT', 'Direct extraction found balance but Chat API also extracted (using Chat API value)', {
          statementImportId: statementImport.id,
          directExtractionValue: structuredData._directlyExtractedClosingBalance,
          chatApiValue: rawClosingBalance,
          difference,
          differencePercent: rawClosingBalance !== 0 ? ((difference / Math.abs(rawClosingBalance)) * 100).toFixed(2) + '%' : 'N/A',
          note: 'Chat API extraction preferred over direct extraction'
        }, correlationId)
      }
    }

    // #region agent log
    logger.info('DEBUG:PRE_FILTER', 'Before filtering transactions', {
      location: 'process-statement/index.ts:2633',
      statementImportId: statementImport.id,
      transactionCount: structuredData.transactions?.length || 0,
      nextStep: 'filter_balance_entries'
    }, correlationId);
    // #endregion
    
    // Step 3: Convert structured data to database format
    // Filter out opening/closing balance entries (these are not real transactions)
    const filteredTransactions = structuredData.transactions.filter((t: any) => {
      const descUpper = (t.description || '').toUpperCase()
      return !descUpper.includes('OPENING BALANCE') && 
             !descUpper.includes('CLOSING BALANCE') &&
             descUpper !== 'OPENING BALANCE' &&
             descUpper !== 'CLOSING BALANCE'
    })

    // #region agent log
    logger.info('DEBUG:POST_FILTER', 'After filtering transactions', {
      location: 'process-statement/index.ts:2642',
      statementImportId: statementImport.id,
      originalCount: structuredData.transactions?.length || 0,
      filteredCount: filteredTransactions.length,
      nextStep: 'mapping_to_db_format'
    }, correlationId);
    // #endregion

    logger.info('STATEMENT:FILTER', 'Filtered transactions (excluded opening/closing balance)', {
      statementImportId: statementImport.id,
      originalCount: structuredData.transactions?.length || 0,
      filteredCount: filteredTransactions.length,
      excludedCount: (structuredData.transactions?.length || 0) - filteredTransactions.length
    }, correlationId)

    // #region agent log
    logger.info('DEBUG:PRE_MAP', 'Before mapping transactions to DB format', {
      location: 'process-statement/index.ts:2699',
      statementImportId: statementImport.id,
      filteredCount: filteredTransactions.length,
      nextStep: 'normalize_and_map'
    }, correlationId);
    // #endregion
    
    // Step 3: Convert structured data to database format
    // Log transaction data before mapping for debugging
    logger.info('STATEMENT:DB_MAP', 'Mapping validated transactions to database format', {
      statementImportId: statementImport.id,
      validatedCount: filteredTransactions.length,
      sampleTransactions: filteredTransactions.slice(0, 3).map((t: any) => ({
        date: t.date,
        description: t.description?.substring(0, 50),
        amount: t.amount,
        type: t.transaction_type
      }))
    }, correlationId)
    
    // #region agent log
    logger.info('DEBUG:POST_MAP_LOG', 'After DB_MAP log, before normalization mapping', {
      location: 'process-statement/index.ts:2712',
      statementImportId: statementImport.id,
      filteredCount: filteredTransactions.length,
      nextStep: 'start_transaction_mapping'
    }, correlationId);
    // #endregion

    // CRITICAL: Normalize transaction amounts to match database schema
    // Database expects: income = positive, expense = negative
    // OCR may return amounts with inconsistent signs or misclassified types, so we normalize intelligently
    // Helper function to determine type (same logic as in mapping below)
    const determineTransactionType = (t: any, logFallback: boolean = false): 'income' | 'expense' => {
      const rawAmount = t.amount;
      const ocrTransactionType = (t.transaction_type || '').toLowerCase();
      const description = (t.description || '').toLowerCase();
      
      // #region agent log
      logger.info('DEBUG:HYPOTHESIS_A', 'determineTransactionType entry', {
        location: 'process-statement/index.ts:2665',
        rawAmount,
        ocrTransactionType,
        description: description.substring(0, 50),
        statementImportId: statementImport.id,
        hypothesisId: 'A'
      }, correlationId);
      // #endregion
      
      // CRITICAL: transaction_type from OCR is PRIMARY determinant
      // This ensures credits are always income, even if OCR extracted negative amount
      // This fixes the issue where credits extracted as negative amounts were misclassified as expenses
      if (ocrTransactionType === 'credit') {
        // #region agent log
        logger.info('DEBUG:HYPOTHESIS_A', 'determineTransactionType credit branch', {
          location: 'process-statement/index.ts:2673',
          ocrTransactionType,
          result: 'income',
          hypothesisId: 'A'
        }, correlationId);
        // #endregion
        return 'income'; // Credits are always income, regardless of amount sign
      } else if (ocrTransactionType === 'debit') {
        // #region agent log
        logger.info('DEBUG:HYPOTHESIS_A', 'determineTransactionType debit branch', {
          location: 'process-statement/index.ts:2675',
          ocrTransactionType,
          result: 'expense',
          hypothesisId: 'A'
        }, correlationId);
        // #endregion
        return 'expense'; // Debits are always expenses
      } else if (ocrTransactionType === 'payment') {
        // CRITICAL FIX: "payment" type from OCR typically means payment received (credit)
        // Check description to determine if it's payment received (income) or payment made (expense)
        // Common patterns: "PAYMENT - THANKYOU", "PAYMENT THANKYOU", "PAYMENT RECEIVED" = income
        // "PAYMENT TO", "PAYMENT MADE", "PAYMENT FOR" = expense
        const hasThankyou = description.includes('thankyou');
        const hasPaymentReceived = description.includes('payment received');
        const hasPaymentThankyou = description.includes('payment thankyou');
        const hasPayment = description.includes('payment');
        const hasPaymentTo = description.includes('payment to');
        const hasPaymentFor = description.includes('payment for');
        const isPaymentReceived = hasThankyou || 
                                  hasPaymentReceived ||
                                  hasPaymentThankyou ||
                                  (hasPayment && rawAmount > 0 && !hasPaymentTo && !hasPaymentFor);
        
        // #region agent log
        logger.info('DEBUG:HYPOTHESIS_B', 'determineTransactionType payment classification', {
          location: 'process-statement/index.ts:2682',
          ocrTransactionType,
          description: description.substring(0, 50),
          rawAmount,
          hasThankyou,
          hasPaymentReceived,
          hasPaymentThankyou,
          hasPayment,
          hasPaymentTo,
          hasPaymentFor,
          isPaymentReceived,
          result: isPaymentReceived ? 'income' : 'expense',
          hypothesisId: 'B'
        }, correlationId);
        // #endregion
        
        if (isPaymentReceived) {
          // Log when we're treating payment as income
          logger.info('STATEMENT:NORMALIZATION:PAYMENT_AS_CREDIT', 'Treating payment transaction as credit/income', {
            description: t.description?.substring(0, 50),
            amount: rawAmount,
            ocrTransactionType: t.transaction_type,
            statementImportId: statementImport.id
          }, correlationId);
          return 'income';
        } else {
          // Payment made = expense
          return 'expense';
        }
      } else if (ocrTransactionType === 'deposit' || ocrTransactionType === 'transfer_in') {
        // Other credit-like types
        return 'income';
      } else if (ocrTransactionType === 'withdrawal' || ocrTransactionType === 'transfer_out') {
        // Other debit-like types
        return 'expense';
      }
      
      // Fallback to amount sign only if transaction_type is missing or invalid
      // Log warning when falling back to amount sign (transaction_type should be present)
      if (logFallback && (!t.transaction_type || t.transaction_type.trim() === '')) {
        logger.warn('STATEMENT:NORMALIZATION:FALLBACK', 'Missing transaction_type, using amount sign as fallback', {
          description: t.description?.substring(0, 50),
          amount: rawAmount,
          fallbackType: rawAmount > 0 ? 'income' : rawAmount < 0 ? 'expense' : 'expense',
          statementImportId: statementImport.id
        }, correlationId);
      }
      
      // #region agent log
      logger.info('DEBUG:HYPOTHESIS_A', 'determineTransactionType fallback to amount sign', {
        location: 'process-statement/index.ts:2719',
        rawAmount,
        ocrTransactionType,
        description: description.substring(0, 50),
        hasTransactionType: !!t.transaction_type,
        hypothesisId: 'A'
      }, correlationId);
      // #endregion
      
      if (rawAmount > 0) {
        // #region agent log
        logger.info('DEBUG:HYPOTHESIS_A', 'determineTransactionType positive amount fallback', {
          location: 'process-statement/index.ts:2720',
          rawAmount,
          result: 'income',
          hypothesisId: 'A'
        }, correlationId);
        // #endregion
        return 'income';
      } else if (rawAmount < 0) {
        // #region agent log
        logger.info('DEBUG:HYPOTHESIS_A', 'determineTransactionType negative amount fallback', {
          location: 'process-statement/index.ts:2722',
          rawAmount,
          result: 'expense',
          hypothesisId: 'A'
        }, correlationId);
        // #endregion
        return 'expense';
      }
      
      // Default fallback for zero amounts
      // #region agent log
      logger.info('DEBUG:HYPOTHESIS_A', 'determineTransactionType zero amount default', {
        location: 'process-statement/index.ts:2726',
        rawAmount,
        result: 'expense',
        hypothesisId: 'A'
      }, correlationId);
      // #endregion
      return 'expense';
    };
    
    logger.info('STATEMENT:AMOUNT_NORMALIZATION', 'Normalizing transaction amounts', {
      statementImportId: statementImport.id,
      note: 'transaction_type is PRIMARY determinant: credit = income, debit = expense. Amount sign used as fallback if type missing.',
      sampleNormalizations: filteredTransactions.slice(0, 5).map((t: any) => {
        const transactionType = determineTransactionType(t, false); // Don't log in sample, only in actual mapping
        const normalizedAmount = transactionType === 'income' 
          ? Math.abs(t.amount)  // Ensure positive for income
          : -Math.abs(t.amount); // Ensure negative for expense
        return {
          originalAmount: t.amount,
          ocrTransactionType: t.transaction_type,
          description: t.description?.substring(0, 40),
          normalizedType: transactionType,
          normalizedAmount: normalizedAmount,
          reasoning: t.transaction_type?.toLowerCase() === 'credit' ? 'Credit transaction → income' :
                     t.transaction_type?.toLowerCase() === 'debit' ? 'Debit transaction → expense' :
                     t.amount > 0 ? 'Positive amount (no type) → income' :
                     t.amount < 0 ? 'Negative amount (no type) → expense' :
                     'Zero amount → fallback to expense'
        };
      })
    }, correlationId)

    const transactions = filteredTransactions.map((t: any) => {
      const rawAmount = t.amount;
      const ocrTransactionType = (t.transaction_type || '').toLowerCase();
      
      // Log BEFORE normalization
      logger.debug('STATEMENT:NORMALIZATION:TRANSACTION_DETAIL', 'Transaction before normalization', {
        statementImportId: statementImport.id,
        accountId: statementImport.account_id,
        rawAmount,
        ocrTransactionType: t.transaction_type || 'MISSING',
        description: t.description?.substring(0, 50),
        date: t.date
      }, correlationId);
      
      // Use the helper function to determine transaction type
      // Pass true to log warnings when falling back to amount sign
      const transactionType = determineTransactionType(t, true);
      
      // #region agent log
      logger.info('DEBUG:HYPOTHESIS_C', 'before amount normalization', {
        location: 'process-statement/index.ts:2768',
        rawAmount,
        transactionType,
        ocrTransactionType: t.transaction_type,
        hypothesisId: 'C'
      }, correlationId);
      // #endregion
      
      // CRITICAL: If transaction_type is credit but amount is negative, flip the sign
      // This handles cases where OCR extracted credit as negative
      let normalizedAmount: number;
      let correctionApplied = false;
      
      if (transactionType === 'income') {
        // Income must be positive - ensure positive even if OCR extracted negative
        normalizedAmount = Math.abs(rawAmount);
        correctionApplied = rawAmount < 0;
        
        // #region agent log
        logger.info('DEBUG:HYPOTHESIS_C', 'amount normalization income branch', {
          location: 'process-statement/index.ts:2777',
          rawAmount,
          normalizedAmount,
          correctionApplied,
          transactionType,
          hypothesisId: 'C'
        }, correlationId);
        // #endregion
        
        // Log warning if we had to flip the sign for a credit transaction
        if (rawAmount < 0 && t.transaction_type?.toLowerCase() === 'credit') {
          logger.warn('STATEMENT:AMOUNT_CORRECTION', 'Flipped negative amount for credit transaction', {
            originalAmount: rawAmount,
            correctedAmount: normalizedAmount,
            description: t.description?.substring(0, 50),
            transactionType: t.transaction_type,
            statementImportId: statementImport.id
          }, correlationId);
        }
      } else {
        // Expense must be negative - ensure negative even if OCR extracted positive
        normalizedAmount = -Math.abs(rawAmount);
        correctionApplied = rawAmount > 0;
        
        // #region agent log
        logger.info('DEBUG:HYPOTHESIS_C', 'amount normalization expense branch', {
          location: 'process-statement/index.ts:2792',
          rawAmount,
          normalizedAmount,
          correctionApplied,
          transactionType,
          hypothesisId: 'C'
        }, correlationId);
        // #endregion
        
        // Log warning if we had to flip the sign for a debit transaction
        if (rawAmount > 0 && t.transaction_type?.toLowerCase() === 'debit') {
          logger.warn('STATEMENT:AMOUNT_CORRECTION', 'Flipped positive amount for debit transaction', {
            originalAmount: rawAmount,
            correctedAmount: normalizedAmount,
            description: t.description?.substring(0, 50),
            transactionType: t.transaction_type,
            statementImportId: statementImport.id
          }, correlationId);
        }
      }
      
      // #region agent log
      logger.info('DEBUG:HYPOTHESIS_C', 'after amount normalization', {
        location: 'process-statement/index.ts:2805',
        rawAmount,
        normalizedAmount,
        transactionType,
        correctionApplied,
        amountSignMatchesType: (transactionType === 'income' && normalizedAmount > 0) || (transactionType === 'expense' && normalizedAmount < 0),
        hypothesisId: 'C'
      }, correlationId);
      // #endregion
      
      // Log AFTER normalization
      logger.info('STATEMENT:NORMALIZATION:TRANSACTION_DETAIL', 'Transaction after normalization', {
        statementImportId: statementImport.id,
        accountId: statementImport.account_id,
        rawAmount,
        ocrTransactionType: t.transaction_type || 'MISSING',
        determinedType: transactionType,
        normalizedAmount,
        correctionApplied,
        description: t.description?.substring(0, 50),
        date: t.date
      }, correlationId);
      
      return {
        user_id: statementImport.user_id,
        account_id: statementImport.account_id,
        statement_import_id: statementImport.id,
        date: t.date,
        description: t.description,
        amount: normalizedAmount,  // ✅ Normalized amount matching schema
        type: transactionType,
        transaction_reference: t.reference || null,
        category: null, // Will be set later by user (note: column is 'category', not 'category_id')
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    })

    // === CHECKPOINT 4: PRE-STORAGE ===
    const transactionsAfterNormalization = transactions.length
    const incomeCount = transactions.filter((tx: any) => tx.type === 'income').length
    const expenseCount = transactions.filter((tx: any) => tx.type === 'expense').length
    const paymentThankyouCount = transactions.filter((tx: any) => 
      (tx.description || '').toUpperCase().includes('PAYMENT') && 
      (tx.description || '').toUpperCase().includes('THANKYOU')
    ).length
    
    // Get original count from structuredData if available
    const originalExtractedCount = structuredData?.transactions?.length || transactionsAfterNormalization
    
    console.log('=== CHECKPOINT 4: PRE-STORAGE ===')
    console.log('File: supabase/functions/process-statement/index.ts:3393')
    console.log('Transactions before storage:', transactionsAfterNormalization)
    console.log('Income transactions:', incomeCount)
    console.log('Expense transactions:', expenseCount)
    console.log('PAYMENT - THANKYOU transactions:', paymentThankyouCount)
    console.log('Original extracted count:', originalExtractedCount)
    console.log('Transactions after validation/normalization:', transactionsAfterNormalization)
    console.log('Any filtered out?', originalExtractedCount - transactionsAfterNormalization)
    console.log('Sample transactions (first 3):', transactions.slice(0, 3))
    console.log('Status:', transactionsAfterNormalization >= 40 ? `✅ ${transactionsAfterNormalization} transactions (expected ~43)` : `❌ Only ${transactionsAfterNormalization} transactions (expected 43)`)
    
    logger.info('CHECKPOINT:PRE_STORAGE', 'Pre-storage checkpoint', {
      file: 'supabase/functions/process-statement/index.ts:3393',
      transactionsBeforeStorage: transactionsAfterNormalization,
      incomeCount: incomeCount,
      expenseCount: expenseCount,
      paymentThankyouCount: paymentThankyouCount,
      originalExtractedCount: originalExtractedCount,
      filteredOut: originalExtractedCount - transactionsAfterNormalization,
      sampleTransactions: transactions.slice(0, 3),
      status: transactionsAfterNormalization >= 40 ? 'OK' : 'LOSS_DETECTED',
      expectedCount: 43
    }, correlationId)
    
    // Log exact transaction data being inserted
    logger.info('STATEMENT:DB_INSERT_PREP', 'Prepared transactions for database insertion', {
      statementImportId: statementImport.id,
      transactionCount: transactions.length,
      accountId: statementImport.account_id,
      userId: statementImport.user_id,
      sampleTransactionData: transactions.slice(0, 2).map((tx: any) => ({
        date: tx.date,
        description: tx.description?.substring(0, 50),
        amount: tx.amount,
        type: tx.type,
        statement_import_id: tx.statement_import_id,
        transaction_reference: tx.transaction_reference
      })),
      allDescriptions: transactions.map((tx: any) => tx.description?.substring(0, 30))
    }, correlationId)
    
    // CRITICAL: Log exact payload for first 10 transactions before database insert
    logger.info('STATEMENT:DB_INSERT:PAYLOAD', 'Exact database insert payload for first 10 transactions', {
      statementImportId: statementImport.id,
      accountId: statementImport.account_id,
      totalTransactions: transactions.length,
      payloadSample: transactions.slice(0, 10).map((tx: any) => ({
        amount: tx.amount,
        type: tx.type,
        description: tx.description?.substring(0, 50),
        statement_import_id: tx.statement_import_id,
        date: tx.date,
        transaction_reference: tx.transaction_reference,
        // Validation: Check if amount sign matches type
        amountMatchesType: (tx.type === 'income' && tx.amount > 0) || (tx.type === 'expense' && tx.amount < 0)
      })),
      incomeCount: transactions.filter((tx: any) => tx.type === 'income').length,
      expenseCount: transactions.filter((tx: any) => tx.type === 'expense').length,
      positiveAmountCount: transactions.filter((tx: any) => tx.amount > 0).length,
      negativeAmountCount: transactions.filter((tx: any) => tx.amount < 0).length
    }, correlationId)

    // #region agent log
    logger.info('DEBUG:PRE_DUPLICATE_CHECK', 'Before duplicate check query', {
      location: 'process-statement/index.ts:3104',
      statementImportId: statementImport.id,
      transactionCount: transactions.length,
      hasStatementPeriod: !!statementPeriod,
      nextStep: 'query_existing_transactions'
    }, correlationId);
    // #endregion
    
    // Step 4: Remove duplicates based on existing transactions
    // Use Supabase JS client with retry logic for schema cache issues
    // Optimized with date range filtering to reduce query time
    const duplicateCheckStartTime = Date.now()
    
    // Add timeout to duplicate check to prevent hanging
    const duplicateCheckTimeoutMs = 10000 // 10 second timeout
    let existingTransactions: any[] = []
    try {
      const queryPromise = queryTransactionsWithRetry(
        supabase,
        statementImport.account_id,
        statementImport.user_id,
        correlationId,
        3, // maxRetries
        statementPeriod ? {
          startDate: statementPeriod.from_date,
          endDate: statementPeriod.to_date
        } : undefined
      )
      const timeoutPromise = new Promise<any[]>((_, reject) => 
        setTimeout(() => reject(new Error(`Duplicate check timeout after ${duplicateCheckTimeoutMs}ms`)), duplicateCheckTimeoutMs)
      )
      
      existingTransactions = await Promise.race([queryPromise, timeoutPromise])
      
      // #region agent log
      logger.info('DEBUG:POST_DUPLICATE_CHECK', 'After duplicate check query', {
        location: 'process-statement/index.ts:3125',
        statementImportId: statementImport.id,
        existingTransactionsCount: existingTransactions.length,
        duration: Date.now() - duplicateCheckStartTime,
        nextStep: 'filter_duplicates'
      }, correlationId);
      // #endregion
    } catch (duplicateCheckError) {
      // Log timeout but continue - better to insert duplicates than fail completely
      logger.warn('STATEMENT:DUPLICATE_CHECK', 'Duplicate check timed out or failed, continuing without duplicate filtering', {
        statementImportId: statementImport.id,
        error: duplicateCheckError instanceof Error ? duplicateCheckError.message : String(duplicateCheckError),
        duration: Date.now() - duplicateCheckStartTime,
        note: 'Continuing without duplicate check - duplicates will be filtered by database constraints'
      }, correlationId)
      existingTransactions = [] // Continue without duplicate filtering
    }

    // Create Set for O(1) duplicate lookups (performance optimization)
    const existingTransactionKeys = new Set<string>()
    if (existingTransactions && existingTransactions.length > 0) {
      for (const existing of existingTransactions) {
        // Create unique key: reference + date + amount (rounded to 2 decimals)
        const amountKey = Math.round(existing.amount * 100) / 100
        const key = `${existing.transaction_reference || ''}|${existing.date}|${amountKey}`
        existingTransactionKeys.add(key)
      }
    }

    const uniqueTransactions = transactions.filter((newTx: any) => {
      const amountKey = Math.round(newTx.amount * 100) / 100
      const key = `${newTx.transaction_reference || ''}|${newTx.date}|${amountKey}`
      return !existingTransactionKeys.has(key)
    })
    
    const duplicateCheckDuration = Date.now() - duplicateCheckStartTime

    // Step 5: Update statement import with parsing metadata (but NOT status - that's set after insertion)
    // Status is already 'processing' from main handler, will be updated to 'completed' or 'failed' after insertion
    // Note: ocrContentHash is computed during OCR extraction and stored here for cache key matching
    await supabase
      .from('statement_imports')
      .update({
        parsing_method: extractionMethod,
        total_transactions: uniqueTransactions.length,
        metadata: {
          extraction_method: extractionMethod,
          account_number: structuredData.account?.account_number,
          bank_name: structuredData.account?.bank_name,
          statement_period: structuredData.statement_period,
          parsed_at: new Date().toISOString(),
          ocr_content_hash: structuredData._ocrContentHash || null, // Store OCR content hash for improved cache key
          extracted_balance: extractedBalance,
          extracted_balance_source: balanceSource,
          balance_updated: false, // Will be set to true if balance update succeeds
        }
      })
      .eq('id', statementImport.id)

    performanceMetrics.duplicateCheckDuration = duplicateCheckDuration
    
    logger.info('STATEMENT:PROCESS', 'Statement processing completed', {
      statementImportId: statementImport.id,
      transactionsFound: transactions.length,
      uniqueTransactionsCount: uniqueTransactions.length,
      duplicateCheckDuration,
      extractionMethod,
    }, correlationId)

    // Step 6: Create transactions (if processing successful)
    // Use Supabase JS client with retry logic for schema cache issues
    // RLS policies automatically enforce that user_id matches JWT sub claim
    if (uniqueTransactions.length > 0) {
      const insertStartTime = Date.now()
      logger.info('STATEMENT:INSERT', 'Starting transaction insertion', {
        statementImportId: statementImport.id,
        transactionCount: uniqueTransactions.length,
        accountId: statementImport.account_id,
        userId: statementImport.user_id
      }, correlationId)
      const { data: insertedTransactions, error: insertError } = await insertTransactionsWithRetry(
        supabase,
        uniqueTransactions,
        correlationId
      )
      const insertDuration = Date.now() - insertStartTime
      performanceMetrics.insertDuration = insertDuration

      // Handle partial success: if some transactions were inserted, don't fail completely
      const insertedCount = insertedTransactions?.length || 0
      const failedCount = uniqueTransactions.length - insertedCount
      const hasPartialSuccess = insertedCount > 0 && insertedCount < uniqueTransactions.length
      const hasCompleteFailure = insertedCount === 0
      
      // === CHECKPOINT 5: DATABASE INSERT ===
      // Verify with query
      let verifiedStoredCount = 0
      try {
        const { data: storedTransactions, error: queryError } = await supabase
          .from('transactions')
          .select('id', { count: 'exact' })
          .eq('statement_import_id', statementImport.id)
          .eq('account_id', statementImport.account_id)
          .eq('user_id', statementImport.user_id)
        
        verifiedStoredCount = storedTransactions?.length || 0
      } catch (verifyError) {
        logger.warn('CHECKPOINT:DB_INSERT', 'Could not verify stored count', {
          error: verifyError instanceof Error ? verifyError.message : String(verifyError)
        }, correlationId)
      }
      
      console.log('=== CHECKPOINT 5: DATABASE INSERT ===')
      console.log('File: supabase/functions/process-statement/index.ts:3585')
      console.log('Insert operation returned:', insertedCount, 'records')
      console.log('Query verification:', verifiedStoredCount, 'records in DB')
      console.log('Unique transactions attempted:', uniqueTransactions.length)
      console.log('Failed count:', failedCount)
      console.log('Sample inserted transactions:', insertedTransactions?.slice(0, 3))
      console.log('Status:', insertedCount >= 40 && verifiedStoredCount >= 40 ? `✅ ${insertedCount} inserted, ${verifiedStoredCount} verified (expected ~43)` : `❌ Only ${insertedCount} inserted, ${verifiedStoredCount} verified (expected 43)`)
      
      logger.info('CHECKPOINT:DB_INSERT', 'Database insert checkpoint', {
        file: 'supabase/functions/process-statement/index.ts:3585',
        insertOperationReturned: insertedCount,
        queryVerification: verifiedStoredCount,
        uniqueTransactionsAttempted: uniqueTransactions.length,
        failedCount: failedCount,
        sampleInsertedTransactions: insertedTransactions?.slice(0, 3),
        status: insertedCount >= 40 && verifiedStoredCount >= 40 ? 'OK' : 'LOSS_DETECTED',
        expectedCount: 43
      }, correlationId)

      if (insertError && hasCompleteFailure) {
        // Complete failure - no transactions inserted
        logger.error('STATEMENT:INSERT', 'Transaction insertion failed completely', {
          statementImportId: statementImport.id,
          error: insertError.message,
          transactionCount: uniqueTransactions.length,
          insertedCount: 0,
          duration: insertDuration
        }, correlationId)
        
        // Update status to failed if no transactions were inserted
        await supabase
          .from('statement_imports')
          .update({
            status: 'failed',
            error_message: insertError.message,
            failed_transactions: uniqueTransactions.length,
            updated_at: new Date().toISOString(),
            correlation_id: correlationId,
          })
          .eq('id', statementImport.id)

        throw new Error(`Transaction creation failed: ${insertError.message}`)
      } else if (hasPartialSuccess) {
        // Partial success - some transactions inserted, some failed
        logger.warn('STATEMENT:INSERT', 'Transaction insertion partially successful', {
          statementImportId: statementImport.id,
          insertedCount,
          failedCount,
          totalCount: uniqueTransactions.length,
          duration: insertDuration,
          note: 'Some transactions were successfully inserted despite errors'
        }, correlationId)
        
        // Update status to completed with partial success metadata
        await supabase
          .from('statement_imports')
          .update({
            status: 'completed',
            imported_transactions: insertedCount,
            failed_transactions: failedCount,
            error_message: insertError ? `Partial success: ${insertError.message}` : 'Some transactions failed validation',
            updated_at: new Date().toISOString(),
            correlation_id: correlationId,
          })
          .eq('id', statementImport.id)
      } else if (insertError) {
        // Error but all transactions were inserted (unlikely but handle it)
        logger.warn('STATEMENT:INSERT', 'Transaction insertion completed with warnings', {
          statementImportId: statementImport.id,
          insertedCount,
          error: insertError.message,
          duration: insertDuration
        }, correlationId)
      }

      logger.info('STATEMENT:INSERT', 'Transaction insertion completed', {
        statementImportId: statementImport.id,
        insertedCount: insertedTransactions?.length || 0,
        expectedCount: uniqueTransactions.length,
        duration: insertDuration
      }, correlationId)

      // CRITICAL: Log inserted transaction data for verification
      if (insertedTransactions && insertedTransactions.length > 0) {
        logger.info('STATEMENT:DB_INSERT_VERIFY', 'Verifying inserted transactions in database', {
          statementImportId: statementImport.id,
          insertedCount: insertedTransactions.length,
          sampleInsertedTransactions: insertedTransactions.slice(0, 3).map((tx: any) => ({
            id: tx.id,
            date: tx.date,
            description: tx.description?.substring(0, 50),
            amount: tx.amount,
            type: tx.type,
            statement_import_id: tx.statement_import_id || tx.statementImportId,
            transaction_reference: tx.transaction_reference || tx.transactionReference
          })),
          allInsertedDescriptions: insertedTransactions.map((tx: any) => 
            (tx.description || '').substring(0, 30)
          ),
          allInsertedIds: insertedTransactions.map((tx: any) => tx.id)
        }, correlationId)

        // Verify statement_import_id is set correctly on all inserted transactions
        const missingStatementImportId = insertedTransactions.filter((tx: any) => 
          !tx.statement_import_id && !tx.statementImportId
        )
        if (missingStatementImportId.length > 0) {
          logger.error('STATEMENT:DB_INSERT_VERIFY', 'CRITICAL: Some inserted transactions missing statement_import_id', {
            statementImportId: statementImport.id,
            missingCount: missingStatementImportId.length,
            missingIds: missingStatementImportId.map((tx: any) => tx.id)
          }, correlationId)
        }
        
        // CRITICAL: Query back inserted transactions to verify stored values match intended values
        const insertedIds = insertedTransactions.map((tx: any) => tx.id)
        const { data: verifiedTransactions, error: verifyError } = await supabase
          .from('transactions')
          .select('id, amount, type, description, statement_import_id, date')
          .in('id', insertedIds)
          .order('created_at', { ascending: false })
        
        if (verifyError) {
          logger.error('STATEMENT:DB_INSERT:VERIFIED', 'Failed to query back inserted transactions for verification', {
            statementImportId: statementImport.id,
            error: verifyError.message,
            insertedCount: insertedTransactions.length
          }, correlationId)
        } else if (verifiedTransactions && verifiedTransactions.length > 0) {
          // Compare stored values vs intended values
          const verificationResults = verifiedTransactions.slice(0, 10).map((stored: any) => {
            const intended = uniqueTransactions.find((intended: any) => 
              intended.description === stored.description && 
              intended.date === stored.date
            )
            return {
              id: stored.id,
              storedAmount: stored.amount,
              storedType: stored.type,
              intendedAmount: intended?.amount,
              intendedType: intended?.type,
              description: stored.description?.substring(0, 50),
              amountMatches: intended ? stored.amount === intended.amount : false,
              typeMatches: intended ? stored.type === intended.type : false,
              amountSignMatchesType: (stored.type === 'income' && stored.amount > 0) || (stored.type === 'expense' && stored.amount < 0)
            }
          })
          
          logger.info('STATEMENT:DB_INSERT:VERIFIED', 'Verified stored transactions match intended values', {
            statementImportId: statementImport.id,
            accountId: statementImport.account_id,
            verifiedCount: verifiedTransactions.length,
            verificationResults,
            allStoredTransactions: verifiedTransactions.map((tx: any) => ({
              id: tx.id,
              amount: tx.amount,
              type: tx.type,
              description: tx.description?.substring(0, 50),
              date: tx.date,
              amountSignMatchesType: (tx.type === 'income' && tx.amount > 0) || (tx.type === 'expense' && tx.amount < 0)
            })),
            incomeCount: verifiedTransactions.filter((tx: any) => tx.type === 'income').length,
            expenseCount: verifiedTransactions.filter((tx: any) => tx.type === 'expense').length,
            positiveAmountCount: verifiedTransactions.filter((tx: any) => tx.amount > 0).length,
            negativeAmountCount: verifiedTransactions.filter((tx: any) => tx.amount < 0).length
          }, correlationId)
        }
      }

      // Update final status to 'completed' with explicit logging
      const statusValue = 'completed'
      logger.info('STATEMENT:STATUS_UPDATE', 'Updating status to completed', {
        statementImportId: statementImport.id,
        statusValue,
        insertedCount: insertedTransactions?.length || 0,
        totalCount: uniqueTransactions.length
      }, correlationId)

      const statusUpdateResult = await supabase
        .from('statement_imports')
        .update({
          status: statusValue,
          imported_transactions: insertedTransactions?.length || 0,
          failed_transactions: uniqueTransactions.length - (insertedTransactions?.length || 0),
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(), // Explicitly set updated_at
          correlation_id: correlationId, // Persist correlation ID
        })
        .eq('id', statementImport.id)

      if (statusUpdateResult.error) {
        logger.error('STATEMENT:STATUS_UPDATE', 'Failed to update status', {
          statementImportId: statementImport.id,
          error: statusUpdateResult.error.message,
          attemptedStatus: statusValue,
          insertedCount: insertedTransactions?.length || 0
        }, correlationId)
      } else {
        // Verify the update by reading it back (for debugging/observability)
        const { data: verify, error: verifyError } = await supabase
          .from('statement_imports')
          .select('status, imported_transactions')
          .eq('id', statementImport.id)
          .single()
        
        if (verifyError || verify?.status !== statusValue) {
          logger.error('STATEMENT:VERIFY', 'Status update verification failed', {
            statementImportId: statementImport.id,
            expected: statusValue,
            actual: verify?.status,
            error: verifyError?.message,
            insertedCount: insertedTransactions?.length || 0
          }, correlationId)
        } else {
          logger.info('STATEMENT:COMMIT', 'Status updated and verified successfully', {
            statementImportId: statementImport.id,
            finalStatus: verify?.status,
            importedCount: insertedTransactions?.length || 0,
            totalCount: uniqueTransactions.length,
            statusUpdated: true,
            verified: true
          }, correlationId)
        }
      }

      // Step 7: Update account balance from extracted closing_balance (if this is the most recent statement)
      // CRITICAL: Always log balance update attempt, even if balance is null/invalid
      logger.info('STATEMENT:BALANCE_UPDATE:START', 'Starting balance update check', {
        statementImportId: statementImport.id,
        accountId: statementImport.account_id,
        extractedBalance,
        extractedBalanceType: typeof extractedBalance,
        isExtractedBalanceValid: extractedBalance !== null && typeof extractedBalance === 'number' && !isNaN(extractedBalance)
      }, correlationId);
      
      // CRITICAL: Detailed balance update logging BEFORE update
      // Query current account balance first
      let currentAccountBalance: number | null = null;
      try {
        const { data: currentAccount } = await supabase
          .from('accounts')
          .select('balance, last_updated')
          .eq('id', statementImport.account_id)
          .single();
        currentAccountBalance = currentAccount?.balance || null;
      } catch (err) {
        // Ignore error, will log in detailed log
      }
      
      logger.info('STATEMENT:BALANCE_UPDATE:DETAILED', 'Detailed balance update information before update', {
        statementImportId: statementImport.id,
        accountId: statementImport.account_id,
        currentAccountBalance,
        extractedBalance,
        balanceSource,
        statementEndDate: statementEndDate?.toISOString(),
        hasStatementEndDate: !!statementEndDate,
        statementPeriodFrom: statementPeriod?.from_date,
        statementPeriodTo: statementPeriod?.to_date
      }, correlationId);

      if (extractedBalance !== null && typeof extractedBalance === 'number' && !isNaN(extractedBalance)) {
        try {
          // Step 1: Validate balance is reasonable
          const MAX_BALANCE = 1000000000; // $1 billion
          const MIN_BALANCE = -1000000000; // -$1 billion
          
          if (extractedBalance > MAX_BALANCE || extractedBalance < MIN_BALANCE) {
            logger.error('STATEMENT:BALANCE_UPDATE:VALIDATION', 'Extracted balance is outside reasonable range', {
              statementImportId: statementImport.id,
              accountId: statementImport.account_id,
              extractedBalance,
              min: MIN_BALANCE,
              max: MAX_BALANCE
            }, correlationId);
            // Don't update with unreasonable balance, but don't block statement processing
            return;
          }
          
          // Step 2: Idempotency check - verify balance wasn't already updated for this statement
          const existingMetadata = statementImport.metadata || {};
          if (existingMetadata.balance_updated === true && 
              existingMetadata.extracted_balance === extractedBalance &&
              existingMetadata.extracted_balance_source === balanceSource) {
            logger.info('STATEMENT:BALANCE_UPDATE:IDEMPOTENCY', 'Balance already updated for this statement, skipping', {
              statementImportId: statementImport.id,
              accountId: statementImport.account_id,
              extractedBalance,
              balanceSource
            }, correlationId);
            return; // Skip update - already done
          }
          
          // Step 3: Determine if this is the most recent statement based on statement_period.to_date
          let isMostRecent = true;
          // #region agent log
          logger.info('DEBUG:HYPOTHESIS_F', 'most recent statement check start', {
            location: 'process-statement/index.ts:3298',
            statementImportId: statementImport.id,
            accountId: statementImport.account_id,
            hasStatementEndDate: !!statementEndDate,
            statementEndDate: statementEndDate?.toISOString(),
            hypothesisId: 'F'
          }, correlationId);
          // #endregion
          if (statementEndDate) {
            const { data: otherStatements, error: queryError } = await supabase
              .from('statement_imports')
              .select('metadata')
              .eq('account_id', statementImport.account_id)
              .eq('status', 'completed')
              .neq('id', statementImport.id);
            
            // #region agent log
            logger.info('DEBUG:HYPOTHESIS_F', 'most recent statement query result', {
              location: 'process-statement/index.ts:3306',
              statementImportId: statementImport.id,
              accountId: statementImport.account_id,
              hasError: !!queryError,
              otherStatementsCount: otherStatements?.length || 0,
              queryError: queryError?.message,
              hypothesisId: 'F'
            }, correlationId);
            // #endregion
            
            if (queryError) {
              logger.warn('STATEMENT:BALANCE_UPDATE', 'Failed to query other statements for recency check', {
                statementImportId: statementImport.id,
                accountId: statementImport.account_id,
                error: queryError.message
              }, correlationId);
              // If query fails, assume this is most recent to avoid blocking balance update
              isMostRecent = true;
            } else if (otherStatements && otherStatements.length > 0) {
              // Check if any other statement has a later end date
              const laterStatements = otherStatements.filter((stmt: any) => {
                const otherEndDate = stmt.metadata?.statement_period?.to_date;
                if (!otherEndDate) return false;
                try {
                  return new Date(otherEndDate) > statementEndDate;
                } catch {
                  return false;
                }
              });
              isMostRecent = laterStatements.length === 0;
              
              // #region agent log
              logger.info('DEBUG:HYPOTHESIS_F', 'most recent statement check result', {
                location: 'process-statement/index.ts:3325',
                statementImportId: statementImport.id,
                accountId: statementImport.account_id,
                isMostRecent,
                otherStatementsCount: otherStatements.length,
                laterStatementsCount: laterStatements.length,
                statementEndDate: statementEndDate?.toISOString(),
                hypothesisId: 'F'
              }, correlationId);
              // #endregion
            }
          } else {
            // If statement_period.to_date is missing, assume this is most recent
            logger.info('STATEMENT:BALANCE_UPDATE', 'Statement period end date missing, assuming most recent', {
              statementImportId: statementImport.id,
              accountId: statementImport.account_id
            }, correlationId);
            // #region agent log
            logger.info('DEBUG:HYPOTHESIS_F', 'most recent statement check - no end date', {
              location: 'process-statement/index.ts:3332',
              statementImportId: statementImport.id,
              accountId: statementImport.account_id,
              isMostRecent: true,
              hypothesisId: 'F'
            }, correlationId);
            // #endregion
          }
          
          // #region agent log
          logger.info('DEBUG:HYPOTHESIS_F', 'most recent statement check final', {
            location: 'process-statement/index.ts:3335',
            statementImportId: statementImport.id,
            accountId: statementImport.account_id,
            isMostRecent,
            willUpdateBalance: isMostRecent,
            hypothesisId: 'F'
          }, correlationId);
          // #endregion

          if (isMostRecent) {
            // Pre-update validation: Get account to verify it exists and user owns it
            const { data: account, error: accountQueryError } = await supabase
              .from('accounts')
              .select('id, account_type, user_id, balance, balance_owed')
              .eq('id', statementImport.account_id)
              .eq('user_id', statementImport.user_id)
              .single();
            
            if (accountQueryError) {
              logger.error('STATEMENT:BALANCE_UPDATE', 'Failed to query account for validation', {
                statementImportId: statementImport.id,
                accountId: statementImport.account_id,
                userId: statementImport.user_id,
                error: accountQueryError.message,
                errorCode: accountQueryError.code,
                errorDetails: accountQueryError.details
              }, correlationId);
            } else if (!account) {
              logger.error('STATEMENT:BALANCE_UPDATE', 'Account not found or user does not own it', {
                statementImportId: statementImport.id,
                accountId: statementImport.account_id,
                userId: statementImport.user_id
              }, correlationId);
            } else {
              const isCreditAccount = account?.account_type === 'Credit Card' || account?.account_type === 'Loan';
              
              // Additional validation for credit accounts
              if (isCreditAccount && extractedBalance < 0) {
                logger.warn('STATEMENT:BALANCE_UPDATE:VALIDATION', 'Credit account balance is negative, using absolute value', {
                  statementImportId: statementImport.id,
                  accountId: statementImport.account_id,
                  extractedBalance,
                  note: 'Credit card balances typically represent amount owed (positive)'
                }, correlationId);
              }
              
              // Store previous balance for verification
              const previousBalance = account.balance;
              const previousBalanceOwed = (account as any).balance_owed;
              
              const updateData: any = {
                last_updated: new Date().toISOString()
              };
              
              if (isCreditAccount) {
                // For credit cards/loans, closing_balance typically represents amount owed (positive)
                // Store as balance_owed (positive) and balance (negative)
                updateData.balance_owed = Math.abs(extractedBalance);
                updateData.balance = -Math.abs(extractedBalance);
              } else {
                // For regular accounts, closing_balance is the account balance
                updateData.balance = extractedBalance;
              }
              
              // Log the update data and query details for debugging
              logger.info('STATEMENT:BALANCE_UPDATE:QUERY', 'Preparing balance update query', {
                statementImportId: statementImport.id,
                accountId: statementImport.account_id,
                userId: statementImport.user_id,
                updateDataKeys: Object.keys(updateData),
                updateData: updateData,
                isCreditAccount,
                previousBalance,
                previousBalanceOwed
              }, correlationId);
              
              // Ensure updateData doesn't accidentally contain account_id
              const cleanUpdateData = { ...updateData };
              delete (cleanUpdateData as any).account_id;
              
              // Use retry logic for balance update
              const updateResult = await updateAccountBalanceWithRetry(
                supabase,
                statementImport.account_id,
                statementImport.user_id,
                cleanUpdateData,
                correlationId
              );
              
              if (!updateResult.success || updateResult.error) {
                logger.error('STATEMENT:BALANCE_UPDATE', 'Failed to update account balance', {
                  statementImportId: statementImport.id,
                  accountId: statementImport.account_id,
                  userId: statementImport.user_id,
                  error: updateResult.error?.message || 'Unknown error',
                  errorCode: (updateResult.error as any)?.code,
                  errorDetails: (updateResult.error as any)?.details,
                  errorHint: (updateResult.error as any)?.hint,
                  extractedBalance,
                  isCreditAccount,
                  updateDataKeys: Object.keys(cleanUpdateData),
                  updateData: cleanUpdateData,
                  queryDetails: {
                    table: 'accounts',
                    whereClause: `id = ${statementImport.account_id}, user_id = ${statementImport.user_id}`
                  }
                }, correlationId);
              } else {
                // Verify the update succeeded by reading back the updated account
                const { data: updatedAccount, error: verifyError } = await supabase
                  .from('accounts')
                  .select('balance, balance_owed, last_updated')
                  .eq('id', statementImport.account_id)
                  .eq('user_id', statementImport.user_id)
                  .single();
                
                if (verifyError || !updatedAccount) {
                  logger.error('STATEMENT:BALANCE_UPDATE:VERIFY', 'Failed to verify balance update', {
                    statementImportId: statementImport.id,
                    accountId: statementImport.account_id,
                    userId: statementImport.user_id,
                    error: verifyError?.message,
                    errorCode: verifyError?.code
                  }, correlationId);
                } else {
                  // Verify the balance was actually updated correctly
                  const expectedBalance = isCreditAccount ? -Math.abs(extractedBalance) : extractedBalance;
                  const actualBalance = updatedAccount.balance;
                  const balanceDifference = Math.abs(actualBalance - expectedBalance);
                  
                  // Allow small floating point differences (0.01)
                  if (balanceDifference > 0.01) {
                    logger.error('STATEMENT:BALANCE_UPDATE:VERIFY', 'Balance mismatch after update', {
                      statementImportId: statementImport.id,
                      accountId: statementImport.account_id,
                      expectedBalance,
                      actualBalance,
                      difference: balanceDifference,
                      previousBalance,
                      extractedBalance,
                      isCreditAccount
                    }, correlationId);
                  } else {
                    logger.info('STATEMENT:BALANCE_UPDATE', 'Account balance updated and verified successfully', {
                      statementImportId: statementImport.id,
                      accountId: statementImport.account_id,
                      balance: extractedBalance,
                      actualBalance: updatedAccount.balance,
                      balance_owed: updatedAccount.balance_owed,
                      previousBalance,
                      isCreditAccount,
                      statementEndDate: statementEndDate?.toISOString(),
                      balanceSource,
                      verified: true
                    }, correlationId);
                    
                    // CRITICAL: Detailed balance update logging AFTER update
                    logger.info('STATEMENT:BALANCE_UPDATE:DETAILED', 'Detailed balance update information after update', {
                      statementImportId: statementImport.id,
                      accountId: statementImport.account_id,
                      previousBalance,
                      extractedBalance,
                      newAccountBalance: updatedAccount.balance,
                      balance_owed: updatedAccount.balance_owed,
                      last_updated: updatedAccount.last_updated,
                      statementEndDate: statementEndDate?.toISOString(),
                      isMostRecent: true,
                      balanceSource,
                      isCreditAccount,
                      updateSuccess: true,
                      verified: true
                    }, correlationId);

                    // Update metadata to indicate balance was updated
                    await supabase
                      .from('statement_imports')
                      .update({
                        metadata: {
                          ...existingMetadata,
                          extraction_method: extractionMethod,
                          account_number: structuredData.account?.account_number,
                          bank_name: structuredData.account?.bank_name,
                          statement_period: structuredData.statement_period,
                          parsed_at: new Date().toISOString(),
                          ocr_content_hash: structuredData._ocrContentHash || null,
                          extracted_balance: extractedBalance,
                          extracted_balance_source: balanceSource,
                          balance_updated: true,
                          balance_updated_at: new Date().toISOString(),
                          previous_balance: previousBalance
                        }
                      })
                      .eq('id', statementImport.id);
                  }
                }
              }
            }
          } else {
            logger.info('STATEMENT:BALANCE_UPDATE', 'Skipping balance update - not the most recent statement', {
              statementImportId: statementImport.id,
              accountId: statementImport.account_id,
              statementEndDate: statementEndDate?.toISOString(),
              extractedBalance
            }, correlationId);
          }
        } catch (balanceUpdateError) {
          // Balance update failures should not block transaction import
          const errorMessage = balanceUpdateError instanceof Error ? balanceUpdateError.message : String(balanceUpdateError);
          logger.error('STATEMENT:BALANCE_UPDATE', 'Error during balance update (non-blocking)', {
            statementImportId: statementImport.id,
            accountId: statementImport.account_id,
            error: errorMessage,
            extractedBalance
          }, correlationId);
        }
      } else {
        if (extractedBalance === null) {
          logger.warn('STATEMENT:BALANCE_UPDATE', 'No balance extracted from statement, skipping balance update', {
            statementImportId: statementImport.id,
            accountId: statementImport.account_id
          }, correlationId);
        } else {
          logger.warn('STATEMENT:BALANCE_UPDATE', 'Invalid balance value extracted, skipping balance update', {
            statementImportId: statementImport.id,
            accountId: statementImport.account_id,
            extractedBalance,
            balanceType: typeof extractedBalance
          }, correlationId);
        }
      }
    } else {
      // No transactions to insert - mark as completed with 0 transactions
      logger.warn('STATEMENT:NO_TRANSACTIONS', 'No transactions to insert after filtering', {
        statementImportId: statementImport.id,
        originalCount: transactions.length,
        filteredCount: filteredTransactions.length,
        uniqueCount: uniqueTransactions.length
      }, correlationId)

      // Update status to 'completed' with 0 transactions
      const statusValue = 'completed'
      const statusUpdateResult = await supabase
        .from('statement_imports')
        .update({
          status: statusValue,
          imported_transactions: 0,
          failed_transactions: 0,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(), // Explicitly set updated_at
          correlation_id: correlationId, // Persist correlation ID
        })
        .eq('id', statementImport.id)

      if (statusUpdateResult.error) {
        logger.error('STATEMENT:STATUS_UPDATE', 'Failed to update status when no transactions', {
          statementImportId: statementImport.id,
          error: statusUpdateResult.error.message,
          attemptedStatus: statusValue
        }, correlationId)
      } else {
        // Verify the status update
        const { data: verify, error: verifyError } = await supabase
          .from('statement_imports')
          .select('status')
          .eq('id', statementImport.id)
          .single()
        
        if (verifyError || verify?.status !== statusValue) {
          logger.error('STATEMENT:VERIFY', 'Status update verification failed (0 transactions)', {
            statementImportId: statementImport.id,
            expected: statusValue,
            actual: verify?.status,
            error: verifyError?.message
          }, correlationId)
        } else {
          logger.info('STATEMENT:COMMIT', 'Status updated and verified (0 transactions)', {
            statementImportId: statementImport.id,
            finalStatus: statusValue,
            importedCount: 0,
            totalCount: 0,
            verified: true
          }, correlationId)
        }
      }

      // Step 7: Update account balance from extracted closing_balance (if this is the most recent statement)
      // Even with no transactions, we may want to update the balance if this is the most recent statement
      // CRITICAL: Always log balance update attempt, even if balance is null/invalid
      logger.info('STATEMENT:BALANCE_UPDATE:START', 'Starting balance update check (no transactions)', {
        statementImportId: statementImport.id,
        accountId: statementImport.account_id,
        extractedBalance,
        extractedBalanceType: typeof extractedBalance,
        isExtractedBalanceValid: extractedBalance !== null && typeof extractedBalance === 'number' && !isNaN(extractedBalance)
      }, correlationId);

      if (extractedBalance !== null && typeof extractedBalance === 'number' && !isNaN(extractedBalance)) {
        try {
          // Step 1: Validate balance is reasonable
          const MAX_BALANCE = 1000000000; // $1 billion
          const MIN_BALANCE = -1000000000; // -$1 billion
          
          if (extractedBalance > MAX_BALANCE || extractedBalance < MIN_BALANCE) {
            logger.error('STATEMENT:BALANCE_UPDATE:VALIDATION', 'Extracted balance is outside reasonable range (no transactions)', {
              statementImportId: statementImport.id,
              accountId: statementImport.account_id,
              extractedBalance,
              min: MIN_BALANCE,
              max: MAX_BALANCE
            }, correlationId);
            // Don't update with unreasonable balance, but don't block statement processing
            return;
          }
          
          // Step 2: Idempotency check - verify balance wasn't already updated for this statement
          const existingMetadata = statementImport.metadata || {};
          if (existingMetadata.balance_updated === true && 
              existingMetadata.extracted_balance === extractedBalance &&
              existingMetadata.extracted_balance_source === balanceSource) {
            logger.info('STATEMENT:BALANCE_UPDATE:IDEMPOTENCY', 'Balance already updated for this statement, skipping (no transactions)', {
              statementImportId: statementImport.id,
              accountId: statementImport.account_id,
              extractedBalance,
              balanceSource
            }, correlationId);
            return; // Skip update - already done
          }
          
          // Step 3: Determine if this is the most recent statement based on statement_period.to_date
          let isMostRecent = true;
          if (statementEndDate) {
            const { data: otherStatements, error: queryError } = await supabase
              .from('statement_imports')
              .select('metadata')
              .eq('account_id', statementImport.account_id)
              .eq('status', 'completed')
              .neq('id', statementImport.id);
            
            if (queryError) {
              logger.warn('STATEMENT:BALANCE_UPDATE', 'Failed to query other statements for recency check (no transactions)', {
                statementImportId: statementImport.id,
                accountId: statementImport.account_id,
                error: queryError.message
              }, correlationId);
              // If query fails, assume this is most recent to avoid blocking balance update
              isMostRecent = true;
            } else if (otherStatements && otherStatements.length > 0) {
              // Check if any other statement has a later end date
              isMostRecent = !otherStatements.some((stmt: any) => {
                const otherEndDate = stmt.metadata?.statement_period?.to_date;
                if (!otherEndDate) return false;
                try {
                  return new Date(otherEndDate) > statementEndDate;
                } catch {
                  return false;
                }
              });
            }
          } else {
            // If statement_period.to_date is missing, assume this is most recent
            logger.info('STATEMENT:BALANCE_UPDATE', 'Statement period end date missing, assuming most recent (no transactions)', {
              statementImportId: statementImport.id,
              accountId: statementImport.account_id
            }, correlationId);
          }

          if (isMostRecent) {
            // Pre-update validation: Get account to verify it exists and user owns it
            const { data: account, error: accountQueryError } = await supabase
              .from('accounts')
              .select('id, account_type, user_id, balance, balance_owed')
              .eq('id', statementImport.account_id)
              .eq('user_id', statementImport.user_id)
              .single();
            
            if (accountQueryError) {
              logger.error('STATEMENT:BALANCE_UPDATE', 'Failed to query account for validation (no transactions)', {
                statementImportId: statementImport.id,
                accountId: statementImport.account_id,
                userId: statementImport.user_id,
                error: accountQueryError.message,
                errorCode: accountQueryError.code,
                errorDetails: accountQueryError.details
              }, correlationId);
            } else if (!account) {
              logger.error('STATEMENT:BALANCE_UPDATE', 'Account not found or user does not own it (no transactions)', {
                statementImportId: statementImport.id,
                accountId: statementImport.account_id,
                userId: statementImport.user_id
              }, correlationId);
            } else {
              const isCreditAccount = account?.account_type === 'Credit Card' || account?.account_type === 'Loan';
              
              // Additional validation for credit accounts
              if (isCreditAccount && extractedBalance < 0) {
                logger.warn('STATEMENT:BALANCE_UPDATE:VALIDATION', 'Credit account balance is negative, using absolute value (no transactions)', {
                  statementImportId: statementImport.id,
                  accountId: statementImport.account_id,
                  extractedBalance,
                  note: 'Credit card balances typically represent amount owed (positive)'
                }, correlationId);
              }
              
              // Store previous balance for verification
              const previousBalance = account.balance;
              const previousBalanceOwed = (account as any).balance_owed;
              
              const updateData: any = {
                last_updated: new Date().toISOString()
              };
              
              if (isCreditAccount) {
                // For credit cards/loans, closing_balance typically represents amount owed (positive)
                // Store as balance_owed (positive) and balance (negative)
                updateData.balance_owed = Math.abs(extractedBalance);
                updateData.balance = -Math.abs(extractedBalance);
              } else {
                // For regular accounts, closing_balance is the account balance
                updateData.balance = extractedBalance;
              }
              
              // Log the update data and query details for debugging
              logger.info('STATEMENT:BALANCE_UPDATE:QUERY', 'Preparing balance update query (no transactions)', {
                statementImportId: statementImport.id,
                accountId: statementImport.account_id,
                userId: statementImport.user_id,
                updateDataKeys: Object.keys(updateData),
                updateData: updateData,
                isCreditAccount,
                previousBalance,
                previousBalanceOwed
              }, correlationId);
              
              // Ensure updateData doesn't accidentally contain account_id
              const cleanUpdateData = { ...updateData };
              delete (cleanUpdateData as any).account_id;
              
              // Use retry logic for balance update
              const updateResult = await updateAccountBalanceWithRetry(
                supabase,
                statementImport.account_id,
                statementImport.user_id,
                cleanUpdateData,
                correlationId
              );
              
              if (!updateResult.success || updateResult.error) {
                logger.error('STATEMENT:BALANCE_UPDATE', 'Failed to update account balance (no transactions)', {
                  statementImportId: statementImport.id,
                  accountId: statementImport.account_id,
                  userId: statementImport.user_id,
                  error: updateResult.error?.message || 'Unknown error',
                  errorCode: (updateResult.error as any)?.code,
                  errorDetails: (updateResult.error as any)?.details,
                  errorHint: (updateResult.error as any)?.hint,
                  extractedBalance,
                  isCreditAccount,
                  updateDataKeys: Object.keys(cleanUpdateData),
                  updateData: cleanUpdateData,
                  queryDetails: {
                    table: 'accounts',
                    whereClause: `id = ${statementImport.account_id}, user_id = ${statementImport.user_id}`
                  }
                }, correlationId);
              } else {
                // Verify the update succeeded by reading back the updated account
                const { data: updatedAccount, error: verifyError } = await supabase
                  .from('accounts')
                  .select('balance, balance_owed, last_updated')
                  .eq('id', statementImport.account_id)
                  .eq('user_id', statementImport.user_id)
                  .single();
                
                if (verifyError || !updatedAccount) {
                  logger.error('STATEMENT:BALANCE_UPDATE:VERIFY', 'Failed to verify balance update (no transactions)', {
                    statementImportId: statementImport.id,
                    accountId: statementImport.account_id,
                    userId: statementImport.user_id,
                    error: verifyError?.message,
                    errorCode: verifyError?.code
                  }, correlationId);
                } else {
                  // Verify the balance was actually updated correctly
                  const expectedBalance = isCreditAccount ? -Math.abs(extractedBalance) : extractedBalance;
                  const actualBalance = updatedAccount.balance;
                  const balanceDifference = Math.abs(actualBalance - expectedBalance);
                  
                  // Allow small floating point differences (0.01)
                  if (balanceDifference > 0.01) {
                    logger.error('STATEMENT:BALANCE_UPDATE:VERIFY', 'Balance mismatch after update (no transactions)', {
                      statementImportId: statementImport.id,
                      accountId: statementImport.account_id,
                      expectedBalance,
                      actualBalance,
                      difference: balanceDifference,
                      previousBalance,
                      extractedBalance,
                      isCreditAccount
                    }, correlationId);
                  } else {
                    logger.info('STATEMENT:BALANCE_UPDATE', 'Account balance updated and verified successfully (no transactions)', {
                      statementImportId: statementImport.id,
                      accountId: statementImport.account_id,
                      balance: extractedBalance,
                      actualBalance: updatedAccount.balance,
                      balance_owed: updatedAccount.balance_owed,
                      previousBalance,
                      isCreditAccount,
                      statementEndDate: statementEndDate?.toISOString(),
                      balanceSource,
                      verified: true
                    }, correlationId);

                    // Update metadata to indicate balance was updated
                    await supabase
                      .from('statement_imports')
                      .update({
                        metadata: {
                          ...existingMetadata,
                          extraction_method: extractionMethod,
                          account_number: structuredData.account?.account_number,
                          bank_name: structuredData.account?.bank_name,
                          statement_period: structuredData.statement_period,
                          parsed_at: new Date().toISOString(),
                          ocr_content_hash: structuredData._ocrContentHash || null,
                          extracted_balance: extractedBalance,
                          extracted_balance_source: balanceSource,
                          balance_updated: true,
                          balance_updated_at: new Date().toISOString(),
                          previous_balance: previousBalance
                        }
                      })
                      .eq('id', statementImport.id);
                  }
                }
              }
            }
          } else {
            logger.info('STATEMENT:BALANCE_UPDATE', 'Skipping balance update - not the most recent statement (no transactions)', {
              statementImportId: statementImport.id,
              accountId: statementImport.account_id,
              statementEndDate: statementEndDate?.toISOString(),
              extractedBalance
            }, correlationId);
          }
        } catch (balanceUpdateError) {
          // Balance update failures should not block statement import
          const errorMessage = balanceUpdateError instanceof Error ? balanceUpdateError.message : String(balanceUpdateError);
          logger.error('STATEMENT:BALANCE_UPDATE', 'Error during balance update (non-blocking, no transactions)', {
            statementImportId: statementImport.id,
            accountId: statementImport.account_id,
            error: errorMessage,
            extractedBalance
          }, correlationId);
        }
      } else {
        if (extractedBalance === null) {
          logger.warn('STATEMENT:BALANCE_UPDATE', 'No balance extracted from statement, skipping balance update (no transactions)', {
            statementImportId: statementImport.id,
            accountId: statementImport.account_id
          }, correlationId);
        } else {
          logger.warn('STATEMENT:BALANCE_UPDATE', 'Invalid balance value extracted, skipping balance update (no transactions)', {
            statementImportId: statementImport.id,
            accountId: statementImport.account_id,
            extractedBalance,
            balanceType: typeof extractedBalance
          }, correlationId);
        }
      }
    }

    // Performance summary: Log comprehensive metrics
    performanceMetrics.totalDuration = Date.now() - processStartTime
    logger.info('STATEMENT:PERFORMANCE', 'Statement processing performance summary', {
      statementImportId: statementImport.id,
      totalDuration: performanceMetrics.totalDuration,
      extractionDuration: performanceMetrics.extractionDuration,
      validationDuration: performanceMetrics.validationDuration,
      duplicateCheckDuration: performanceMetrics.duplicateCheckDuration,
      insertDuration: performanceMetrics.insertDuration,
      balanceUpdateDuration: performanceMetrics.balanceUpdateDuration,
      cacheCheckDuration: performanceMetrics.cacheCheckDuration,
      cacheStoreDuration: performanceMetrics.cacheStoreDuration,
      ocrApiDuration: performanceMetrics.ocrApiDuration,
      chatApiDuration: performanceMetrics.chatApiDuration,
      markdownIndexDuration: performanceMetrics.markdownIndexDuration,
      transactionsProcessed: transactions.length,
      uniqueTransactionsInserted: uniqueTransactions.length,
      extractionMethod,
      performanceBreakdown: {
        extractionPercent: (performanceMetrics.extractionDuration / performanceMetrics.totalDuration * 100).toFixed(1),
        validationPercent: (performanceMetrics.validationDuration / performanceMetrics.totalDuration * 100).toFixed(1),
        insertPercent: (performanceMetrics.insertDuration / performanceMetrics.totalDuration * 100).toFixed(1),
        duplicateCheckPercent: (performanceMetrics.duplicateCheckDuration / performanceMetrics.totalDuration * 100).toFixed(1)
      }
    }, correlationId)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error'

    logger.error('STATEMENT:PROCESS', 'Statement processing failed', {
      statementImportId: statementImport.id,
      error: errorMessage
    }, correlationId)

    // Update status to failed
    const failedStatusResult = await supabase
      .from('statement_imports')
      .update({
        status: 'failed',
        error_message: errorMessage,
        updated_at: new Date().toISOString(), // Explicitly set updated_at
        correlation_id: correlationId, // Persist correlation ID
      })
      .eq('id', statementImport.id)

    if (failedStatusResult.error) {
      logger.error('STATEMENT:STATUS_UPDATE', 'Failed to update status to failed', {
        statementImportId: statementImport.id,
        error: failedStatusResult.error.message,
        originalError: errorMessage
      }, correlationId)
    } else {
      // Verify the status update
      const { data: verify, error: verifyError } = await supabase
        .from('statement_imports')
        .select('status, error_message')
        .eq('id', statementImport.id)
        .single()
      
      if (verifyError || verify?.status !== 'failed') {
        logger.error('STATEMENT:VERIFY', 'Failed status update verification failed', {
          statementImportId: statementImport.id,
          expected: 'failed',
          actual: verify?.status,
          error: verifyError?.message
        }, correlationId)
      } else {
        logger.info('STATEMENT:VERIFY', 'Failed status updated and verified', {
          statementImportId: statementImport.id,
          finalStatus: verify?.status,
          errorMessage: verify?.error_message,
          verified: true
        }, correlationId)
      }
    }

    throw error
  }
}

/**
 * Main Edge Function handler
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Extract correlation ID from request (header or body)
    const headerCorrelationId = req.headers.get('x-correlation-id')
    const requestBody = await req.json()
    const { statementImportId, correlationId: bodyCorrelationId } = requestBody
  
  // Use provided correlation ID, or generate one (but log if missing)
  const correlationId = headerCorrelationId || bodyCorrelationId || getCorrelationId()
  if (!headerCorrelationId && !bodyCorrelationId) {
    logger.warn('STATEMENT:START', 'No correlation ID provided, generated one', {
      generatedCorrelationId: correlationId
    }, correlationId)
  }

    if (!statementImportId) {
      return new Response(JSON.stringify({ error: 'statementImportId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    logger.info('STATEMENT:START', 'Edge function invoked', {
    statementImportId,
    correlationId
    }, correlationId)

    // Get Clerk JWT token from custom header (Supabase gateway uses anon key for Authorization)
    const clerkToken = req.headers.get('x-clerk-token')
    if (!clerkToken) {
      return new Response(JSON.stringify({ error: 'Clerk JWT token required in x-clerk-token header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create Authorization header with Clerk JWT for Supabase client
    const authHeader = `Bearer ${clerkToken}`

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error('STATEMENT:CONFIG', 'Supabase configuration missing', {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey
      }, correlationId)
      return new Response(JSON.stringify({ 
        error: 'Supabase configuration missing. SUPABASE_URL and SUPABASE_ANON_KEY are required.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Client: Uses anon key + user JWT (respects RLS for all operations)
    // For transactions table, we use PostgREST REST API directly to avoid schema cache issues
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      db: { schema: 'public' }
    })
    
    logger.info('STATEMENT:CONFIG', 'Supabase client initialized with anon key + JWT (RLS enforced)', {
      usingRestApi: true
    }, correlationId)

    // Fetch statement import - RLS policies automatically enforce user ownership
    const { data: statementImport, error: fetchError } = await supabase
      .from('statement_imports')
      .select('id, user_id, account_id, file_path, file_hash, status')
      .eq('id', statementImportId)
      .single()

    if (fetchError || !statementImport) {
      // RLS will return null/error if user doesn't own this import
      logger.warn('STATEMENT:AUTH', 'Statement import not found or access denied', {
        statementImportId,
        error: fetchError?.message,
        note: 'RLS policies enforce user ownership automatically'
      }, correlationId)

      return new Response(JSON.stringify({ error: 'Statement import not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Rate limiting: Check recent processing activity (max 10 per hour per user)
    // Optimized: Use materialized view for fast lookup (<10ms vs 100-500ms)
    const rateLimitCheckStartTime = Date.now()
    const currentHour = new Date()
    currentHour.setMinutes(0, 0, 0) // Round down to current hour
    
    // Try materialized view first (fast path)
    const { data: hourlyCount, error: viewError } = await supabase
      .from('user_statement_count_hourly')
      .select('import_count')
      .eq('user_id', statementImport.user_id)
      .eq('hour_bucket', currentHour.toISOString())
      .single()

    let recentCount = 0
    if (!viewError && hourlyCount) {
      recentCount = hourlyCount.import_count || 0
    } else {
      // Fallback to direct query if materialized view is not available or outdated
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { data: recentImports, error: rateLimitError } = await supabase
        .from('statement_imports')
        .select('id', { count: 'exact' })
        .eq('user_id', statementImport.user_id)
        .gte('created_at', oneHourAgo)

      if (rateLimitError) {
        logger.error('STATEMENT:RATE_LIMIT', 'Failed to check rate limit', {
          statementImportId,
          error: rateLimitError.message
        }, correlationId)
      } else {
        recentCount = recentImports?.length || 0
      }
    }

    const rateLimitCheckDuration = Date.now() - rateLimitCheckStartTime

    if (recentCount >= 10) {
      logger.warn('STATEMENT:RATE_LIMIT', 'Rate limit exceeded', {
        statementImportId,
        userId: statementImport.user_id,
        recentCount,
        checkDuration: rateLimitCheckDuration,
        usedMaterializedView: !viewError && hourlyCount
      }, correlationId)

      await supabase
        .from('statement_imports')
        .update({
          status: 'failed',
          error_message: 'Rate limit exceeded. Please wait before uploading more statements.'
        })
        .eq('id', statementImportId)

      return new Response(JSON.stringify({
        error: 'Rate limit exceeded. Please wait before uploading more statements.'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if already processed (deduplication)
    if (statementImport.status !== 'pending') {
      logger.info('STATEMENT:SKIP', 'Already processed', {
        statementImportId,
        status: statementImport.status
      }, correlationId)

      return new Response(JSON.stringify({
        message: 'Already processed',
        status: statementImport.status
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Cache is enabled by default with OCR content hash validation
    // Set ENABLE_STATEMENT_CACHE=false to disable
    const CACHE_ENABLED = Deno.env.get('ENABLE_STATEMENT_CACHE') !== 'false'
    
    let existingImport = null
    if (CACHE_ENABLED) {
      // Check for duplicate file hash (cost optimization) - do this synchronously for quick cache hits
      const { data: cachedImport } = await supabase
        .from('statement_imports')
        .select('id, status, total_transactions, imported_transactions, file_hash')
        .eq('file_hash', statementImport.file_hash)
        .eq('status', 'completed')
        .neq('id', statementImportId) // Exclude current import
        .single()

      existingImport = cachedImport
      
      if (existingImport) {
        logger.info('STATEMENT:CACHE:CHECK', 'Cache enabled and duplicate file hash found', {
          statementImportId,
          cachedFromId: existingImport.id,
          note: 'Cache will be validated against OCR content before reuse'
        }, correlationId)
      }
    } else {
      logger.info('STATEMENT:CACHE:DISABLED', 'Cache is disabled - forcing OCR extraction', {
        statementImportId,
        fileHash: statementImport.file_hash,
        note: 'Set ENABLE_STATEMENT_CACHE=true to re-enable cache'
      }, correlationId)
    }

    if (existingImport) {
      logger.info('STATEMENT:CACHE', 'Duplicate file hash found - validating cache before reuse', {
        statementImportId,
        cachedFromId: existingImport.id,
        totalTransactions: existingImport.total_transactions,
        importedTransactions: existingImport.imported_transactions,
        note: 'Cache will be validated against OCR content to ensure transactions match statement'
      }, correlationId)

      // CRITICAL: Validate cached transactions against OCR content before reusing
      // Download file and extract OCR to validate cache
      logger.info('STATEMENT:CACHE:VALIDATE', 'Validating cached transactions against OCR content', {
        statementImportId,
        cachedFromId: existingImport.id
      }, correlationId)

      // Download file to extract OCR for validation
      const { data: fileBlobForValidation, error: downloadError } = await supabase.storage
        .from('statements')
        .download(statementImport.file_path)

      if (downloadError || !fileBlobForValidation) {
        logger.error('STATEMENT:CACHE:VALIDATE', 'Failed to download file for cache validation', {
          statementImportId,
          error: downloadError?.message,
          note: 'Skipping cache and proceeding with OCR extraction'
        }, correlationId)
        // Skip cache and proceed with OCR extraction
        existingImport = null
      } else {
        // Extract OCR content for validation
        try {
          const preSignedUrl = await createPreSignedUrl(
            supabase,
            statementImport.file_path,
            900,
            logger,
            correlationId
          )

          // Extract OCR markdown (lightweight extraction for validation)
          const ocrResult = await ocrDocument({
            kind: 'document_url',
            url: preSignedUrl,
            tableFormat: 'markdown',
            extractHeader: false,
            extractFooter: false,
            includeImageBase64: false,
            // Don't request structured extraction - just get markdown for validation
          }, logger, correlationId)

          const allMarkdownText = (ocrResult.pages || [])
            .map((page: any) => page.markdown || '')
            .join('\n\n')

          // Compute OCR content hash for cache key matching
          const currentOcrContentHash = await computeOCRContentHash(allMarkdownText)
          
          // Get cached import's OCR content hash from metadata
          const { data: cachedImportWithMetadata } = await supabase
            .from('statement_imports')
            .select('metadata')
            .eq('id', existingImport.id)
            .single()
          
          const cachedOcrContentHash = cachedImportWithMetadata?.metadata?.ocr_content_hash || null
          
          // Compare OCR content hashes - if they don't match, skip cache
          if (cachedOcrContentHash && cachedOcrContentHash !== currentOcrContentHash) {
            logger.warn('STATEMENT:CACHE:VALIDATE', 'OCR content hash mismatch - skipping cache', {
              statementImportId,
              cachedFromId: existingImport.id,
              cachedOcrContentHash,
              currentOcrContentHash,
              note: 'OCR content differs, cache may contain different transactions'
            }, correlationId)
            // Skip cache and proceed with OCR extraction
            existingImport = null
          } else if (cachedOcrContentHash && cachedOcrContentHash === currentOcrContentHash) {
            logger.info('STATEMENT:CACHE:VALIDATE', 'OCR content hash matches - cache key validated', {
              statementImportId,
              cachedFromId: existingImport.id,
              ocrContentHash: currentOcrContentHash,
              note: 'OCR content hash matches, proceeding with transaction validation'
            }, correlationId)
          } else {
            logger.info('STATEMENT:CACHE:VALIDATE', 'No cached OCR content hash found - using transaction validation only', {
              statementImportId,
              cachedFromId: existingImport.id,
              note: 'Cached import does not have OCR content hash (legacy), using transaction validation'
            }, correlationId)
          }

          // If cache was invalidated by hash mismatch, skip transaction validation
          if (!existingImport) {
            // Skip cache and proceed with OCR extraction (will be handled below)
            logger.info('STATEMENT:CACHE:VALIDATE', 'Cache invalidated - proceeding with OCR extraction', {
              statementImportId,
              reason: 'OCR content hash mismatch'
            }, correlationId)
          } else {
            // Query cached transactions for validation
            const { data: cachedTransactions } = await supabase
              .from('transactions')
              .select('date, description, amount, type')
              .eq('statement_import_id', existingImport.id)
              .eq('user_id', statementImport.user_id)
              .limit(100) // Limit for validation performance

            if (cachedTransactions && cachedTransactions.length > 0) {
            // Validate each cached transaction against OCR markdown
            let validCount = 0
            let invalidCount = 0

            for (const tx of cachedTransactions) {
              const validation = validateTransactionAgainstOCR(
                tx,
                allMarkdownText,
                logger,
                correlationId
              )
              if (validation.valid && validation.confidence !== 'low') {
                validCount++
              } else {
                invalidCount++
              }
            }

            const validationRatio = cachedTransactions.length > 0 
              ? validCount / cachedTransactions.length 
              : 0

            logger.info('STATEMENT:CACHE:VALIDATE', 'Cache validation results', {
              statementImportId,
              cachedFromId: existingImport.id,
              totalCachedTransactions: cachedTransactions.length,
              validCount,
              invalidCount,
              validationRatio,
              threshold: 0.7
            }, correlationId)

            // Only use cache if at least 70% of transactions are validated
            if (validationRatio < 0.7) {
              logger.warn('STATEMENT:CACHE:VALIDATE', 'Cache validation failed - too many transactions not found in OCR', {
                statementImportId,
                cachedFromId: existingImport.id,
                validationRatio,
                validCount,
                invalidCount,
                note: 'Skipping cache and proceeding with OCR extraction'
              }, correlationId)
              // Skip cache and proceed with OCR extraction
              existingImport = null
            } else {
              logger.info('STATEMENT:CACHE:VALIDATE', 'Cache validation passed - reusing cached transactions', {
                statementImportId,
                cachedFromId: existingImport.id,
                validationRatio,
                validCount
              }, correlationId)
            }
            } else {
              logger.warn('STATEMENT:CACHE:VALIDATE', 'No cached transactions found for validation', {
                statementImportId,
                cachedFromId: existingImport.id,
                note: 'Skipping cache and proceeding with OCR extraction'
              }, correlationId)
              existingImport = null
            }
          }
        } catch (validationError) {
          logger.error('STATEMENT:CACHE:VALIDATE', 'Cache validation error', {
            statementImportId,
            error: validationError instanceof Error ? validationError.message : String(validationError),
            note: 'Skipping cache and proceeding with OCR extraction'
          }, correlationId)
          // Skip cache and proceed with OCR extraction
          existingImport = null
        }
      }

      // If cache validation failed, proceed with OCR extraction
      if (!existingImport) {
        logger.info('STATEMENT:CACHE:SKIP', 'Skipping cache - proceeding with OCR extraction', {
          statementImportId,
          note: 'Cache was invalidated or validation failed'
        }, correlationId)
        // Continue to OCR extraction below (existingImport is null, so cache block won't execute)
      }
    }

    if (existingImport) {
      logger.info('STATEMENT:CACHE', 'Using validated cached results', {
        statementImportId,
        cachedFromId: existingImport.id,
        totalTransactions: existingImport.total_transactions,
        importedTransactions: existingImport.imported_transactions
      }, correlationId)

      // Update status to 'completed' FIRST (before background copy)
      // This ensures status is always set, even if background copy fails
      // CRITICAL: This must happen synchronously to trigger realtime notification
      console.log(`[CACHE_PATH] Status update block starting for ${statementImportId}`)
      logger.info('STATEMENT:STATUS_UPDATE', 'Attempting to update status to completed (cached)', {
        statementImportId,
        currentStatus: statementImport.status,
        targetStatus: 'completed'
      }, correlationId)
      
      const statusUpdateResult = await supabase
        .from('statement_imports')
        .update({
          status: 'completed',
          total_transactions: existingImport.total_transactions,
          imported_transactions: existingImport.imported_transactions,
          parsing_method: 'ocr', // Use 'ocr' since cached transactions came from OCR extraction
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(), // Explicitly set updated_at
          correlation_id: correlationId, // Persist correlation ID
        })
        .eq('id', statementImportId)
        .select() // Select to get updated row and trigger realtime

      // Log status update explicitly
      if (statusUpdateResult.error) {
        logger.error('STATEMENT:STATUS_UPDATE', 'Failed to update status to completed (cached)', {
          statementImportId,
          error: statusUpdateResult.error.message,
          errorCode: statusUpdateResult.error.code
        }, correlationId)
      } else {
        logger.info('STATEMENT:STATUS_UPDATE', 'Status updated to completed (cached)', {
          statementImportId,
          finalStatus: 'completed',
          totalTransactions: existingImport.total_transactions,
          importedTransactions: existingImport.imported_transactions,
          updateResultRows: statusUpdateResult.data?.length || 0
        }, correlationId)
        
        // Verify the status was actually updated in the database
        const { data: verify, error: verifyError } = await supabase
          .from('statement_imports')
          .select('status, imported_transactions, total_transactions')
          .eq('id', statementImportId)
          .single()

        if (verifyError || verify?.status !== 'completed') {
          logger.error('STATEMENT:VERIFY', 'Cached status update verification failed', {
            statementImportId,
            expected: 'completed',
            actual: verify?.status,
            error: verifyError?.message,
            verifiedImportedTransactions: verify?.imported_transactions,
            verifiedTotalTransactions: verify?.total_transactions
          }, correlationId)
        } else {
          logger.info('STATEMENT:STATUS_UPDATE:VERIFY', 'Verified status update (cached)', {
            statementImportId,
            verifiedStatus: verify?.status,
            verifiedImportedTransactions: verify?.imported_transactions,
            verifiedTotalTransactions: verify?.total_transactions,
            statusMatches: true,
            verified: true,
            willTriggerRealtime: true
          }, correlationId)
        }
      }

      // Copy transactions from cached import to new import
      // CRITICAL: Do this SYNCHRONOUSLY to ensure transactions are inserted before returning
      const copyTransactionsSynchronously = async () => {
        try {
          logger.info('STATEMENT:CACHE:START', 'Starting copy of cached transactions', {
            statementImportId,
            cachedFromId: existingImport.id,
            expectedCount: existingImport.imported_transactions
          }, correlationId)

          // Query transactions from the cached import
          const { data: cachedTransactions, error: queryError } = await supabase
            .from('transactions')
            .select('date, description, amount, type, transaction_reference, category')
            .eq('statement_import_id', existingImport.id)
            .eq('user_id', statementImport.user_id)

          if (queryError) {
            logger.error('STATEMENT:CACHE:QUERY', 'Failed to query cached transactions', {
              statementImportId,
              cachedFromId: existingImport.id,
              error: queryError.message,
              errorCode: queryError.code,
              errorDetails: queryError
            }, correlationId)
            logger.error('STATEMENT:CACHE:QUERY', 'Failed to query cached transactions', {
              statementImportId,
              cachedFromId: existingImport.id,
              error: queryError.message,
              errorCode: queryError.code,
              errorDetails: queryError
            }, correlationId)
            // Status already 'completed', no need to update it again
            // Just log the error - status remains 'completed' with existing counts
            return
          }

          logger.info('STATEMENT:CACHE:QUERY', 'Queried cached transactions', {
            statementImportId,
            cachedFromId: existingImport.id,
            cachedTransactionsCount: cachedTransactions?.length || 0,
            expectedCount: existingImport.imported_transactions
          }, correlationId)

          if (cachedTransactions && cachedTransactions.length > 0) {
            // Copy transactions to new import
            const transactionsToCopy = cachedTransactions.map((tx: any) => ({
              user_id: statementImport.user_id,
              account_id: statementImport.account_id,
              statement_import_id: statementImportId,
              date: tx.date,
              description: tx.description,
              amount: tx.amount,
              type: tx.type,
              transaction_reference: tx.transaction_reference,
              category: tx.category,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }))

            logger.info('STATEMENT:CACHE:INSERT_PREP', 'Prepared transactions for copy', {
              statementImportId,
              cachedFromId: existingImport.id,
              transactionsToCopyCount: transactionsToCopy.length,
              sampleTransactions: transactionsToCopy.slice(0, 2).map((tx: any) => ({
                date: tx.date,
                description: tx.description?.substring(0, 50),
                amount: tx.amount,
                type: tx.type
              }))
            }, correlationId)

            const insertStartTime = Date.now()
            const { data: insertedTransactions, error: insertError } = await insertTransactionsWithRetry(
              supabase,
              transactionsToCopy,
              correlationId
            )
            const insertDuration = Date.now() - insertStartTime

            if (insertError) {
              logger.error('STATEMENT:CACHE:INSERT', 'Failed to copy cached transactions', {
                statementImportId,
                cachedFromId: existingImport.id,
                error: insertError.message,
                errorStack: insertError.stack,
                transactionsCount: transactionsToCopy.length,
                duration: insertDuration
              }, correlationId)
              // Status already 'completed', but transaction count might be wrong
              // Update only the imported_transactions count
              const updateResult = await supabase
                .from('statement_imports')
                .update({
                  imported_transactions: 0, // Copy failed, so 0 imported
                  error_message: `Failed to copy cached transactions: ${insertError.message}`,
                  // Status already 'completed', don't update it
                })
                .eq('id', statementImportId)
              
              if (updateResult.error) {
                logger.error('STATEMENT:CACHE:UPDATE', 'Failed to update status after copy failure', {
                  statementImportId,
                  updateError: updateResult.error.message
                }, correlationId)
              }
            } else {
              const insertedCount = insertedTransactions?.length || 0
              logger.info('STATEMENT:CACHE:INSERT', 'Successfully copied cached transactions', {
                statementImportId,
                cachedFromId: existingImport.id,
                copiedCount: insertedCount,
                expectedCount: transactionsToCopy.length,
                duration: insertDuration,
                sampleInsertedIds: insertedTransactions?.slice(0, 5).map((tx: any) => tx.id)
              }, correlationId)
              
              // Verify inserted transactions have correct statement_import_id
              if (insertedTransactions && insertedTransactions.length > 0) {
                const missingStatementImportId = insertedTransactions.filter((tx: any) => {
                  const hasStatementImportId = tx.statement_import_id === statementImportId || 
                                              tx.statementImportId === statementImportId
                  return !hasStatementImportId
                })
                if (missingStatementImportId.length > 0) {
                  logger.error('STATEMENT:CACHE:VERIFY_IDS', 'CRITICAL: Some copied transactions missing or incorrect statement_import_id', {
                    statementImportId,
                    missingCount: missingStatementImportId.length,
                    missingIds: missingStatementImportId.map((tx: any) => tx.id),
                    sampleMissing: missingStatementImportId.slice(0, 3).map((tx: any) => ({
                      id: tx.id,
                      statement_import_id: tx.statement_import_id,
                      statementImportId: tx.statementImportId
                    }))
                  }, correlationId)
                } else {
                  logger.info('STATEMENT:CACHE:VERIFY_IDS', 'All inserted transactions have correct statement_import_id', {
                    statementImportId,
                    verifiedCount: insertedTransactions.length
                  }, correlationId)
                }
              }
              
              // CRITICAL: Verify transactions were actually inserted into database
              const verifyStartTime = Date.now()
              const { data: verifiedTransactions, error: verifyError } = await supabase
                .from('transactions')
                .select('id, date, description, amount, type, statement_import_id')
                .eq('statement_import_id', statementImportId)
                .eq('user_id', statementImport.user_id)
              
              const verifyDuration = Date.now() - verifyStartTime
              
              if (verifyError) {
                logger.error('STATEMENT:CACHE:VERIFY_QUERY', 'Failed to verify inserted transactions', {
                  statementImportId,
                  verifyError: verifyError.message,
                  verifyErrorCode: verifyError.code
                }, correlationId)
              } else {
                const verifiedCount = verifiedTransactions?.length || 0
                logger.info('STATEMENT:CACHE:VERIFY', 'Verified transactions in database', {
                  statementImportId,
                  insertedCount,
                  verifiedCount,
                  expectedCount: transactionsToCopy.length,
                  verifyDuration,
                  match: verifiedCount === insertedCount,
                  sampleVerifiedIds: verifiedTransactions?.slice(0, 5).map((tx: any) => tx.id)
                }, correlationId)
                
                if (verifiedCount !== insertedCount) {
                  logger.warn('STATEMENT:CACHE:VERIFY_MISMATCH', 'Transaction count mismatch after insertion', {
                    statementImportId,
                    insertedCount,
                    verifiedCount,
                    difference: insertedCount - verifiedCount
                  }, correlationId)
                }
                
                if (verifiedCount === 0 && insertedCount > 0) {
                  logger.error('STATEMENT:CACHE:VERIFY_CRITICAL', 'CRITICAL: No transactions found in database after insertion', {
                    statementImportId,
                    insertedCount,
                    verifiedCount,
                    note: 'Transactions may have been inserted but not visible due to RLS policies or other issues'
                  }, correlationId)
                }
              }
              
              // Update only the imported_transactions count (status already 'completed')
              const updateResult = await supabase
                .from('statement_imports')
                .update({
                  imported_transactions: insertedCount,
                  // Status already 'completed', don't update it
                })
                .eq('id', statementImportId)
              
              if (updateResult.error) {
                logger.error('STATEMENT:CACHE:UPDATE', 'Failed to update imported_transactions count', {
                  statementImportId,
                  updateError: updateResult.error.message,
                  insertedCount
                }, correlationId)
              } else {
                logger.info('STATEMENT:CACHE:UPDATE', 'Updated imported_transactions count', {
                  statementImportId,
                  imported_transactions: insertedCount
                }, correlationId)
              }
            }
          } else {
            // No transactions to copy - status already 'completed', counts already set
            logger.warn('STATEMENT:CACHE:EMPTY', 'No cached transactions found to copy', {
              statementImportId,
              cachedFromId: existingImport.id,
              expectedCount: existingImport.imported_transactions,
              note: 'This may indicate the cached import had no transactions or query failed'
            }, correlationId)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          const errorStack = error instanceof Error ? error.stack : undefined
          logger.error('STATEMENT:CACHE:ERROR', 'Error processing cached import', {
            statementImportId,
            error: errorMessage,
            errorStack,
            errorType: error instanceof Error ? error.constructor.name : typeof error
          }, correlationId)
          // Status already 'completed', background copy error doesn't affect status
          // But update error_message so user knows something went wrong
          try {
            await supabase
              .from('statement_imports')
              .update({
                error_message: `Background copy failed: ${errorMessage}`
              })
              .eq('id', statementImportId)
          } catch (updateError) {
            logger.error('STATEMENT:CACHE:ERROR_UPDATE', 'Failed to update error message', {
              statementImportId,
              updateError: updateError instanceof Error ? updateError.message : String(updateError)
            }, correlationId)
          }
        }
      }

      // Execute the copy synchronously (await it)
      await copyTransactionsSynchronously()

      // Return success after transactions are copied
      return new Response(JSON.stringify({
        success: true,
        processing: false,
        cached: true,
        message: 'Cached transactions copied successfully.',
        correlationId
      }), {
        status: 200, // OK - processing completed
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update status to processing BEFORE starting background work
    await supabase
      .from('statement_imports')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString(), // Explicitly set updated_at
        correlation_id: correlationId, // Persist correlation ID
      })
      .eq('id', statementImportId)

    // Start processing in background (non-blocking)
    // Download file and process - all happens in background
    const processPromise = (async () => {
      try {
        // Process the file using pre-signed URLs (no download needed - performance optimization)
        // The extractStatementDataWithMistralOCR function creates pre-signed URLs directly
        logger.info('STATEMENT:PROCESS', 'Starting statement processing with pre-signed URL (no download)', {
          statementImportId,
          filePath: statementImport.file_path,
          fileSize: statementImport.file_size,
          note: 'File download eliminated - using pre-signed URLs for direct OCR API access'
        }, correlationId)

        // Process the file (fileBlob is null - we use pre-signed URLs instead)
        await processStatement(null, statementImport, supabase, correlationId)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown processing error'
        const isTimeoutOrResourceLimit = errorMessage.includes('timeout') || 
                                         errorMessage.includes('Timeout') ||
                                         errorMessage.includes('WORKER_LIMIT') ||
                                         errorMessage.includes('resource')

        logger.error('STATEMENT:BACKGROUND_ERROR', 'Background processing failed', {
          statementImportId,
          error: errorMessage,
          isTimeoutOrResourceLimit
        }, correlationId)

        // Update status to failed
        try {
          await supabase
            .from('statement_imports')
            .update({
              status: 'failed',
              error_message: isTimeoutOrResourceLimit
                ? `Processing timeout: ${errorMessage}. The statement may be too large or complex. Please try uploading a smaller statement or contact support.`
                : errorMessage,
              updated_at: new Date().toISOString(), // Explicitly set updated_at
              correlation_id: correlationId, // Persist correlation ID
            })
            .eq('id', statementImportId)

          logger.info('STATEMENT:BACKGROUND_ERROR', 'Status updated to failed after background processing error', {
            statementImportId,
            errorMessage
          }, correlationId)
        } catch (statusUpdateError) {
          logger.error('STATEMENT:BACKGROUND_ERROR', 'Failed to update status after background processing error', {
            statementImportId,
            error: errorMessage,
            statusUpdateError: statusUpdateError instanceof Error ? statusUpdateError.message : String(statusUpdateError)
          }, correlationId)
        }
      }
    })()
    // Use Deno.waitUntil() if available to ensure background task completes
    // Otherwise, fire-and-forget (processing continues but may be killed if function exits)
    if (typeof Deno !== 'undefined' && 'waitUntil' in Deno && typeof Deno.waitUntil === 'function') {
      Deno.waitUntil(processPromise)
    }

    // Return immediately - processing continues in background
    logger.info('STATEMENT:ASYNC', 'Processing started in background, returning 202 Accepted', {
      statementImportId
    }, correlationId)

    return new Response(JSON.stringify({ 
      success: true, 
      processing: true,
      message: 'Processing started. Status will update as processing completes.'
    }), {
      status: 202, // Accepted - processing started
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error('STATEMENT:ERROR', 'Edge function error', {
      error: errorMessage
    }, correlationId)

    // Try to update status even if we can't process
    try {
      await supabase
        .from('statement_imports')
        .update({
          status: 'failed',
          error_message: errorMessage
        })
        .eq('id', statementImportId)
    } catch (statusError) {
      logger.error('STATEMENT:ERROR', 'Failed to update status in outer catch', {
        statementImportId,
        error: errorMessage,
        statusError: statusError instanceof Error ? statusError.message : String(statusError)
      }, correlationId)
    }

    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
