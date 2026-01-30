/**
 * Supabase Edge Function for processing statement files
 *
 * This function handles the complete statement import workflow:
 * 1. Download file from Supabase Storage
 * 2. Extract text using pdfjs-dist (for text-based PDFs)
 * 3. Fall back to Mistral OCR for scanned/complex PDFs
 * 4. Parse transactions using deterministic parser
 * 5. Update database with results
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  status: string
}

/**
 * Extract text using pdfjs-dist for text-based PDFs
 */
async function extractTextWithPdfJs(fileBlob: Blob): Promise<string | null> {
  try {
    // Dynamic import to avoid loading in all cases
    const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.530/+esm')

    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

    // Read file as array buffer
    const arrayBuffer = await fileBlob.arrayBuffer()

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise

    // Extract text from all pages
    const textParts: string[] = []

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()

      // Combine text items into a single string
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str || '' : ''))
        .join(' ')

      textParts.push(pageText)
    }

    const extractedText = textParts.join('\n\n')

    // Return text only if it seems substantial (not just OCR artifacts)
    if (extractedText.length > 100) {
      return extractedText
    }

    return null // Low confidence, try OCR
  } catch (error) {
    logger.warn('STATEMENT:EXTRACT', 'pdfjs-dist failed', {
      error: error instanceof Error ? error.message : String(error)
    })
    return null // Continue to OCR
  }
}

/**
 * Extract structured JSON data using Mistral OCR API with circuit breaker protection
 */
async function extractStatementDataWithMistralOCR(fileBlob: Blob): Promise<any> {
  return mistralCircuitBreaker.call(async () => {
    const mistralApiKey = Deno.env.get('MISTRAL_API_KEY')
    if (!mistralApiKey) {
      throw new Error('MISTRAL_API_KEY not configured')
    }

    // Convert blob to base64
    const arrayBuffer = await fileBlob.arrayBuffer()
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

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
          items: {
            type: "object",
            properties: {
              date: { type: "string", format: "date" },
              description: { type: "string" },
              amount: { type: "number" },
              transaction_type: { type: "string", enum: ["credit", "debit", "transfer", "fee", "interest", "payment"] },
              reference: { type: "string" },
              balance: { type: "number" }
            },
            required: ["date", "description", "amount"]
          }
        }
      },
      required: ["account", "transactions"]
    }

    const prompt = `
Extract the bank statement information into the following JSON structure. Analyze the bank statement and return ONLY a valid JSON object that matches this exact schema.

${JSON.stringify(extractionSchema, null, 2)}

Instructions:
- Extract all transactions with their dates, descriptions, and amounts
- Use negative amounts for debits/expenses, positive for credits/income
- Format all dates as YYYY-MM-DD
- Include account information from the statement header
- Calculate balances if not explicitly shown
- Return ONLY the JSON object, no additional text or explanation
`

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Data}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Mistral API error: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content in Mistral API response')
    }

    // Try to extract JSON from the response
    try {
      // Look for JSON in the response (might be wrapped in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsedData = JSON.parse(jsonMatch[0])

      // Validate required fields
      if (!parsedData.account?.account_number || !Array.isArray(parsedData.transactions)) {
        throw new Error('Invalid JSON structure - missing required fields')
      }

      return parsedData
    } catch (parseError) {
      logger.error('STATEMENT:PARSE', 'Failed to parse Mistral JSON response', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        content: content.substring(0, 500) + '...'
      })
      throw new Error('Failed to parse structured data from Mistral response')
    }
  })
}

/**
 * Get existing transactions for deduplication
 */
async function getExistingTransactions(accountId: string, supabase: any): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('id, transaction_reference, date, description, amount')
      .eq('account_id', accountId)

    if (error) {
      logger.warn('STATEMENT:PROCESS', 'Failed to fetch existing transactions', { error: error.message })
      return []
    }

    return data || []
  } catch (error) {
    logger.warn('STATEMENT:PROCESS', 'Error fetching existing transactions', {
      error: error instanceof Error ? error.message : String(error)
    })
    return []
  }
}

/**
 * Process a statement file
 */
async function processStatement(fileBlob: Blob, statementImport: StatementImport, supabase: any) {
  const correlationId = getCorrelationId()

  try {
    // Step 1: Extract structured data with Mistral OCR (primary method)
    logger.info('STATEMENT:PROCESS', 'Starting structured data extraction with Mistral OCR', {
      statementImportId: statementImport.id,
      fileSize: fileBlob.size
    }, correlationId)

    let structuredData: any

    try {
      structuredData = await extractStatementDataWithMistralOCR(fileBlob)
      logger.info('STATEMENT:EXTRACT', 'Structured data extracted with Mistral OCR', {
        statementImportId: statementImport.id,
        transactionCount: structuredData.transactions?.length || 0,
        accountNumber: structuredData.account?.account_number
      }, correlationId)
    } catch (mistralError) {
      logger.warn('STATEMENT:EXTRACT', 'Mistral OCR failed, falling back to text extraction', {
        statementImportId: statementImport.id,
        error: mistralError instanceof Error ? mistralError.message : String(mistralError)
      }, correlationId)

      // Fallback: Try pdfjs-dist extraction
      const extractedText = await extractTextWithPdfJs(fileBlob)

      if (!extractedText || extractedText.length < 100) {
        throw new Error('Could not extract data from statement. File may be corrupted or unsupported format.')
      }

      // Parse with simple parser as fallback
      const transactions = parseTransactionsSimple(extractedText)

      if (transactions.length === 0) {
        throw new Error('No transactions found in the statement text')
      }

      // Convert to structured format for consistency
      structuredData = {
        account: {
          account_number: statementImport.file_name.split('.')[0], // Fallback account number
          account_name: 'Unknown',
          bank_name: 'Unknown',
          account_type: 'checking',
          currency: 'AUD'
        },
        transactions: transactions.map((t: any) => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          transaction_type: t.amount > 0 ? 'credit' : 'debit'
        }))
      }
    }

    // Step 2: Process the structured data
    logger.info('STATEMENT:PROCESS', 'Processing structured statement data', {
      statementImportId: statementImport.id,
      transactionCount: structuredData.transactions?.length || 0
    }, correlationId)

    // Step 3: Convert structured data to database format
    const transactions = structuredData.transactions.map((t: any) => ({
      user_id: statementImport.user_id,
      account_id: statementImport.account_id,
      statement_import_id: statementImport.id,
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.transaction_type === 'credit' ? 'income' : 'expense', // Convert to our app's terminology
      transaction_reference: t.reference || null,
      category_id: null, // Will be set later by user
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    // Step 4: Remove duplicates based on existing transactions
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('id, transaction_reference, date, amount, description')
      .eq('account_id', statementImport.account_id)

    const uniqueTransactions = transactions.filter((newTx: any) =>
      !existingTransactions?.some((existing: any) =>
        existing.transaction_reference === newTx.transaction_reference &&
        existing.date === newTx.date &&
        Math.abs(existing.amount - newTx.amount) < 0.01
      )
    )

    // Step 5: Update statement import with processing results
    await supabase
      .from('statement_imports')
      .update({
        status: uniqueTransactions.length > 0 ? 'review' : 'failed',
        parsing_method: 'mistral-structured', // Always use Mistral for structured extraction
        total_transactions: uniqueTransactions.length,
        metadata: {
          extraction_method: 'mistral-structured',
          account_number: structuredData.account?.account_number,
          bank_name: structuredData.account?.bank_name,
          statement_period: structuredData.statement_period,
          parsed_at: new Date().toISOString(),
        }
      })
      .eq('id', statementImport.id)

    logger.info('STATEMENT:PROCESS', 'Statement processing completed', {
      statementImportId: statementImport.id,
      transactionsFound: transactions.length,
      extractionMethod,
    }, correlationId)

    // Step 6: Create transactions (if processing successful)
    if (uniqueTransactions.length > 0) {
      const { data: insertedTransactions, error: insertError } = await supabase
        .from('transactions')
        .insert(uniqueTransactions)
        .select('id')

      if (insertError) {
        // Update status to failed if transaction creation fails
        await supabase
          .from('statement_imports')
          .update({
            status: 'failed',
            error_message: insertError.message,
            failed_transactions: uniqueTransactions.length,
          })
          .eq('id', statementImport.id)

        throw new Error(`Transaction creation failed: ${insertError.message}`)
      }

      // Update final status
      await supabase
        .from('statement_imports')
        .update({
          status: 'completed',
          imported_transactions: insertedTransactions?.length || 0,
          failed_transactions: uniqueTransactions.length - (insertedTransactions?.length || 0),
          completed_at: new Date().toISOString(),
        })
        .eq('id', statementImport.id)

      logger.info('STATEMENT:COMMIT', 'Transactions committed successfully', {
        statementImportId: statementImport.id,
        importedCount: insertedTransactions?.length || 0,
        totalCount: uniqueTransactions.length,
      }, correlationId)
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error'

    logger.error('STATEMENT:PROCESS', 'Statement processing failed', {
      statementImportId: statementImport.id,
      error: errorMessage
    }, correlationId)

    // Update status to failed
    await supabase
      .from('statement_imports')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', statementImport.id)

    throw error
  }
}

/**
 * Main Edge Function handler
 */
serve(async (req) => {
  const correlationId = getCorrelationId()

  try {
    // Parse request
    const { statementImportId } = await req.json()

    if (!statementImportId) {
      return new Response(JSON.stringify({ error: 'statementImportId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    logger.info('STATEMENT:START', 'Edge function invoked', {
      statementImportId
    }, correlationId)

    // Get authenticated Supabase client
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Supabase configuration missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify user owns this import (RLS check)
    const { data: statementImport, error: fetchError } = await supabase
      .from('statement_imports')
      .select('id, user_id, account_id, file_path, file_hash, status')
      .eq('id', statementImportId)
      .single()

    if (fetchError || !statementImport) {
      logger.warn('STATEMENT:AUTH', 'Statement import not found', {
        statementImportId,
        error: fetchError?.message
      }, correlationId)

      return new Response(JSON.stringify({ error: 'Statement import not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Rate limiting: Check recent processing activity (max 10 per hour per user)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentImports, error: rateLimitError } = await supabase
      .from('statement_imports')
      .select('id')
      .eq('user_id', statementImport.user_id)
      .gte('created_at', oneHourAgo)

    if (rateLimitError) {
      logger.error('STATEMENT:RATE_LIMIT', 'Failed to check rate limit', {
        statementImportId,
        error: rateLimitError.message
      }, correlationId)
    } else if (recentImports && recentImports.length >= 10) {
      logger.warn('STATEMENT:RATE_LIMIT', 'Rate limit exceeded', {
        statementImportId,
        userId: statementImport.user_id,
        recentCount: recentImports.length
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
        headers: { 'Content-Type': 'application/json' }
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
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Check for duplicate file hash (cost optimization)
    const { data: existingImport } = await supabase
      .from('statement_imports')
      .select('id, status, total_transactions, imported_transactions, file_hash')
      .eq('file_hash', statementImport.file_hash)
      .eq('status', 'completed')
      .neq('id', statementImportId) // Exclude current import
      .single()

    if (existingImport) {
      logger.info('STATEMENT:CACHE', 'Reusing cached results for duplicate file', {
        statementImportId,
        cachedFromId: existingImport.id,
        totalTransactions: existingImport.total_transactions,
        importedTransactions: existingImport.imported_transactions
      }, correlationId)

      // Mark current import as completed using cached results
      await supabase
        .from('statement_imports')
        .update({
          status: 'completed',
          total_transactions: existingImport.total_transactions,
          imported_transactions: existingImport.imported_transactions,
          parsing_method: 'cached',
          completed_at: new Date().toISOString(),
        })
        .eq('id', statementImportId)

      return new Response(JSON.stringify({
        success: true,
        cached: true,
        sourceImportId: existingImport.id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Download file from storage
    logger.info('STATEMENT:DOWNLOAD', 'Downloading file from storage', {
      statementImportId,
      filePath: statementImport.file_path
    }, correlationId)

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('statements')
      .download(statementImport.file_path)

    if (downloadError || !fileBlob) {
      const errorMsg = `Failed to download file from storage: ${downloadError?.message || 'Unknown error'}`

      await supabase
        .from('statement_imports')
        .update({
          status: 'failed',
          error_message: errorMsg
        })
        .eq('id', statementImportId)

      logger.error('STATEMENT:DOWNLOAD', 'File download failed', {
        statementImportId,
        error: errorMsg
      }, correlationId)

      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Update status to processing
    await supabase
      .from('statement_imports')
      .update({ status: 'processing' })
      .eq('id', statementImportId)

    // Process the file
    await processStatement(fileBlob, statementImport, supabase)

    logger.info('STATEMENT:SUCCESS', 'Processing completed successfully', {
      statementImportId
    }, correlationId)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error('STATEMENT:ERROR', 'Edge function error', {
      error: errorMessage
    }, correlationId)

    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
