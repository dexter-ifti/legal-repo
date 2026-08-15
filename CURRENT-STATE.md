# Current State

**Last updated:** 2026-08-15

## Project status

**Milestones 1, 2 & 3 Complete** (Identity & Organization, Case Management, and Document Ingestion).  
**Milestone 4 (Document Understanding)** active. **TASK-016 — Native PDF text extraction** is COMPLETE. Next immediate step is **TASK-017 — OCR abstraction for scanned PDFs**.

System status:
- All **108 workspace unit & integration tests** passing with 0 failures.
- TypeScript strict typecheck passing with 0 errors across workspace (`npm run typecheck`).
- ESLint checks passing with 0 warnings or errors (`npm run lint`).
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
- Object storage abstraction (`IStorageProvider`, `LocalStorageProvider`) separate from database
- Server-side multi-tenant authorization middleware (`buildTenantWhereClause`, `authorizeResourceOwnership`)
- Asynchronous document processing pipeline architecture
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
- User membership, roles (`ADMIN`, `ATTORNEY`, `PARALEGAL`, `STAFF`), and organization assignment API (`GET /api/v1/organizations/me/members`).
- `Case` domain model and Express CRUD routes (`POST`, `GET`, `GET :id`, `PATCH`, `DELETE`).
- Zod request validation schemas & server-side authorization middleware (`buildTenantWhereClause`, `authorizeResourceOwnership`).
- Interactive Case Management UI (`Frontend/app/(app)/cases`, `CreateCaseDialog`, search & status filtering).

### Milestone 3 — Document Ingestion (TASK-012 — TASK-015)
- `Document` domain model with `caseId: null` support (Upload First), checksum storage, and status lifecycles (`processingStatus`, `matchStatus`).
- Multer file upload middleware with 50MB limit and PDF magic byte header validation (`%PDF-`).
- Private Object Storage Abstraction (`storage.service`, `LocalStorageProvider`).
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

## What is next

### Active Milestone: Milestone 4 — Document Understanding

1. **TASK-016 — Native PDF text extraction (COMPLETED)**:
   - Extracted raw text content from native text-based legal PDFs using `pdf-parse`.
   - Built `ITextExtractor` abstraction and `DocumentProcessingService` orchestrator.
   - Updated document `processingStatus` through `EXTRACTING` to `CLASSIFYING` and persisted `extracted_text` and `page_count` in `DocumentMetadata`.
   - Handled unreadable scanned PDFs safely by setting status to `UNSUPPORTED`/`PROCESSING_FAILED` without data loss.
2. **TASK-017 — OCR integration for scanned PDFs (NEXT)**:
   - Fallback OCR extraction for image-based/scanned legal PDFs.
3. **TASK-018 — Legal document entity & metadata extraction**:
   - Extract key legal fields (case numbers, party names, court titles, filing dates).

---

## Current risks

1. Scope expansion into non-MVP features (billing, WhatsApp, calendar, SSO).
2. Over-reliance on LLMs for deterministic extraction tasks (e.g. regex case number matching).
3. Weak tenant isolation on new background jobs or file processing workers.
4. Unhandled OCR failures or unreadable PDF text formats causing document loss.

---

## Rule for this document

Update this file after every completed task or major milestone. Keep it concise, clear, and reflective of true system state.
