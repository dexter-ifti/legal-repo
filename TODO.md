# TODO — MVP Execution Backlog

## Status legend

- `READY` — can be started
- `BLOCKED` — dependency required
- `IN PROGRESS`
- `DONE`
- `DEFERRED`

---

# Milestone 0 — Repository Foundation

## TASK-001 — Initialize repository

Status: DONE

Goal:
Create the application repository and baseline project structure.

Acceptance:
- Git initialized
- README exists
- AGENTS.md exists
- docs structure exists
- application starts locally
- environment template exists

Out of scope:
- product features

---

## TASK-002 — Establish frontend/backend foundation

Status: DONE

Goal:
Create the basic application structure with TypeScript.

Acceptance:
- frontend runs
- backend/API layer runs
- typecheck passes
- lint passes
- basic test command works

---

## TASK-003 — Add test infrastructure

Status: DONE

Goal:
Create unit and integration test foundations.

Acceptance:
- test runner works
- one example test passes
- CI/test command documented

---

## TASK-004 — Add PostgreSQL

Status: DONE

Goal:
Connect application to PostgreSQL.

Acceptance:
- local DB works
- migrations work
- connection configuration documented
- no secrets committed

---

# Milestone 1 — Identity & Organization

## TASK-005 — Authentication

Status: DONE

Goal:
Implement basic secure authentication.

Acceptance:
- signup/login/logout/forgot-password
- authenticated session
- password/security behavior documented
- protected routes

---

## TASK-006 — Organization model

Status: DONE

Goal:
Create organization/tenant model.

Acceptance:
- user belongs to organization
- organization isolation tested
- organization creation works

---

## TASK-007 — Authorization foundation

Status: DONE

Goal:
Create server-side resource authorization utilities.

Acceptance:
- user can access own organization resources
- cross-tenant access returns forbidden/not-found appropriately
- tests cover nested resources

---

# Milestone 2 — Cases

## TASK-008 — Case database model

Status: DONE

Goal:
Implement case schema and migration.

Fields:
- title
- case number
- CNR
- court
- judge
- client
- opposing party
- case type
- status
- notes

---

## TASK-009 — Case CRUD API

Status: DONE

Goal:
Create/read/update cases.

Acceptance:
- organization-scoped
- validation
- authorization
- tests

---

## TASK-010 — Case UI

Status: DONE

Goal:
Build case list/create/detail UI.

Acceptance:
- create case
- search cases
- open case
- view metadata
- realistic empty/error states

---

# Milestone 3 — Document Ingestion

## TASK-011 — Object storage abstraction

Status: DONE

Goal:
Create private object-storage service.

Acceptance:
- upload
- retrieve reference
- delete/soft-delete behavior defined
- no public bucket access
- provider hidden behind interface

---

## TASK-012 — Document model

Status: DONE

Goal:
Create document schema.

Acceptance:
- organization scoped
- case can initially be NULL
- original filename preserved
- storage key stored
- SHA-256 stored
- processing state stored

## TASK-013 — PDF upload API

Status: DONE

Goal:
Upload a PDF and persist it safely.

Acceptance:
- MIME/signature validation
- size limit
- secure storage
- SHA-256
- document record
- processing job queued

---

## TASK-014 — Duplicate detection

Status: READY

Goal:
Detect exact duplicate files using organization + SHA-256.

Acceptance:
- duplicate identified
- new file is not silently discarded
- user can view existing document

---

## TASK-015 — Upload UI

Status: BLOCKED

Goal:
Build upload/dropzone experience.

Acceptance:
- no case selection required
- upload progress
- processing state
- error state
- success state

---

# Milestone 4 — Document Understanding

## TASK-016 — Native PDF text extraction

Status: BLOCKED

Goal:
Extract text from text-based PDFs.

Acceptance:
- extracted text persisted
- processing status updated
- failure is recoverable

---

## TASK-017 — OCR abstraction

Status: BLOCKED

Goal:
Add OCR fallback for scanned PDFs.

Acceptance:
- provider behind interface
- OCR invoked only when necessary
- retryable
- original preserved

---

## TASK-018 — Metadata schema

Status: BLOCKED

Goal:
Store extracted metadata with confidence and source.

Fields include:
- case number
- CNR
- parties
- court
- judge
- dates
- legal sections
- document type

---

## TASK-019 — Deterministic case-number extraction

Status: BLOCKED

Goal:
Extract common legal case-number formats using rules/regex.

Acceptance:
- test cases for common formats
- normalized representation
- original value preserved
- false-positive tests

---

## TASK-020 — Document classification

Status: BLOCKED

Goal:
Classify documents into the MVP taxonomy.

Types:
- COURT_ORDER
- JUDGMENT
- PETITION
- APPLICATION
- AFFIDAVIT
- REPLY
- WRITTEN_STATEMENT
- EVIDENCE
- NOTICE
- VAKALATNAMA
- CORRESPONDENCE
- OTHER

---

# Milestone 5 — Case Matching

## TASK-021 — Candidate generation

Status: BLOCKED

Goal:
Generate likely case candidates without comparing every document against every case.

Priority:
1. exact case number
2. CNR/petition number
3. party search
4. court
5. fuzzy/entity signals
6. semantic matching only when needed

---

## TASK-022 — Deterministic matcher

Status: BLOCKED

Goal:
Score case candidates using deterministic signals.

Acceptance:
- configurable weights
- matching signals stored
- unit tests
- no LLM dependency for exact identifier matching

---

## TASK-023 — Matching decision engine

Status: BLOCKED

Goal:
Return:
- AUTO_MATCH
- CONFIRMATION_REQUIRED
- NO_MATCH

Acceptance:
- thresholds configurable
- thresholds not hard-coded in frontend
- decision is server-side

---

## TASK-024 — Match confirmation API

Status: BLOCKED

Goal:
Allow user to confirm a candidate case.

Acceptance:
- authorization
- case assignment
- audit event
- system filename
- search indexing

---

## TASK-025 — Reassignment

Status: BLOCKED

Goal:
Allow users to correct a filing.

Acceptance:
- case changes
- old/new case recorded
- audit event
- feedback record created

---

## TASK-026 — Match confirmation UI

Status: BLOCKED

Goal:
Display candidate case, extracted metadata, and reasons/signals.

Acceptance:
- high-confidence state
- ambiguous state
- no-match state
- correction flow

---

# Milestone 6 — Retrieval

## TASK-027 — Search index

Status: BLOCKED

Goal:
Index case/document metadata and extracted text.

---

## TASK-028 — Basic search API

Status: BLOCKED

Goal:
Search:
- case title
- case number
- party
- court
- filename
- document type
- extracted text

---

## TASK-029 — Search UI

Status: BLOCKED

Goal:
Build global search and result excerpts.

---

## TASK-030 — Document viewer/download

Status: BLOCKED

Goal:
Secure preview/download.

Acceptance:
- authorization before URL generation
- temporary signed URLs
- no permanent public URL

---

# Milestone 7 — Audit & Reliability

## TASK-031 — Audit trail

Status: BLOCKED

Goal:
Record important document actions.

---

## TASK-032 — Processing retry/idempotency

Status: BLOCKED

Goal:
Ensure jobs can safely retry.

Acceptance:
- no duplicate documents
- no duplicate case assignment
- no lost original
- clear failed state

---

## TASK-033 — End-to-end golden path

Status: BLOCKED

Goal:
Automate:

create case
→ upload PDF
→ process
→ match
→ file
→ search
→ open

---

# Milestone 8 — Evaluation

## TASK-034 — Create initial matching dataset

Status: BLOCKED

Goal:
Create 100 labeled test documents.

Ground truth:
- correct case
- document type
- relevant metadata

Use synthetic/public/anonymized documents.

---

## TASK-035 — Matching benchmark

Status: BLOCKED

Goal:
Measure:
- top-1 accuracy
- top-3 recall
- auto-match precision
- false auto-match rate
- automation rate

---

## TASK-036 — Calibrate thresholds

Status: BLOCKED

Goal:
Use benchmark results to determine safe AUTO_MATCH and CONFIRM thresholds.

---

# Milestone 9 — Pilot Readiness

## TASK-037 — Security review

Status: BLOCKED

Review:
- tenant isolation
- authorization
- storage
- signed URLs
- secrets
- logs
- upload validation
- prompt injection handling

---

## TASK-038 — UX review

Status: BLOCKED

Verify:
- upload-first experience
- clear processing
- clear uncertainty
- fast confirmation
- useful search
- empty/error states

---

## TASK-039 — Design-partner pilot

Status: BLOCKED

Target:
3–5 small law offices/chambers.

Measure:
- documents/day
- automation rate
- correction rate
- search success
- time-to-file
- repeat usage
- trust concerns

---

# Deferred

Do not build yet:

- WhatsApp
- Telegram
- email ingestion
- mobile app
- semantic search
- case timelines
- case summaries
- voice filing
- QR filing
- billing
- enterprise SSO
- advanced permissions
- private deployment
- autonomous legal reasoning

---

# Current next task

**TASK-014 — Duplicate detection.**
