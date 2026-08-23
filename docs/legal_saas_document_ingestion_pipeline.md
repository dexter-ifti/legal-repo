# Legal SaaS — Intelligent Legal PDF Ingestion, Bundle Detection, OCR, Native Extraction & Normalization

## 1. Purpose

Implement the document-ingestion pipeline for the Legal SaaS application.

The pipeline must handle real-world Indian legal PDFs, including:

- digitally generated PDFs with selectable/native text
- fully scanned PDFs
- mixed PDFs containing both native and scanned pages
- court filing bundles containing multiple documents
- petitions and applications
- affidavits
- pleadings
- annexures
- government/revenue records
- court orders
- identity documents
- vakalatnamas
- court-fee receipts
- documents containing English, Hindi, or mixed-language content
- handwritten annotations, stamps, signatures, photographs, and poor-quality scans

The original uploaded PDF must remain unchanged in Cloudflare R2.

The system must create a structured, page-aware, searchable representation of the uploaded file.

---

# 2. Critical Design Principle

Do NOT assume that one uploaded PDF equals one logical legal document.

A single PDF may be a **bundle** containing multiple legal documents.

Example:

```text
Uploaded PDF
    |
    +-- Writ Petition
    +-- Application for Interim Relief
    +-- Annexure
    +-- Caveat Application
    +-- Affidavit
    +-- Civil Suit
    +-- Government Letter
    +-- Vakalatnama
    +-- Court Fee Receipt
```

Therefore, the ingestion system must support:

1. document-level classification
2. page-level extraction
3. logical document-segment detection
4. segment-level classification
5. page-to-segment mapping

---

# 3. Important Sample-File Observation

The sample file `Farook Petition.pdf` contains 77 pages and is a scanned legal filing bundle.

The first page already contains important metadata such as:

- Category
- District
- Petition
- Petitioner
- Respondent
- Advocate
- court-related filing information

Therefore, **do not assume that the first page is merely a cover page**.

The first page can contain highly valuable structured metadata.

For this sample:

- Page 1 identifies the petition/court filing context and contains petitioner/respondent information.
- Page 2 contains an index that describes many of the documents/pages that follow.
- Pages 3 onward contain different legal documents and annexures.
- Later pages clearly begin new documents, such as a Caveat Application, affidavits, civil-suit pleadings, government/revenue records, a Vakalatnama, and a court-fee receipt.

The system must therefore inspect the first page for metadata and the first few pages for structural information.

Do not hardcode this sample's page numbers into the implementation.

---

# 4. High-Level Architecture

```text
Frontend
   |
   | Request upload authorization
   v
Backend API
   |
   | Generate short-lived signed R2 upload URL
   v
Frontend
   |
   | Direct upload
   v
Cloudflare R2
   |
   | Upload completed
   v
Backend
   |
   | Create background processing job
   v
Document Worker
   |
   +--> Technical PDF inspection
   |
   +--> First-page metadata discovery
   |
   +--> First 5-page discovery pass
   |
   +--> Native text extraction when available
   |
   +--> Mistral OCR when OCR is required
   |
   +--> Document/bundle boundary detection
   |
   +--> Mistral Small normalization/classification
   |
   +--> Page-level text storage
   |
   +--> Segment creation
   |
   +--> Chunking/indexing
   v
PostgreSQL / Search / RAG
```

---

# 5. Upload Flow

## 5.1 Initialize upload

Frontend:

```http
POST /documents/upload/init
```

Example:

```json
{
  "filename": "Farook Petition.pdf",
  "size": 42000000,
  "mime_type": "application/pdf"
}
```

Backend must:

1. authenticate the user
2. identify the organization/workspace
3. verify upload permission
4. validate size limits
5. validate supported file type
6. generate a unique document ID
7. generate a safe R2 object key
8. create the database document record
9. generate a short-lived signed upload URL

Example object key:

```text
organizations/{organization_id}/documents/{document_id}/original.pdf
```

Do not use the user-provided filename as the storage key.

---

# 6. Direct Upload to R2

The browser should upload directly to Cloudflare R2.

Preferred:

```text
Browser
   |
   v
R2
```

Avoid:

```text
Browser
   |
   v
VPS
   |
   v
R2
```

The VPS should authorize and coordinate the upload rather than proxying large PDFs unnecessarily.

After upload:

```http
POST /documents/{document_id}/upload/complete
```

Verify that the object exists before marking the upload complete.

---

# 7. Original Storage

Cloudflare R2 is the source of truth for the original file.

Recommended:

```text
organizations/
  {organization_id}/
    documents/
      {document_id}/
        original.pdf
```

Never overwrite the original document.

Derived artifacts may optionally be stored separately:

```text
organizations/
  {organization_id}/
    documents/
      {document_id}/
        original.pdf
        extracted.json
        ocr.pdf
```

Do not generate `ocr.pdf` unless the product actually requires a searchable OCR PDF.

The primary AI/search representation should be structured page-level text.

---

# 8. Processing Status

Use explicit processing states.

Recommended:

```text
created
uploading
uploaded
queued
inspecting
discovering
extracting
segmenting
normalizing
indexing
ready
failed
```

Do not use only:

```text
processed = true
```

Processing stages must be independently observable and retryable.

---

# 9. Technical PDF Inspection

Before expensive processing, inspect the PDF technically.

Collect:

```text
page_count
file_size
native_text_character_count
native_text_available
image_count_per_page
page_dimensions
```

The purpose is to determine whether the document is likely:

```text
native_text
scanned
mixed
unknown
```

Do not make the final classification from technical inspection alone.

---

# 10. First Page Must Be Inspected Separately

The first page is often highly informative in legal documents.

Look specifically for:

```text
Petitioner
Petitioners
Respondent
Respondents
Applicant
Applicants
Opposite Party
Opposite Parties
Plaintiff
Plaintiffs
Defendant
Defendants
Appellant
Respondent
Court
Case Number
Writ-C
Writ Petition
Regular Suit
Application
Affidavit
Category
District
Police Station
Advocate
```

Also look for:

```text
IN THE HON'BLE HIGH COURT
IN THE COURT OF
BEFORE
VERSUS
VS.
VS
```

The first page may provide:

- court
- jurisdiction
- case type
- case number
- petitioner/applicant/plaintiff
- respondent/opposite party/defendant
- advocate
- district
- filing category

Extract these as metadata when confidently detected.

Do not assume the first page is a cover page.

---

# 11. First 5 Pages = Discovery Pass

The first five pages should be treated as a **discovery/reconnaissance pass**, not as the final extraction limit.

Initial flow:

```text
Pages 1-5
   |
   +--> native extraction attempt
   |
   +--> OCR if native extraction is unusable
   |
   +--> metadata extraction
   |
   +--> index/table-of-contents detection
   |
   +--> document-type discovery
   |
   +--> initial boundary detection
```

The purpose is to answer:

1. What type of legal material is this?
2. Is it one document or a bundle?
3. Are petitioner/respondent/etc. identifiable?
4. Is there an index?
5. Is there a list of annexures/documents?
6. Where does substantive content appear to start?
7. What extraction strategy should be used?

---

# 12. Do Not Use "Relevant Information" as an Undefined Rule

Do not implement:

```text
if relevant_information_found:
    stop
else:
    extract_more
```

without defining what relevance means.

Instead, use explicit discovery signals.

For example:

```text
metadata_detected
document_type_detected
substantive_content_detected
index_detected
document_boundaries_detected
case_identity_detected
```

A discovery result might look like:

```json
{
  "document_type": "writ_petition_bundle",
  "bundle_detected": true,
  "case_identity_detected": true,
  "petitioner_detected": true,
  "respondent_detected": true,
  "index_detected": true,
  "substantive_content_detected": true,
  "additional_discovery_required": false
}
```

---

# 13. Index / Table of Contents Detection

Actively search the first pages for:

```text
INDEX
TABLE OF CONTENTS
LIST OF DOCUMENTS
LIST OF ANNEXURES
LIST OF ENCLOSURES
SCHEDULE
DOCUMENT INDEX
```

If an index exists, extract it.

The index is a valuable source for predicting document boundaries.

However:

**Never treat the index as ground truth.**

The actual pages must be checked against the index.

Possible problems:

- incorrect page numbers
- missing pages
- inserted pages
- duplicate pages
- unlisted annexures
- handwritten additions
- inconsistent numbering

The index should be treated as evidence.

---

# 14. Progressive Discovery If First 5 Pages Are Insufficient

If the first five pages do not provide enough information to determine the document structure, do not immediately OCR the entire document with an LLM-based workflow.

Expand discovery progressively.

Recommended batches:

```text
1-5
6-15
16-30
31-50
51-75
...
```

At each stage, check whether enough structural information has been obtained.

The system should be able to stop the expensive semantic discovery process once it knows the extraction strategy.

However, stopping discovery does NOT mean stopping document extraction.

---

# 15. Discovery vs Full Extraction

Keep these two concepts separate.

## Discovery

Goal:

```text
Understand the document.
```

Example:

```text
Pages 1-5
   |
   v
Classify bundle
Find index
Identify parties
Estimate document boundaries
```

## Full extraction

Goal:

```text
Produce searchable text for the required document pages.
```

Example:

```text
Pages 1-77
   |
   v
Native extraction / OCR
   |
   v
Page-level text
```

A document can require only 5 pages for discovery but still require all 77 pages for indexing.

---

# 16. Native Extraction

Use a reliable PDF text extraction library such as PyMuPDF for native extraction.

For each page:

```python
text = page.get_text()
```

Collect:

```text
character_count
word_count
line_count
alphabetic_ratio
replacement_character_count
garbage_character_ratio
```

Native extraction should always be attempted before OCR when usable native text may exist.

---

# 17. Native Text Quality Evaluation

Do not use only:

```python
if text:
```

A page may contain technically non-empty but unusable text.

Create a quality evaluator.

Example:

```python
def is_usable_native_text(text):
    if not text:
        return False

    words = text.split()

    if len(words) < MIN_WORD_COUNT:
        return False

    if len(text.strip()) < MIN_CHARACTER_COUNT:
        return False

    alphabetic_chars = sum(c.isalpha() for c in text)
    alphabetic_ratio = alphabetic_chars / max(len(text), 1)

    if alphabetic_ratio < MIN_ALPHABETIC_RATIO:
        return False

    return True
```

Thresholds must be configurable and tuned using real legal PDFs.

---

# 18. OCR Strategy

Use Mistral OCR as the OCR provider.

Priority:

```text
Native extraction
      |
      v
Quality evaluation
      |
      +--> usable --> keep native text
      |
      +--> unusable --> Mistral OCR
```

For a fully scanned document:

```text
PDF
 |
 +--> OCR pages in controlled batches
```

For a mixed document:

```text
Page 1 --> native
Page 2 --> native
Page 3 --> OCR
Page 4 --> native
Page 5 --> OCR
```

Do not OCR every page merely because one page requires OCR.

---

# 19. OCR Provider Abstraction

Do not hard-code Mistral OCR calls throughout the codebase.

Create an abstraction:

```python
class OCRProvider:
    def process(self, input):
        raise NotImplementedError
```

Then:

```python
class MistralOCRProvider(OCRProvider):
    ...
```

This allows future replacement with another OCR provider without rewriting the ingestion pipeline.

---

# 20. OCR Quality

Store OCR quality metadata where available.

Example:

```json
{
  "page_number": 22,
  "extraction_method": "ocr",
  "ocr_provider": "mistral",
  "language": "hi",
  "ocr_confidence": 0.91
}
```

Do not assume that OCR output is always correct.

Scanned Indian legal documents may contain:

- Hindi
- English
- mixed Hindi/English
- stamps
- handwriting
- signatures
- faded text
- photographs
- skewed scans
- poor contrast
- old typewritten documents

The system must preserve OCR uncertainty.

---

# 21. Document Bundle Detection

A single PDF can contain multiple logical documents.

The system must detect boundaries between documents.

Useful signals include:

### Strong signals

```text
new court heading
new case number
new document title
new parties
new "Versus"
new affidavit heading
new application heading
new verification section
new vakalatnama
new receipt
new government letterhead
new annexure heading
```

### Supporting signals

```text
page numbering reset
different typography
different letterhead
different language
different formatting
different signatures
different parties
different dates
new stamp pattern
new document header
```

---

# 22. Boundary Detection

For every page after the first, compare the current page with the previous page.

Generate a boundary score.

Example:

```json
{
  "page": 24,
  "boundary_score": 0.96,
  "signals": [
    "new court heading",
    "new document title",
    "new case/application number",
    "new parties"
  ]
}
```

If the score is above a configurable threshold, create a new document segment.

Do not rely on a single signal.

---

# 23. Example Boundary Patterns

Examples of strong document starts:

```text
CAVEAT APPLICATION
```

```text
AFFIDAVIT
```

```text
WRIT PETITION
```

```text
APPLICATION FOR STAY / INTERIM RELIEF
```

```text
REGULAR SUIT NO. ...
```

```text
OBJECTIONS ...
```

```text
VAKALATNAMA
```

```text
VERIFICATION
```

```text
GOVERNMENT OF ...
```

```text
E-COURT FEE RECEIPT
```

These are examples only.

Do not hardcode exact sample page boundaries.

---

# 24. Mistral Small's Role

Mistral Small should be used for semantic tasks.

Use it for:

- document classification
- document-segment classification
- metadata normalization
- identifying document titles
- identifying legal-document structure
- resolving whether a page transition represents a new document
- detecting headings and sections
- extracting structured metadata
- normalizing OCR-derived text when necessary

Do NOT use Mistral Small for simple deterministic cleanup.

---

# 25. Do Not Use Mistral Small for Basic String Cleanup

Avoid sending every page to the LLM for:

```text
removing extra spaces
normalizing line breaks
removing duplicate whitespace
basic Unicode cleanup
simple header/footer removal
```

Use deterministic code for those operations.

Example:

```text
"THIS   IS   A   CONTRACT"
        |
        v
"THIS IS A CONTRACT"
```

does not require an LLM.

Use Mistral Small when semantic judgment is required.

---

# 26. Mistral Small Normalization Output

Mistral Small should produce structured output whenever possible.

Example:

```json
{
  "document_type": "writ_petition",
  "title": "Writ Petition",
  "court": "High Court of Judicature at Allahabad, Lucknow",
  "petitioners": [
    "Farooq Ali",
    "Amir Ali",
    "Irfan Ali",
    "Nehal Ahmad Sarvar"
  ],
  "respondents": [
    "State of Uttar Pradesh",
    "Principal Secretary Home",
    "Principal Secretary Revenue",
    "District Magistrate Lucknow"
  ],
  "language": "en",
  "confidence": 0.96
}
```

The model must not invent values.

If a value cannot be reliably extracted:

```json
{
  "respondents": null
}
```

or an empty array where appropriate.

---

# 27. Preserve Original Text and Normalized Text Separately

Do not overwrite OCR/native extraction output with LLM-normalized output.

Store:

```text
raw_text
normalized_text
```

Example:

```json
{
  "page_number": 8,
  "raw_text": "...",
  "normalized_text": "..."
}
```

This is important for auditability.

Legal users must be able to trace AI-generated interpretation back to source extraction.

---

# 28. Page-Level Storage

Store text at page level.

Suggested model:

```text
document_pages

id
document_id
page_number
raw_text
normalized_text
extraction_method
ocr_provider
ocr_language
ocr_confidence
word_count
character_count
created_at
updated_at
```

Do not store only one giant text field for the entire PDF.

---

# 29. Document Segment Storage

Create a logical segment model.

Suggested:

```text
document_segments

id
document_id
segment_type
title
start_page
end_page
confidence
metadata_json
created_at
updated_at
```

Example:

```json
{
  "segment_type": "caveat_application",
  "title": "Caveat Application",
  "start_page": 24,
  "end_page": 26,
  "confidence": 0.97
}
```

---

# 30. Page-to-Segment Mapping

Each page must belong to a segment.

Example:

```text
Page 1  -> segment 1
Page 2  -> segment 1
...
Page 23 -> segment 2
Page 24 -> segment 3
...
```

If a page is uncertain, allow:

```text
segment_confidence = low
```

and flag it for further processing.

---

# 31. Legal Metadata

Where confidently available, extract:

```text
court
bench
case_number
case_type
petitioners
respondents
plaintiffs
defendants
applicants
opposite_parties
advocates
district
police_station
dates
document_type
annexure_number
```

Do not force every document into the same metadata schema.

Different document types have different fields.

---

# 32. Multi-Language Handling

The pipeline must support multilingual documents.

Do not assume English.

Possible languages:

```text
English
Hindi
English + Hindi
```

Detect language per page or segment where practical.

Store:

```text
language
```

Do not translate the original text during ingestion unless translation is explicitly required by the product.

Preserve the source language.

---

# 33. Page Numbering

Store both:

```text
pdf_page_number
```

and, where detected:

```text
printed_page_number
```

These can differ.

Example:

```text
PDF page = 15
Printed page = 14
```

Legal citations should normally be able to reference the actual PDF page as well as the printed page when available.

---

# 34. Processing Large Documents

For documents under a reasonable page limit, native extraction of the full document is acceptable because native extraction is relatively inexpensive.

For very large documents:

```text
process in batches
```

Example:

```text
1-50
51-100
101-150
...
```

Each batch must be independently retryable.

Do not load an entire 1000-page PDF into memory unnecessarily.

---

# 35. Important Optimization

Do not confuse these three costs:

```text
PDF native extraction
OCR
LLM processing
```

They are not equivalent.

A 300-page digitally generated PDF can often be natively extracted cheaply.

Do not avoid full native extraction merely because the document has 300 pages.

The expensive operations are more likely to be:

```text
OCR
LLM normalization
embeddings
```

Therefore:

```text
Use native extraction broadly.
Use OCR selectively.
Use Mistral Small selectively.
```

---

# 36. Recommended Processing Strategy

```text
UPLOAD
  |
  v
TECHNICAL INSPECTION
  |
  v
PAGE 1 DISCOVERY
  |
  +--> Extract petitioner/respondent/case metadata
  |
  v
FIRST 5 PAGE DISCOVERY
  |
  +--> Find INDEX
  +--> Find document type
  +--> Find bundle indicators
  +--> Detect initial boundaries
  |
  v
CHOOSE EXTRACTION STRATEGY
  |
  +--> Native document
  |       |
  |       +--> Full native extraction
  |
  +--> Scanned document
  |       |
  |       +--> OCR required pages
  |
  +--> Mixed document
          |
          +--> Native where usable
          +--> OCR where necessary
  |
  v
PAGE-LEVEL EXTRACTION
  |
  v
DOCUMENT BOUNDARY DETECTION
  |
  v
MISTRAL SMALL
  |
  +--> Classification
  +--> Metadata normalization
  +--> Structural normalization
  |
  v
RAW + NORMALIZED TEXT
  |
  v
DOCUMENT SEGMENTS
  |
  v
CHUNKING
  |
  v
SEARCH / RAG
```

---

# 37. Failure Handling

Every stage must be retryable.

If page 73 OCR fails:

```text
Do NOT restart the entire document.
```

Retry:

```text
page 73
```

or its batch.

Store:

```text
attempt_count
status
error
started_at
completed_at
```

---

# 38. Security

Legal documents must be treated as sensitive.

Requirements:

- keep R2 private
- use short-lived signed URLs
- never expose R2 credentials to the browser
- verify organization access before issuing URLs
- use opaque document IDs
- validate uploaded files
- enforce size limits
- sanitize filenames
- isolate document workers
- use processing timeouts
- limit worker resources
- never execute uploaded content
- do not leak document contents into application logs

---

# 39. Do Not Hardcode the Sample

The sample `Farook Petition.pdf` is for testing and validation.

Do NOT implement:

```text
pages 1-16 = petition
pages 24-26 = caveat
pages 43-50 = counter affidavit
```

Instead implement generalized detection based on:

```text
headings
case numbers
parties
court names
document titles
index entries
page numbering
format changes
letterheads
language changes
legal-document keywords
signatures/stamps
```

The sample should become a regression test.

---

# 40. Sample Regression Test

Use `Farook Petition.pdf` as a test fixture.

The pipeline should at minimum be able to detect:

```text
- first-page case/party metadata
- petitioner information
- respondent information
- index on the early pages
- multiple logical documents
- scanned/image-based pages
- English and Hindi content
- different document types
- later document boundaries
- page-level provenance
```

The test should verify that the system does not incorrectly classify the entire 77-page file as one homogeneous text document.

---

# 41. Acceptance Criteria

The implementation is complete when:

- [ ] PDF uploads directly to R2.
- [ ] Original PDF remains immutable.
- [ ] First page is separately inspected for legal metadata.
- [ ] Petitioner/respondent/applicant/plaintiff/etc. can be extracted when visible.
- [ ] First 5 pages are used as a discovery pass.
- [ ] First 5 pages are NOT treated as the final extraction limit.
- [ ] Index/table-of-contents detection exists.
- [ ] Progressive discovery exists when the first 5 pages are insufficient.
- [ ] Native text extraction is attempted before OCR.
- [ ] Native extraction quality is evaluated.
- [ ] Mistral OCR is used for pages requiring OCR.
- [ ] OCR is not blindly applied to every page of a mixed PDF.
- [ ] Mistral OCR is behind an OCR-provider abstraction.
- [ ] Mistral Small is used for semantic normalization/classification rather than trivial string cleanup.
- [ ] Raw extracted text is preserved.
- [ ] Normalized text is stored separately.
- [ ] Page-level provenance is preserved.
- [ ] Logical document boundaries are detected.
- [ ] Multiple documents inside one PDF are supported.
- [ ] Each page can be mapped to a logical document segment.
- [ ] Segment confidence is stored.
- [ ] Processing is asynchronous.
- [ ] Failed pages/batches can be retried independently.
- [ ] The system supports English/Hindi/mixed-language documents.
- [ ] PDF page number and printed page number can be stored separately.
- [ ] The sample `Farook Petition.pdf` can be used as a regression test.
- [ ] The ingestion pipeline is independent of the production LLM used later for legal AI/RAG.

---

# 42. Final Engineering Rule

The system should follow this principle:

> **Inspect cheaply, extract reliably, segment intelligently, normalize selectively, and preserve the source.**

Specifically:

```text
First page
    -> metadata discovery

First 5 pages
    -> structural discovery

If insufficient
    -> progressively inspect more pages

Once strategy is known
    -> perform required full extraction

Native text available
    -> use native extraction

Native text unavailable/poor
    -> use Mistral OCR

Multiple documents detected
    -> segment the bundle

Need semantic cleanup/classification
    -> use Mistral Small

Need simple cleanup
    -> deterministic code

Always
    -> preserve page numbers, raw text, normalized text, extraction method, and source provenance
```

The system must never discard the original source information merely because a normalized or OCR-derived representation exists.
