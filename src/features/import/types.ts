/**
 * Import feature types and interfaces
 */

export type EntityType = 'account' | 'asset' | 'liability' | 'subscription' | 'income';

export interface ParsedRow {
  rowNumber: number;
  entityType: EntityType;
  data: Record<string, unknown>;
}

export interface ParsedImportData {
  accounts: ParsedRow[];
  assets: ParsedRow[];
  liabilities: ParsedRow[];
  subscriptions: ParsedRow[];
  income: ParsedRow[];
}

export interface FieldError {
  field: string;
  message: string;
  value?: unknown;
}

export interface RowError {
  rowNumber: number;
  entityType: EntityType;
  fields: FieldError[];
  rawData: Record<string, unknown>;
}

export interface RowWarning {
  rowNumber: number;
  entityType: EntityType;
  message: string;
  rawData: Record<string, unknown>;
}

export interface DuplicateMatch {
  rowNumber: number;
  entityType: EntityType;
  existingId: string;
  matchReason: string;
  rawData: Record<string, unknown>;
}

export interface ValidationSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  warningRows: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: RowError[];
  warnings: RowWarning[];
  duplicates: DuplicateMatch[];
  summary: ValidationSummary;
}

export interface ImportProgress {
  step: ImportStep;
  current: number;
  total: number;
  entityType?: EntityType;
  message: string;
  estimatedTimeRemaining?: number; // in seconds
}

export type ImportStep =
  | 'parsing'
  | 'validating'
  | 'resolving-categories'
  | 'importing-accounts'
  | 'importing-assets'
  | 'importing-liabilities'
  | 'importing-subscriptions'
  | 'importing-income'
  | 'completed'
  | 'error';

export interface ImportOptions {
  skipDuplicates: boolean;
  dryRun: boolean;
  onProgress?: (progress: ImportProgress) => void;
}

export interface ImportResult {
  success: boolean;
  imported: {
    accounts: number;
    assets: number;
    liabilities: number;
    subscriptions: number;
    income: number;
  };
  errors: RowError[];
  duplicates: DuplicateMatch[];
  warnings: RowWarning[];
  duration: number; // in milliseconds
}

export interface BatchResult<T> {
  successes: Array<{ item: T; data: unknown }>;
  errors: Array<{ item: T; error: { error: string; code: string } }>;
}

