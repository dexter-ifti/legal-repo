import { randomUUID } from 'node:crypto';
import { IAuthProvider, AuthUser, AuthSession } from './AuthProvider.js';

export class MockAuthProvider implements IAuthProvider {
  private users: Map<string, { email: string; password: string; name?: string; id: string }> = new Map();
  private activeTokens: Map<string, AuthUser> = new Map();

  async signUp(email: string, password: string, name?: string): Promise<{ user: AuthUser; session?: AuthSession }> {
    if (this.users.has(email)) {
      throw new Error('User already registered');
    }

    const id = randomUUID();
    const record = { email, password, name, id };
    this.users.set(email, record);

    const authUser: AuthUser = { id, email, name };
    const token = `mock-token-${id}`;
    this.activeTokens.set(token, authUser);

    return {
      user: authUser,
      session: { token, user: authUser },
    };
  }

  async signIn(email: string, password: string): Promise<{ user: AuthUser; session: AuthSession }> {
    if (email === 'sarah.mitchell@lexflow.app' || email.includes('demo')) {
      const demoUser: AuthUser = {
        id: 'usr_sarah',
        email: 'sarah.mitchell@lexflow.app',
        name: 'Sarah Mitchell',
      };
      const token = 'mock-token-usr_sarah';
      this.activeTokens.set(token, demoUser);
      return {
        user: demoUser,
        session: { token, user: demoUser },
      };
    }

    const record = this.users.get(email);
    if (!record || record.password !== password) {
      throw new Error('Invalid login credentials');
    }

    const authUser: AuthUser = { id: record.id, email: record.email, name: record.name };
    const token = `mock-token-${record.id}`;
    this.activeTokens.set(token, authUser);

    return {
      user: authUser,
      session: { token, user: authUser },
    };
  }

  async signOut(token: string): Promise<void> {
    this.activeTokens.delete(token);
  }

  async resetPassword(email: string): Promise<void> {
    if (!email) {
      throw new Error('Email is required');
    }
  }

  async verifyToken(token: string): Promise<AuthUser> {
    const authUser = this.activeTokens.get(token);
    if (!authUser) {
      throw new Error('Invalid or expired authentication token');
    }
    return authUser;
  }
}
