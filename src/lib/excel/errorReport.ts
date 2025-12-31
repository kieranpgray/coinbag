import * as XLSX from 'xlsx';
import type { ImportResult } from '@/features/import/types';

/**
 * Generate error report Excel file
 */
export function generateErrorReport(result: ImportResult): Blob {
  const workbook = XLSX.utils.book_new();

  // Create errors sheet
  const errorData = [
    ['Row Number', 'Entity Type', 'Field', 'Error Message', 'Value'],
    ...result.errors.flatMap((error) =>
      error.fields.map((field) => [
        error.rowNumber,
        error.entityType,
        field.field,
        field.message,
        String(field.value || ''),
      ])
    ),
  ];

  const errorSheet = XLSX.utils.aoa_to_sheet(errorData);
  XLSX.utils.book_append_sheet(workbook, errorSheet, 'Errors');

  // Create duplicates sheet
  if (result.duplicates.length > 0) {
    const duplicateData = [
      ['Row Number', 'Entity Type', 'Match Reason', 'Existing ID'],
      ...result.duplicates.map((dup) => [
        dup.rowNumber,
        dup.entityType,
        dup.matchReason,
        dup.existingId,
      ]),
    ];

    const duplicateSheet = XLSX.utils.aoa_to_sheet(duplicateData);
    XLSX.utils.book_append_sheet(workbook, duplicateSheet, 'Duplicates');
  }

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
  });

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

