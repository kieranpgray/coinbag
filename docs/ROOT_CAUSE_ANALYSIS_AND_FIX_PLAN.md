# Root Cause Analysis and Fix Plan

## Problem Summary

Edge function logs show two critical errors preventing statement processing:

1. **Mistral OCR API 422 Error**: "Extra inputs are not permitted" for `document_annotation_format.name` and `document_annotation_format.schema_definition`
2. **PDF.js Runtime Error**: "DOMMatrix is not defined" - browser API incompatibility in Deno edge functions

## Root Cause Analysis

### Issue 1: Mistral OCR API Schema Change

**Error Details:**
```
422 Unprocessable Entity
"Extra inputs are not permitted" for:
- document_annotation_format.name
- document_annotation_format.schema_definition
```

**Root Cause:**
- The Mistral OCR API schema has changed
- The current code sends `document_annotation_format` with `name` and `schema_definition` fields
- The API no longer accepts these fields in this format (or the format has changed)
- This is a breaking API change that requires updating the request format

**Current Code (ocr-service.ts:229-234):**
```typescript
...(input.documentAnnotationFormat && {
  document_annotation_format: {
    name: input.documentAnnotationFormat.name,
    schema_definition: input.documentAnnotationFormat.schema
  }
}),
```

**Investigation Needed:**
1. Check Mistral OCR API documentation for current schema format
2. Verify if structured extraction is still supported
3. Determine correct field names and structure
4. Test with minimal request to understand API expectations

### Issue 2: PDF.js Browser API Incompatibility

**Error Details:**
```
WARN STATEMENT:EXTRACT: pdfjs-dist failed { error: "DOMMatrix is not defined" }
```

**Root Cause:**
- PDF.js (`pdfjs-dist`) is designed for browser environments
- It requires browser APIs like `DOMMatrix`, `DOMParser`, `Canvas`, etc.
- Deno edge functions run in a serverless environment without these APIs
- This is a fundamental architectural incompatibility

**Current Code (index.ts:185-224):**
- Imports `pdfjs-dist` from CDN
- Attempts to use it as fallback when Mistral OCR fails
- Fails immediately due to missing browser APIs

**Impact:**
- Fallback mechanism is completely broken
- When Mistral OCR fails, the entire processing fails
- No alternative extraction method available

## Fix Plan

### Phase 1: Investigate Mistral OCR API Schema (Priority: CRITICAL)

**Goal:** Understand the correct API format for structured extraction

**Tasks:**
1. **Research Current API Documentation**
   - Check Mistral AI official documentation for OCR API
   - Look for recent API changes or migration guides
   - Verify if `document_annotation_format` is still supported
   - Check for alternative methods for structured extraction

2. **Test API with Minimal Request**
   - Create a test script to call Mistral OCR API directly
   - Test without `document_annotation_format` first (basic OCR)
   - Test with different schema formats if structured extraction is needed
   - Document the correct request format

3. **Check API Response Format**
   - Verify if structured data is returned in `document_annotation` field
   - Check if we need to use a different approach (e.g., chat completions after OCR)
   - Understand if schema-based extraction is still available

**Deliverables:**
- Documented correct API request format
- Test results showing working API calls
- Decision on whether to use structured extraction or post-process OCR results

### Phase 2: Fix Mistral OCR API Integration (Priority: CRITICAL)

**Goal:** Update code to use correct API format

**Tasks:**
1. **Update Request Format**
   - Modify `ocr-service.ts` to use correct field names/structure
   - Remove or correct `document_annotation_format` fields
   - Ensure request matches current API expectations

2. **Handle Two Scenarios:**
   - **Scenario A:** Structured extraction still supported (different format)
     - Update to use correct schema format
   - **Scenario B:** Structured extraction removed
     - Extract raw markdown from OCR
     - Use Mistral Chat API to structure the data (two-step process)
     - Or use local parsing logic on markdown

3. **Update Error Handling**
   - Remove retries for 422 errors (schema errors won't be fixed by retry)
   - Provide clear error messages for API schema issues
   - Log the actual API response for debugging

**Deliverables:**
- Updated `ocr-service.ts` with correct API format
- Working Mistral OCR integration
- Clear error messages for API issues

### Phase 3: Remove PDF.js Fallback (Priority: HIGH)

**Goal:** Remove incompatible fallback and implement proper error handling

**Tasks:**
1. **Remove PDF.js Code**
   - Remove `extractTextWithPdfJs` function
   - Remove all PDF.js imports and dependencies
   - Remove fallback logic that calls PDF.js

2. **Update Error Handling**
   - When Mistral OCR fails, provide clear user feedback
   - Don't attempt fallback that will definitely fail
   - Update error messages to explain OCR is required

3. **Consider Alternative Fallbacks (Future)**
   - Document that PDF.js is not viable in edge functions
   - Consider server-side PDF parsing service if needed
   - Or accept that OCR is required for all PDFs

**Deliverables:**
- Removed PDF.js code
- Updated error handling
- Clear user-facing error messages

### Phase 4: Improve Error Handling and User Experience (Priority: MEDIUM)

**Goal:** Provide better feedback when processing fails

**Tasks:**
1. **Categorize Errors**
   - API schema errors (422) - configuration issue
   - API auth errors (401) - credential issue
   - API rate limit (429) - temporary issue
   - API timeout - resource limit issue
   - File format errors - user issue

2. **User-Friendly Error Messages**
   - Translate technical errors to user-friendly messages
   - Provide actionable guidance (e.g., "Check API key", "Try again later")
   - Log technical details for debugging

3. **Status Updates**
   - Ensure `statement_imports.status` is set correctly
   - Include helpful `error_message` for users
   - Update `metadata` with error details for debugging

**Deliverables:**
- Improved error categorization
- User-friendly error messages
- Better status tracking

### Phase 5: Testing and Validation (Priority: HIGH)

**Goal:** Verify fixes work with real statements

**Tasks:**
1. **Test Mistral OCR Integration**
   - Upload a test statement
   - Verify OCR extraction works
   - Verify structured data is extracted correctly
   - Check that transactions are validated properly

2. **Test Error Scenarios**
   - Test with invalid API key
   - Test with corrupted PDF
   - Test with unsupported file format
   - Verify error messages are helpful

3. **Monitor Production**
   - Check edge function logs after deployment
   - Verify no more 422 errors
   - Verify no more PDF.js errors
   - Monitor success rate

**Deliverables:**
- Test results showing successful processing
- Verified error handling
- Production monitoring plan

## Implementation Order

1. **Phase 1** - Investigate API (blocks everything else)
2. **Phase 2** - Fix API integration (critical for functionality)
3. **Phase 3** - Remove PDF.js (prevents false fallback attempts)
4. **Phase 4** - Improve errors (better UX)
5. **Phase 5** - Test and validate (ensure it works)

## Success Criteria

- ✅ Mistral OCR API calls succeed (no 422 errors)
- ✅ Structured data extraction works correctly
- ✅ No PDF.js errors in logs
- ✅ Clear error messages when processing fails
- ✅ Statement processing succeeds for valid PDFs
- ✅ Error handling provides actionable feedback

## Risks and Mitigation

**Risk 1:** Mistral API no longer supports structured extraction
- **Mitigation:** Implement two-step process (OCR → Chat API for structuring)

**Risk 2:** API documentation is unclear or outdated
- **Mitigation:** Test directly with API, check response formats, contact Mistral support if needed

**Risk 3:** Removing PDF.js leaves no fallback
- **Mitigation:** Accept that OCR is required, provide clear error messages, consider alternative services if needed

## Next Steps

1. Start with Phase 1 - investigate current Mistral OCR API format
2. Test API calls directly to understand correct format
3. Update code based on findings
4. Remove PDF.js fallback
5. Test with real statements
6. Deploy and monitor



