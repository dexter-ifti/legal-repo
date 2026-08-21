/**
 * Deterministic demo user IDs. Must stay in sync with
 * `Backend/src/auth/demo-users.ts` so frontend fallbacks match
 * what the backend issues for demo sessions (Prisma IDs are UUIDs).
 */
export const DEMO_USER_IDS = {
  sarahMitchell: 'a3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  genericAdvocate: 'b4e2d3c5-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
} as const;
