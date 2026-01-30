import { z } from 'zod';

/**
 * Statement Import contracts - Zod-first schemas for type-safe API communication
 * These schemas define the contract between frontend and backend for statement import data.
 */

// Validation limits
const VALIDATION_LIMITS = {
  fileName: { min: 1, max: 255 },
  filePath: { min: 1, max: 500 },
  fileHash: { min: 64, max: 64 }, // SHA-256 is 64 hex characters
  mimeType: { max: 100 },
  errorMessage: { max: 1000 },
} as const;

// Status validation
const importStatusSchema = z.enum(['pending', 'processing', 'review', 'completed', 'failed', 'cancelled']);

// Parsing method validation
const parsingMethodSchema = z.enum(['deterministic', 'ocr', 'llm']).optional().nullable();

// UUID validation
const uuidSchema = z.string().uuid('Invalid UUID format');

// File name validation
const fileNameSchema = z.string()
  .min(VALIDATION_LIMITS.fileName.min, `File name must be at least ${VALIDATION_LIMITS.fileName.min} character`)
  .max(VALIDATION_LIMITS.fileName.max, `File name must be less than ${VALIDATION_LIMITS.fileName.max} characters`)
  .trim();

// File path validation
const filePathSchema = z.string()
  .min(VALIDATION_LIMITS.filePath.min, `File path must be at least ${VALIDATION_LIMITS.filePath.min} character`)
  .max(VALIDATION_LIMITS.filePath.max, `File path must be less than ${VALIDATION_LIMITS.filePath.max} characters`)
  .trim();

// File hash validation (SHA-256)
const fileHashSchema = z.string()
  .length(VALIDATION_LIMITS.fileHash.min, `File hash must be exactly ${VALIDATION_LIMITS.fileHash.min} characters (SHA-256)`)
  .regex(/^[a-f0-9]{64}$/i, 'File hash must be a valid SHA-256 hex string');

// MIME type validation
const mimeTypeSchema = z.string()
  .max(VALIDATION_LIMITS.mimeType.max, `MIME type must be less than ${VALIDATION_LIMITS.mimeType.max} characters`)
  .trim();

// Confidence score validation (0-100)
const confidenceScoreSchema = z.number()
  .min(0, 'Confidence score must be at least 0')
  .max(100, 'Confidence score must be at most 100')
  .optional()
  .nullable();

// Correlation ID validation (optional, but recommended)
const correlationIdSchema = z.string().max(200).trim().optional();

// API request schemas
export const statementImportCreateSchema = z.object({
  accountId: uuidSchema,
  fileName: fileNameSchema,
  filePath: filePathSchema,
  fileHash: fileHashSchema,
  fileSize: z.number().int().positive('File size must be positive'),
  mimeType: mimeTypeSchema,
  correlationId: correlationIdSchema,
});

export const statementImportUpdateSchema = z.object({
  status: importStatusSchema.optional(),
  parsingMethod: parsingMethodSchema,
  totalTransactions: z.number().int().min(0).optional(),
  importedTransactions: z.number().int().min(0).optional(),
  failedTransactions: z.number().int().min(0).optional(),
  confidenceScore: confidenceScoreSchema,
  errorMessage: z.string().max(VALIDATION_LIMITS.errorMessage.max).trim().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
  completedAt: z.string().optional().nullable(),
  correlationId: correlationIdSchema,
});

// API response schemas
export const statementImportEntitySchema = z.object({
  id: z.string().uuid('Invalid statement import ID format'),
  userId: z.string().min(1, 'User ID is required'),
  accountId: z.string().uuid('Invalid account ID format'),
  fileName: fileNameSchema,
  filePath: filePathSchema,
  fileHash: fileHashSchema,
  fileSize: z.number().int().positive(),
  mimeType: mimeTypeSchema,
  status: importStatusSchema,
  parsingMethod: parsingMethodSchema,
  totalTransactions: z.number().int().min(0),
  importedTransactions: z.number().int().min(0),
  failedTransactions: z.number().int().min(0),
  confidenceScore: confidenceScoreSchema,
  errorMessage: z.string().trim().optional().nullable(),
  metadata: z.record(z.unknown()),
  correlationId: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional().nullable(),
});

export const statementImportListSchema = z.array(statementImportEntitySchema);

// Type exports for convenience
export type StatementImportCreate = z.infer<typeof statementImportCreateSchema>;
export type StatementImportUpdate = z.infer<typeof statementImportUpdateSchema>;
export type StatementImportEntity = z.infer<typeof statementImportEntitySchema>;
export type StatementImportError = {
  error: string;
  code: string;
  details?: unknown;
};

// Error codes that can be returned by the statement imports API
export const STATEMENT_IMPORT_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_FILE: 'DUPLICATE_FILE',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

