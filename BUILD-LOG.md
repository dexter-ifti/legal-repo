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
- TASK-004 — Add PostgreSQL.

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
- TASK-005 — Authentication.

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
