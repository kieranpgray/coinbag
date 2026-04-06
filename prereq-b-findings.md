# Prerequisite B — CSV Import Support Check

## 1. Verdict

**CSV is NOT supported.**

Neither the Edge Function nor the upload UI accept CSV files. The entire statement processing pipeline is OCR-based (Mistral OCR API), designed exclusively for PDFs and images (JPEG/PNG).

---

## 2. Evidence from Edge Function

**File:** `supabase/functions/process-statement/index.ts`

The function header describes the workflow explicitly:

> 1. Download file from Supabase Storage  
> 2. Extract text using **Mistral OCR API**  
> 3. Structure data from markdown using Mistral Chat API  
> 4. Validate transactions against OCR content  
> 5. Update database with results

The OCR service interface (`supabase/functions/process-statement/ocr-service.ts`) only accepts:
- `kind: 'document_url'` — a pre-signed URL pointing to a file in Supabase Storage (used for PDFs/images)
- `kind: 'base64_pdf'` — raw base64-encoded PDF content

There is **zero CSV parsing logic** anywhere in the Edge Function. No `text/csv` MIME type handling, no CSV parsing libraries, no branch for structured file formats. A CSV uploaded to storage would be passed to the Mistral OCR API which would fail or return nonsensical output, as OCR is designed for document images/PDFs, not delimited text.

---

## 3. Evidence from Upload UI

**File:** `src/components/shared/MultiStatementFileUpload.tsx`

```
accept = '.pdf,.jpg,.jpeg,.png'   // default prop value (line 38)
```

MIME type validation (lines 65–77) explicitly allows only:
```
'application/pdf'
'image/jpeg'
'image/jpg'
'image/png'
```

Error shown to users when an invalid type is dropped/selected:
> `"Invalid file type. Please upload a PDF or image (JPEG/PNG)"`

UI copy on the drop zone (line 249):
> `"Supports PDF, JPEG, PNG (max 10MB per file)"`

**File:** `src/features/accounts/components/StatementUploadStep.tsx` (line 324):
> `"Upload PDF or image statements for [accountName] to import transactions."`

No CSV mentioned anywhere in the upload UI layer.

---

## 4. Trust Strip to Use

```
PDF supported · Processed securely · Never shared
```

---

## 5. Spec Flag

> **Spec discrepancy:** The spec copy states "PDF and CSV supported" but the product currently only supports PDF (and image) uploads. CSV parsing is not implemented in the Edge Function or the UI. This copy must not ship as-is — either remove CSV from the claim or implement CSV support before launch.
