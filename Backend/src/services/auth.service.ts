import { IAuthProvider, AuthUser, AuthSession } from '../auth/AuthProvider.js';
import { SupabaseAuthProvider } from '../auth/SupabaseAuthProvider.js';
import { MockAuthProvider } from '../auth/MockAuthProvider.js';
import { DEMO_ORGANIZATION_IDS } from '../auth/demo-users.js';
import { prisma } from '../db/client.js';

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
    let dbUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!dbUser) {
      let defaultOrg = await prisma.organization.findFirst();
      if (!defaultOrg) {
        defaultOrg = await prisma.organization.create({
          data: {
            name: 'Default Legal Chambers',
          },
        });
      }

      dbUser = await prisma.user.create({
        data: {
          id: authUser.id,
          email: authUser.email,
          name: displayName,
          organizationId: defaultOrg.id,
          role: 'MEMBER',
        },
      });
    }

    organizationId = dbUser.organizationId;
    role = dbUser.role;
    displayName = dbUser.name;
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
    let dbUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!dbUser) {
      let defaultOrg = await prisma.organization.findFirst();
      if (!defaultOrg) {
        defaultOrg = await prisma.organization.create({
          data: {
            name: 'Default Legal Chambers',
          },
        });
      }

      dbUser = await prisma.user.create({
        data: {
          id: authUser.id,
          email: authUser.email,
          name: displayName,
          organizationId: defaultOrg.id,
          role: 'MEMBER',
        },
      });
    }

    organizationId = dbUser.organizationId;
    role = dbUser.role;
    displayName = dbUser.name;
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
