import { IAuthProvider, AuthUser, AuthSession } from '../auth/AuthProvider.js';
import { SupabaseAuthProvider } from '../auth/SupabaseAuthProvider.js';
import { MockAuthProvider } from '../auth/MockAuthProvider.js';
import { prisma } from '../db/client.js';

let currentAuthProvider: IAuthProvider;

if (process.env.NODE_ENV === 'test') {
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
        name: name || authUser.name || 'Legal Advocate',
        organizationId: defaultOrg.id,
        role: 'MEMBER',
      },
    });
  }

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      organizationId: dbUser.organizationId,
    },
    session: providerResult.session,
    organizationId: dbUser.organizationId,
  };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: AuthUser; session: AuthSession; organizationId?: string }> {
  const providerResult = await getAuthProvider().signIn(email, password);
  const authUser = providerResult.user;

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
        name: authUser.name || 'Legal Advocate',
        organizationId: defaultOrg.id,
        role: 'MEMBER',
      },
    });
  }

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      organizationId: dbUser.organizationId,
    },
    session: providerResult.session,
    organizationId: dbUser.organizationId,
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

  return authUser;
}
