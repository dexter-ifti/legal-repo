# PRD — Legal Document Automation & Case Intelligence
## MVP: Automatic Case Filing

**Status:** Draft  
**Product stage:** MVP  
**Primary market:** Indian advocates, chambers, and small law firms  
**Primary platform:** Web application  
**Document version:** 1.0  
**Product principle:** Upload first. Let the system organize.

---

# 1. Executive Summary

We are building a legal document management platform that automatically identifies which case an uploaded legal document belongs to, extracts useful metadata, and files the document into the correct case.

Today, advocates and their assistants often receive documents through WhatsApp, Telegram, email, downloads, scans, and local folders. The difficult part is not storing the file. The difficult part is repeatedly deciding:

- Which case does this belong to?
- What should I name it?
- Where should I store it?
- What type of document is it?
- How will I find it later?

The product removes this manual routing step.

### MVP promise

> **Upload a legal document. We identify the case, extract the important information, and file it for you.**

The MVP should prove one fundamental hypothesis:

> **Can we reliably file incoming legal documents into the correct case without requiring the user to select the case first?**

The source concept explicitly identifies automatic case identification and filing as the initial wedge, with search and deeper case intelligence coming later.

---

# 2. Product Vision

The long-term vision is to become the **operating system for a law firm's case information**.

The user should eventually interact primarily with cases rather than folders, filenames, storage locations, OCR systems, or metadata.

However, the MVP deliberately does **not** attempt to build the entire vision.

### Long-term evolution

```text
                    LEGAL CASE OS
                         |
        +----------------+----------------+
        |                |                |
    Documents         People           Events
        |                |                |
        +----------------+----------------+
                         |
                    CASE GRAPH
                         |
        +----------------+----------------+
        |                |                |
      Search         Timeline       Intelligence
                         |
                  Workflow Automation
```

### MVP wedge

```text
UPLOAD
   ↓
EXTRACT
   ↓
IDENTIFY CASE
   ↓
CLASSIFY
   ↓
CONFIRM IF NEEDED
   ↓
FILE
   ↓
SEARCH
```

---

# 3. Problem Statement

## 3.1 Primary problem

Legal offices currently rely heavily on generic tools such as messaging applications, cloud drives, email, and local folders.

These tools store documents but do not understand the relationship between:

**document → case → parties → court → document type → date**

As a result, humans become the routing layer.

For every incoming document, someone has to determine where it belongs.

This creates:

- repetitive administrative work
- inconsistent filenames
- misplaced documents
- duplicate documents
- difficult retrieval
- dependency on individual clerks/assistants
- poor visibility into case records

The underlying problem is therefore:

> **Humans are manually organizing information that software should be able to understand.**

This is the central problem identified in the product concept.

---

# 4. Target Users

## Primary MVP user

### Advocate / Lawyer

Characteristics:

- handles multiple active cases
- receives documents frequently
- works primarily from PDF/scanned documents
- currently uses folders, WhatsApp, Telegram, email, Drive, or similar tools
- wants faster document retrieval
- does not want to perform administrative filing

### Secondary MVP user

### Clerk / Legal Assistant

Characteristics:

- receives and organizes documents on behalf of advocates
- performs repetitive filing and renaming
- knows the firm's cases well
- is likely to become a heavy user of the system

The initial target should be solo advocates, small chambers, and approximately 2–10 person offices rather than large enterprises.

---

# 5. Jobs To Be Done

## Primary JTBD

> When I receive a legal document, I want to upload it without thinking about where it belongs, so that it is automatically filed under the correct case.

## Secondary JTBDs

> When I need an old document, I want to search using information I remember rather than the exact filename.

> When the system is unsure which case a document belongs to, I want to quickly choose the correct case rather than manually filing the document.

> When I open a document, I want to know what information the system extracted and why it assigned the document to a particular case.

---

# 6. MVP Scope

## In scope

The MVP includes:

1. User authentication
2. Organization/workspace
3. Case creation
4. Case list
5. Web document upload
6. PDF support
7. OCR/text extraction
8. Metadata extraction
9. Case-number extraction
10. Party-name extraction
11. Court extraction where possible
12. Document-date extraction
13. Document-type classification
14. Automatic case matching
15. Confidence score
16. Candidate cases
17. Human confirmation for uncertain matches
18. Automatic document organization
19. System-generated filename
20. Original filename preservation
21. Basic case dashboard
22. Basic search
23. Document preview
24. Document download
25. Duplicate detection
26. Basic audit log
27. Secure object storage

These are aligned with the proposed MVP feature set in the source product specification.

---

# 7. Explicitly Out of Scope

Do **not** build these in the first MVP:

### Integrations

- WhatsApp integration
- Telegram integration
- Google Drive sync
- Dropbox sync
- OneDrive sync
- email ingestion
- mobile share sheet
- API
- desktop application

### Advanced AI

- autonomous legal advice
- legal strategy recommendations
- autonomous legal conclusions
- case-law recommendations
- autonomous filing decisions with legal consequences
- sophisticated AI agents

### Enterprise

- SSO
- private deployment
- on-premise deployment
- advanced compliance controls
- enterprise retention policies
- complex organizational hierarchy

### Product expansion

- billing system
- CRM
- calendaring
- task management
- court filing automation
- advanced analytics
- voice filing
- QR workflows
- advanced case timelines

The product should remain focused on **administrative automation + document intelligence**, rather than attempting to become an AI legal advisor.

---

# 8. Core User Flow

## Happy path

```text
Login
  ↓
Cases already exist
  ↓
Upload PDF
  ↓
System processes document
  ↓
Extract text
  ↓
Extract metadata
  ↓
Find matching cases
  ↓
Confidence is high
  ↓
Show result
  ↓
Auto-file
  ↓
Document becomes searchable
```

### Example

User uploads:

`order_final.pdf`

System detects:

```text
Case:
Rajesh Kumar vs State

Case Number:
WP 1234/2025

Court:
Allahabad High Court

Document Type:
Court Order

Document Date:
08 Aug 2026

Confidence:
96%
```

System generates:

`08-Aug-2026_Court-Order_WP-1234-2025.pdf`

Then files it under the case.

---

# 9. Critical UX Principle

## Upload first, ask questions later.

The user should **not** be forced to choose a case before uploading.

Bad:

```text
Select Case
↓
Select Document Type
↓
Enter Date
↓
Upload
```

Good:

```text
Upload
↓
AI processes
↓
"Looks like this belongs to..."
↓
Confirm only if necessary
```

This principle is fundamental to the product.

---

# 10. Feature Requirements

# 10.1 Authentication

Users should be able to:

- create an account
- log in
- log out
- reset password
- maintain a secure session

MVP authentication can remain simple.

Social login is optional and should not delay the core product.

---

# 10.2 Organization / Workspace

Every user belongs to an organization.

Example:

```text
Organization
└── ABC Chambers
    ├── Users
    ├── Cases
    └── Documents
```

Every case and document must belong to exactly one organization.

This is important for tenant isolation even in the MVP.

---

# 10.3 Case Creation

Users can manually create a case.

Minimum fields:

### Required

- Case title
- Case number

### Optional

- Client / primary party
- Opposing party
- Court
- CNR number
- Judge
- Case type
- Notes

Example:

```text
Case Title:
Rajesh Kumar vs State

Case Number:
WP 1234/2025

Court:
Allahabad High Court

Client:
Rajesh Kumar

Opposing Party:
State of Uttar Pradesh
```

The MVP should not require users to populate every field.

---

# 10.4 Case List

Users can see all cases.

Minimum information:

| Field | Description |
|---|---|
| Case | Case title |
| Case Number | Primary identifier |
| Court | Court name |
| Documents | Number of documents |
| Last Updated | Most recent activity |

Users should be able to search cases.

---

# 10.5 Document Upload

The primary MVP intake mechanism is web upload.

Supported:

- PDF
- scanned PDF
- text-based PDF

Potential future support:

- JPG
- PNG
- DOCX
- other formats

### Upload UX

The upload screen should be extremely simple.

```text
+--------------------------------------+
|                                      |
|       Drop legal document here       |
|                                      |
|        or [ Choose PDF ]              |
|                                      |
|   No need to select a case.          |
|   We'll identify it automatically.   |
|                                      |
+--------------------------------------+
```

Optional:

- note
- source
- upload context

These should never be mandatory.

---

# 10.6 Document Processing Pipeline

Once uploaded:

```text
Upload
  ↓
Virus/file validation
  ↓
Store original file
  ↓
Calculate SHA-256 hash
  ↓
Extract text
  ↓
OCR if necessary
  ↓
Extract metadata
  ↓
Classify document
  ↓
Find candidate cases
  ↓
Calculate confidence
  ↓
Decision
```

Processing should be asynchronous.

The user should see processing status.

Example:

```text
Processing document...

✓ Uploaded
✓ Text extracted
✓ Case information detected
✓ Document classified

Finding matching case...
```

---

# 10.7 OCR / Text Extraction

The system must be able to extract searchable text from scanned PDFs.

The pipeline should distinguish:

### Text PDF

```text
PDF
↓
Native text extraction
```

### Scanned PDF

```text
PDF
↓
OCR
↓
Extracted text
```

OCR output should be stored separately from the original document.

The original document must never be modified.

---

# 10.8 Metadata Extraction

The system should attempt to extract:

- case number
- CNR
- petition number
- client names
- opposing parties
- court
- judge
- advocate names
- document date
- referenced dates
- legal sections
- document type

The product concept specifically identifies these fields as candidate extraction signals.

Each extracted field should have an internal confidence score.

Example:

```json
{
  "case_number": {
    "value": "WP 1234/2025",
    "confidence": 0.99
  },
  "court": {
    "value": "Allahabad High Court",
    "confidence": 0.94
  }
}
```

The exact implementation is an engineering decision.

---

# 10.9 Document Classification

The MVP should classify documents into a limited controlled taxonomy.

Recommended initial types:

- Court Order
- Judgment
- Petition
- Application
- Affidavit
- Reply
- Written Statement
- Evidence
- Notice
- Vakalatnama
- Correspondence
- Other

Do not attempt to create an enormous taxonomy initially.

If confidence is low:

```text
Document Type
[ Court Order ▼ ]

Not sure?
[Change]
```

The user should be able to override the classification.

---

# 10.10 Case Matching Engine

This is the **most important component of the MVP**.

The system should use multiple signals rather than depending entirely on an LLM.

## Matching hierarchy

### Level 1 — Exact identifiers

Highest confidence:

- exact case number
- exact CNR
- exact petition number

Example:

```text
Document:
WP 1234/2025

Existing case:
WP 1234/2025

→ Very high confidence
```

### Level 2 — Entity matching

Compare:

- client
- opposing party
- court
- advocate
- related identifiers

Handle variations:

```text
Rajesh Kumar
R. Kumar
Rajesh K.
Rajesh Kumar S/o ...
```

### Level 3 — Document context

Use:

- document type
- dates
- court
- existing case documents
- historical metadata

### Level 4 — Semantic matching

Use semantic similarity when deterministic signals are insufficient.

Example:

```text
Candidate A
Rajesh Kumar vs State
WP 1234/2025
94%

Candidate B
Rajesh Kumar vs ABC Ltd
WP 882/2024
17%
```

The source specification recommends exactly this layered approach: deterministic extraction, fuzzy matching, classification, semantic matching, and human confirmation.

---

# 11. Matching Decision Policy

The system must never silently make a low-confidence guess.

Use three states.

## State A — High confidence

Example:

```text
Confidence: 96%
```

System can automatically file.

## State B — Medium confidence

Example:

```text
Confidence: 78%
```

Ask the user to confirm.

## State C — Low confidence

Example:

```text
Confidence: 41%
```

Do not guess.

Show:

```text
We couldn't confidently identify this case.

Possible matches:

1. Rajesh Kumar vs State
   WP 1234/2025

2. Rajesh Kumar vs ABC Ltd
   WP 882/2024

[Choose Case]

[Create New Case]
```

### Important

The exact numerical thresholds should be calibrated from real-world evaluation data.

Do **not** hard-code “90% = automatic” merely because it sounds reasonable.

The product team should determine thresholds using precision/recall and user correction data.

---

# 12. Confirmation UX

The confirmation screen should make the system's reasoning visible without overwhelming the user.

Example:

```text
┌─────────────────────────────────────┐
│ Document detected                   │
│                                     │
│ Court Order                         │
│ 08 Aug 2026                         │
│                                     │
│ Suggested case                      │
│                                     │
│ Rajesh Kumar vs State               │
│ WP 1234/2025                        │
│ Allahabad High Court                │
│                                     │
│ Match confidence: High              │
│                                     │
│ [ Confirm & File ]                  │
│ [ Choose another case ]             │
└─────────────────────────────────────┘
```

For high-confidence documents, confirmation may eventually become unnecessary.

For the initial MVP, keeping a visible confirmation step can help establish user trust and collect training/evaluation data.

---

# 13. Automatic Organization

Once a document is assigned to a case, the system should automatically organize it by document type.

Example:

```text
Rajesh Kumar vs State
WP 1234/2025

├── Orders
├── Pleadings
├── Evidence
├── Affidavits
├── Applications
├── Correspondence
└── Other
```

The user does not manually create these folders.

However, the underlying database should treat these primarily as metadata/categories rather than depending on physical folder structures.

---

# 14. File Naming

The system should generate a normalized filename.

Example:

```text
08-Aug-2026_Court-Order_WP-1234-2025.pdf
```

But preserve:

```text
original_filename
```

Example:

```text
Original:
order_final2.pdf

System:
08-Aug-2026_Court-Order_WP-1234-2025.pdf
```

This follows the source proposal to preserve both original and system-generated filenames.

---

# 15. Duplicate Detection

Calculate SHA-256 for every uploaded file.

If the same file already exists:

```text
This document appears to already exist.

Uploaded:
09 Aug 2026

Existing document:
09 Aug 2026

[View Existing]
[Upload Anyway]
```

The system should distinguish:

### Exact duplicate

Same file hash.

### Possible duplicate

Different file but highly similar content.

Only exact duplicate detection is required for MVP.

---

# 16. Case Dashboard

Every case should have a simple dashboard.

Example:

```text
RAJESH KUMAR VS STATE
WP 1234/2025
Allahabad High Court

Documents: 42
Last updated: 09 Aug 2026

[ Search this case ]

Orders              8
Pleadings            5
Evidence            11
Applications         7
Affidavits           4
Correspondence       6
Other                1
```

The dashboard is primarily for retrieval and validation.

Do not turn it into a complete case-management system in MVP.

---

# 17. Search

MVP search should focus on practical retrieval rather than sophisticated conversational AI.

## Searchable fields

- case title
- case number
- CNR
- client
- opposing party
- court
- filename
- document type
- extracted text

### Examples

```text
Rajesh Kumar
```

```text
WP 1234/2025
```

```text
Section 138
```

```text
court order
```

The source product specification identifies case search, case-number search, metadata search, full-text search, and eventually semantic search as the progression.

### MVP boundary

Start with:

**metadata search + full-text search**

Do not make natural-language semantic search a launch blocker.

---

# 18. Search Result UX

Search results should show enough context to identify the correct document immediately.

Example:

```text
Search: Section 138

42 results

┌────────────────────────────────────────┐
│ Court Order                            │
│ 08 Aug 2026                            │
│ Rajesh Kumar vs State                  │
│ WP 1234/2025                           │
│                                        │
│ "...the court considered Section 138..."│
└────────────────────────────────────────┘
```

For full-text results, highlight the relevant excerpt.

The user should always be able to open the original document.

---

# 19. Document Viewer

The viewer should support:

- PDF preview
- page navigation
- search within document
- download
- metadata display
- case information
- document type
- document date
- original filename
- system filename

Example:

```text
Document
Court Order

Case
Rajesh Kumar vs State

Date
08 Aug 2026

Type
Court Order

Case Number
WP 1234/2025

[Download]
```

---

# 20. Audit Log

Every important action should be recorded.

At minimum:

- upload
- processing
- classification
- case assignment
- metadata change
- download
- deletion
- restoration

Example:

```text
09 Aug 2026 10:31
Amit uploaded Order.pdf

09 Aug 2026 10:31
System classified document as Court Order

09 Aug 2026 10:31
System matched Case #182

09 Aug 2026 11:04
Priya downloaded document
```

The source concept identifies auditability and document integrity as important requirements for legal workflows.

---

# 21. Data Model

A minimal relational model:

```text
Organization
    |
    +---- Users
    |
    +---- Cases
              |
              +---- Documents
                         |
                         +---- DocumentMetadata
                         |
                         +---- AuditEvents
```

## Organization

```text
id
name
created_at
```

## User

```text
id
organization_id
name
email
role
created_at
```

## Case

```text
id
organization_id
title
case_number
cnr_number
court
client_name
opposing_party
created_at
updated_at
```

## Document

```text
id
organization_id
case_id
original_filename
system_filename
storage_key
mime_type
file_size
sha256
document_type
document_date
processing_status
match_confidence
uploaded_by
uploaded_at
```

## ExtractedMetadata

```text
id
document_id
field
value
confidence
source
```

`source` could distinguish:

```text
OCR
EXTRACTION
AI
USER
```

This distinction is important because the product should differentiate extracted facts from AI interpretations and user-confirmed information.

## AuditEvent

```text
id
organization_id
user_id
document_id
event_type
metadata
created_at
```

---

# 22. Architecture

Recommended MVP architecture:

```text
                   WEB APP
                      |
                      v
                 API SERVER
                      |
          +-----------+-----------+
          |                       |
          v                       v
      PostgreSQL             Object Storage
          |
          v
     Search Index
          |
          v
  Document Processing Queue
          |
     +----+----+----+----+
     |         |         |
    OCR    Extraction  Matching
```

The architecture should keep the storage layer abstracted so the provider can change later. The source document similarly recommends separating object storage, database, and search infrastructure.

---

# 23. Recommended MVP Technical Strategy

## Database

PostgreSQL.

Use it for:

- organizations
- users
- cases
- documents
- metadata
- audit events
- basic search

## Object storage

Use a private object-storage provider.

Candidates include:

- S3-compatible storage
- Cloudflare R2
- Supabase Storage

The exact provider should be selected based on engineering constraints, cost, and expected geography.

## Search

Start with PostgreSQL full-text search.

Do not introduce Elasticsearch/OpenSearch/vector infrastructure until usage demonstrates the need.

## Processing

Use an asynchronous job queue.

Reason:

OCR and AI processing should not block the main web request.

---

# 24. AI Architecture

Avoid a single "AI does everything" architecture.

Use a pipeline:

```text
             DOCUMENT
                 |
                 v
         TEXT EXTRACTION
                 |
                 v
        DETERMINISTIC RULES
                 |
                 v
       STRUCTURED EXTRACTION
                 |
                 v
        DOCUMENT CLASSIFIER
                 |
                 v
        CANDIDATE GENERATION
                 |
                 v
        MATCHING / RANKING
                 |
                 v
        CONFIDENCE DECISION
                 |
       +---------+---------+
       |                   |
     HIGH                LOW
       |                   |
       v                   v
    AUTO-FILE          ASK USER
```

This architecture is preferable because deterministic identifiers such as case numbers can be much more reliable than asking an LLM to infer everything.

---

# 25. AI Guardrails

The system must never present uncertain extracted information as fact.

For example:

```text
Case Number
WP 1234/2025
Confidence: 99%
Source: Document text
```

versus:

```text
Court
Allahabad High Court
Confidence: 72%
```

The user should be able to correct metadata.

Corrections should be captured for future model/evaluation improvements.

---

# 26. Security Requirements

Legal documents may contain highly confidential information.

MVP minimum:

- TLS/encryption in transit
- encryption at rest
- private object storage
- organization-level tenant isolation
- role-based access
- secure authentication
- signed document URLs
- audit logging
- session management
- backups
- deletion controls
- least-privilege service access

Never expose the object-storage bucket publicly.

The security requirements should be treated as launch requirements, not post-MVP polish.

---

# 27. MVP Roles

Keep roles simple.

## Admin

- manage organization
- manage users
- create/manage cases
- upload documents
- search
- download
- view audit log

## Advocate

- create cases
- upload documents
- search
- view/download documents

## Clerk

- upload documents
- manage documents
- search
- view cases

For the earliest prototype, these roles can potentially be simplified to:

```text
Admin
Member
```

Advanced permissions should not slow down validation.

---

# 28. Key Product Metrics

## North Star Metric

### Successfully automated document filing

Percentage of uploaded documents that reach the correct case **without manual case selection**.

This directly measures whether the core product promise works.

---

## Primary metrics

### 1. Automatic Filing Rate

```text
Documents automatically correctly filed
---------------------------------------
Total uploaded documents
```

Initial target:

**>80%**

Long-term target:

**>95%**

The source concept proposes these same directional targets.

---

### 2. Case Match Precision

Of documents the system automatically files:

> What percentage are actually filed into the correct case?

This is more important than raw automation rate.

---

### 3. Manual Correction Rate

```text
Documents requiring correction
------------------------------
Documents processed
```

Track separately:

- wrong case
- wrong document type
- wrong metadata

---

### 4. Time to File

Measure:

```text
Upload → Successfully filed
```

Target should eventually be near-real-time for normal PDFs.

---

### 5. Search Success Rate

When a user searches for a document:

> Did they find the intended document?

Measure through:

- click-through
- successful open
- user feedback
- failed searches

---

### 6. Weekly Active Users

Do users repeatedly return to:

- upload
- search
- retrieve documents?

---

### 7. Documents Processed

Useful secondary product activity metric.

---

# 29. MVP Success Criteria

The MVP should not be considered successful merely because users upload files.

The MVP succeeds if pilot users demonstrate:

### A.

They regularly upload documents without selecting a case first.

### B.

The system correctly identifies the case for the majority of documents.

### C.

Users trust the automatic filing enough to continue using it.

### D.

Users spend materially less time organizing documents.

### E.

Users can retrieve documents faster than with their previous workflow.

### F.

The product becomes part of their normal document workflow.

---

# 30. MVP Acceptance Criteria

## Upload

- User can upload a PDF.
- Original file is stored securely.
- Upload receives a unique document ID.
- SHA-256 hash is generated.
- Upload status is visible.

## Processing

- Text is extracted from text PDFs.
- OCR is attempted for scanned PDFs.
- Processing failures are visible.
- Original document remains unchanged.

## Extraction

The system attempts to identify:

- case number
- parties
- court
- document date
- document type

## Matching

- Existing case candidates are generated.
- Candidates are ranked.
- Confidence is calculated.
- High-confidence cases can be automatically assigned.
- Low-confidence cases require user intervention.

## Filing

- Document is associated with a case.
- Document type is stored.
- System filename is generated.
- Original filename is preserved.

## Search

User can search:

- case title
- case number
- document type
- filename
- extracted text

## Retrieval

User can:

- preview document
- download document
- see associated case
- see extracted metadata

## Audit

The system records important document events.

---

# 31. Failure States

The MVP should be designed around failure, not only the happy path.

## Case cannot be identified

```text
We couldn't identify the case.

[Choose existing case]
[Create new case]
```

## Multiple cases match

```text
We found 3 possible cases.

[Case A]
[Case B]
[Case C]
```

## OCR fails

```text
We couldn't read this document.

[Retry]
[File manually]
```

## Unsupported document

```text
This file type isn't supported yet.

Please upload a PDF.
```

## Duplicate

```text
This appears to be the same document you already uploaded.

[View existing]
[Upload anyway]
```

## AI extraction failure

The document should still be uploadable.

**AI failure must never equal document loss.**

---

# 32. Important Product Principle

## The system should fail safely.

Bad:

> AI thinks the document belongs to Case A → silently files it incorrectly.

Good:

> AI is uncertain → asks the user.

Even more important:

> Processing fails → the original document remains safely stored and recoverable.

---

# 33. Trust UX

Trust is likely to be one of the largest adoption barriers.

The user is effectively saying:

> "I'm trusting you with my legal documents."

Therefore, the product should make automation transparent.

Instead of:

> Filed.

Show:

```text
Filed under:

Rajesh Kumar vs State
WP 1234/2025

Because we found:
✓ Case number: WP 1234/2025
✓ Party: Rajesh Kumar
✓ Court: Allahabad High Court
```

The user should be able to override the decision.

---

# 34. Evaluation Dataset

Before optimizing the model, create a representative evaluation dataset.

Target:

**500–2,000 real or appropriately anonymized legal documents** across multiple cases.

Dataset should contain:

- clear matches
- ambiguous party names
- multiple cases involving the same party
- different document types
- scanned PDFs
- poor OCR
- documents with missing case numbers
- documents with inconsistent filenames
- duplicates
- multiple courts

Each document needs ground-truth:

```text
Correct Case
Correct Document Type
Correct Date
Relevant Metadata
```

This dataset becomes the benchmark for every matching-engine iteration.

---

# 35. Matching Evaluation

Do not optimize only for average accuracy.

Track:

### Case-match precision

When the system says:

> "This belongs to Case A."

How often is it correct?

### Case-match recall

How often can the system find the correct case?

### Top-1 accuracy

Correct case is ranked #1.

### Top-3 accuracy

Correct case appears in the first 3 candidates.

### Abstention quality

When uncertain, does the system correctly ask the user instead of guessing?

For this product, **precision should initially be prioritized over aggressive automation**.

A wrong legal filing can be more damaging than asking the user one extra question.

---

# 36. MVP Rollout Strategy

## Stage 0 — Internal prototype

Use a small controlled dataset.

Goal:

> Prove extraction and matching technically.

---

## Stage 1 — Design partner pilot

Work with approximately:

**3–5 law offices**

Do not attempt mass acquisition.

Observe real workflows.

---

## Stage 2 — Expanded pilot

Approximately:

**10–20 offices**

Measure:

- automation rate
- corrections
- trust
- time saved
- retention
- search behavior

---

## Stage 3 — Public MVP

Only after:

- matching reliability is acceptable
- failure handling is robust
- security fundamentals are in place
- users demonstrate repeat usage

---

# 37. Recommended MVP Screens

Keep the application small.

## Screen 1 — Login

Simple authentication.

## Screen 2 — Home

```text
Good evening.

[ Upload Document ]

Recent Cases
Recent Documents
```

## Screen 3 — Upload

Extremely simple upload experience.

## Screen 4 — Processing

Shows processing state.

## Screen 5 — Match Confirmation

Shows:

- case
- confidence
- document type
- date
- extracted metadata

## Screen 6 — Cases

Searchable list of cases.

## Screen 7 — Case Detail

Documents grouped by type.

## Screen 8 — Search

Global document search.

## Screen 9 — Document Viewer

Preview + metadata + download.

## Screen 10 — Settings

Basic account/organization settings.

That's enough.

---

# 38. MVP Navigation

```text
             ┌──────────────┐
             │     Home     │
             └──────┬───────┘
                    |
       +------------+------------+
       |            |            |
       v            v            v
   Upload         Cases        Search
       |            |            |
       v            v            v
 Processing     Case Detail   Results
       |
       v
 Match
       |
       v
 Filed
       |
       v
 Document
```

The navigation should make **Upload** the primary action.

---

# 39. What We Should NOT Optimize Yet

Do not spend early engineering time optimizing:

- beautiful folder trees
- complex dashboards
- analytics
- billing
- advanced permissions
- mobile apps
- integrations
- semantic chat
- case summaries
- timeline visualization
- sophisticated AI agents

The question is much simpler:

> **Does automatic case filing work well enough that lawyers want to use it?**

---

# 40. Product Risks

## Risk 1 — Case matching isn't reliable enough

This is the biggest risk.

### Mitigation

- deterministic identifiers first
- candidate ranking
- conservative thresholds
- human confirmation
- evaluation dataset
- correction feedback

---

## Risk 2 — OCR quality

Scanned Indian legal documents can be difficult.

### Mitigation

- support native PDFs first
- use OCR as fallback
- preserve original
- expose extraction uncertainty

---

## Risk 3 — Users don't trust automatic filing

### Mitigation

- show reasoning
- show confidence
- allow correction
- maintain audit trail
- never hide uncertainty

---

## Risk 4 — Users don't have cases pre-created

Automatic matching requires candidate cases.

### MVP solution

Make case creation extremely easy.

Potential future solution:

> Create cases automatically from historical documents.

---

## Risk 5 — Product becomes another folder system

This would undermine the core thesis.

### Mitigation

The primary workflow must remain:

**Upload → Understand → File**

not:

**Create folders → Navigate → Upload**

---

## Risk 6 — Too much scope

The vision contains many attractive features.

### Mitigation

Maintain a strict MVP rule:

> If a feature does not improve automatic document filing or basic retrieval, it does not belong in MVP.

---

# 41. Product Decisions

These should be treated as explicit decisions.

### Decision 1

**Web first.**

No mobile application required for MVP.

### Decision 2

**PDF first.**

Do not support every file type.

### Decision 3

**Case-first data model.**

Cases are the primary business object.

### Decision 4

**Automatic filing is the primary feature.**

Search is secondary.

### Decision 5

**Precision over aggressive automation.**

When uncertain, ask.

### Decision 6

**AI is an internal capability, not the product pitch.**

The user buys:

> "Stop manually filing documents."

Not:

> "We use advanced AI."

### Decision 7

**Storage is infrastructure.**

Do not position the product as another cloud drive.

---

# 42. MVP Product Positioning

### Primary positioning

> **Upload once. We organize it for you.**

### Alternative

> **Your legal document filing assistant.**

### Problem-oriented

> **Stop manually filing legal documents.**

### Long-term

> **The operating system for your case information.**

The source concept similarly positions the initial wedge around automatic case filing rather than generic storage.

---

# 43. Competitive Differentiation

We should not compete with Google Drive, Dropbox, Telegram, or generic file storage on storage.

Those products answer:

> "Where can I put this file?"

We answer:

> **"What is this document, which case does it belong to, and how can I find it later?"**

Our moat is therefore expected to come from:

1. legal document understanding
2. case matching
3. accumulated case/document relationships
4. firm-specific corrections
5. search index
6. workflow learning

The long-term product concept calls this the **case graph**.

---

# 44. Future Roadmap

Once MVP is validated:

## Phase 2 — Better Retrieval

- advanced metadata search
- full-text search improvements
- semantic search
- search filters
- excerpts
- related documents

## Phase 3 — Case Intelligence

- case timeline
- case summaries
- important dates
- entity relationships
- document summaries
- case overview

## Phase 4 — Universal Intake

- mobile app
- share sheet
- email ingestion
- Telegram import
- WhatsApp workflows
- Drive import
- local-folder migration

## Phase 5 — Workflow Automation

- reminders
- tasks
- document requests
- filing workflows
- court-date workflows

## Phase 6 — Enterprise

- advanced permissions
- SSO
- retention
- audit exports
- private deployment
- API
- compliance tooling

This progression follows the source strategy of automatic filing → search → intelligence → integrations → enterprise.

---

# 45. Open Questions

These should be answered through customer discovery rather than blocking MVP development.

## Customer

1. How many documents does a typical advocate receive per day?
2. How many active cases does the typical target user have?
3. Who currently performs filing — advocate, clerk, assistant?
4. What percentage of documents contain a reliable case number?
5. How often do multiple cases share similar party names?
6. Which courts should we support first?
7. Are users more comfortable with automatic filing or confirmation-first filing?

## Product

8. Should high-confidence documents auto-file immediately in v1, or always require confirmation initially?
9. What exact document taxonomy is most useful?
10. Should users see confidence scores directly or should the UI use simpler language such as "High confidence"?
11. Should users be able to manually edit extracted metadata?

## Technical

12. Which OCR engine provides sufficient accuracy for the initial court/document mix?
13. Which model/provider gives the best extraction-to-cost ratio?
14. What is acceptable processing latency?
15. How should very large PDFs be handled?

## Commercial

16. Do customers prefer per-advocate or per-chamber pricing?
17. How much would the target customer pay to eliminate manual filing?
18. Is migration a paid service?
19. What level of storage/processing should be bundled?

The source document already recommends interviewing 20–30 advocates before overcommitting to pricing and workflow assumptions.

---

# 46. Customer Discovery Plan

Before scaling engineering, interview approximately 20–30 target users.

Ask about **current behavior**, not hypothetical enthusiasm.

### Current workflow

- Where do documents arrive?
- Who files them?
- What happens after receiving a PDF?
- How are cases identified?
- How are files named?
- Where are they stored?
- How are old documents found?

### Quantify pain

- documents/day
- active cases
- minutes/document
- failed searches/week
- duplicate documents
- filing mistakes

### Trust

Ask:

> "What would make you comfortable allowing software to automatically file your legal documents?"

### Buying

Ask:

> "If this removed most of the manual filing work, what would it be worth to your office each month?"

Do not lead respondents toward a predefined price.

---

# 47. Definition of MVP Done

The MVP is ready for a real pilot when:

### Product

- [ ] A user can create an organization.
- [ ] A user can create cases.
- [ ] A user can upload PDFs.
- [ ] Documents are securely stored.
- [ ] Text extraction works.
- [ ] OCR works for supported scanned PDFs.
- [ ] Metadata extraction works.
- [ ] Document classification works.
- [ ] Case candidates are generated.
- [ ] Matching confidence is calculated.
- [ ] High-confidence matches can be automatically filed.
- [ ] Low-confidence matches ask the user.
- [ ] Users can correct the match.
- [ ] Documents are searchable.
- [ ] Documents can be previewed/downloaded.
- [ ] Duplicate files can be detected.
- [ ] Important actions are audited.

### Quality

- [ ] Evaluation dataset exists.
- [ ] Case-match precision is measured.
- [ ] Top-1 accuracy is measured.
- [ ] False-positive filing is monitored.
- [ ] OCR failures are measurable.
- [ ] Processing failures do not lose documents.

### Security

- [ ] Files are private.
- [ ] Tenant isolation is implemented.
- [ ] Authentication is secure.
- [ ] Download URLs are protected.
- [ ] Audit events are recorded.
- [ ] Backups exist.
- [ ] Deletion behavior is defined.

### Pilot

- [ ] 3–5 design partners are identified.
- [ ] Real-world documents are being tested.
- [ ] User corrections are being collected.
- [ ] Time-to-file is measured.
- [ ] Search success is measured.

---

# 48. The One Metric That Matters First

If the team remembers only one thing from this PRD, it should be this:

> ## **Correct documents automatically filed into the correct case.**

Not:

- number of documents stored
- number of users registered
- number of AI calls
- number of folders
- storage consumed

The product only works if it removes the human routing step.

---

# 49. Final Product Definition

### Product

Legal document automation and case intelligence platform.

### MVP

Automatic legal document filing.

### Primary user

Advocate / lawyer / legal clerk.

### Primary problem

Manual filing and difficult document retrieval.

### Core interaction

**Upload document → system identifies case → document is filed.**

### Core differentiator

**The user does not need to decide where the document belongs.**

### Core technical challenge

Reliable case matching.

### Core UX principle

**Ask only when necessary.**

### Core trust principle

**Never hide uncertainty.**

### Core business value

**Time saved.**

### Long-term moat

**Structured case/document intelligence and the case graph.**

---

# 50. Product North Star

The product should ultimately make this workflow feel almost magical:

```text
                 BEFORE

Document arrives
       ↓
"What case?"
       ↓
Search folders/channels
       ↓
Find case
       ↓
Open folder
       ↓
Rename
       ↓
Upload
       ↓
Later search again
```

versus:

```text
                 AFTER

Document arrives
       ↓
      UPLOAD
       ↓
"Rajesh Kumar vs State"
"WP 1234/2025"
"Court Order"
"08 Aug 2026"
       ↓
     FILED
       ↓
      DONE
```

The product wins when the user stops thinking about document organization entirely.

> **Upload. We organize. You practice law.**