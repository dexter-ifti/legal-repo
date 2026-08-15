# Current State

**Last updated:** 2026-08-15

## Project status

Repository initialized (TASK-001 complete). Foundation setup in progress.

Git workspace initialized, root README, `.gitignore`, and environment variable templates created. Frontend typecheck and linting verified. Next step is TASK-002 (frontend/backend foundation).

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
- PostgreSQL is the default MVP database direction
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

Frontend as Per UI Build Specification with dummy data

### Database

Not started.

### Deployment

Not started.

### AI evaluation dataset

Not started.

---

## What is next

### Immediate next milestone

Initialize the repository and establish the development foundation:

1. Git repository
2. application scaffold
3. TypeScript
4. lint/typecheck
5. test runner
6. environment configuration
7. PostgreSQL connection
8. initial schema/migrations
9. development object storage
10. basic auth
11. organization model

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

These do not block repository initialization:

- Which exact OCR provider will be used?
- Which AI provider/model gives the best extraction/cost tradeoff?
- Which object-storage provider will be used?
- Which authentication provider will be used?
- What initial target court/document mix will be used for evaluation?
- What matching thresholds will the real dataset justify?

---

## Rule for this document

Update this file after every meaningful milestone.

Keep it short.

It should describe what is true now, not the entire product vision.
