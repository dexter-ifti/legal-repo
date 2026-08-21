# MVP Issue Log

Audit date: 2026-08-17  
Scope: code review of the implemented legal-saas MVP, current docs, backend routes/services, frontend API usage, and verification commands.

## Verification Summary

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm run build`: PASS, with non-blocking Next metadata warnings and outdated Browserslist warning
- `npm test`: FAIL
  - 173 tests total
  - 162 passing
  - 11 failing
  - Failing areas: document extraction, case matching pipeline, match confirmation, reassignment, and cross-tenant upload validation

## P0 - Must Fix Before Pilot

### 1. Core document pipeline APIs return 500 after successful DB work because responses include `BigInt`

Evidence:
- `npm test` fails 11 tests, including extraction and matching pipeline tests.
- Focused run of `npx tsx --test tests/integration/document-extraction.test.ts` shows DB work completing through extraction, metadata persistence, matching, audit logging, and final document fetch, then the HTTP assertion receives `500` instead of `200`.
- Prisma `Document.fileSize` is a `BigInt` in [Backend/prisma/schema.prisma](/home/Code/Projects/36-legal-saas/Backend/prisma/schema.prisma:108).
- `processDocumentPipeline()` returns `finalDoc` directly with `fileSize: BigInt` in [Backend/src/services/document-processing.service.ts](/home/Code/Projects/36-legal-saas/Backend/src/services/document-processing.service.ts:189).
- `/extract` sends that result directly through JSON in [Backend/src/routes/document.routes.ts](/home/Code/Projects/36-legal-saas/Backend/src/routes/document.routes.ts:351).
- `/confirm-match` and `/reassign` also return raw Prisma documents with `fileSize: BigInt` in [Backend/src/routes/document.routes.ts](/home/Code/Projects/36-legal-saas/Backend/src/routes/document.routes.ts:434) and [Backend/src/routes/document.routes.ts](/home/Code/Projects/36-legal-saas/Backend/src/routes/document.routes.ts:506).

Impact:
- The Golden Path is broken at extraction/matching API level even when processing succeeds internally.
- Users may see failed actions while the database has partially or fully changed state.

Suggested fix:
- Add a response serializer for `Document` records that converts `BigInt` and `Decimal` values to JSON-safe values.
- Use it consistently in document detail, list, extract, match confirmation, reassignment, retry, search, and case detail embedded documents.
- Add regression tests asserting `POST /documents/:id/extract`, `confirm-match`, and `reassign` return JSON successfully.

### 2. Upload accepts a `caseId` from another tenant instead of rejecting it

Evidence:
- Test failure: `POST /api/v1/documents/upload enforces cross-tenant boundary isolation` expected `404`, got `201`.
- In [Backend/src/services/document.service.ts](/home/Code/Projects/36-legal-saas/Backend/src/services/document.service.ts:71), case verification only checks whether a tenant-scoped case exists; if it does not, upload continues.
- The catch block at [Backend/src/services/document.service.ts](/home/Code/Projects/36-legal-saas/Backend/src/services/document.service.ts:79) suppresses verification errors.

Impact:
- A user can provide an inaccessible/nonexistent `caseId` and still create a document with that raw `caseId` path.
- This violates server-side authorization and tenant isolation rules.

Suggested fix:
- If `caseId` is supplied and no case exists for `organizationId`, throw `Target case not found in organization`.
- Do not suppress tenant/case validation errors.
- Keep upload-first behavior by allowing `caseId` to be absent/null only.

### 3. Document listing has a cross-tenant fallback that can leak other organizations' documents

Evidence:
- `GET /api/v1/documents` first queries `where: { organizationId }`, then if no documents are found it fetches all recent documents without tenant scope in [Backend/src/routes/document.routes.ts](/home/Code/Projects/36-legal-saas/Backend/src/routes/document.routes.ts:107).

Impact:
- A newly onboarded organization with no documents could receive documents from other tenants.
- This directly violates the launch requirement that every organization-owned resource is tenant-scoped.

Suggested fix:
- Remove the fallback query entirely.
- Return an empty list for tenants with no documents.
- Add an integration test for an empty tenant not seeing another tenant's documents.

## P1 - High Priority

### 4. DB failure during upload can return a fake successful document that is not persisted

Evidence:
- If `prisma.document.create()` fails, upload catches it and returns a synthetic fallback document with id `doc_${crypto.randomUUID()}` in [Backend/src/services/document.service.ts](/home/Code/Projects/36-legal-saas/Backend/src/services/document.service.ts:158).

Impact:
- API can report a successful upload when the database record does not exist.
- Follow-up detail/extract/download requests will fail.
- This undermines document integrity and auditability.

Suggested fix:
- Treat DB persistence failure as upload failure.
- If storage succeeded but DB failed, either delete the just-uploaded object or record a retryable orphan-cleanup task.
- Never return a fake business record for persisted legal documents.

### 5. Storage provider silently falls back from Supabase to local disk

Evidence:
- `uploadStorageObject`, `getStorageSignedUrl`, `deleteStorageObject`, and `getStorageFileBuffer` fall back to `LocalStorageProvider` on primary provider failure in [Backend/src/storage/storage.service.ts](/home/Code/Projects/36-legal-saas/Backend/src/storage/storage.service.ts:42).

Impact:
- In production, Supabase outage/misconfiguration can store sensitive client documents on container local disk while API reports success.
- Download paths later may fail depending on which provider is active.

Suggested fix:
- Allow local fallback only in explicit development/test mode.
- In production, fail closed and surface a retryable processing/storage error.
- Log storage failure metadata without exposing document contents.

### 6. Demo auth user uses invalid UUID IDs

> **Status: FIXED (2026-08-21)** — Demo users now use deterministic, Prisma-safe UUIDs defined in `Backend/src/auth/demo-users.ts` (`DEMO_USERS`), used by both `MockAuthProvider` and `SupabaseAuthProvider` (including the legacy `demo-token` and dev-fallback paths). Tokens are derived as `mock-token-${uuid}` instead of `mock-token-usr_sarah`. Frontend fallback IDs in `Frontend/lib/use-user.ts` now use matching deterministic UUIDs via `Frontend/lib/demo-users.ts`. Non-UUID organization fallbacks (`org_default`, `org_lexflow_demo`) were also replaced with deterministic UUIDs (`DEMO_ORGANIZATION_IDS`) in `Backend/src/services/auth.service.ts` and `Frontend/lib/use-user.ts`. Unit tests added in `Backend/tests/unit/auth.test.ts`.

Evidence:
- Demo login path returns `id: 'usr_sarah'` and token `mock-token-usr_sarah` in [Backend/src/auth/MockAuthProvider.ts](/home/Code/Projects/36-legal-saas/Backend/src/auth/MockAuthProvider.ts:28).
- Prisma user IDs are UUIDs in [Backend/prisma/schema.prisma](/home/Code/Projects/36-legal-saas/Backend/prisma/schema.prisma:56).

Impact:
- Any flow that tries to sync or persist the demo user into Prisma can fail UUID validation.
- Similar invalid IDs appear in frontend demo user defaults.

Suggested fix:
- Use deterministic UUIDs for demo users.
- Keep display-friendly user names separate from IDs.

### 7. Frontend uses stale match status value `AUTO_MATCH` instead of backend `AUTO_MATCHED`

Evidence:
- Backend enum value is `AUTO_MATCHED` in [Backend/prisma/schema.prisma](/home/Code/Projects/36-legal-saas/Backend/prisma/schema.prisma:35).
- Frontend checks `AUTO_MATCH` in documents/dashboard/viewer logic, for example [Frontend/app/(app)/documents/page.tsx](/home/Code/Projects/36-legal-saas/Frontend/app/(app)/documents/page.tsx:56), [Frontend/app/(app)/dashboard/page.tsx](/home/Code/Projects/36-legal-saas/Frontend/app/(app)/dashboard/page.tsx:92), and [Frontend/app/(app)/documents/[id]/page.tsx](/home/Code/Projects/36-legal-saas/Frontend/app/(app)/documents/[id]/page.tsx:96).

Impact:
- Auto-filed documents display as uploaded/unfiled in the UI.
- Dashboard filed counts and status badges are wrong.

Suggested fix:
- Standardize the frontend on backend enum values.
- Prefer shared API types or a small status mapping utility with tests.

### 8. Upload page passes mock case IDs to the real upload API

> **Status: FIXED (2026-08-21)** — `Frontend/app/(app)/upload/page.tsx` now gates case options on demo mode via `useUserProfile()`: demo users keep mock cases, real users get their tenant's cases from `GET /api/v1/cases` (mapped to `{ id, title, caseNumber }`, same pattern as the Filing Inbox). On API failure real users get an empty list — no mock fallback.

Evidence:
- Upload page builds `availableCases` from `mock-data` in [Frontend/app/(app)/upload/page.tsx](/home/Code/Projects/36-legal-saas/Frontend/app/(app)/upload/page.tsx:19).
- Those IDs are sent as `caseId` by [Frontend/components/documents/document-upload-dropzone.tsx](/home/Code/Projects/36-legal-saas/Frontend/components/documents/document-upload-dropzone.tsx:131).

Impact:
- Real users can choose a fake case option and get failed upload behavior once server-side case validation is fixed.
- Current broken backend validation can make this worse by accepting invalid associations.

Suggested fix:
- Fetch tenant cases from `/api/v1/cases` for non-demo users.
- Only use mock cases when the authenticated user is explicitly in demo mode.

### 9. Filing Inbox cannot populate available cases correctly

Evidence:
- `/api/v1/cases` returns `{ data: { cases, pagination } }`.
- Inbox code sets `availableCases` to `casesData.data || []` in [Frontend/app/(app)/inbox/page.tsx](/home/Code/Projects/36-legal-saas/Frontend/app/(app)/inbox/page.tsx:66), so it stores the wrapper object instead of the cases array.

Impact:
- Manual reassignment case selector can be empty or malformed.
- Users may be unable to correct ambiguous/no-match documents.

Suggested fix:
- Use `casesData.data.cases`.
- Map backend case fields to `{ id, title, caseNumber }`.
- Add a frontend unit test for inbox data mapping.

## P2 - Medium Priority

### 10. Case detail page is mock-only and does not load real case data

> **Status: FIXED (2026-08-21)** — `Frontend/app/(app)/cases/[id]/page.tsx` now fetches `GET /api/v1/cases/:id` plus tenant documents from `GET /api/v1/documents` (filtered by `caseId`) for non-demo users, using the same Bearer-token pattern as the rest of the app. Case metadata is mapped from backend fields (`title`, `clientName`, etc.) with neutral placeholders instead of fabricated legal facts; document counts/status tabs are derived from real `matchStatus` values (`AUTO_MATCHED`/`CONFIRMED` → filed, `CONFIRMATION_REQUIRED` → review). Not-found and API-failure states render honest empty states with retry — no fabricated fallback data for real users. Mock behavior is now gated behind demo mode only.

Evidence:
- Case detail page only searches `mock-data`, then fabricates fallback case details in [Frontend/app/(app)/cases/[id]/page.tsx](/home/Code/Projects/36-legal-saas/Frontend/app/(app)/cases/[id]/page.tsx:44).

Impact:
- Opening a real case from the case list shows fake case metadata and fake document associations.
- This breaks the create case -> open case -> view documents part of the Golden Path UX.

Suggested fix:
- Fetch `/api/v1/cases/:id` for non-demo users.
- Render empty/error states instead of fabricated legal facts.

### 11. Frontend silently falls back to mock data on API failure

> **Status: FIXED (2026-08-21)** — Documents page no longer falls back to mock documents on fetch error (real users get an empty list; demo users keep demo data). Dashboard now skips API fetching entirely for demo users and no longer mixes mock stats with real records (`totalDocCount` is either demo stats or real count, never both). Real users see zero/empty states on failure instead of synthetic data.

Evidence:
- Documents page falls back to mock documents on fetch error in [Frontend/app/(app)/documents/page.tsx](/home/Code/Projects/36-legal-saas/Frontend/app/(app)/documents/page.tsx:73).
- Dashboard mixes demo/mock stats with real records in [Frontend/app/(app)/dashboard/page.tsx](/home/Code/Projects/36-legal-saas/Frontend/app/(app)/dashboard/page.tsx:87).

Impact:
- During pilot, backend failures can be hidden by plausible demo data.
- Users may make decisions based on non-tenant, synthetic records.

Suggested fix:
- Gate mock data behind explicit demo mode only.
- For real users, show error/empty states with retry.

### 12. Environment examples can produce doubled `/api/api/v1` URLs

Evidence:
- Frontend code appends `/api/v1/...` to `NEXT_PUBLIC_API_URL`.
- Frontend example sets `NEXT_PUBLIC_API_URL=http://localhost:3000/api` in [Frontend/.env.example](/home/Code/Projects/36-legal-saas/Frontend/.env.example:3).
- Root example sets `NEXT_PUBLIC_API_URL=http://localhost/api` in [.env.example](/home/Code/Projects/36-legal-saas/.env.example:8).

Impact:
- Deployed/frontend requests can target `/api/api/v1/...`.
- Local frontend may call itself instead of the backend.

Suggested fix:
- Define `NEXT_PUBLIC_API_URL` as the API origin/base only, e.g. `http://localhost:5000` locally or `https://domain.tld` behind proxy.
- Update docs and examples consistently.

### 13. Search/audit query params are not safely validated

> **Status: FIXED (2026-08-21)** — `GET /api/v1/search` and `GET /api/v1/audit-logs` now validate `page`/`limit` with Zod schemas (`searchQuerySchema`, `auditQuerySchema`) following the case-routes pattern. Non-numeric values return a clean `400 VALIDATION_ERROR`. Pagination is clamped server-side (`page >= 1`, `1 <= limit <= 100`). Unit tests added in `Backend/tests/unit/query-validation.test.ts`.

Evidence:
- Search parses `page`/`limit` with `parseInt` and passes possible `NaN` into service in [Backend/src/routes/search.routes.ts](/home/Code/Projects/36-legal-saas/Backend/src/routes/search.routes.ts:31).
- Audit route does the same in [Backend/src/routes/audit.routes.ts](/home/Code/Projects/36-legal-saas/Backend/src/routes/audit.routes.ts:29).

Impact:
- Bad query params can cause Prisma/runtime errors instead of clean `400` validation responses.

Suggested fix:
- Use Zod schemas like case routes.
- Clamp pagination after validating integer input.

### 14. Matching thresholds are hard-coded in service despite docs warning against fixed thresholds

> **Status: FIXED (2026-08-21)** — Thresholds moved to `Backend/src/config/matching.config.ts` (`getMatchingThresholds()`), configurable via `MATCHING_AUTO_CONFIDENCE`, `MATCHING_AUTO_SCORE_MARGIN`, and `MATCHING_CONFIRMATION_CONFIDENCE`. Conservative defaults (0.85 / 0.15 / 0.50) are unchanged; invalid or inverted env values degrade safely to defaults with a warning. The resolved threshold values are now recorded in the `DOCUMENT_MATCHED` audit event metadata for evaluation. Unit tests added in `Backend/tests/unit/matching-config.test.ts`.

Evidence:
- Matching thresholds are hard-coded at `0.85` and `0.50` in [Backend/src/services/matching/case-matcher.service.ts](/home/Code/Projects/36-legal-saas/Backend/src/services/matching/case-matcher.service.ts:65).
- Project instructions say not to hard-code final confidence thresholds without evaluation data.

Impact:
- Evaluation calibration exists, but production code may drift from benchmark assumptions.
- Harder to tune safely during pilot.

Suggested fix:
- Move thresholds into server-side config with conservative defaults.
- Include threshold values in audit/matching metadata for evaluation.

## P3 - Cleanup / Documentation

### 15. `CURRENT-STATE.md` claims tests are passing and repo tree is clean, but current verification fails

Evidence:
- [CURRENT-STATE.md](/home/Code/Projects/36-legal-saas/CURRENT-STATE.md:10) says the platform is MVP complete and ready for pilot.
- [CURRENT-STATE.md](/home/Code/Projects/36-legal-saas/CURRENT-STATE.md:16) says tests pass 100% offline.
- Current `npm test` fails 11 tests.

Impact:
- Status docs overstate readiness.

Suggested fix:
- Update `CURRENT-STATE.md` after fixes or immediately mark current state as blocked by this issue log.

### 16. Build has non-blocking deployment hygiene warnings

Evidence:
- `npm run build` passes but warns that `metadata.metadataBase` is not set and Browserslist data is outdated.

Impact:
- Not an MVP blocker, but should be cleaned up before public pilot deployment.

Suggested fix:
- Set Next metadata base from `NEXT_PUBLIC_APP_URL`.
- Update Browserslist/caniuse data during dependency maintenance.

## Suggested Fix Order

1. Fix JSON serialization for Prisma `BigInt`/`Decimal` document responses.
2. Fix upload `caseId` tenant validation and remove the document-list cross-tenant fallback.
3. Remove fake DB persistence fallback in uploads and production local-storage fallback.
4. Fix frontend enum/status mapping and inbox cases response mapping.
5. Replace mock-only real-user flows: upload case list and case detail page.
6. Update env examples and current-state docs.
7. Rerun `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

