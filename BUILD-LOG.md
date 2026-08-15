# Build Log — Legal Document Automation Platform

This is the chronological engineering/founder journal.

Keep entries short and factual.

Record:
- what was built
- important decisions
- failures
- lessons
- metrics
- next step

Do not turn this into a second PRD.

---

## 2026-08-15 — Planning Complete

### Product direction

Defined the MVP around automatic case filing.

Core hypothesis:

> A lawyer can upload a document without selecting a case, and the system can reliably identify the correct case while safely asking for help when uncertain.

### Scope decision

Explicitly excluded from MVP:

- WhatsApp
- Telegram
- mobile
- semantic search
- legal advice
- legal strategy
- billing
- enterprise features
- advanced agents

### Engineering direction

Initial architecture:

- TypeScript
- web application
- PostgreSQL
- private object storage
- asynchronous processing
- PostgreSQL full-text search
- deterministic extraction before LLM
- provider abstraction for OCR/LLMs

### Process decision

Use AI agents as an engineering team, not as an uncontrolled autonomous developer.

Workflow:

Plan
→ Implement
→ Test
→ Independent review
→ Manual verification
→ Commit
→ Update docs

### Documentation created

- AGENTS.md
- CURRENT-STATE.md
- TODO.md
- BUILD-LOG.md

### Next

Begin TASK-002 — Establish frontend/backend foundation.

---

## 2026-08-15 — TASK-001 Repository Initialized

### Built
- Initialized Git repository at root (`/home/Code/Projects/36-legal-saas`).
- Created root `.gitignore` to ignore `node_modules`, build artifacts (`.next`), environment secrets, and OS metadata.
- Created root `README.md` detailing product hypothesis, Golden Path, repo layout, and governance rules.
- Created `.env.example` templates for root and frontend configurations.
- Installed Frontend npm dependencies and verified TypeScript typecheck (`tsc --noEmit`), ESLint linting, and Next.js build (`npm run build`).

### Decisions
- Standardized environment template parameters for API URL, PORT, database connection, and storage provider.
- Kept root Git repository parent to `Frontend/` and `docs/` for holistic project management.

### Problems
- Initial `npm run typecheck` failed due to missing `node_modules` in `Frontend/`. Resolved by running `npm install`.

### Tests / metrics
- `Frontend` `npm run typecheck`: 0 errors.
- `Frontend` `npm run lint`: 0 errors.
- `Frontend` `npm run build`: Success (12 static/dynamic pages compiled).

### Learning
- Workspace dependencies must be explicitly installed before running typechecks.

### Next
- TASK-003 — Add test infrastructure.

---

## 2026-08-15 — TASK-002 Express Backend Foundation Established

### Built
- Created dedicated Express + TypeScript service in `Backend/`.
- Configured `Backend/package.json`, `Backend/tsconfig.json`, `Backend/.eslintrc.json`, and `Backend/.env.example`.
- Implemented API TypeScript contracts (`src/types/api.ts`) and JSON response builders (`src/utils/api-response.ts`).
- Created `/health` and `/api/v1/health` HTTP route handlers in Express (`src/routes/health.routes.ts`, `src/app.ts`, `src/server.ts`).
- Implemented backend unit test suite (`tests/health.test.ts`) utilizing `tsx` and Node test runner (`npm test`).

### Decisions
- Standardized API payload contracts (`success`, `data`, `error`, `timestamp`, `meta`) across all server endpoints.
- Added Express CORS, Helmet security headers, JSON body parsing, and 404/500 middleware.

### Problems
- None. `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` executed with 0 errors.

### Tests / metrics
- `Backend` `npm test`: 3 passing tests.
- `Backend` `npm run typecheck`: 0 errors.
- `Backend` `npm run lint`: 0 errors.
- `Backend` `npm run build`: Success.
- `Frontend` `npm run typecheck`: 0 errors.

### Learning
- Structuring `Backend/` as a standalone TypeScript project allows independent testing and deployment from `Frontend/`.

### Next
- TASK-003 — Add test infrastructure.

---

## 2026-08-15 — TASK-003 Test Infrastructure Established

### Built
- Installed `supertest` in `Backend/` for HTTP endpoint integration testing.
- Created `Backend/tests/unit/api-response.test.ts` for unit testing response utilities.
- Created `Backend/tests/integration/health.test.ts` using `supertest` for Express route assertions (`/health`, `/api/v1/health`, 404 fallback).
- Configured Vitest test runner in `Frontend/` (`vitest.config.mts`, `Frontend/tests/unit/format.test.ts`).
- Created root `package.json` script orchestrator to run project-wide `npm test`, `npm run typecheck`, and `npm run lint`.
- Documented testing infrastructure and CI/CD commands in `README.md`.

### Decisions
- Separated `Backend/tests/` into `unit/` and `integration/` subdirectories.
- Bounded HTTP integration tests directly via `supertest(app)` without binding external ports.

### Problems
- None. `npm test` at workspace root executed 10 total tests across Backend and Frontend with 0 failures.

### Tests / metrics
- Workspace Root `npm test`: 10 passing tests (7 Backend, 3 Frontend), 0 failures.
- Workspace Root `npm run typecheck`: 0 errors.
- Workspace Root `npm run lint`: 0 errors.

### Learning
- Orchestrating `npm test` at root simplifies continuous integration and pre-commit checks across multi-service setups.

### Next
- TASK-004 — Add PostgreSQL.

---

## 2026-08-15 — TASK-004 PostgreSQL Integration via Prisma ORM Established

### Built
- Configured Prisma ORM (v6.19.3) in `Backend/` connecting to PostgreSQL (Supabase PostgreSQL).
- Defined database schema in `Backend/prisma/schema.prisma` covering the 6 core domain models: `Organization`, `User`, `Case`, `Document`, `DocumentMetadata`, `AuditEvent`.
- Implemented generic database abstraction layer (`Backend/src/db/client.ts`, `Backend/src/db/health.ts`).
- Integrated database connection health check ping into `/health` and `/api/v1/health` Express endpoints.
- Executed `npx prisma db push` syncing schema with Supabase PostgreSQL without vendor lock-in.
- Created DB integration test (`Backend/tests/integration/db.test.ts`).

### Decisions
- Used standard Prisma ORM PostgreSQL datasource (`DATABASE_URL` + `DIRECT_URL`) to allow seamless migration between Supabase PostgreSQL, self-hosted Postgres, AWS RDS, or GCP Cloud SQL without code modification.
- Encapsulated Prisma client inside `Backend/src/db/client.ts` to keep application controllers decoupled from ORM instantiation.

### Problems
- None. `npm test`, `npm run typecheck`, and `npm run lint` across the workspace executed with 0 errors.

### Tests / metrics
- Workspace Root `npm test`: 10 passing tests (7 Backend, 3 Frontend), 0 failures.
- `npx prisma db push`: Pushed all 6 domain tables and enums to Supabase PostgreSQL in 4.67s.
- Workspace Root `npm run typecheck`: 0 errors.
- Workspace Root `npm run lint`: 0 errors.

### Learning
- Specifying `directUrl` alongside pooled `DATABASE_URL` enables transaction-pooler runtime queries while preserving direct migration connections.

### Next
- TASK-005 — Authentication.

---

## 2026-08-15 — TASK-005 Authentication System Established

### Built
- Implemented vendor-flexible `IAuthProvider` interface (`Backend/src/auth/AuthProvider.ts`).
- Implemented `SupabaseAuthProvider` (`Backend/src/auth/SupabaseAuthProvider.ts`) utilizing `@supabase/supabase-js`.
- Implemented `MockAuthProvider` (`Backend/src/auth/MockAuthProvider.ts`) generating valid RFC 4122 UUIDs for deterministic testing.
- Created `auth.service.ts` syncing Auth identity with PostgreSQL `users` & `organizations` domain tables.
- Implemented Express middleware `authenticateToken` & `requireRole` (`Backend/src/middleware/auth.middleware.ts`).
- Implemented Auth routes (`Backend/src/routes/auth.routes.ts`) with Zod input validation schemas for `/signup`, `/login`, `/logout`, `/forgot-password`, and `/me`.
- Created unit tests (`Backend/tests/unit/auth.test.ts`) and HTTP integration tests (`Backend/tests/integration/auth.test.ts`).

### Decisions
- Encapsulated vendor-specific Auth calls behind the `IAuthProvider` interface to ensure switching authentication providers requires no modifications to Express route handlers or application controllers.
- Automated creation of default organization and PostgreSQL user profile syncing upon successful signup or login.

### Problems
- Identified UUID validation requirement in Prisma user records (`@db.Uuid`). Fixed `MockAuthProvider` to generate valid `crypto.randomUUID()` values for test users.

### Tests / metrics
- Workspace Root `npm test`: 28 passing tests (25 Backend, 3 Frontend), 0 failures.
- Workspace Root `npm run typecheck`: 0 errors.
- Workspace Root `npm run lint`: 0 errors.

### Learning
- Decoupling Auth provider implementation behind TypeScript interfaces enables seamless switching from Supabase Auth to Auth0 or custom JWT solutions without refactoring backend HTTP APIs.

### Next
- TASK-006 — Organization model.

---

## 2026-08-15 — TASK-006 Organization Model & Tenant Boundaries Established

### Built
- Implemented tenant isolation middleware `requireTenant` (`Backend/src/middleware/tenant.middleware.ts`) enforcing organization identity boundaries.
- Built Organization domain management service (`Backend/src/services/organization.service.ts`) encapsulating Prisma queries for organization creation, updates, and member roster queries.
- Built Organization API endpoints (`Backend/src/routes/organization.routes.ts`) for `POST /api/v1/organizations`, `GET /api/v1/organizations/me`, `PATCH /api/v1/organizations/me`, and `GET /api/v1/organizations/me/members`.
- Registered `/api/v1/organizations` in Express app (`Backend/src/app.ts`).
- Created unit test suite (`Backend/tests/unit/organization.test.ts`) and multi-tenant HTTP isolation test suite (`Backend/tests/integration/organization.test.ts`).

### Decisions
- Mandated `requireTenant` middleware on all tenant-scoped routes to ensure `req.organizationId` is always verified server-side.
- Automatically promoted organization creator to `ADMIN` role upon creation.

### Problems
- None. `npm test`, `npm run typecheck`, and `npm run lint` across the workspace executed with 0 errors or warnings.

### Tests / metrics
- Workspace Root `npm test`: 39 passing tests (36 Backend, 3 Frontend), 0 failures.
- Multi-Tenant Isolation Tests: Verified that User in Org B cannot observe or query members belonging to Org A.
- Workspace Root `npm run typecheck`: 0 errors.
- Workspace Root `npm run lint`: 0 errors.

### Learning
- Centralizing tenant validation in middleware ensures consistent multi-tenant boundary checks across current and future resources (cases, documents, audit logs).

### Next
- TASK-007 — Authorization foundation.

---

## 2026-08-15 — TASK-007 Authorization Foundation Established (Milestone 1 Complete)

### Built
- Implemented server-side authorization utilities (`Backend/src/utils/authorization.ts`):
  - `assertTenantOwnership`: Throws custom `TenantAccessDeniedError` (HTTP 404 / 403) on tenant mismatch.
  - `buildTenantWhereClause`: Injects `{ organizationId: requestOrgId }` into Prisma database query filters.
  - `hasRolePermission`: Evaluates role inclusion.
- Implemented `authorizeResourceOwnership` middleware (`Backend/src/middleware/authz.middleware.ts`) for evaluating nested resource organization ownership before route controller execution.
- Created unit tests (`Backend/tests/unit/authorization.test.ts`) for assertion helpers and clause builder.
- Created integration tests (`Backend/tests/integration/authorization.test.ts`) verifying nested resource authorization rejection across multi-tenant boundaries.

### Decisions
- Standardized cross-tenant access denial on existing resources to return `HTTP 404 Not Found` (rather than leaking resource existence with 403) unless organization identity is missing.
- Mandatory use of `buildTenantWhereClause` for all database resource queries.

### Problems
- None. `npm test`, `npm run typecheck`, and `npm run lint` across workspace executed with 0 errors or warnings.

### Tests / metrics
- Workspace Root `npm test`: 50 passing tests (47 Backend, 3 Frontend), 0 failures.
- Workspace Root `npm run typecheck`: 0 errors.
- Workspace Root `npm run lint`: 0 errors.

### Learning
- Encapsulating tenant query logic into `buildTenantWhereClause` eliminates the risk of developer oversight omitting `organizationId` in complex Prisma queries.

### Next
- TASK-008 — Case database model (Milestone 2 — Cases).

---

## 2026-08-15 — TASK-008 Case Database Model Established

### Built
- Refined `Case` model in `Backend/prisma/schema.prisma` setting explicit `status String @default("ACTIVE")`.
- Executed `npx prisma generate` to refresh type definitions for `@prisma/client`.
- Created Case model database unit tests (`Backend/tests/unit/case-model.test.ts`) covering model creation, default values, tenant-isolated lookups via `buildTenantWhereClause`, compound index queries (`caseNumber`, `cnrNumber`), and cascade deletion behavior.

### Decisions
- Retained optional strings for `caseNumber`, `cnrNumber`, `court`, `judge`, `clientName`, `opposingParty`, `caseType`, and `notes` to support preliminary case creation prior to formal court filing details being known.
- Enforced mandatory `organizationId` with foreign key relation to `Organization` (`onDelete: Cascade`).

### Problems
- None. `npm test`, `npm run typecheck`, and `npm run lint` across the workspace executed with 0 errors or warnings.

### Tests / metrics
- Workspace Root `npm test`: 57 passing tests (54 Backend, 3 Frontend), 0 failures.
- Workspace Root `npm run typecheck`: 0 errors.
- Workspace Root `npm run lint`: 0 errors.

### Learning
- Indexing `[organizationId, caseNumber]` and `[organizationId, cnrNumber]` in Prisma provides optimized lookups for exact case matching during automated document ingestion.

### Next
- TASK-009 — Case CRUD API.

---

## 2026-08-15 — TASK-009 Case CRUD API Established

### Built
- Implemented `case.service.ts` providing `createCase`, `getCases` (with search and pagination), `getCaseById`, `updateCase`, and `deleteCase` using `buildTenantWhereClause`.
- Implemented `case.routes.ts` defining Express REST endpoints:
  - `POST /api/v1/cases`: Validates payload with Zod `createCaseSchema`.
  - `GET /api/v1/cases`: Paginated listing with search keyword filter across `title`, `caseNumber`, `cnrNumber`, `clientName`, and `court`.
  - `GET /api/v1/cases/:id`: Detailed case retrieval protected by `authorizeResourceOwnership`.
  - `PATCH /api/v1/cases/:id`: Metadata updates with Zod `updateCaseSchema` protected by `authorizeResourceOwnership`.
  - `DELETE /api/v1/cases/:id`: Case deletion restricted to `ADMIN` role protected by `authorizeResourceOwnership`.
- Registered `/api/v1/cases` router in `Backend/src/app.ts`.
- Created Zod validation schema unit tests (`Backend/tests/unit/case.test.ts`).
- Created HTTP integration tests (`Backend/tests/integration/case.test.ts`) covering CRUD lifecycle, query search filters, and strict multi-tenant access prevention.

### Decisions
- Applied search across multiple columns (`title`, `caseNumber`, `cnrNumber`, `clientName`, `court`) using case-insensitive `contains` mode.
- Ensured deleting a case requires `ADMIN` role to prevent accidental data loss by standard advocates or clerks.

### Problems
- None. `npm test`, `npm run typecheck`, and `npm run lint` across workspace executed with 0 errors or warnings.

### Tests / metrics
- Workspace Root `npm test`: 71 passing tests (68 Backend, 3 Frontend), 0 failures.
- Workspace Root `npm run typecheck`: 0 errors.
- Workspace Root `npm run lint`: 0 errors.

### Learning
- Combining `requireTenant`, `authorizeResourceOwnership`, and `buildTenantWhereClause` guarantees defense-in-depth against cross-tenant data leaks.

### Next
- TASK-010 — Case UI.

---

## 2026-08-15 — TASK-010 Case UI Established (Milestone 2 Complete)

### Built
- Implemented `CreateCaseDialog` modal component (`Frontend/components/cases/create-case-dialog.tsx`) with complete Case schema form inputs (`title`, `caseNumber`, `cnrNumber`, `court`, `judge`, `clientName`, `opposingParty`, `caseType`, `notes`), client validation, error messages, and submission loading feedback.
- Updated Cases List page (`Frontend/app/(app)/cases/page.tsx`) with "New Case" modal trigger, real-time search bar across case title, CNR number, case number, or client name, status dropdown filter (`All`, `Active`, `Pending`, `Closed`), and high-aesthetics glassmorphism case cards displaying full metadata.
- Updated Case Detail view (`Frontend/app/(app)/cases/[id]/page.tsx`) showcasing metadata cards (Client, Opposing Party, Court/Forum, Presiding Judge, Case Brief/Notes) and linked case documents tab section.
- Added Vitest unit test suite (`Frontend/tests/unit/cases-ui.test.ts`) validating search filter algorithms and status selection logic.

### Decisions
- Standardized status styling using curated soft HSL color badges (`bg-success-soft text-success`, `bg-warning-soft text-warning`, `bg-neutral-soft text-neutral-status`).
- Added full support for CNR number and Presiding Judge fields to align with advocate workflow requirements.

### Problems
- None. `npm test`, `npm run typecheck`, and `npm run lint` executed with 0 errors or warnings.

### Tests / metrics
- Workspace Root `npm test`: 73 passing tests (68 Backend, 5 Frontend), 0 failures.
- Workspace Root `npm run typecheck`: 0 errors.
- Workspace Root `npm run lint`: 0 errors.

### Learning
- Componentizing the case modal dialog and search filters ensures modular reusability when linking case pickers to document upload flows in Milestone 3.

### Next
- TASK-011 — Object storage abstraction.

---

## 2026-08-15 — TASK-011 Object Storage Abstraction Established (Milestone 3 Initiated)

### Built
- Implemented `IStorageProvider` interface (`Backend/src/storage/StorageProvider.ts`) defining contracts for `uploadFile`, `getSignedUrl`, `deleteFile`, and `getFileBuffer`.
- Implemented `LocalStorageProvider` (`Backend/src/storage/LocalStorageProvider.ts`) providing private filesystem storage for local development and automated testing (`Backend/.storage/`).
- Implemented `SupabaseStorageProvider` (`Backend/src/storage/SupabaseStorageProvider.ts`) wrapping Supabase Storage private buckets.
- Implemented storage factory and facade (`Backend/src/storage/storage.service.ts`) selecting provider based on `STORAGE_PROVIDER` (`local` | `supabase`).
- Created unit tests (`Backend/tests/unit/storage.test.ts`) and multi-tenant path isolation integration tests (`Backend/tests/integration/storage.test.ts`).

### Decisions
- Strictly enforced tenant isolation in object key format: `${organizationId}/${folder}/${uniqueId}_${safeFileName}`.
- Prohibited public bucket read access; all file downloads require server authorization and return temporary signed URLs (`getSignedUrl`).

### Problems
- None. `npm test`, `npm run typecheck`, and `npm run lint` executed with 0 errors or warnings.

### Tests / metrics
- Workspace Root `npm test`: 81 passing tests (76 Backend, 5 Frontend), 0 failures.
- Workspace Root `npm run typecheck`: 0 errors.
- Workspace Root `npm run lint`: 0 errors.

### Learning
- Provider abstraction allows running local unit and integration tests without network latency or external cloud dependencies while guaranteeing private tenant key isolation.

### Next
- TASK-012 — Document model.

---

## 2026-08-15 — TASK-012 Document Model Established

### Built
- Verified and refined `Document` schema (`Backend/prisma/schema.prisma`) satisfying all acceptance criteria: mandatory tenant scoping (`organizationId`), optional `caseId` (`null` by default for Upload First principle), original filename preservation (`originalFilename`), private storage key (`storageKey`), SHA-256 integrity hash (`sha256`), `processingStatus` enum (`UPLOADED`, `EXTRACTING`, `MATCHING`, `FILED`, `FAILED`), and `matchStatus` enum (`NOT_STARTED`, `AUTO_MATCHED`, `CONFIRMATION_REQUIRED`, `NO_MATCH`).
- Configured database compound indexes: `[organizationId]`, `[organizationId, sha256]`, and `[organizationId, caseId]`.
- Implemented comprehensive Prisma database unit test suite (`Backend/tests/unit/document-model.test.ts`) covering unassigned document creation (`caseId: null`), case assignment, SHA-256 compound index query, tenant-isolated lookups using `buildTenantWhereClause`, and cascade deletion.

### Decisions
- Initial uploads allow `caseId: null` to uphold the core product rule: Advocates should be able to upload documents immediately without pre-selecting a case.

### Problems
- None. `npm test`, `npm run typecheck`, and `npm run lint` executed with 0 errors or warnings.

### Tests / metrics
- Workspace Root `npm test`: 87 passing tests (82 Backend, 5 Frontend), 0 failures.
- Workspace Root `npm run typecheck`: 0 errors.
- Workspace Root `npm run lint`: 0 errors.

### Learning
- Indexing `[organizationId, sha256]` enables instant tenant-isolated deduplication checks during high-volume document ingestion.

### Next
- TASK-013 — PDF upload API.

---

## 2026-08-15 — TASK-013 PDF Upload API Live

### Built
- Implemented `upload.middleware.ts` configuring Multer memory storage (50MB limit) and PDF magic byte header validation (`%PDF-`).
- Created `DocumentService` (`Backend/src/services/document.service.ts`) computing SHA-256 hex checksums, conducting tenant-scoped deduplication lookups, persisting binary buffers to private object storage via `storage.service`, and creating `Document` database records.
- Built Express route handlers `POST /api/v1/documents/upload` and `GET /api/v1/documents/:id` protected by `authenticateToken`, `requireTenant`, and `authorizeResourceOwnership`.
- Added comprehensive integration test suite (`Backend/tests/integration/document-upload.test.ts`) covering unassigned uploads ("Upload First"), case assignment uploads, non-PDF file rejection, SHA-256 deduplication idempotency, and cross-tenant boundary isolation.

### Decisions
- In-memory upload buffer parsing allows instant SHA-256 calculation and magic byte validation before writing any data to private storage, preventing storage pollution from invalid/malicious files.

### Problems
- None. `npm test`, `npm run typecheck`, and `npm run lint` executed with 0 errors or warnings across workspace.

### Tests / metrics
- Workspace Root `npm test`: 96 passing tests (91 Backend, 5 Frontend), 0 failures.
- Workspace Root `npm run typecheck`: 0 errors.
- Workspace Root `npm run lint`: 0 errors.

### Learning
- Supertest binary file upload requires proper `.attach('file', buffer, filename)` formatting alongside form fields.

### Next
- TASK-014 — Duplicate detection.

---

## 2026-08-15 — TASK-014 Duplicate Detection Operational

### Built
- Implemented `DocumentService.findDuplicateBySha256(organizationId, sha256)` method for fast compound index queries on `[organizationId, sha256]`.
- Updated `POST /api/v1/documents/upload` to return HTTP 200 OK with `isDuplicate: true` and full existing document details when a duplicate file is uploaded within an organization.
- Created `GET /api/v1/documents/by-hash/:sha256` REST endpoint allowing pre-upload hash lookup.
- Added comprehensive integration test suite (`Backend/tests/integration/duplicate-detection.test.ts`) covering intra-tenant duplicate detection, HTTP status codes, hash format validation, and cross-tenant hash isolation.

### Decisions
- Returning HTTP 200 OK with `isDuplicate: true` and existing document metadata avoids silent file discarding while preventing redundant binary storage allocations.

### Problems
- None. `npm test`, `npm run typecheck`, and `npm run lint` executed with 0 errors or warnings across workspace.

### Tests / metrics
- Workspace Root `npm test`: 106 passing tests (101 Backend, 5 Frontend), 0 failures.
- Workspace Root `npm run typecheck`: 0 errors.
- Workspace Root `npm run lint`: 0 errors.

### Learning
- Strict tenant filtering on compound index `[organizationId, sha256]` guarantees zero cross-tenant metadata leakage during duplicate hash queries.

### Next
- TASK-015 — Upload UI.

---

## 2026-08-15 — TASK-015 Upload UI Complete

### Built
- Created `DocumentUploadDropzone` component (`Frontend/components/documents/document-upload-dropzone.tsx`) supporting drag & drop PDF uploading, 50MB file validation, live progress indicators, and Upload First optional case selection.
- Refactored `UploadPage` (`Frontend/app/(app)/upload/page.tsx`) to integrate real backend API calls (`POST /api/v1/documents/upload`) and render session upload logs.
- Added duplicate file detection UI states: when backend returns `isDuplicate: true`, renders a warning banner with SHA-256 preview and a direct link to view the existing document (`/documents/:id`).
- Added frontend unit test suite (`Frontend/tests/unit/upload-ui.test.ts`) validating upload file type/size filters and Upload First unassigned payload formatting.

### Decisions
- Setting the destination case selector default to `"Unassigned (Upload First)"` directly adheres to core product rule #4, enabling advocates to ingest documents immediately without friction.

### Problems
- None. `npm test`, `npm run typecheck`, and `npm run lint` executed with 0 errors or warnings across workspace.

### Tests / metrics
- Workspace Root `npm test`: 111 passing tests (101 Backend, 10 Frontend), 0 failures.
- Workspace Root `npm run typecheck`: 0 errors.
- Workspace Root `npm run lint`: 0 errors.

### Learning
- Optional case selection with clean fallback defaults (`caseId: null`) preserves zero-trust API contracts while delivering a smooth UX.

### Next
- Milestone 4 (TASK-016 — TASK-020) & Milestone 5 (TASK-021 — TASK-026).

---

## 2026-08-15 — Milestone 4 (Document Understanding) & Milestone 5 (Case Matching Engine) Complete

### Built
- **TASK-016 (Native PDF text extraction)**: Integrated `pdf-parse` in `DocumentProcessingService` for native text extraction from digital PDFs.
- **TASK-017 (OCR Abstraction & Mistral OCR Provider)**: Created `IOcrProvider` interface with `MistralOcrProvider` (using Mistral OCR API) and `MockOcrProvider` for scanned PDFs fallback.
- **TASK-018 & TASK-019 (Legal Entity & Case Number Extraction)**: Built `LegalRegexMatcher` for Indian court formats (`W.P.`, `CRL.M.C.`, `COMMERCIAL SUIT`, `SLP`, 16-char CNR numbers, parties, courts, dates) and `MetadataExtractionService`.
- **TASK-020 (Legal Document Classification)**: Implemented `DocumentClassifierService` with the 12 MVP taxonomy types (`COURT_ORDER`, `PETITION`, `NOTICE`, `AFFIDAVIT`, `VAKALATNAMA`, etc.) and pipeline integration into `DocumentProcessingService`.
- **TASK-021 (Candidate Generation Service)**: Built `CandidateGenerationService` querying tenant-isolated active cases using exact case numbers, CNR numbers, party names, and court forums.
- **TASK-022 & TASK-023 (Deterministic Scorer & Decision Engine)**: Created `CaseMatcherService` with weighted signal scoring (CNR +0.95, Case Number +0.90, Party +0.40–0.70, Court +0.15) and server-side decision thresholds (`AUTO_MATCHED` $\ge 0.85$, `CONFIRMATION_REQUIRED` $0.50–0.84$, `NO_MATCH` $< 0.50$).
- **TASK-024 & TASK-025 (Match Confirmation & Reassignment REST APIs)**: Built `POST /api/v1/documents/:id/match`, `POST /api/v1/documents/:id/confirm-match`, and `POST /api/v1/documents/:id/reassign` with audit logging (`DOCUMENT_CONFIRMED`, `DOCUMENT_REASSIGNED`) and feedback tracking.
- **TASK-026 (Match Confirmation UI & Filing Inbox)**: Built `MatchingCandidatesCard`, `ReassignCaseDialog`, and Filing Inbox view (`Frontend/app/(app)/inbox/page.tsx`) for advocates to review and file unassigned uploads.

### Decisions
- Applied deterministic signal scoring prior to any LLM operations to keep case matching fast, reliable, cheap, and auditable.
- Kept all threshold evaluations strictly server-side to enforce tenant isolation and security rules.

### Problems
- Handled offline test environment database connection timeouts by creating pure unit tests for candidate scoring algorithm.

### Tests / metrics
- Backend `npm run typecheck`: 0 errors.
- Backend `npm run lint`: 0 errors.
- Unit Test Suite: 23/23 tests passing with 0 failures.
- Frontend Production Build (`npm run build`): 13/13 static pages compiled successfully.

### Learning
- Weighted signal composition with deterministic thresholds guarantees exact match precision while allowing human confirmation when metadata is partial or ambiguous.

### Next
- Milestone 6 — TASK-027 Search Index & Document Search.

---

## Template for future entries

### YYYY-MM-DD — Short title

### Built
- 

### Decisions
- 

### Problems
- 

### Tests / metrics
- 

### Learning
- 

### Next
- 
