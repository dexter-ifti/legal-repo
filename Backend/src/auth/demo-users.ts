export interface DemoUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Deterministic UUIDs so demo users can be synced into Prisma
 * (User.id / Organization.id are `Uuid @db.Uuid`) without collisions.
 */
export const DEMO_USERS: Record<string, DemoUser> = {
  sarahMitchell: {
    id: 'a3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
    email: 'sarah.mitchell@lexflow.app',
    name: 'Sarah Mitchell',
  },
  genericAdvocate: {
    id: 'b4e2d3c5-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
    email: 'advocate@lexflow.app',
    name: 'Legal Advocate',
  },
};

export const demoTokenFor = (userId: string): string => `mock-token-${userId}`;
