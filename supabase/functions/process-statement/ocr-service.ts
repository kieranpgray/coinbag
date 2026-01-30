/**
 * Mistral Document AI OCR Service Module
 * 
 * Provides a clean interface for OCR document processing using Mistral's OCR API.
 * Reuses existing logger and correlation ID patterns from the Edge Function.
 */

// Import logger from main file (will be passed in, but define types here)
// Note: In Deno Edge Functions, we'll import logger from index.ts

// Types matching Mistral OCR API documentation
export interface OcrInput {
  kind: 'document_url' | 'base64_pdf'
  url?: string  // For document_url (pre-signed URL)
  base64?: string  // For base64_pdf
  filename?: string
  mimeType?: string
  pages?: number[]  // 0-indexed, validated against bounds
  tableFormat?: 'html' | 'markdown'
  extractHeader?: boolean
  extractFooter?: boolean
  includeImageBase64?: boolean
  documentAnnotationFormat?: {
    name: string
    schema: any
  }
}

export interface OcrResult {
  pages: Array<{
    index: number
    markdown: string
    images: Array<{ 
      id: string
      top_left_x?: number
      top_left_y?: number
      bottom_right_x?: number
      bottom_right_y?: number
      image_base64?: string
    }>
    tables: Array<{ 
      id: string
      format: string
      content: string
    }>
    hyperlinks: Array<{ 
      url: string
      text?: string
    }>
    header?: string | null
    footer?: string | null
    dimensions?: { 
      width?: number
      height?: number
      dpi?: number
    }
  }>
  model: string
  usage_info: { 
    pages_processed: number
    doc_size_bytes?: number | null
  }
  document_annotation?: any
}

// Error types for better error handling
export class OcrAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OcrAuthError'
  }
}

export class OcrRateLimitError extends Error {
  retryAfter?: number
  constructor(message: string, retryAfter?: number) {
    super(message)
    this.name = 'OcrRateLimitError'
    this.retryAfter = retryAfter
  }
}

export class OcrTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OcrTimeoutError'
  }
}

export class OcrValidationError extends Error {
  field?: string
  constructor(message: string, field?: string) {
    super(message)
    this.name = 'OcrValidationError'
    this.field = field
  }
}

// Logger interface (matches existing logger in index.ts)
interface Logger {
  info: (event: string, message: string, data?: any, correlationId?: string) => void
  warn: (event: string, message: string, data?: any, correlationId?: string) => void
  error: (event: string, message: string, data?: any, correlationId?: string) => void
}

/**
 * Validate OCR input parameters
 */
function validateOcrInput(
  input: OcrInput, 
  logger: Logger,
  correlationId?: string
): void {
  // Validate document_url
  if (input.kind === 'document_url') {
    if (!input.url) {
      throw new OcrValidationError('URL is required for document_url input', 'url')
    }
    if (!input.url.startsWith('http://') && !input.url.startsWith('https://') && !input.url.startsWith('data:')) {
      throw new OcrValidationError('URL must be http(s) or data URL', 'url')
    }
  }
  
  // Validate base64_pdf
  if (input.kind === 'base64_pdf') {
    if (!input.base64) {
      throw new OcrValidationError('Base64 data is required for base64_pdf input', 'base64')
    }
    // Rough size check (base64 is ~33% larger than binary)
    const estimatedSize = (input.base64.length * 3) / 4
    const maxSize = 50 * 1024 * 1024  // 50MB
    if (estimatedSize > maxSize) {
      throw new OcrValidationError(
        `Base64 PDF too large: ${Math.round(estimatedSize / 1024 / 1024)}MB (max ${maxSize / 1024 / 1024}MB)`, 
        'base64'
      )
    }
  }
  
  // Validate pages (0-indexed, must be non-negative)
  if (input.pages) {
    if (!Array.isArray(input.pages)) {
      throw new OcrValidationError('Pages must be an array', 'pages')
    }
    if (input.pages.some(p => typeof p !== 'number' || p < 0 || !Number.isInteger(p))) {
      throw new OcrValidationError('Pages must be non-negative integers', 'pages')
    }
  }
  
  logger.info('OCR:VALIDATION', 'Input validation passed', {
    inputKind: input.kind,
    hasPages: !!input.pages,
    pagesCount: input.pages?.length || 0
  }, correlationId)
}

/**
 * Validate OCR API response structure
 */
function validateOCRResponse(
  response: any, 
  logger: Logger,
  correlationId?: string
): OcrResult {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid OCR response: not an object')
  }
  
  if (!Array.isArray(response.pages)) {
    throw new Error('Invalid OCR response: pages is not an array')
  }
  
  if (!response.model || typeof response.model !== 'string') {
    throw new Error('Invalid OCR response: model is missing or invalid')
  }
  
  if (!response.usage_info || typeof response.usage_info.pages_processed !== 'number') {
    throw new Error('Invalid OCR response: usage_info.pages_processed is missing or invalid')
  }
  
  // Validate each page structure
  for (const page of response.pages) {
    if (typeof page.index !== 'number' || page.index < 0) {
      throw new Error(`Invalid OCR response: page index ${page.index} is invalid`)
    }
    if (typeof page.markdown !== 'string') {
      throw new Error(`Invalid OCR response: page ${page.index} markdown is missing or invalid`)
    }
  }
  
  logger.info('OCR:VALIDATION', 'Response validation passed', {
    pagesCount: response.pages.length,
    model: response.model,
    pagesProcessed: response.usage_info.pages_processed
  }, correlationId)
  
  return response as OcrResult
}

/**
 * Call Mistral OCR API with retry logic and error handling
 */
async function callMistralOCR(
  apiKey: string,
  input: OcrInput,
  logger: Logger,
  correlationId?: string,
  timeoutMs: number = 60000,
  maxRetries: number = 2
): Promise<OcrResult> {
  const startTime = Date.now()
  let lastError: Error | null = null
  
  // Retry logic with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    
    try {
      // Build request body
      const body: any = {
        model: 'mistral-ocr-latest',
        ...(input.pages && { pages: input.pages }),  // 0-indexed, no shifting
        ...(input.tableFormat && { table_format: input.tableFormat }),
        ...(input.extractHeader && { extract_header: true }),
        ...(input.extractFooter && { extract_footer: true }),
        ...(input.includeImageBase64 && { include_image_base64: true })
        // Note: Mistral OCR API no longer supports structured extraction via any annotation format parameter
        // Structured extraction must be done via Chat API after OCR markdown extraction
      }
      
      // Handle document input type
      if (input.kind === 'document_url') {
        body.document = {
          type: 'document_url',
          document_url: input.url
        }
      } else if (input.kind === 'base64_pdf') {
        body.document = {
          type: 'document_url',
          document_url: `data:${input.mimeType || 'application/pdf'};base64,${input.base64}`
        }
      }
      
      const requestBodySize = JSON.stringify(body).length
      
      logger.info('OCR:API_CALL', `Calling Mistral OCR API (attempt ${attempt + 1}/${maxRetries + 1})`, {
        endpoint: 'https://api.mistral.ai/v1/ocr',
        inputKind: input.kind,
        hasPages: !!input.pages,
        pagesCount: input.pages?.length || 0,
        requestBodySize,
        timeoutMs
      }, correlationId)
      
      const response = await fetch('https://api.mistral.ai/v1/ocr', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      const duration = Date.now() - startTime
      
      // Parse error response if not OK
      if (!response.ok) {
        const errorText = await response.text()
        const status = response.status
        
        logger.error('OCR:API_ERROR', 'Mistral OCR API error', {
          status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500),  // Truncate for logging
          attempt: attempt + 1,
          duration
        }, correlationId)
        
        // Categorize errors
        if (status === 401 || status === 403) {
          throw new OcrAuthError(`Authentication failed: ${status} ${errorText}`)
        } else if (status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          throw new OcrRateLimitError(
            `Rate limit exceeded: ${errorText}`, 
            retryAfter ? parseInt(retryAfter) : undefined
          )
        } else if (status >= 500) {
          // Retryable server errors
          lastError = new Error(`Server error: ${status} ${errorText}`)
          if (attempt < maxRetries) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000)  // Max 10s
            logger.warn('OCR:RETRY', `Retrying after ${backoffMs}ms`, {
              attempt: attempt + 1,
              backoffMs
            }, correlationId)
            await new Promise(resolve => setTimeout(resolve, backoffMs))
            continue
          }
          throw lastError
        } else {
          throw new Error(`Mistral OCR API error: ${status} ${errorText}`)
        }
      }
      
      // Parse successful response
      const responseData = await response.json()
      const responseSize = JSON.stringify(responseData).length
      const pagesProcessed = responseData.pages?.length || 0
      
      logger.info('OCR:API_SUCCESS', 'Mistral OCR API call succeeded', {
        duration,
        pagesProcessed,
        responseSize,
        model: responseData.model,
        attempt: attempt + 1
      }, correlationId)
      
      return responseData
      
    } catch (error) {
      clearTimeout(timeoutId)
      const duration = Date.now() - startTime
      
      if (error.name === 'AbortError') {
        const timeoutError = new OcrTimeoutError(`OCR request timeout after ${timeoutMs}ms`)
        logger.error('OCR:TIMEOUT', 'OCR request timed out', {
          timeoutMs,
          duration,
          attempt: attempt + 1
        }, correlationId)
        
        if (attempt < maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000)
          logger.warn('OCR:RETRY', `Retrying after timeout (${backoffMs}ms)`, {
            attempt: attempt + 1
          }, correlationId)
          await new Promise(resolve => setTimeout(resolve, backoffMs))
          continue
        }
        throw timeoutError
      }
      
      // Don't retry auth/validation errors
      if (error instanceof OcrAuthError || error instanceof OcrValidationError || error instanceof OcrRateLimitError) {
        throw error
      }
      
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt < maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000)
        logger.warn('OCR:RETRY', `Retrying after error (${backoffMs}ms)`, {
          attempt: attempt + 1,
          error: lastError.message,
          duration
        }, correlationId)
        await new Promise(resolve => setTimeout(resolve, backoffMs))
        continue
      }
      
      logger.error('OCR:FAILED', 'All retry attempts exhausted', {
        attempts: maxRetries + 1,
        duration,
        lastError: lastError.message
      }, correlationId)
      throw lastError
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('OCR call failed')
}

/**
 * Create pre-signed URL from Supabase Storage
 */
export async function createPreSignedUrl(
  supabase: any,
  filePath: string,
  expiresIn: number = 900,  // 15 minutes default
  logger: Logger,
  correlationId?: string
): Promise<string> {
  const startTime = Date.now()
  
  try {
    const { data, error } = await supabase.storage
      .from('statements')
      .createSignedUrl(filePath, expiresIn)
    
    const duration = Date.now() - startTime
    
    if (error || !data?.signedUrl) {
      logger.error('OCR:PRESIGNED_URL', 'Failed to create pre-signed URL', {
        filePath,
        error: error?.message,
        duration
      }, correlationId)
      throw new Error(`Failed to create pre-signed URL: ${error?.message || 'Unknown error'}`)
    }
    
    logger.info('OCR:PRESIGNED_URL', 'Pre-signed URL created', {
      filePath,
      expiresIn,
      duration,
      urlLength: data.signedUrl.length
    }, correlationId)
    
    return data.signedUrl
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('OCR:PRESIGNED_URL', 'Pre-signed URL generation failed', {
      filePath,
      error: error instanceof Error ? error.message : String(error),
      duration
    }, correlationId)
    throw error
  }
}

/**
 * Main OCR service function
 * Processes a document using Mistral OCR API
 */
export async function ocrDocument(
  input: OcrInput,
  logger: Logger,
  correlationId?: string,
  options?: {
    apiKey?: string
    timeoutMs?: number
    maxRetries?: number
  }
): Promise<OcrResult> {
  const startTime = Date.now()
  const apiKey = options?.apiKey || Deno.env.get('MISTRAL_API_KEY')
  
  if (!apiKey) {
    logger.error('OCR:CONFIG', 'MISTRAL_API_KEY not configured', {}, correlationId)
    throw new OcrAuthError('MISTRAL_API_KEY not configured')
  }
  
  try {
    // Validate input
    validateOcrInput(input, logger, correlationId)
    
    // Call API with retry logic
    const response = await callMistralOCR(
      apiKey,
      input,
      logger,
      correlationId,
      options?.timeoutMs || 60000,
      options?.maxRetries || 2
    )
    
    // Validate response
    const validatedResponse = validateOCRResponse(response, logger, correlationId)
    
    const totalDuration = Date.now() - startTime
    logger.info('OCR:SUCCESS', 'OCR document processing completed', {
      totalDuration,
      pagesProcessed: validatedResponse.pages.length,
      model: validatedResponse.model
    }, correlationId)
    
    return validatedResponse
  } catch (error) {
    const totalDuration = Date.now() - startTime
    logger.error('OCR:ERROR', 'OCR document processing failed', {
      totalDuration,
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : undefined
    }, correlationId)
    throw error
  }
}

