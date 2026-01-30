# Root Cause Analysis: Transaction Loss at Extraction Step

## Critical Finding

**The loss occurs at the `extractTransactionSections()` function (lines 1014-1120), NOT at validation.**

The function filters the OCR markdown to only include "transaction-relevant sections" before sending to Chat API. This filtering is **too aggressive** and is removing 37 of 43 transactions.

---

## The Problem

### Current Flow

1. **OCR Extraction**: OCR extracts full markdown from PDF ✅ (likely has all 43 transactions)
2. **`extractTransactionSections()`**: Filters markdown to only include lines matching transaction patterns ❌ **LOSS HERE**
3. **Chat API**: Receives filtered markdown, extracts 6 transactions ✅ (correctly extracts what it receives)
4. **Validation**: All 6 transactions pass validation ✅ (no further loss)

### Why `extractTransactionSections()` is Too Aggressive

The function (lines 1014-1120) uses this pattern to identify transaction rows:

```typescript
const transactionRowPattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2}).*(\$\d+\.\d{2}|-\$\d+\.\d{2}|\d+\.\d{2})|(\$\d+\.\d{2}|-\$\d+\.\d{2}|\d+\.\d{2}).*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/
```

**Problems with this pattern**:
1. Requires date AND amount on the same line
2. Doesn't handle multi-line transaction entries (common in ANZ statements)
3. Doesn't handle transactions split across multiple lines
4. May not match all date formats used in ANZ statements
5. May not match all amount formats (e.g., amounts with "CR" suffix)

### Evidence from Logs

- `transactionCount: 6` - Chat API only received 6 transactions worth of markdown
- `validatedTransactionsCount: 6, filteredOutCount: 0` - All 6 passed validation
- `validationDuration: 0` - Validation was very fast (or skipped) because only 6 transactions

---

## The Fix

### Option 1: Disable `extractTransactionSections()` for Small Statements (Recommended)

For statements with < 20k characters, send the full markdown to Chat API instead of filtering:

```typescript
// Only use extractTransactionSections for very large statements (> 50k chars)
const shouldFilter = originalMarkdownLength > 50000
const transactionMarkdown = shouldFilter 
  ? extractTransactionSections(allMarkdownText)
  : allMarkdownText // Send full markdown for small/medium statements
```

### Option 2: Improve `extractTransactionSections()` Pattern

Make the pattern more lenient to catch multi-line entries and various formats:

```typescript
// More lenient pattern that handles:
// - Multi-line entries
// - Various date formats
// - Amounts with CR/DR suffixes
// - Split across lines
```

### Option 3: Use Chunking for All Statements

Force chunking for statements with > 10 transactions, regardless of size:

```typescript
// Estimate transaction count from OCR
const estimatedTransactionCount = potentialTransactionLines.length
const isLargeStatement = pagesCount >= 10 || 
                         originalMarkdownLength > 20000 || 
                         estimatedTransactionCount > 20
```

---

## Recommended Solution

**Use Option 1 + Option 3 combined**:

1. For small statements (< 20k chars), send full markdown (no filtering)
2. For medium statements (20k-50k chars), use improved filtering OR chunking
3. For large statements (> 50k chars), use chunking

This ensures:
- Small statements: Full markdown → Chat API extracts all transactions
- Medium statements: Better filtering or chunking → More transactions preserved
- Large statements: Chunking → All chunks processed

---

## Why My Previous Fix Didn't Help

My fix (transaction type inference + lenient credit validation) **cannot help** because:

1. Transactions are lost **before** validation
2. Only 6 transactions make it to validation
3. All 6 transactions pass validation (0 filtered out)

**The fix is in the wrong place** - we need to fix the extraction step, not validation.

---

## Next Steps

1. **Immediate Fix**: Disable `extractTransactionSections()` for statements < 20k chars
2. **Verify**: Check CHECKPOINT 1 logs to see if OCR has all 43 transactions
3. **Test**: Upload PDF again and verify all 43 transactions are extracted
4. **Monitor**: Check CHECKPOINT 2 and 3 logs to see what Chat API receives/returns


