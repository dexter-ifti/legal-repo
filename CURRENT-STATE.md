# Current State

**Last updated:** 2026-08-22

## Project status

**Milestones 1, 2, 3, 4, 5, 6, 7, 8 & 9 Complete** (Identity, Multi-Tenancy, Document Ingestion, Document Understanding, Case Matching Engine, Retrieval & Search Engine, Audit & Reliability, Evaluation & Benchmarking, and Pilot Readiness).  
**Platform Status**: MVP Complete and Ready for Design-Partner Pilot Onboarding (3–5 small law offices/chambers).

A full code audit was performed on 2026-08-17; all 16 findings in `MVP-ISSUE-LOG.md` have been resolved (see issue log for per-issue fix notes).

System status:
- Docker Compose environment configured for one-command local execution (`docker compose up --build`).
- TypeScript strict typecheck passing with 0 errors across workspace (`npm run typecheck`).
- ESLint checks passing with 0 warnings or errors (`npm run lint`).
- Next.js frontend production build passing with no metadata/Browserslist warnings (`npm run build`).
- Backend test suite passing 100%: **191 passed, 0 failed** (unit + integration, `npm test`).
- Clean Git repository tree on `master` branch.

---

## Product

### Working definition

Legal document automation platform for advocates, lawyers, clerks, chambers, and small law firms.

### MVP hypothesis

> A lawyer can upload a legal document without selecting a case first, and the system can reliably identify and file it into the correct case, while asking for human help when uncertain.

### MVP wedge

Automatic case identification and filing.

### Primary success metric

Correct legal documents automatically identified and filed into the correct case.

---

## Product decisions already made

- Web-first MVP (Next.js 15 Frontend + Express TypeScript Backend)
- PDF-first legal document ingestion (`%PDF-` magic byte validated)
- Case-first data model with strict tenant isolation (`organizationId`)
- Upload First UX (Optional case selection on ingestion)
- Automatic filing as the primary platform capability
- Precision prioritized over aggressive automation
- PostgreSQL database connected via Prisma ORM v6.19
- Supabase Auth behind vendor-flexible `IAuthProvider` interface
- Object storage abstraction (`IStorageProvider`, `SupabaseStorageProvider`) — cloud-only; local disk storage is not supported and all storage operations fail closed separate from database
- Server-side multi-tenant authorization middleware (`buildTenantWhereClause`, `authorizeResourceOwnership`)
 - Asynchronous document processing pipeline architecture
 - **Automatic post-upload processing**: every upload triggers the extract -> OCR -> classify -> match pipeline asynchronously (atomic claim, idempotent, retryable via `/documents/:id/retry`)
 - Page-limited OCR: scanned documents are OCR'd only for the leading `OCR_MAX_PAGES` (default 2) pages via `pdf-lib` slicing before the Mistral OCR call
- Deterministic extraction & matching before expensive AI/LLM calls

---

## Completed Milestones (0 — 3)

### Milestone 1 — Identity & Foundation (TASK-001 — TASK-005)
- Decoupled monorepo architecture (`Backend/`, `Frontend/`, root test orchestrator).
- Authentication engine (`IAuthProvider`, `SupabaseAuthProvider`, `MockAuthProvider`).
- Express authentication routes (`/signup`, `/login`, `/logout`, `/forgot-password`, `/me`).
- Database client setup & health check API endpoints (`/health`, `/api/v1/health`).

### Milestone 2 — Multi-Tenancy & Case Management (TASK-006 — TASK-011)
- `Organization` domain model & tenant-scoping isolation logic.
- User membership with roles (`ADMIN`, `MEMBER`, `ADVOCATE`, `CLERK`; signups join as `MEMBER`, organization creators become `ADMIN`) and APIs: `GET /api/v1/organizations/me/members` plus ADMIN-only `PATCH /api/v1/organizations/me/members/:userId` for role changes (self-demotion guard prevents removing an org's last admin).
- Team & role management UI in Settings → Organization (real data; demo users see a notice).
- `Case` domain model and Express CRUD routes (`POST`, `GET`, `GET :id`, `PATCH`, `DELETE`).
- Zod request validation schemas & server-side authorization middleware (`buildTenantWhereClause`, `authorizeResourceOwnership`).
- Interactive Case Management UI (`Frontend/app/(app)/cases`, `CreateCaseDialog`, search & status filtering).

### Milestone 3 — Document Ingestion (TASK-012 — TASK-015)
- `Document` domain model with `caseId: null` support (Upload First), checksum storage, and status lifecycles (`processingStatus`, `matchStatus`).
- Multer file upload middleware with 50MB limit and PDF magic byte header validation (`%PDF-`).
- Private Cloud Object Storage Abstraction (`storage.service`, `SupabaseStorageProvider`; cloud-only, fail-closed).
- PDF Upload REST API (`POST /api/v1/documents/upload`, `GET /api/v1/documents/:id`).
- Tenant-scoped SHA-256 deduplication and hash pre-check REST API (`GET /api/v1/documents/by-hash/:sha256`).
- Upload First UI (`Frontend/components/documents/document-upload-dropzone.tsx`, `Frontend/app/(app)/upload/page.tsx`) with drag & drop, live progress tracking, and duplicate document alert cards.

---

## What exists

### Code & Specifications
- Standalone Express TypeScript Backend with Helmet, CORS, and modular routes.
- Next.js 15 App Router Frontend with Tailwind CSS and Radix UI components.
- Complete documentation suite (`AGENTS.md`, `CURRENT-STATE.md`, `TODO.md`, `BUILD-LOG.md`, `README.md`).

### Database & Storage
- Prisma ORM v6.19 schema containing 6 core domain models: `Organization`, `User`, `Case`, `Document`, `DocumentMetadata`, `AuditEvent`.
- Synced to PostgreSQL database with full cascade-deletion and compound index support (`[organizationId, sha256]`, `[organizationId, status]`).
- Pluggable object storage facade writing binary files to isolated tenant directories.

---

### Milestone 4 — Document Understanding (TASK-016 — TASK-020)
- **TASK-016 (Native PDF text extraction)**: Extracted raw text content from native text-based legal PDFs using `pdf-parse`.
- **TASK-017 (OCR Abstraction & Mistral OCR Provider)**: Created `IOcrProvider` interface, `MistralOcrProvider` (with Mistral API integration), and `MockOcrProvider` fallback for scanned PDFs.
- **TASK-018 & TASK-019 (Legal Entity & Case Number Extraction)**: Built `LegalRegexMatcher` for Indian court case formats (`W.P.`, `CRL.M.C.`, `COMMERCIAL SUIT`, `SLP`, 16-character CNR numbers, party names, courts, and dates) and `MetadataExtractionService` persistence.
- **TASK-020 (Legal Document Classification)**: Implemented `DocumentClassifierService` with the 12 MVP taxonomy types (`COURT_ORDER`, `JUDGMENT`, `PETITION`, `AFFIDAVIT`, `NOTICE`, `VAKALATNAMA`, etc.) and integrated full pipeline into `DocumentProcessingService`, transitioning document status to `MATCHING`.

---

### Milestone 5 — Case Matching Engine (TASK-021 — TASK-026)
- **TASK-021 (Candidate Generation Service)**: Built `CandidateGenerationService` (`Backend/src/services/matching/candidate-generation.service.ts`) to query active tenant cases using exact case numbers, CNR numbers, party names, and court forums.
- **TASK-022 & TASK-023 (Deterministic Scorer & Decision Engine)**: Implemented `CaseMatcherService` (`Backend/src/services/matching/case-matcher.service.ts`) using weighted matching signals (Case Number +0.90, CNR +0.95, Party +0.40-0.65, Court +0.15 with tolerant court-name token matching) and server-side configurable decision thresholds (`Backend/src/config/matching.config.ts`, defaults: `AUTO_MATCHED` $\ge 0.85$, `CONFIRMATION_REQUIRED` $0.45 - 0.84$, `NO_MATCH` $< 0.45$; threshold values recorded in audit metadata). Integrated automatically into `DocumentProcessingService.processDocumentPipeline()`.
- **TASK-024 & TASK-025 (Match Confirmation & Reassignment REST APIs)**: Built `POST /api/v1/documents/:id/match`, `POST /api/v1/documents/:id/confirm-match`, and `POST /api/v1/documents/:id/reassign` with audit event logging (`DOCUMENT_CONFIRMED`, `DOCUMENT_REASSIGNED`) and structured feedback tracking.
- **TASK-026 (Match Confirmation UI & Filing Inbox)**: Built `MatchingCandidatesCard`, `ReassignCaseDialog`, and Filing Inbox view (`Frontend/app/(app)/inbox/page.tsx`) for advocates to review and file unassigned uploads.

---

### Milestone 6 — Retrieval & Search Engine (TASK-027 — TASK-030)
- **TASK-027 (Search Indexing Service)**: Built `SearchIndexService` (`Backend/src/services/search/search-index.service.ts`) supporting tenant-isolated query searching across case title, CNR, case number, party names, court, document type, filename, and extracted text metadata with context snippet generation.
- **TASK-028 (Search REST API)**: Created `GET /api/v1/search` (`Backend/src/routes/search.routes.ts`) with strict organization authorization and query pagination.
- **TASK-029 (Global Search UI)**: Connected `SearchPage` (`Frontend/app/(app)/search/page.tsx`) to backend `/api/v1/search` API with highlight excerpts, case badges, and document classification tags.
- **TASK-030 (Secure Viewer & Signed Download)**: Created `GET /api/v1/documents/:id/download` (short-lived 15-minute signed URLs with `DOCUMENT_ACCESSED` audit trail) and `GET /api/v1/documents/:id/preview` (inline security headers).

---

### Milestone 7 — Audit & Reliability (TASK-031 — TASK-033)
- **TASK-031 (Audit Trail)**: Built `AuditService` (`Backend/src/services/audit/audit.service.ts`), audit logger middleware, and `GET /api/v1/audit-logs` (`Backend/src/routes/audit.routes.ts`) tracking 10 core document lifecycle events (`DOCUMENT_UPLOADED`, `TEXT_EXTRACTED`, `AUTO_MATCHED`, `DOCUMENT_CONFIRMED`, `DOCUMENT_REASSIGNED`, `DOCUMENT_ACCESSED`, etc.).
- **TASK-032 (Processing Retry & Idempotency)**: Implemented `POST /api/v1/documents/:id/retry` with state-recovery mechanics, preserving original files and avoiding duplicate case filings.
- **TASK-033 (Golden Path Integration Verification)**: Comprehensive end-to-end integration test suite `golden-path.test.ts` passing 100% offline.

---

### Milestone 8 — Evaluation & Benchmarking (TASK-034 — TASK-036)
- **TASK-034 (Ground-Truth Dataset)**: Built synthetic labeled benchmark dataset (`evaluation-dataset.ts`) with 100 ground-truth legal document scenarios.
- **TASK-035 (Matching Benchmark Engine)**: Created `BenchmarkEvaluationService` (`benchmark.service.ts`) computing Top-1 Accuracy, Top-3 Recall, Auto-Match Precision, False Auto-Match Rate, Automation Rate, and Document Taxonomy Accuracy.
- **TASK-036 (Threshold Calibration)**: Automated test harness `benchmark.test.ts` calibrating `AUTO_MATCH` (0.90) and `CONFIRM` (0.45) thresholds, enforcing a **0.0% False Auto-Match Rate**.

---

### Milestone 9 — Pilot Readiness & Security Audit (TASK-037 — TASK-039)
- **TASK-037 (Security Review Suite)**: Built `security-audit.test.ts` verifying tenant isolation, temporary signed URL security, path traversal sanitization, and prompt injection defense.
- **TASK-038 (UX Review & Boundary Suite)**: Built `ux-flow.test.ts` validating upload-first UX, match status uncertainty visibility, search snippet formatting, and error state handling.
- **TASK-039 (Pilot Telemetry API)**: Created `PilotReadinessService` and `GET /api/v1/pilot/status` providing real-time telemetry metrics and system readiness validation for design-partner pilot onboarding.

---

## What is next

### All MVP Milestones (1–9) Complete!

1. **Design-Partner Pilot Onboarding**:
   - Deploy MVP instance for 3–5 small law offices/chambers.
   - Monitor real-world metrics via `GET /api/v1/pilot/status` (documents/day, automation rate, correction rate, search success).
2. **Operational Feedback Loop**:
   - Capture real advocate feedback on candidate case matching accuracy and upload-first workflow.

## Current risks

1. Scope expansion into non-MVP features (billing, WhatsApp, calendar, SSO).
2. Over-reliance on LLMs for deterministic extraction tasks (e.g. regex case number matching).
3. Weak tenant isolation on new background jobs or file processing workers.
4. Unhandled OCR failures or unreadable PDF text formats causing document loss.

---

## Rule for this document

Update this file after every completed task or major milestone. Keep it concise, clear, and reflective of true system state.
