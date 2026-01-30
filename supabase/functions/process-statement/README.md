# Process Statement Edge Function

This Supabase Edge Function handles the complete statement import workflow:

1. Downloads files from Supabase Storage
2. Extracts structured JSON data using Mistral OCR with schema guidance
3. Processes transactions from structured data
4. Updates database with results

## Deployment

### Prerequisites

1. **Supabase CLI installed**: `npm install -g supabase`
2. **Project linked**: `supabase link --project-ref your-project-ref`
3. **Environment variables set** in Supabase Dashboard → Edge Functions → Environment variables:

```bash
MISTRAL_API_KEY=your_mistral_api_key_here
SUPABASE_ANON_KEY=your_anon_key  # Required - used with JWT to enforce RLS on all operations
SUPABASE_URL=https://your-project.supabase.co
```

**Important**: 
- `SUPABASE_ANON_KEY` is **required** - the function uses anon key + user JWT to respect RLS policies on all database operations
- **No service role key needed** - the function uses PostgREST REST API directly with anon key + JWT, which respects RLS and avoids schema cache issues
- All database operations (transactions table) use REST API endpoints that automatically enforce RLS policies
- This approach is more secure than using service role key, as RLS policies are automatically enforced by Supabase

### Deploy Function

```bash
# Deploy this specific function
supabase functions deploy process-statement

# Or deploy all functions
supabase functions deploy
```

### Test Function

```bash
# Test with curl (requires valid Clerk JWT token)
curl -X POST 'https://your-project.supabase.co/functions/v1/process-statement' \
  -H 'Authorization: Bearer <clerk-jwt-token>' \
  -H 'Content-Type: application/json' \
  -d '{"statementImportId": "your-import-id"}'
```

**Note**: The Authorization header must contain a valid Clerk JWT token. The function uses this token with the anon key to enforce RLS policies.

## Architecture

### Processing Flow

```
Client Upload → Supabase Storage → Edge Function Trigger → Processing → Database Update → Real-time Updates
```

### Processing Strategy

1. **Mistral Document AI OCR** (primary method)
   - Uses official Mistral OCR API (`POST /v1/ocr`) with `mistral-ocr-latest` model
   - Extracts markdown from PDF pages with headers/footers
   - Tables extracted as markdown tables
   - High accuracy (95%+ based on testing)
   - Pre-signed URL support for secure private file access
   - Retry logic with exponential backoff (max 2 retries)
   - Circuit breaker protection for reliability

2. **Mistral Chat Completions** (structuring step)
   - Structures OCR markdown into JSON using `mistral-large-latest`
   - Uses JSON schema mode for reliable extraction
   - Extracts account info, statement period, balances, and transactions

3. **Fallback: PDF.js + Simple Parser** (if Mistral OCR fails)
   - PDF.js extracts text from text-based PDFs
   - Basic regex-based parsing for emergency fallback
   - Lower accuracy but ensures functionality
   - Used only when OCR extraction fails

### Error Handling

- **Rate limiting**: 10 statements per user per hour
- **Circuit breaker**: Prevents cascade failures when Mistral is down
- **Caching**: Reuses results for duplicate files (by hash)
- **Timeout handling**: Prevents hanging requests

### Security

- **RLS enforcement**: Uses anon key + user JWT token to automatically enforce Row Level Security policies
  - Database queries respect RLS - users can only access their own data
  - Storage downloads respect storage RLS - users can only download their own files
  - No manual ownership verification needed - RLS handles it at the database layer
- **Defense in depth**: Even if application code has bugs, RLS prevents unauthorized access
- **File access control**: Storage RLS policies ensure users can only access files in their own folder
- **API key protection**: Keys stored in Supabase secrets (never exposed to client)
- **Input validation**: Sanitizes all inputs
- **Service role fallback**: Service role key only used as emergency fallback for storage (should be rare)

## Cost Optimization

### Features

- **File deduplication**: Same file processed only once
- **Smart fallback**: Uses free methods when possible
- **Rate limiting**: Prevents abuse
- **Caching**: Avoids re-processing identical files

### Cost Estimates

- **Primary processing**: All statements use Mistral OCR (~$1 per 1,000 pages)
- **Cost optimization**: File hash deduplication prevents re-processing
- **Expected savings**: 30-50% through caching of duplicate uploads
- **Reliability premium**: Structured extraction eliminates parsing errors

## Monitoring

### Logs

Check function logs in Supabase Dashboard → Edge Functions → process-statement → Logs

### Metrics

Monitor these metrics:
- Processing success rate
- Average processing time
- Mistral OCR usage/costs
- Circuit breaker status
- Rate limiting hits

## OCR Service Architecture

The Edge Function uses a dedicated OCR service module (`ocr-service.ts`) that:

- **Reuses existing infrastructure**: Logger, circuit breaker, correlation IDs
- **Provides clean interface**: `ocrDocument()` function with typed inputs/outputs
- **Handles errors gracefully**: Categorized error types (auth, rate-limit, timeout, validation)
- **Supports multiple input types**: Pre-signed URLs (recommended) or base64 PDFs
- **Includes retry logic**: Exponential backoff for transient failures
- **Validates inputs/outputs**: Type-safe validation at boundaries

### OCR Processing Flow

```
1. Generate pre-signed URL from Supabase Storage (15 min expiry)
2. Call Mistral OCR API with pre-signed URL
3. Extract markdown from OCR response pages (with headers/footers)
4. Pass markdown to Mistral Chat Completions for JSON structuring
5. Store structured transactions in database
6. Frontend displays transactions from database
```

## Error Handling

### Error Types

The OCR service categorizes errors for better handling:

- **OcrAuthError**: Authentication failures (invalid API key)
  - No fallback - requires configuration fix
- **OcrRateLimitError**: Rate limit exceeded
  - Automatically falls back to PDF.js extraction
- **OcrTimeoutError**: Request timeout (default 60s)
  - Automatically falls back to PDF.js extraction
- **OcrValidationError**: Invalid input parameters
  - No fallback - requires input fix

### Fallback Chain

1. **Mistral OCR** → Primary method (highest accuracy)
2. **PDF.js extraction** → Fallback for text-based PDFs
3. **Simple parser** → Emergency fallback (lowest accuracy)

## Debugging Guide

### Correlation IDs

All log entries include correlation IDs for tracing requests through the system. Use the correlation ID to filter logs for a specific request.

### Performance Metrics

Look for log entries with `duration` fields:

- `OCR:PRESIGNED_URL` - Time to generate pre-signed URL (typically <100ms)
- `OCR:API_CALL` - Time for Mistral OCR API call (typically 5-30s depending on PDF size)
- `OCR:SUCCESS` - Total OCR processing time
- `STATEMENT:OCR_EXTRACT` - Time to extract markdown from OCR pages
- `STATEMENT:MISTRAL_CHAT` - Time for chat completions structuring

### Request/Response Sizes

Monitor `requestBodySize` and `responseSize` in logs for large payloads. Large PDFs (>10MB) may require:
- Page selection (process specific pages only)
- Increased timeout
- File size limits

### Retry Attempts

Check `attempt` field in logs to see retry behavior:
- `attempt: 1` - First attempt
- `attempt: 2` - First retry (after 1s backoff)
- `attempt: 3` - Second retry (after 2s backoff)

### Log Event Codes

- `OCR:CONFIG` - Configuration issues (missing API key)
- `OCR:VALIDATION` - Input/output validation
- `OCR:PRESIGNED_URL` - Pre-signed URL generation
- `OCR:API_CALL` - OCR API call initiation
- `OCR:API_SUCCESS` - Successful OCR API call
- `OCR:API_ERROR` - OCR API error response
- `OCR:TIMEOUT` - Request timeout
- `OCR:RETRY` - Retry attempt
- `OCR:FAILED` - All retries exhausted
- `OCR:SUCCESS` - Complete OCR processing success
- `OCR:ERROR` - OCR processing failure
- `STATEMENT:OCR_EXTRACT` - Markdown extraction from OCR pages
- `STATEMENT:OCR_PAGE` - Individual page processing

## Troubleshooting

### Common Issues

1. **OcrAuthError** (`OCR:AUTH_FAILED`)
   - **Cause**: Invalid or missing `MISTRAL_API_KEY`
   - **Solution**: Check Edge Function environment variables in Supabase Dashboard
   - **No Fallback**: Auth errors won't be fixed by retry

2. **OcrRateLimitError** (`OCR:RATE_LIMIT`)
   - **Cause**: Mistral API rate limit exceeded
   - **Solution**: Wait for retry-after period, or check API tier limits
   - **Fallback**: Automatically falls back to PDF.js extraction

3. **OcrTimeoutError** (`OCR:TIMEOUT`)
   - **Cause**: OCR request exceeded timeout (default 60s)
   - **Solution**: 
     - Increase timeout for large PDFs: `ocrDocument(input, logger, correlationId, { timeoutMs: 120000 })`
     - Use page selection: `pages: [0, 1, 2]` to process specific pages
   - **Fallback**: Automatically falls back to PDF.js extraction

4. **OcrValidationError** (`OCR:VALIDATION`)
   - **Cause**: Invalid input (URL format, file size, page numbers)
   - **Solution**: Check input parameters, validate file size before upload
   - **No Fallback**: Validation errors indicate configuration issues

5. **Pre-signed URL Generation Failure** (`OCR:PRESIGNED_URL`)
   - **Cause**: Storage bucket permissions or RLS policy issues
   - **Solution**: 
     - Verify storage bucket exists: `statements` bucket
     - Check RLS policies allow user access
     - Verify file path is correct
   - **No Fallback**: Required for OCR processing

6. **"Circuit breaker is open"**
   - **Cause**: Too many consecutive OCR failures (5 failures)
   - **Solution**: Wait 1 minute for circuit breaker to reset
   - **Fallback**: Function will automatically fall back to PDF.js

7. **"Rate limit exceeded"** (user rate limit)
   - **Cause**: User has uploaded too many statements recently (10 per hour)
   - **Solution**: Wait before retrying
   - **Note**: This is different from Mistral API rate limits

8. **Processing fails with "No transactions found"**
   - **Cause**: OCR extraction succeeded but no transactions detected
   - **Solution**: 
     - Check if PDF contains transaction data
     - Verify PDF is not corrupted
     - Check logs for OCR extraction quality

### Debugging Steps

1. **Check correlation ID**: Filter logs by correlation ID to trace a specific request
2. **Review performance metrics**: Check `duration` fields to identify bottlenecks
3. **Examine error logs**: Look for `OCR:ERROR` or `STATEMENT:EXTRACT` events
4. **Verify API key**: Check `OCR:CONFIG` logs for API key issues
5. **Check retry behavior**: Look for `OCR:RETRY` logs to see retry attempts
6. **Review fallback chain**: Check if PDF.js fallback was used (`STATEMENT:EXTRACT` logs)

### Performance Tuning

- **Timeout configuration**: Increase `timeoutMs` for large PDFs (>50 pages)
- **Page selection**: Use `pages: [0, 1, 2]` to process only specific pages
- **Retry configuration**: Adjust `maxRetries` (default: 2) for unreliable networks
- **File size limits**: Consider enforcing file size limits before upload (recommended: <10MB)
