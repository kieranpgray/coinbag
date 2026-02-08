/**
 * Unit tests for OCR service module
 * 
 * Tests cover:
 * - Successful OCR with pre-signed URL
 * - Successful OCR with base64 input
 * - Retry logic (server errors, timeouts)
 * - Error categorization (auth, rate limit, timeout, validation)
 * - Input validation (invalid URLs, oversized base64, invalid pages)
 * - Response validation (missing fields, invalid structure)
 * - Performance metrics logging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ocrDocument,
  createPreSignedUrl,
  OcrAuthError,
  OcrRateLimitError,
  OcrTimeoutError,
  OcrValidationError,
  type OcrInput,
  type OcrResult
} from './ocr-service.ts'

// Mock logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Mock fetch
global.fetch = vi.fn()

// Mock Deno.env
const mockEnv = {
  get: vi.fn(),
}

// Mock Supabase client
const _mockSupabase = {
  storage: {
    from: vi.fn(() => ({
      createSignedUrl: vi.fn(),
    })),
  },
}

describe('OCR Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.get.mockReturnValue('test-api-key')
  })

  describe('Input Validation', () => {
    it('should validate document_url input', async () => {
      const input: OcrInput = {
        kind: 'document_url',
        url: 'https://example.com/doc.pdf',
      }

      // Mock successful response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pages: [{ index: 0, markdown: 'Test content' }],
          model: 'mistral-ocr-latest',
          usage_info: { pages_processed: 1 },
        }),
      })

      await ocrDocument(input, mockLogger)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'OCR:VALIDATION',
        'Input validation passed',
        expect.any(Object),
        undefined
      )
    })

    it('should reject invalid URL format', async () => {
      const input: OcrInput = {
        kind: 'document_url',
        url: 'invalid-url',
      }

      await expect(ocrDocument(input, mockLogger)).rejects.toThrow(OcrValidationError)
      await expect(ocrDocument(input, mockLogger)).rejects.toThrow('URL must be http(s) or data URL')
    })

    it('should reject missing URL for document_url', async () => {
      const input: OcrInput = {
        kind: 'document_url',
      }

      await expect(ocrDocument(input, mockLogger)).rejects.toThrow(OcrValidationError)
      await expect(ocrDocument(input, mockLogger)).rejects.toThrow('URL is required')
    })

    it('should validate base64_pdf input', async () => {
      const input: OcrInput = {
        kind: 'base64_pdf',
        base64: 'dGVzdA==', // "test" in base64
      }

      // Mock successful response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pages: [{ index: 0, markdown: 'Test content' }],
          model: 'mistral-ocr-latest',
          usage_info: { pages_processed: 1 },
        }),
      })

      await ocrDocument(input, mockLogger)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'OCR:VALIDATION',
        'Input validation passed',
        expect.any(Object),
        undefined
      )
    })

    it('should reject oversized base64 PDF', async () => {
      // Create a base64 string that exceeds 50MB when decoded
      const largeBase64 = 'A'.repeat(70 * 1024 * 1024) // ~70MB base64 = ~52MB decoded
      const input: OcrInput = {
        kind: 'base64_pdf',
        base64: largeBase64,
      }

      await expect(ocrDocument(input, mockLogger)).rejects.toThrow(OcrValidationError)
      await expect(ocrDocument(input, mockLogger)).rejects.toThrow('too large')
    })

    it('should validate page numbers', async () => {
      const input: OcrInput = {
        kind: 'document_url',
        url: 'https://example.com/doc.pdf',
        pages: [0, 1, 2], // Valid: non-negative integers
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pages: [
            { index: 0, markdown: 'Page 1' },
            { index: 1, markdown: 'Page 2' },
            { index: 2, markdown: 'Page 3' },
          ],
          model: 'mistral-ocr-latest',
          usage_info: { pages_processed: 3 },
        }),
      })

      await ocrDocument(input, mockLogger)
      expect(mockLogger.info).toHaveBeenCalled()
    })

    it('should reject invalid page numbers', async () => {
      const input: OcrInput = {
        kind: 'document_url',
        url: 'https://example.com/doc.pdf',
        pages: [-1, 0.5], // Invalid: negative and non-integer
      }

      await expect(ocrDocument(input, mockLogger)).rejects.toThrow(OcrValidationError)
      await expect(ocrDocument(input, mockLogger)).rejects.toThrow('non-negative integers')
    })
  })

  describe('API Calls', () => {
    it('should successfully call OCR API with pre-signed URL', async () => {
      const input: OcrInput = {
        kind: 'document_url',
        url: 'https://example.com/doc.pdf',
        tableFormat: 'markdown',
        extractHeader: true,
        extractFooter: true,
      }

      const mockResponse: OcrResult = {
        pages: [
          {
            index: 0,
            markdown: 'Test content',
            images: [],
            tables: [],
            hyperlinks: [],
            header: 'Header',
            footer: 'Footer',
          },
        ],
        model: 'mistral-ocr-latest',
        usage_info: { pages_processed: 1 },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await ocrDocument(input, mockLogger)

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.mistral.ai/v1/ocr',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
        })
      )

      expect(result).toEqual(mockResponse)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'OCR:SUCCESS',
        'OCR document processing completed',
        expect.any(Object),
        undefined
      )
    })

    it('should handle authentication errors', async () => {
      const input: OcrInput = {
        kind: 'document_url',
        url: 'https://example.com/doc.pdf',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key',
      })

      await expect(ocrDocument(input, mockLogger)).rejects.toThrow(OcrAuthError)
      await expect(ocrDocument(input, mockLogger)).rejects.toThrow('Authentication failed')
    })

    it('should handle rate limit errors', async () => {
      const input: OcrInput = {
        kind: 'document_url',
        url: 'https://example.com/doc.pdf',
      }

      const mockHeaders = new Headers()
      mockHeaders.set('Retry-After', '60')

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: mockHeaders,
        text: async () => 'Rate limit exceeded',
      })

      await expect(ocrDocument(input, mockLogger)).rejects.toThrow(OcrRateLimitError)
      const error = await ocrDocument(input, mockLogger).catch((e) => e)
      expect(error).toBeInstanceOf(OcrRateLimitError)
      expect((error as OcrRateLimitError).retryAfter).toBe(60)
    })

    it('should retry on server errors', async () => {
      const input: OcrInput = {
        kind: 'document_url',
        url: 'https://example.com/doc.pdf',
      }

      // First call fails with 500, second succeeds
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Server error',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            pages: [{ index: 0, markdown: 'Success' }],
            model: 'mistral-ocr-latest',
            usage_info: { pages_processed: 1 },
          }),
        })

      const result = await ocrDocument(input, mockLogger, undefined, { maxRetries: 1 })

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'OCR:RETRY',
        expect.stringContaining('Retrying'),
        expect.any(Object),
        undefined
      )
      expect(result.pages).toHaveLength(1)
    })

    it('should handle timeout errors', async () => {
      const input: OcrInput = {
        kind: 'document_url',
        url: 'https://example.com/doc.pdf',
      }

      // Mock AbortController to simulate timeout
      const originalAbortController = global.AbortController
      global.AbortController = vi.fn(() => ({
        abort: vi.fn(),
        signal: { aborted: true },
      })) as any

      ;(global.fetch as any).mockRejectedValueOnce({
        name: 'AbortError',
        message: 'The operation was aborted',
      })

      await expect(
        ocrDocument(input, mockLogger, undefined, { timeoutMs: 1000, maxRetries: 0 })
      ).rejects.toThrow(OcrTimeoutError)

      global.AbortController = originalAbortController
    })
  })

  describe('Pre-signed URL Generation', () => {
    it('should create pre-signed URL successfully', async () => {
      const mockStorage = {
        from: vi.fn(() => ({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: 'https://example.com/signed-url' },
            error: null,
          }),
        })),
      }

      const url = await createPreSignedUrl(
        mockStorage,
        'user123/account456/file.pdf',
        900,
        mockLogger
      )

      expect(url).toBe('https://example.com/signed-url')
      expect(mockLogger.info).toHaveBeenCalledWith(
        'OCR:PRESIGNED_URL',
        'Pre-signed URL created',
        expect.any(Object),
        undefined
      )
    })

    it('should handle pre-signed URL generation errors', async () => {
      const mockStorage = {
        from: vi.fn(() => ({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Permission denied' },
          }),
        })),
      }

      await expect(
        createPreSignedUrl(mockStorage, 'invalid/path.pdf', 900, mockLogger)
      ).rejects.toThrow('Failed to create pre-signed URL')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'OCR:PRESIGNED_URL',
        'Failed to create pre-signed URL',
        expect.any(Object),
        undefined
      )
    })
  })

  describe('Response Validation', () => {
    it('should validate OCR response structure', async () => {
      const input: OcrInput = {
        kind: 'document_url',
        url: 'https://example.com/doc.pdf',
      }

      const validResponse = {
        pages: [{ index: 0, markdown: 'Content' }],
        model: 'mistral-ocr-latest',
        usage_info: { pages_processed: 1 },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => validResponse,
      })

      const result = await ocrDocument(input, mockLogger)
      expect(result).toEqual(validResponse)
    })

    it('should reject invalid response structure', async () => {
      const input: OcrInput = {
        kind: 'document_url',
        url: 'https://example.com/doc.pdf',
      }

      const invalidResponse = {
        // Missing pages array
        model: 'mistral-ocr-latest',
        usage_info: { pages_processed: 1 },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse,
      })

      await expect(ocrDocument(input, mockLogger)).rejects.toThrow('pages is not an array')
    })
  })
})

