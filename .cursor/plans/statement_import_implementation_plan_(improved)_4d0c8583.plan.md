---
name: Statement Import Implementation Plan (Improved)
overview: Comprehensive implementation plan for statement-based transaction import feature with improvements from full stack dev, UX design, and product perspectives. Includes all missing TODOs and implementation details.
todos:
  - id: phase0-foundations
    content: "Phase 0: Create transactions and statement_imports tables with RLS policies, implement deduplication service, add feature flags, create Zod contracts, add transaction_reference field, implement file hash service, add account type constraint"
    status: pending
  - id: phase1-account-creation
    content: "Phase 1: Implement account creation modal with AccountForm component, post-create prompt component, add currency field migration, wire up transactions repository, create account type dropdown with PRD values"
    status: pending
    dependencies:
      - phase0-foundations
  - id: phase2-upload
    content: "Phase 2: Create storage bucket with RLS policies, extend FileUpload for PDF/images, implement upload API, create StatementImport repository, add upload progress component, comprehensive error handling, client-side file validation"
    status: pending
    dependencies:
      - phase1-account-creation
  - id: phase3-deterministic
    content: "Phase 3: Implement PDF text extraction, deterministic parser, schema validation, review screen with empty state, import commit logic with database transactions, parsing progress component, error boundary, quick fix validation"
    status: pending
    dependencies:
      - phase2-upload
  - id: phase4-ocr-ai
    content: "Phase 4: Implement OCR provider abstraction, LLM router, document extraction pipeline, confidence scoring, import summaries, prompt versioning system, environment variable management, cost tracking, confidence visualization, model selection logic"
    status: pending
    dependencies:
      - phase3-deterministic
  - id: phase5-reupload
    content: "Phase 5: Support multiple imports per account, import history view with status badges, re-upload detection, historical backfill, delete import batch functionality, import details modal"
    status: pending
    dependencies:
      - phase4-ocr-ai
  - id: phase6-hardening
    content: "Phase 6: Add metrics/logging, circuit breakers, admin tooling, user import history, file deletion verification, scheduled cleanup job, rate limiting middleware, analytics events, user feedback widget, help documentation"
    status: pending
    dependencies:
      - phase5-reupload
  - id: todo-1767247044176-1ttsfjd0s
    content: "Review changes and clean up any potential bugs and poor quality prior to production builds. "
    status: pending
---

# Statement Import Implementation Plan (Improved)

## Summary of Improvements

This plan has been enhanced with:

1. **Full Stack Dev Perspective**: Added database transaction handling, error recovery, background job infrastructure details, file storage cleanup, rate limiting, API key security, performance optimizations, and security enhancements.
2. **UX Design Perspective**: Added loading states, empty states, error states, success feedback, accessibility considerations, mobile responsiveness, help text, and validation feedback.
3. **Product Perspective**: Added success metrics implementation, user onboarding, feature announcement, support escalation, A/B testing framework, and user research plan.
4. **Critical Missing TODOs**: Expanded each phase with additional tasks covering all implementation details.

## Key Additions

### Database Schema Improvements

- Added `transaction_reference` field to transactions table (PRD requirement)
- Added comprehensive RLS policies for both tables
- Added indexes for performance (status filtering, reference lookups)
- Added account type constraint validation

### Error Handling & Recovery

- Comprehensive error states for all failure modes
- Retry logic for transient failures
- Error boundaries for review screen
- Validation for quick fixes

### Security & Performance

- File type validation (MIME + extension)
- Server-side file size limits
- Rate limiting per user/IP
- Batch transaction inserts
- Lazy loading for review screen

### UX Enhancements

- Skeleton loaders during parsing
- Empty states for all screens
- Success animations/notifications
- Accessibility (keyboard nav, screen readers)
- Mobile responsiveness
- Help documentation

### Product Features

- Success metrics tracking
- User feedback widget
- Analytics events