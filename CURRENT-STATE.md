# Current State

**Last updated:** 2026-08-15

## Project status

Milestones 1 & 2 Complete (Identity, Organization & Case Management). Milestone 3 (Document Ingestion) active: Document database schema and model unit test suite established (`Backend/tests/unit/document-model.test.ts`).

`Document` model enforces tenant-scoping (`organizationId`), supports unassigned initial uploads (`caseId: null` implementing the Upload First principle), preserves `originalFilename`, records private `storageKey`, stores `sha256` checksums for deduplication, tracks `processingStatus` (`UPLOADED`, `EXTRACTING`, `MATCHING`, `FILED`, `FAILED`) and `matchStatus` (`NOT_STARTED`, `AUTO_MATCHED`, `CONFIRMATION_REQUIRED`, `NO_MATCH`). (TASK-001 through TASK-012 complete). Next step is TASK-013 (PDF upload API).

---

## Product

### Working definition

Legal document automation platform for advocates, lawyers, clerks, chambers, and small law firms.

### MVP hypothesis

> A lawyer can upload a legal document without selecting a case first, and the system can reliably identify and file it into the correct case, while asking for human help when uncertain.

### MVP wedge

Automatic case identification and filing.

### Primary success metric

Correct documents automatically filed into the correct case.

---

## Product decisions already made

- Web-first MVP
- PDF-first MVP
- Case-first data model
- Upload-first UX
- Automatic filing is the primary feature
- Precision is more important than aggressive automation
- PostgreSQL is the default MVP database direction (connected via Prisma ORM)
- Supabase Auth behind vendor-flexible `IAuthProvider` interface
- Object storage is separate from the database
- Start search with PostgreSQL full-text search
- Use asynchronous document processing
- Use deterministic extraction before expensive AI
- Keep AI providers replaceable
- Keep future integrations out of MVP

---

## What exists

### Product documentation

- UI Build Specification
- MVP Engineering Specification
- AGENTS.md
- CURRENT-STATE.md
- TODO.md
- BUILD-LOG.md

### Code

- Decoupled monorepo with `Frontend/` (Next.js + Vitest) and standalone Express `Backend/` (TypeScript, Helmet, CORS).
- Test infrastructure (`node:test` + `supertest` in Backend, `vitest` in Frontend, root `npm test` orchestrator).
- Vendor-flexible authentication (`IAuthProvider`, `SupabaseAuthProvider`, `MockAuthProvider`, Zod payload schemas, `authenticateToken` / `requireRole` middleware, and `/signup`, `/login`, `/logout`, `/forgot-password`, `/me` routes).

### Database

- Prisma ORM (v6.19.3) schema defined in `Backend/prisma/schema.prisma` with 6 core domain models: `Organization`, `User`, `Case`, `Document`, `DocumentMetadata`, `AuditEvent`.
- Synced to Supabase PostgreSQL database via `prisma db push`.
- Generic abstraction client (`Backend/src/db/client.ts`) and health check ping utility (`Backend/src/db/health.ts`) integrated into `/health` and `/api/v1/health` API endpoints.

### Deployment

Not started.

### AI evaluation dataset

Not started.

---

## What is next

### Immediate next milestone

Milestone 1 — Identity & Organization:
1. TASK-006: Organization model & multi-tenant organization boundaries.
2. TASK-007: User-to-organization assignment & permissions.
3. TASK-008: Case management data layer.

Do not start OCR, semantic search, or advanced AI before the foundation is stable.

---

## First vertical slice

The first useful vertical slice should be:

Create organization
→ create case
→ upload PDF
→ store original
→ create document record
→ display document in UI

After that, add:

PDF
→ extract text
→ extract case number
→ match exact case number
→ file automatically

---

## Current risks

1. Scope expansion
2. Over-reliance on LLMs for deterministic tasks
3. Weak tenant isolation
4. AI-generated code becoming difficult to understand
5. No evaluation dataset for case matching
6. Building too much UI before proving the matching wedge
7. Using confidential legal documents too early in development

---

## Current questions

These do not block development:

- Which exact OCR provider will be used?
- Which AI provider/model gives the best extraction/cost tradeoff?
- Which object-storage provider will be used? (Local / S3 compatible)
- What initial target court/document mix will be used for evaluation?
- What matching thresholds will the real dataset justify?

---

## Rule for this document

Update this file after every meaningful milestone.

Keep it short.

It should describe what is true now, not the entire product vision.
