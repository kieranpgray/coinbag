/**
 * Statement Import Service
 * 
 * Orchestrates the complete statement import flow:
 * 1. Extract text from PDF/image
 * 2. Parse transactions deterministically
 * 3. Validate transactions
 * 4. Commit to database
 */

import { extractTextFromFile } from './pdfExtraction';
import { parseStatementText, convertToTransactionCreate } from './deterministicParser';
import { createTransactionsRepository } from '@/data/transactions/repo';
import { createStatementImportsRepository } from '@/data/statementImports/repo';
import { removeDuplicates } from './deduplication';
import type { TransactionCreate, TransactionEntity } from '@/contracts/transactions';
import { logger, getCorrelationId } from './logger';

export interface ImportProgress {
  stage: 'extracting' | 'parsing' | 'validating' | 'committing';
  progress: number; // 0-100
  message?: string;
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  failedCount: number;
  transactions?: TransactionEntity[];
  errors?: string[];
}

export interface StatementImportOptions {
  accountId: string;
  statementImportId: string;
  file: File;
  getToken: () => Promise<string | null>;
  onProgress?: (progress: ImportProgress) => void;
}

/**
 * Process and import a statement file
 */
export async function processStatementImport(
  options: StatementImportOptions
): Promise<ImportResult> {
  const correlationId = getCorrelationId();
  const { accountId, statementImportId, file, getToken, onProgress } = options;

  try {
    // Update status to processing
    const statementRepo = await createStatementImportsRepository();
    await statementRepo.update(
      statementImportId,
      { status: 'processing' },
      getToken
    );

    // Step 1: Extract text
    onProgress?.({
      stage: 'extracting',
      progress: 10,
      message: 'Extracting text from statement...',
    });

    let text: string;
    try {
      text = await extractTextFromFile(file);
      logger.info(
        'IMPORT:STATEMENT',
        'Text extracted from statement',
        { statementImportId, textLength: text.length },
        correlationId || undefined
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to extract text';
      await statementRepo.update(
        statementImportId,
        {
          status: 'failed',
          errorMessage,
        },
        getToken
      );
      return {
        success: false,
        importedCount: 0,
        failedCount: 0,
        errors: [errorMessage],
      };
    }

    // Step 2: Parse transactions
    onProgress?.({
      stage: 'parsing',
      progress: 40,
      message: 'Parsing transactions...',
    });

    const parseResult = parseStatementText(text);
    
    if (parseResult.errors.length > 0 && parseResult.transactions.length === 0) {
      await statementRepo.update(
        statementImportId,
        {
          status: 'failed',
          errorMessage: parseResult.errors.join('; '),
          parsingMethod: 'deterministic',
        },
        getToken
      );
      return {
        success: false,
        importedCount: 0,
        failedCount: 0,
        errors: parseResult.errors,
      };
    }

    // Step 3: Convert to TransactionCreate format
    onProgress?.({
      stage: 'validating',
      progress: 60,
      message: 'Validating transactions...',
    });

    let transactions = convertToTransactionCreate(
      parseResult.transactions,
      accountId,
      statementImportId
    );

    // Remove duplicates
    const existingTransactions = await getExistingTransactions(accountId, getToken);
    const allTransactions = [...existingTransactions, ...transactions];
    const uniqueTransactions = removeDuplicates(
      allTransactions.map(t => ({
        ...t,
        id: 'temp',
        userId: 'temp',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
    ).filter(t => !existingTransactions.some(et => 
      et.transactionReference && 
      et.transactionReference === t.transactionReference &&
      et.date === t.date
    ));

    transactions = uniqueTransactions.filter(t => 
      !t.id || t.id === 'temp'
    ) as TransactionCreate[];

    // Update statement import with parsing results
    await statementRepo.update(
      statementImportId,
      {
        status: 'review',
        parsingMethod: 'deterministic',
        totalTransactions: transactions.length,
        metadata: {
          warnings: parseResult.warnings,
          errors: parseResult.errors,
        },
      },
      getToken
    );

    onProgress?.({
      stage: 'validating',
      progress: 80,
      message: `Found ${transactions.length} transactions`,
    });

    // Return transactions for review (commit happens separately)
    return {
      success: true,
      importedCount: 0, // Not committed yet
      failedCount: 0,
      errors: parseResult.errors.length > 0 ? parseResult.errors : undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      'IMPORT:STATEMENT',
      'Failed to process statement import',
      { error: errorMessage, statementImportId },
      correlationId || undefined
    );

    const statementRepo = await createStatementImportsRepository();
    await statementRepo.update(
      statementImportId,
      {
        status: 'failed',
        errorMessage,
      },
      getToken
    );

    return {
      success: false,
      importedCount: 0,
      failedCount: 0,
      errors: [errorMessage],
    };
  }
}

/**
 * Commit transactions to database
 */
export async function commitTransactions(
  transactions: TransactionCreate[],
  statementImportId: string,
  getToken: () => Promise<string | null>
): Promise<ImportResult> {
  const correlationId = getCorrelationId();
  const transactionsRepo = await createTransactionsRepository();
  const statementRepo = await createStatementImportsRepository();

  try {
    // Update status to processing
    await statementRepo.update(
      statementImportId,
      { status: 'processing' },
      getToken
    );

    // Batch insert transactions
    const result = await transactionsRepo.createBatch(transactions, getToken);

    if (result.error) {
      await statementRepo.update(
        statementImportId,
        {
          status: 'failed',
          errorMessage: result.error.error,
          failedTransactions: transactions.length,
        },
        getToken
      );

      return {
        success: false,
        importedCount: 0,
        failedCount: transactions.length,
        errors: [result.error.error],
      };
    }

    const importedTransactions = result.data || [];

    // Update statement import with completion
    await statementRepo.update(
      statementImportId,
      {
        status: 'completed',
        importedTransactions: importedTransactions.length,
        failedTransactions: transactions.length - importedTransactions.length,
        completedAt: new Date().toISOString(),
      },
      getToken
    );

    logger.info(
      'IMPORT:STATEMENT',
      'Transactions committed successfully',
      {
        statementImportId,
        importedCount: importedTransactions.length,
        totalCount: transactions.length,
      },
      correlationId || undefined
    );

    return {
      success: true,
      importedCount: importedTransactions.length,
      failedCount: transactions.length - importedTransactions.length,
      transactions: importedTransactions,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      'IMPORT:STATEMENT',
      'Failed to commit transactions',
      { error: errorMessage, statementImportId },
      correlationId || undefined
    );

    await statementRepo.update(
      statementImportId,
      {
        status: 'failed',
        errorMessage,
        failedTransactions: transactions.length,
      },
      getToken
    );

    return {
      success: false,
      importedCount: 0,
      failedCount: transactions.length,
      errors: [errorMessage],
    };
  }
}

/**
 * Get existing transactions for an account (for deduplication)
 */
async function getExistingTransactions(
  accountId: string,
  getToken: () => Promise<string | null>
): Promise<TransactionEntity[]> {
  try {
    const transactionsRepo = await createTransactionsRepository();
    const result = await transactionsRepo.list(accountId, getToken);
    return result.data || [];
  } catch {
    return [];
  }
}

