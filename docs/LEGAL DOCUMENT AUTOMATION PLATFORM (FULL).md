# LEGAL DOCUMENT AUTOMATION PLATFORM
# MVP ENGINEERING & AI-CODING SPECIFICATION

## For Cursor / Claude Code / Codex / Gemini / AI Coding Agents

**Version:** 1.0  
**Status:** MVP Engineering Specification  
**Primary objective:** Build a working production-oriented MVP  
**Audience:** AI coding agents + human engineers

---

# 1. MISSION

Build the MVP of a legal document automation platform whose primary capability is:

> **A user uploads a legal document without selecting a case. The system extracts information, identifies the most likely case, asks for confirmation when uncertain, and files the document correctly.**

The MVP is fundamentally a **document ingestion + case matching system**.

It is NOT:

- a legal advice product
- a complete practice-management system
- a CRM
- a generic cloud drive
- an autonomous legal agent

The core product hypothesis is that software can replace the manual human routing layer between incoming documents and legal cases.

---

# 2. ENGINEERING PRIORITY

Order engineering priorities as follows:

```text
1. Data integrity
2. Security / tenant isolation
3. Reliable document ingestion
4. Correct case matching
5. Safe failure handling
6. Search / retrieval
7. UX polish
8. Performance optimization
9. Future intelligence
```

Do not sacrifice document integrity for AI convenience.

---

# 3. MVP ARCHITECTURE

Recommended architecture:

```text
                    WEB CLIENT
                        |
                        v
                  API / BACKEND
                        |
       +----------------+----------------+
       |                |                |
       v                v                v
 PostgreSQL       Object Storage       Queue
       |                                 |
       |                         +-------+-------+
       |                         |       |       |
       |                        OCR   Extract  Match
       |                         |       |       |
       +-------------------------+-------+-------+
                        |
                        v
                  Search Layer
```

Recommended initial stack:

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- component library such as shadcn/ui

### Backend

Prefer:

- TypeScript
- Node.js
- express

Do not create unnecessary microservices for MVP.

### Database

PostgreSQL. ( supabase ) for now...

### Storage

S3-compatible object storage.

Candidates:

- Supabase Storage

### Queue

Use a simple background-job mechanism.

Possible:

- BullMQ + Redis
- managed queue
- database-backed job system for very early prototype

### Search

Start with PostgreSQL full-text search.

Do NOT introduce Elasticsearch/OpenSearch/vector DB until required.

---

# 4. SYSTEM BOUNDARIES

Separate the system into these conceptual modules:

```text
Auth
Organization
Cases
Documents
Document Processing
Metadata Extraction
Document Classification
Case Matching
Search
Audit
Storage
```

The modules can live in one deployable application initially.

Do not over-engineer into independent services.

---

# 5. MULTI-TENANCY

Every organization is a tenant.

Conceptually:

```text
Organization A
 ├── Users
 ├── Cases
 └── Documents

Organization B
 ├── Users
 ├── Cases
 └── Documents
```

Every organization-owned database entity must include `organization_id` either directly or through an enforced relationship.

Never allow a user from Organization A to retrieve Organization B's:

- cases
- documents
- metadata
- search results
- audit events
- storage objects

Tenant isolation is a launch requirement.

The source architecture similarly requires every database record to be scoped to an organization.

---

# 6. DATABASE SCHEMA

Use PostgreSQL.

## organizations

```text
id UUID PRIMARY KEY
name TEXT NOT NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

## users

```text
id UUID PRIMARY KEY
organization_id UUID NOT NULL
name TEXT NOT NULL
email TEXT NOT NULL
role TEXT NOT NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

Roles initially:

```text
admin
member
```

Optionally:

```text
clerk
advocate
```

Do not overcomplicate permissions initially.

---

# 7. CASE MODEL

## cases

```text
id UUID PRIMARY KEY
organization_id UUID NOT NULL

title TEXT NOT NULL
case_number TEXT
cnr_number TEXT

court TEXT
judge TEXT

client_name TEXT
opposing_party TEXT

case_type TEXT
status TEXT

notes TEXT

created_by UUID
created_at TIMESTAMP
updated_at TIMESTAMP
```

Indexes:

- `(organization_id)`
- `(organization_id, case_number)`
- `(organization_id, cnr_number)`
- searchable text fields

---

# 8. DOCUMENT MODEL

## documents

```text
id UUID PRIMARY KEY

organization_id UUID NOT NULL
case_id UUID NULL

original_filename TEXT NOT NULL
system_filename TEXT

storage_key TEXT NOT NULL

mime_type TEXT
file_size BIGINT

sha256 TEXT NOT NULL

document_type TEXT
document_date DATE

processing_status TEXT NOT NULL

match_status TEXT
match_confidence NUMERIC

uploaded_by UUID NOT NULL
uploaded_at TIMESTAMP
updated_at TIMESTAMP
```

Important:

`case_id` may initially be NULL.

This is necessary because a document can exist while the matching engine is processing it.

---

# 9. DOCUMENT PROCESSING STATUS

Use an explicit state machine.

```text
UPLOADED
   ↓
QUEUED
   ↓
EXTRACTING
   ↓
CLASSIFYING
   ↓
MATCHING
   ↓
AWAITING_CONFIRMATION
   ↓
FILED
```

Failure states:

```text
PROCESSING_FAILED
OCR_FAILED
UNSUPPORTED
```

Do not use arbitrary boolean fields such as:

```text
processed = true
```

Use explicit states.

---

# 10. DOCUMENT MATCH STATUS

Separate processing status from matching status.

```text
NOT_STARTED
NO_MATCH
CANDIDATES_FOUND
AUTO_MATCHED
CONFIRMATION_REQUIRED
CONFIRMED
REASSIGNED
```

---

# 11. METADATA MODEL

Do not put every extracted field directly into the documents table.

Use structured metadata.

## document_metadata

```text
id UUID PRIMARY KEY
document_id UUID NOT NULL

field_name TEXT NOT NULL
field_value TEXT

confidence NUMERIC

source TEXT

created_at TIMESTAMP
updated_at TIMESTAMP
```

Example:

```text
field_name = case_number
field_value = WP 1234/2025
confidence = 0.99
source = DOCUMENT_TEXT
```

Possible source values:

```text
DOCUMENT_TEXT
OCR
FILENAME
AI
USER
SYSTEM
```

This allows the system to distinguish machine extraction from user-confirmed information.

---

# 12. AUDIT MODEL

## audit_events

```text
id UUID PRIMARY KEY

organization_id UUID NOT NULL
user_id UUID NULL

entity_type TEXT
entity_id UUID

event_type TEXT

metadata JSONB

created_at TIMESTAMP
```

Events:

```text
DOCUMENT_UPLOADED
DOCUMENT_PROCESSED
DOCUMENT_CLASSIFIED
DOCUMENT_MATCHED
DOCUMENT_CONFIRMED
DOCUMENT_REASSIGNED
DOCUMENT_DOWNLOADED
DOCUMENT_DELETED
DOCUMENT_RESTORED
METADATA_UPDATED
```

Audit logs should be append-only from the application perspective.

---

# 13. OBJECT STORAGE

Never store document binaries directly in PostgreSQL.

Use object storage.

Example:

```text
organizations/
  {organization_id}/
    documents/
      {document_id}/
        original.pdf
```

The exact key structure may vary.

Requirements:

- private bucket
- no public object URLs
- signed temporary download URLs
- server-side authorization before issuing URLs

---

# 14. DOCUMENT UPLOAD API

Suggested:

```http
POST /api/documents
```

Input:

```text
multipart/form-data
file=<PDF>
```

Optional:

```text
note
```

Response:

```json
{
  "id": "document-id",
  "status": "UPLOADED"
}
```

The API should:

1. authenticate user
2. validate organization
3. validate file type
4. validate file size
5. store original
6. calculate SHA-256
7. create database record
8. create processing job
9. return document ID

Do not perform expensive OCR/AI processing synchronously in the upload request.

---

# 15. FILE VALIDATION

Validate:

- MIME type
- extension
- actual file signature
- maximum size
- corruption

Never trust only the filename extension.

Reject unsupported files gracefully.

---

# 16. HASHING

Calculate SHA-256 during ingestion.

Example:

```text
file
 ↓
SHA-256
 ↓
document.sha256
```

Use the hash for exact duplicate detection.

If:

```text
organization_id + sha256
```

already exists, flag as duplicate.

Do not automatically delete the new upload.

Let the user decide.

---

# 17. DOCUMENT PROCESSING PIPELINE

Implement processing as jobs.

```text
UPLOAD
  ↓
CREATE DOCUMENT
  ↓
QUEUE PROCESSING
  ↓
TEXT EXTRACTION
  ↓
OCR FALLBACK
  ↓
METADATA EXTRACTION
  ↓
DOCUMENT CLASSIFICATION
  ↓
CASE CANDIDATE GENERATION
  ↓
CASE MATCHING
  ↓
DECISION
```

Each stage should be independently observable.

---

# 18. TEXT EXTRACTION

First attempt native PDF text extraction.

If extracted text is insufficient:

```text
PDF
 ↓
OCR
 ↓
Text
```

Do not OCR every PDF unnecessarily.

Store:

```text
raw_extracted_text
```

separately from the original document.

---

# 19. OCR

OCR should be replaceable.

Create an abstraction such as:

```typescript
interface OCRProvider {
  extractText(input: Buffer | StorageReference): Promise<OCRResult>;
}
```

This allows providers to change later.

OCR result should include:

```text
text
page information
confidence where available
provider
processing metadata
```

Do not hard-code the application to one OCR vendor.

---

# 20. METADATA EXTRACTION

Create an extraction service.

Conceptually:

```typescript
extractDocumentMetadata(text, filename)
```

Expected output:

```json
{
  "caseNumbers": [],
  "cnrNumbers": [],
  "parties": [],
  "courts": [],
  "judges": [],
  "advocates": [],
  "dates": [],
  "legalSections": [],
  "documentType": null
}
```

Each result must have confidence.

---

# 21. EXTRACTION STRATEGY

Use deterministic extraction before LLM extraction.

Example:

### Case number

Use regex/rules for known patterns.

Examples:

```text
WP 1234/2025
W.P. No. 1234 of 2025
CRL.M.C. 1234/2025
```

The exact patterns should evolve from the evaluation dataset.

### CNR

Use deterministic pattern matching.

### Dates

Use date extraction + contextual classification.

### Parties

Use document structure and NER/LLM extraction.

---

# 22. DOCUMENT CLASSIFICATION

Start with a fixed enum:

```text
COURT_ORDER
JUDGMENT
PETITION
APPLICATION
AFFIDAVIT
REPLY
WRITTEN_STATEMENT
EVIDENCE
NOTICE
VAKALATNAMA
CORRESPONDENCE
OTHER
```

The classifier should return:

```json
{
  "type": "COURT_ORDER",
  "confidence": 0.96
}
```

User corrections should be recorded.

---

# 23. CASE CANDIDATE GENERATION

Do not compare every document against every case using an LLM.

Use candidate generation.

Example:

```text
Document
   ↓
Extract case number
   ↓
Exact DB lookup
   ↓
If candidates exist → rank them
   ↓
Otherwise search parties
   ↓
Otherwise search court
   ↓
Otherwise semantic candidate generation
```

This makes matching cheaper and more reliable.

---

# 24. CASE MATCHING ENGINE

Implement the matcher as a separate module.

Example:

```typescript
matchDocumentToCases(
  documentMetadata,
  candidateCases
): MatchResult[]
```

Return:

```json
[
  {
    "caseId": "...",
    "score": 0.96,
    "signals": [
      {
        "type": "CASE_NUMBER",
        "match": true,
        "weight": 0.60
      },
      {
        "type": "PARTY",
        "match": true,
        "weight": 0.20
      },
      {
        "type": "COURT",
        "match": true,
        "weight": 0.10
      }
    ]
  }
]
```

The exact weighting should be configurable.

Do not bury scoring logic inside an LLM prompt.

---

# 25. MATCHING LAYERS

Implement:

## Layer 1 — Exact

- case number
- CNR
- petition number

## Layer 2 — Entity

- client
- opposing party
- court
- judge
- advocate

## Layer 3 — Fuzzy

Handle:

```text
Rajesh Kumar
R. Kumar
Rajesh K.
Rajesh Kumar S/o ...
```

## Layer 4 — Context

Use:

- document type
- dates
- previous documents
- known case metadata

## Layer 5 — Semantic

Use embeddings/LLM only when necessary.

This follows the layered matching approach defined in the original product concept.

---

# 26. MATCHING POLICY

The system should support three decisions.

## AUTO_MATCH

High-confidence result.

```text
Document → Case A
```

No user intervention required.

## CONFIRM

Reasonably likely but not sufficiently safe.

```text
Possible cases:
A — 91%
B — 61%
```

Ask user.

## NO_MATCH

No sufficiently credible candidate.

Ask user to:

- select existing case
- create case

---

# 27. IMPORTANT: DO NOT TRUST RAW MODEL CONFIDENCE

An LLM saying:

```text
confidence = 0.96
```

does not mean the prediction is actually 96% reliable.

The application should maintain its own matching score/calibration.

Measure actual accuracy against the evaluation dataset.

Confidence displayed to users should eventually be calibrated against observed precision.

---

# 28. MATCHING THRESHOLDS

Do not hard-code final thresholds before evaluation.

Start with configurable values:

```text
AUTO_MATCH_THRESHOLD
CONFIRM_THRESHOLD
```

Example initial configuration:

```text
AUTO_MATCH_THRESHOLD = 0.92
CONFIRM_THRESHOLD = 0.65
```

These are starting hypotheses only.

The evaluation dataset should determine final values.

---

# 29. HUMAN CONFIRMATION

When confirmation is required:

API:

```http
POST /api/documents/:id/confirm-match
```

Body:

```json
{
  "caseId": "..."
}
```

The API must:

1. verify user authorization
2. verify case belongs to same organization
3. assign case
4. update match status
5. create audit event
6. generate final system filename
7. index document
8. return updated document

---

# 30. REASSIGNMENT

Users must be able to correct a filing.

```http
POST /api/documents/:id/reassign
```

Body:

```json
{
  "caseId": "..."
}
```

Record:

```text
old_case_id
new_case_id
user_id
timestamp
reason if provided
```

This is important both for auditability and future matching improvements.

---

# 31. FILE NAMING

Generate a normalized filename.

Example:

```text
08-Aug-2026_Court-Order_WP-1234-2025.pdf
```

Function:

```typescript
generateSystemFilename(document): string
```

Requirements:

- deterministic
- filesystem-safe
- preserve extension
- avoid collisions
- preserve original filename separately

---

# 32. SEARCH

MVP search should use PostgreSQL.

Search across:

```text
case title
case number
CNR
client
opposing party
court
document filename
document type
extracted text
```

Example endpoint:

```http
GET /api/search?q=Rajesh+Kumar
```

Filters:

```text
caseId
documentType
court
dateFrom
dateTo
```

---

# 33. FULL-TEXT SEARCH

Create a PostgreSQL full-text index over extracted text.

Potential structure:

```text
documents_search
```

or a generated `tsvector`.

Search results should include:

```text
document
case
document type
date
relevant excerpt
```

Do not build vector search in the first implementation unless conventional search demonstrably fails.

---

# 34. SEARCH INDEXING

Index a document only after:

- document exists
- text extraction completed
- case association is confirmed
- metadata is available

If the document is later reassigned, update the searchable case association.

---

# 35. DOCUMENT RETRIEVAL

Endpoint:

```http
GET /api/documents/:id
```

Must return metadata but not a permanent public storage URL.

For download:

```http
GET /api/documents/:id/download
```

Backend:

1. authenticate
2. authorize
3. generate signed URL
4. return temporary URL

---

# 36. SECURITY MODEL

Minimum:

- HTTPS
- secure authentication
- password hashing
- organization isolation
- authorization on every resource
- private object storage
- signed downloads
- audit logs
- secure sessions
- rate limiting
- input validation
- file validation
- backup strategy

Never rely on frontend checks for authorization.

---

# 37. AUTHORIZATION

Every API request involving:

- organization
- case
- document
- audit event

must verify ownership/permission server-side.

Bad:

```typescript
if (user) {
  return document;
}
```

Good:

```typescript
if (
  document.organizationId !== user.organizationId
) {
  throw ForbiddenError;
}
```

All nested resources must be tenant-scoped.

---

# 38. FILE SECURITY

Uploaded files are untrusted input.

Consider:

- file signature validation
- file-size limits
- malware scanning where available
- safe PDF parsing
- sandboxing expensive processing
- preventing path traversal
- avoiding executable uploads

Never construct filesystem paths directly from user-controlled filenames.

---

# 39. ERROR HANDLING

Every processing stage must have explicit errors.

Example:

```text
UPLOAD_FAILED
TEXT_EXTRACTION_FAILED
OCR_FAILED
METADATA_EXTRACTION_FAILED
CLASSIFICATION_FAILED
MATCHING_FAILED
INDEXING_FAILED
```

A failure in AI processing must NOT delete the original document.

---

# 40. RETRY STRATEGY

Background jobs should support retry.

For transient errors:

```text
retry
retry
retry
```

For permanent errors:

```text
mark failed
notify user
retain original
```

Avoid infinite retries.

---

# 41. IDEMPOTENCY

Processing jobs must be safe to retry.

For example:

If OCR runs twice, it should not create two documents.

If matching runs twice, it should not create duplicate case associations.

Use:

- document ID
- job ID
- unique constraints
- processing state

where appropriate.

---

# 42. OBSERVABILITY

Track:

- upload success rate
- processing duration
- OCR duration
- extraction duration
- matching duration
- processing failures
- automatic match rate
- correction rate
- search latency

Every document should have a traceable processing lifecycle.

---

# 43. AI PROVIDER ABSTRACTION

Do not hard-code business logic directly against one AI vendor.

Create interfaces.

Example:

```typescript
interface MetadataExtractor {
  extract(input: ExtractionInput): Promise<MetadataExtractionResult>;
}

interface DocumentClassifier {
  classify(input: ClassificationInput): Promise<ClassificationResult>;
}

interface SemanticMatcher {
  findCandidates(input: MatchingInput): Promise<Candidate[]>;
}
```

Providers can then be swapped.

---

# 44. LLM PROMPT DESIGN

LLMs should return structured output.

Do NOT request prose such as:

> "Analyze this document and tell me what case it belongs to."

Instead require JSON schema output.

Example:

```json
{
  "document_type": "COURT_ORDER",
  "document_date": "2026-08-08",
  "case_numbers": [
    "WP 1234/2025"
  ],
  "parties": [
    "Rajesh Kumar",
    "State of Uttar Pradesh"
  ],
  "court": "Allahabad High Court",
  "legal_sections": [
    "Section 138"
  ]
}
```

Validate all LLM output against a schema.

Reject malformed output.

---

# 45. LLM SAFETY

Treat document content as untrusted data.

A legal document could contain text such as:

> "Ignore previous instructions..."

The model must treat document text as content to extract, not instructions.

Use strong separation between:

```text
SYSTEM INSTRUCTIONS
USER / DOCUMENT CONTENT
```

Never allow document text to override system behavior.

---

# 46. LEGAL AI BOUNDARY

The MVP should not generate:

- legal advice
- legal conclusions
- strategy
- recommendations
- autonomous legal interpretation

It may extract:

- case number
- parties
- dates
- court
- document type
- sections referenced

It may help retrieve documents.

It should not pretend that extracted information constitutes legal advice.

The original product specification deliberately keeps the initial product focused on administrative automation and document intelligence.

---

# 47. API SURFACE

Suggested initial API:

## Auth

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Organizations

```text
GET  /api/organization
PATCH /api/organization
```

## Cases

```text
GET  /api/cases
POST /api/cases
GET  /api/cases/:id
PATCH /api/cases/:id
```

## Documents

```text
POST /api/documents
GET  /api/documents/:id
DELETE /api/documents/:id
GET  /api/documents/:id/download
```

## Processing

```text
GET /api/documents/:id/status
```

## Matching

```text
GET  /api/documents/:id/matches
POST /api/documents/:id/confirm-match
POST /api/documents/:id/reassign
```

## Search

```text
GET /api/search
```

## Audit

```text
GET /api/audit
```

The exact routing framework may differ.

---

# 48. CASE API BEHAVIOR

Creating a case:

```http
POST /api/cases
```

Example:

```json
{
  "title": "Rajesh Kumar vs State",
  "caseNumber": "WP 1234/2025",
  "court": "Allahabad High Court",
  "clientName": "Rajesh Kumar",
  "opposingParty": "State of Uttar Pradesh"
}
```

The backend should normalize fields where appropriate.

For example:

- trim whitespace
- normalize case-number formatting
- preserve original value if needed

---

# 49. DATA NORMALIZATION

Legal identifiers can appear in different forms.

Potentially normalize:

```text
WP 1234/2025
W.P. 1234/2025
WP No. 1234 of 2025
```

into a canonical representation where safely possible.

But preserve the original extracted value.

Do not perform destructive normalization.

---

# 50. CASE MATCHING EXAMPLE

Existing:

```text
Case A
Rajesh Kumar vs State
WP 1234/2025
Allahabad High Court
```

Document contains:

```text
WP 1234/2025
Rajesh Kumar
Allahabad High Court
Order dated 08/08/2026
```

Expected:

```text
Case A
Score: very high
Decision: AUTO_MATCH
```

---

# 51. AMBIGUOUS EXAMPLE

Existing:

```text
Case A
Rajesh Kumar vs State
WP 1234/2025

Case B
Rajesh Kumar vs ABC Ltd
WP 882/2024
```

Document:

```text
Rajesh Kumar
```

No case number.

Expected:

```text
Candidate A
Candidate B

Decision:
CONFIRMATION_REQUIRED
```

Never automatically choose based solely on name.

---

# 52. NO-MATCH EXAMPLE

Document:

```text
Unknown party
Unknown case number
Unknown court
```

Expected:

```text
NO_MATCH
```

User can:

```text
Choose existing case
OR
Create new case
```

---

# 53. DOCUMENT CORRECTION FEEDBACK

When user changes:

```text
Case A → Case B
```

store this as structured feedback.

Example:

```json
{
  "documentId": "...",
  "predictedCaseId": "...",
  "correctCaseId": "...",
  "correctedBy": "...",
  "timestamp": "..."
}
```

This data becomes extremely valuable later.

---

# 54. EVALUATION DATASET

Before launch, build an evaluation dataset.

Recommended:

**500–2,000 documents**

Preferably covering:

- different courts
- different document types
- different scanning quality
- multiple cases with same parties
- missing case numbers
- inconsistent filenames
- duplicate files
- OCR errors

Each document needs ground truth.

---

# 55. MATCHING METRICS

Track:

### Top-1 accuracy

Correct case is #1.

### Top-3 recall

Correct case is within first 3 candidates.

### Auto-match precision

Of automatically filed documents, how many are correct?

### Automation rate

Percentage of all uploads automatically filed.

### False auto-match rate

Percentage of automatically filed documents that were wrong.

This is a critical safety metric.

---

# 56. TARGETS

Initial hypotheses:

```text
Auto-match precision:
>95%

Automatic filing rate:
>70–80%

Top-3 candidate recall:
>95%

Processing success:
>98%

Search success:
>90%
```

These are product hypotheses, not promises.

A lower automation rate with extremely high precision may be preferable to aggressive automation.

---

# 57. WHY PRECISION MATTERS

A system that says:

> "I don't know."

is frustrating.

A system that confidently files a legal document into the wrong case can be dangerous.

Therefore:

```text
Precision > Automation Rate
```

at the beginning.

After trust and calibration improve:

```text
Automation Rate ↑
```

---

# 58. SEARCH IMPLEMENTATION

Start with PostgreSQL.

Potential fields:

```text
case.title
case.case_number
case.client_name
case.opposing_party
case.court

document.original_filename
document.system_filename
document.document_type
document.document_date

document.extracted_text
```

Use PostgreSQL full-text search.

Add indexes based on real query patterns.

---

# 59. FUTURE SEMANTIC SEARCH

Do not implement initially unless needed.

Future:

```text
"Find the latest order discussing limitation."
```

could use:

```text
Query
 ↓
Embedding
 ↓
Hybrid retrieval
 ↓
Metadata filtering
 ↓
Relevant excerpts
 ↓
Source document
```

But MVP should first establish strong keyword/metadata retrieval.

---

# 60. TESTING STRATEGY

Tests should exist at four levels.

## Unit

Test:

- case-number parser
- date parser
- filename generator
- normalization
- match scoring
- permission functions

## Integration

Test:

- upload → database
- upload → storage
- processing jobs
- matching
- search
- authorization

## End-to-end

Test:

```text
Create case
↓
Upload document
↓
Process
↓
Match
↓
Confirm
↓
Search
↓
Open
```

## Evaluation

Run the matching engine against the labeled legal-document dataset.

---

# 61. CRITICAL UNIT TESTS

At minimum:

### Case number

Input:

```text
WP No. 1234 of 2025
```

Expected:

```text
WP 1234/2025
```

### Duplicate

Same file twice.

Expected:

```text
duplicate = true
```

### Tenant isolation

User A requests document belonging to User B.

Expected:

```text
403
```

### Wrong case correction

Document initially assigned Case A.

User selects Case B.

Expected:

```text
case_id = B
audit event created
```

### Processing retry

Job executes twice.

Expected:

```text
one logical document
```

---

# 62. PERFORMANCE TARGETS

For a normal PDF:

### Upload response

Target:

**<2 seconds**

The upload request should not wait for processing.

### Processing

Target:

**<30 seconds** for typical documents.

Long documents may take longer.

### Search

Target:

**<500ms** for normal search queries.

These are engineering targets, not hard launch blockers.

---

# 63. COST CONTROL

AI processing can become expensive.

Optimize in this order:

```text
Deterministic extraction
        ↓
Database candidate search
        ↓
Cheap classification/extraction
        ↓
LLM only when necessary
```

Do not send entire documents to an expensive model if a case number already provides an exact match.

---

# 64. AI PROCESSING STRATEGY

Example:

```text
Document
   ↓
Extract text
   ↓
Regex case number
   |
   +---- Found
   |       ↓
   |   DB lookup
   |       ↓
   |   Strong match
   |
   +---- Not found
           ↓
       Extract parties
           ↓
       Candidate search
           ↓
       Fuzzy matching
           ↓
       Semantic matching if needed
```

This should dramatically reduce AI usage.

---

# 65. BACKGROUND JOBS

Recommended jobs:

```text
document.extract_text
document.ocr
document.extract_metadata
document.classify
document.match
document.index
```

Each job should:

- receive document ID
- load current state
- perform one responsibility
- update status
- log errors
- be retryable

Avoid a giant job that performs everything.

---

# 66. JOB ORCHESTRATION

Conceptually:

```text
Upload
 ↓
extract_text
 ↓
if OCR needed
   ↓
ocr
 ↓
extract_metadata
 ↓
classify
 ↓
match
 ↓
decision
 ↓
index
```

A workflow/orchestrator can later replace simple queue chaining.

---

# 67. TRANSACTIONAL INTEGRITY

When filing a document:

The following should be logically consistent:

```text
document.case_id
document.match_status
document.system_filename
audit event
search index
```

Avoid a state where the UI says "filed" but the database still has no case.

Use transactions where appropriate.

For external systems such as search indexing, use retryable asynchronous updates.

---

# 68. DOCUMENT DELETION

Do not immediately hard-delete documents.

For MVP, prefer soft deletion:

```text
deleted_at
deleted_by
```

The original file can later be permanently deleted according to retention policy.

Every deletion should create an audit event.

---

# 69. DOCUMENT VERSIONING

Full versioning is out of scope.

MVP only needs:

- original uploaded file
- immutable original
- metadata changes
- audit history

Do not implement Google-Docs-style versioning.

---

# 70. BACKUPS

At minimum:

- database backups
- object-storage durability
- documented restore process

A legal-document product must assume accidental deletion or infrastructure failure can happen.

---

# 71. ENVIRONMENT STRUCTURE

Use:

```text
development
staging
production
```

Never point development AI processing at production data.

Never use production legal documents for debugging without proper controls.

---

# 72. SECRETS

Never commit:

- API keys
- database credentials
- storage credentials
- JWT secrets
- AI provider keys

Use environment variables / secret manager.

---

# 73. LOGGING

Log:

- request ID
- organization ID where safe
- document ID
- job ID
- processing stage
- duration
- error class

Do NOT log entire legal document contents or sensitive extracted data unnecessarily.

---

# 74. PRIVACY

Minimize sensitive data in logs.

Avoid:

```text
console.log(fullDocumentText)
```

Avoid logging entire uploaded PDFs.

Use identifiers.

---

# 75. FRONTEND/BACKEND CONTRACT

The frontend should not implement business decisions.

For example:

Bad:

```typescript
if (confidence > 0.9) {
   autoFile();
}
```

The backend owns the final filing decision.

Frontend should display the backend state:

```text
AUTO_MATCHED
CONFIRMATION_REQUIRED
NO_MATCH
```

This keeps business logic centralized.

---

# 76. RECOMMENDED PROJECT STRUCTURE

Example:

```text
src/
  app/
  components/
  features/
    auth/
    cases/
    documents/
    search/
  server/
    auth/
    cases/
    documents/
    processing/
    matching/
    search/
    audit/
    storage/
  lib/
    db/
    validation/
    logging/
  workers/
    extract-text/
    ocr/
    metadata/
    classification/
    matching/
    indexing/
  types/
```

The exact framework may differ.

The important principle is separation of responsibilities.

---

# 77. VALIDATION

Use schema validation everywhere.

For example:

- API request bodies
- extracted AI output
- database boundaries
- configuration

Recommended TypeScript schema library:

```text
Zod
```

But the implementation may choose an equivalent.

---

# 78. AI OUTPUT VALIDATION

LLM output should go through:

```text
LLM
 ↓
JSON parse
 ↓
Schema validation
 ↓
Normalization
 ↓
Business validation
 ↓
Database
```

Never:

```text
LLM
 ↓
Database
```

---

# 79. MODEL FALLBACKS

AI providers can fail.

Build provider abstraction so that:

```text
Primary provider
      ↓ failure
Fallback provider
      ↓ failure
Mark extraction uncertain
```

Do not make provider failure equal document loss.

---

# 80. ADMIN / DEBUG TOOLS

For MVP development, build an internal-only debug view or API that allows engineers to inspect:

- extracted text
- extracted metadata
- candidate cases
- matching scores
- matching signals
- processing errors
- job history

This does not need to be exposed to normal users.

It will dramatically accelerate model evaluation.

---

# 81. MATCH EXPLANATIONS

Store matching signals.

Example:

```json
{
  "caseNumber": {
    "match": true,
    "weight": 0.6
  },
  "clientName": {
    "match": true,
    "weight": 0.2
  },
  "court": {
    "match": true,
    "weight": 0.1
  }
}
```

This enables:

- debugging
- user explanations
- evaluation
- future model improvement

---

# 82. LEARNING LOOP

Every correction should become evaluation data.

```text
Prediction
   ↓
User correction
   ↓
Ground truth
   ↓
Evaluation dataset
   ↓
Improve matcher
   ↓
Re-evaluate
```

Do not automatically retrain production models from every correction.

First collect and validate the data.

---

# 83. MVP DEVELOPMENT PHASES

## Phase 1 — Foundation

Build:

- repository
- authentication
- organization
- database
- storage
- basic frontend shell

---

## Phase 2 — Cases

Build:

- case creation
- case list
- case detail
- case search

---

## Phase 3 — Upload

Build:

- PDF upload
- validation
- object storage
- hashing
- document record

---

## Phase 4 — Processing

Build:

- extraction
- OCR fallback
- metadata extraction
- classification

---

## Phase 5 — Matching

Build:

- candidate generation
- deterministic matching
- fuzzy matching
- scoring
- confirmation workflow

This is the most important phase.

---

## Phase 6 — Retrieval

Build:

- search
- excerpts
- document viewer
- download

---

## Phase 7 — Trust/Security

Build:

- audit
- permissions
- error handling
- signed URLs
- tenant isolation
- backups

---

## Phase 8 — Pilot

Deploy to a small number of design partners.

Measure real performance.

---

# 84. AI CODING AGENT EXECUTION RULES

When an AI coding agent is implementing this project:

### Rule 1

Do not implement future roadmap features unless explicitly requested.

### Rule 2

Do not replace deterministic logic with an LLM unnecessarily.

### Rule 3

Do not invent undocumented business behavior.

### Rule 4

Do not bypass authorization for convenience.

### Rule 5

Do not expose storage buckets publicly.

### Rule 6

Do not hard-code AI confidence thresholds into frontend code.

### Rule 7

Do not put legal document contents into logs.

### Rule 8

Write tests for every core matching behavior.

### Rule 9

Keep external providers behind interfaces.

### Rule 10

Prefer the simplest architecture that can support the MVP.

---

# 85. AI CODING AGENT WORKFLOW

The coding agent should work in this order:

```text
Read specification
      ↓
Inspect repository
      ↓
Propose architecture
      ↓
Create database schema
      ↓
Implement auth
      ↓
Implement cases
      ↓
Implement storage
      ↓
Implement upload
      ↓
Implement processing pipeline
      ↓
Implement extraction
      ↓
Implement matching
      ↓
Implement confirmation
      ↓
Implement search
      ↓
Implement audit
      ↓
Write tests
      ↓
Run end-to-end flow
      ↓
Fix issues
```

Do not build the entire application in one giant generation step.

---

# 86. DEFINITION OF DONE

The MVP is complete when a new user can:

```text
Sign up
 ↓
Create organization
 ↓
Create a case
 ↓
Upload PDF
 ↓
Wait for processing
 ↓
See extracted metadata
 ↓
See matched case
 ↓
Confirm if necessary
 ↓
Document is filed
 ↓
Open case
 ↓
Find document
 ↓
Search document
 ↓
Download document
```

And the system reliably records:

- who uploaded
- what was extracted
- which case was selected
- whether AI matched it
- whether the user corrected it
- who downloaded it

---

# 87. MVP ACCEPTANCE TEST

Use this exact scenario for the first complete end-to-end test.

## Setup

Create:

```text
Case:
Rajesh Kumar vs State

Case number:
WP 1234/2025

Court:
Allahabad High Court
```

Upload:

```text
08-Aug-2026-order.pdf
```

Document contains:

```text
WP 1234/2025
Rajesh Kumar
State of Uttar Pradesh
Allahabad High Court
Order dated 08 August 2026
```

Expected system behavior:

```text
Upload
 ↓
Extract text
 ↓
Extract case number
 ↓
Find WP 1234/2025
 ↓
Match case
 ↓
Classify as Court Order
 ↓
Extract date
 ↓
Generate filename
 ↓
File under case
 ↓
Index
```

Expected final state:

```text
Case:
Rajesh Kumar vs State

Documents:
+ Court Order
  08-Aug-2026_Court-Order_WP-1234-2025.pdf
```

---

# 88. SECOND ACCEPTANCE TEST — AMBIGUITY

Create:

```text
Case A:
Rajesh Kumar vs State
WP 1234/2025

Case B:
Rajesh Kumar vs ABC Ltd
WP 882/2024
```

Upload a document containing only:

```text
Rajesh Kumar
```

Expected:

```text
NO automatic filing

Candidates:
Case A
Case B

User must choose.
```

This test is critical.

---

# 89. THIRD ACCEPTANCE TEST — TENANT ISOLATION

Create:

```text
Organization A
Case A
Document A

Organization B
Case B
Document B
```

Authenticate as Organization A.

Attempt:

```http
GET /api/documents/{documentB}
```

Expected:

```text
403 Forbidden
```

The same test must be performed for:

- cases
- search
- downloads
- audit logs

---

# 90. FOURTH ACCEPTANCE TEST — RETRY

Upload a document.

Force OCR/extraction failure.

Retry processing.

Expected:

```text
One document
One original file
No duplicate case
No duplicate audit records
Final processing state correct
```

---

# 91. FIFTH ACCEPTANCE TEST — CORRECTION

System predicts:

```text
Case A
```

User selects:

```text
Case B
```

Expected:

```text
document.case_id = Case B
match_status = REASSIGNED
audit event created
search result reflects Case B
```

---

# 92. LAUNCH BLOCKERS

Do not launch the MVP if any of these are true:

- cross-tenant document access is possible
- documents can be lost during processing
- incorrect automatic matches are silently hidden
- original files can be overwritten
- storage is publicly accessible
- authentication can be bypassed
- AI output can directly corrupt database state
- no audit trail exists for filing corrections
- search exposes another organization's documents

---

# 93. NON-BLOCKERS

These can wait:

- beautiful animations
- semantic search
- mobile application
- advanced dashboards
- WhatsApp
- Telegram
- timeline
- summaries
- legal AI
- advanced billing
- enterprise SSO

---

# 94. LONG-TERM ARCHITECTURAL EXTENSIONS

Design the MVP so future capabilities can be added without rebuilding the core.

Future:

```text
Universal Intake
       |
       +--- Web
       +--- Mobile
       +--- Email
       +--- WhatsApp
       +--- Telegram
       +--- Drive
       +--- API
              |
              v
       DOCUMENT PIPELINE
              |
              v
        CASE INTELLIGENCE
```

The source product vision explicitly treats the universal intake layer and downstream document engine as reusable infrastructure.

---

# 95. LONG-TERM CASE GRAPH

The data model should eventually support relationships such as:

```text
                 CASE
                  |
      +-----------+-----------+
      |           |           |
   PEOPLE     DOCUMENTS     EVENTS
      |           |           |
   Lawyers       Orders     Hearings
   Parties       Pleadings  Filings
                 Evidence   Dates
```

Do not build a graph database in MVP.

PostgreSQL relational structures are sufficient.

---

# 96. FUTURE MIGRATION

Historical imports can later use the same processing pipeline:

```text
Telegram export
       ↓
Drive
       ↓
Local folder
       ↓
Email archive
       ↓
      IMPORT
         ↓
     OCR/Text
         ↓
     Extraction
         ↓
      Matching
         ↓
       Filing
```

This is why document processing should be decoupled from the web upload endpoint.

---

# 97. CORE ENGINEERING PRINCIPLES

### Principle 1

**Original documents are sacred.**

Never modify or lose the original.

### Principle 2

**AI is fallible.**

Every AI decision must be recoverable and correctable.

### Principle 3

**Deterministic signals first.**

Use exact identifiers wherever possible.

### Principle 4

**Human exceptions are a feature.**

Asking the user is better than confidently guessing.

### Principle 5

**Security is foundational.**

Treat every legal document as sensitive.

### Principle 6

**Keep the architecture boring.**

A simple reliable system beats a sophisticated fragile system.

### Principle 7

**Build the learning loop from day one.**

Corrections become evaluation data.

---

# 98. FINAL ENGINEERING DEFINITION

The MVP is a system that performs:

```text
             LEGAL DOCUMENT
                    |
                    v
             SECURE INGESTION
                    |
                    v
            TEXT / OCR EXTRACTION
                    |
                    v
           STRUCTURED EXTRACTION
                    |
          +---------+---------+
          |                   |
          v                   v
     CLASSIFICATION       CASE MATCHING
                              |
                    +---------+---------+
                    |                   |
                 HIGH                LOW
                    |                   |
                    v                   v
                AUTO-FILE          ASK USER
                    |                   |
                    +---------+---------+
                              |
                              v
                         CASE RECORD
                              |
                              v
                           SEARCH
```

The most important engineering outcome is:

> **A reliable, measurable, secure case-matching pipeline.**

Everything else supports that pipeline.

---

# 99. FINAL BUILD PRIORITY

If engineering time becomes constrained, prioritize in exactly this order:

```text
1. Secure upload
2. Original file preservation
3. Text/OCR extraction
4. Case-number extraction
5. Candidate case retrieval
6. Case matching
7. Human confirmation
8. Filing
9. Search
10. Audit
11. UI polish
```

Do not sacrifice #1–#8 to build advanced AI features.

---

# 100. FINAL PRODUCT TEST

At the end of MVP development, ask:

> **Can an advocate upload a PDF without selecting a case, and can our system correctly file it into the right case most of the time—while safely asking for help when it is uncertain?**

If yes:

**The MVP works.**

If no:

Do not move on to timelines, summaries, WhatsApp, semantic search, or autonomous legal intelligence.

Fix case filing first.