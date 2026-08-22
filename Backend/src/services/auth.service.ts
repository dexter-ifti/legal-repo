import { IAuthProvider, AuthUser, AuthSession } from '../auth/AuthProvider.js';
import { SupabaseAuthProvider } from '../auth/SupabaseAuthProvider.js';
import { MockAuthProvider } from '../auth/MockAuthProvider.js';
import { DEMO_ORGANIZATION_IDS } from '../auth/demo-users.js';
import { prisma } from '../db/client.js';
import type { Role } from '@prisma/client';

let currentAuthProvider: IAuthProvider;

const supabaseUrl = process.env.SUPABASE_URL;
if (
  process.env.NODE_ENV === 'test' ||
  process.env.USE_MOCK_AUTH === 'true' ||
  !supabaseUrl ||
  supabaseUrl.includes('placeholder')
) {
  currentAuthProvider = new MockAuthProvider();
} else {
  currentAuthProvider = new SupabaseAuthProvider();
}

export function setAuthProvider(provider: IAuthProvider): void {
  currentAuthProvider = provider;
}

export function getAuthProvider(): IAuthProvider {
  return currentAuthProvider;
}

const isDemoEmail = (email: string): boolean =>
  email.toLowerCase().includes('sarah.mitchell') || email.toLowerCase().includes('demo');

/**
 * Provisions the tenant for a newly persisted user.
 *
 * Tenant policy: every self-signup creates a dedicated new organization with
 * the creator as ADMIN — users never silently join an existing tenant.
 * Joining an existing organization will be possible only via a future
 * invite flow. Demo users are provisioned into the deterministic demo org.
 */
async function provisionUserTenant(
  authUser: Pick<AuthUser, 'id' | 'email'>,
  displayName: string
): Promise<{ organizationId: string; role: Role }> {
  const isDemo = isDemoEmail(authUser.email);

  let orgId: string;
  let role: Role;

  if (isDemo) {
    const demoOrg = await prisma.organization.upsert({
      where: { id: DEMO_ORGANIZATION_IDS.lexflowDemo },
      update: {},
      create: { id: DEMO_ORGANIZATION_IDS.lexflowDemo, name: 'LexFlow Demo Chambers' },
    });
    orgId = demoOrg.id;
    role = 'ADMIN';
  } else {
    const baseName = displayName.trim() || authUser.email.split('@')[0];
    const org = await prisma.organization.create({
      data: { name: `${baseName}'s Chambers` },
    });
    orgId = org.id;
    role = 'ADMIN';
  }

  return { organizationId: orgId, role };
}

/**
 * Syncs an authenticated provider user into the local database,
 * provisioning a dedicated tenant on first sight (see provisionUserTenant).
 */
async function syncUserToDb(
  authUser: AuthUser,
  fallbackName?: string
): Promise<{ organizationId: string; role: Role; name: string }> {
  const displayName = authUser.name || fallbackName || 'Legal Advocate';

  const existing = await prisma.user.findUnique({
    where: { email: authUser.email },
  });

  if (existing) {
    return { organizationId: existing.organizationId, role: existing.role, name: existing.name };
  }

  const tenant = await provisionUserTenant(authUser, displayName);

  await prisma.user.create({
    data: {
      id: authUser.id,
      email: authUser.email,
      name: displayName,
      organizationId: tenant.organizationId,
      role: tenant.role,
    },
  });

  return { organizationId: tenant.organizationId, role: tenant.role, name: displayName };
}

export async function registerUser(
  email: string,
  password: string,
  name?: string
): Promise<{ user: AuthUser; session?: AuthSession; organizationId?: string }> {
  const providerResult = await getAuthProvider().signUp(email, password, name);
  const authUser = providerResult.user;

  let organizationId: string = DEMO_ORGANIZATION_IDS.default;
  let role = 'MEMBER';
  let displayName = name || authUser.name || 'Legal Advocate';

  try {
    const synced = await syncUserToDb(authUser, name);
    organizationId = synced.organizationId;
    role = synced.role;
    displayName = synced.name;
  } catch (dbErr) {
    console.warn('[AuthService] Database sync warning:', dbErr instanceof Error ? dbErr.message : dbErr);
  }

  const finalUser: AuthUser = {
    id: authUser.id,
    email: authUser.email,
    name: displayName,
    role,
    organizationId,
  };

  return {
    user: finalUser,
    session: providerResult.session || {
      token: `mock-token-${authUser.id}`,
      user: finalUser,
    },
    organizationId,
  };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: AuthUser; session: AuthSession; organizationId?: string }> {
  const providerResult = await getAuthProvider().signIn(email, password);
  const authUser = providerResult.user;

  let organizationId: string = DEMO_ORGANIZATION_IDS.default;
  let role = 'MEMBER';
  let displayName = authUser.name || 'Legal Advocate';

  try {
    const synced = await syncUserToDb(authUser);
    organizationId = synced.organizationId;
    role = synced.role;
    displayName = synced.name;
  } catch (dbErr) {
    console.warn('[AuthService] Database sync warning:', dbErr instanceof Error ? dbErr.message : dbErr);
  }

  const finalUser: AuthUser = {
    id: authUser.id,
    email: authUser.email,
    name: displayName,
    role,
    organizationId,
  };

  return {
    user: finalUser,
    session: providerResult.session || {
      token: `mock-token-${authUser.id}`,
      user: finalUser,
    },
    organizationId,
  };
}

export async function logoutUser(token: string): Promise<void> {
  await getAuthProvider().signOut(token);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await getAuthProvider().resetPassword(email);
}

export async function verifyUserToken(token: string): Promise<AuthUser> {
  const authUser = await getAuthProvider().verifyToken(token);

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email },
    });

    if (dbUser) {
      return {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        organizationId: dbUser.organizationId,
      };
    }
  } catch (dbErr) {
    // DB offline fallback
  }

  return {
    ...authUser,
    organizationId: authUser.organizationId || DEMO_ORGANIZATION_IDS.default,
  };
}
