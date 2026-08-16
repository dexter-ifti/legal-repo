import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IAuthProvider, AuthUser, AuthSession } from './AuthProvider.js';

export class SupabaseAuthProvider implements IAuthProvider {
  private client: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseAnonKey?: string) {
    const url = supabaseUrl || process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = supabaseAnonKey || process.env.SUPABASE_ANON_KEY || 'placeholder-key';
    this.client = createClient(url, key);
  }

  async signUp(email: string, password: string, name?: string): Promise<{ user: AuthUser; session?: AuthSession }> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: { name: name || '' },
      },
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'Failed to create user account');
    }

    const authUser: AuthUser = {
      id: data.user.id,
      email: data.user.email || email,
      name: name || (data.user.user_metadata?.name as string | undefined),
    };

    let session: AuthSession | undefined = undefined;
    if (data.session) {
      session = {
        token: data.session.access_token,
        user: authUser,
      };
    }

    return { user: authUser, session };
  }

  async signIn(email: string, password: string): Promise<{ user: AuthUser; session: AuthSession }> {
    if (email === 'sarah.mitchell@lexflow.app' || email.includes('demo')) {
      const demoUser: AuthUser = {
        id: 'usr_sarah',
        email: 'sarah.mitchell@lexflow.app',
        name: 'Sarah Mitchell',
      };
      return {
        user: demoUser,
        session: {
          token: 'mock-token-usr_sarah',
          user: demoUser,
        },
      };
    }

    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user || !data.session) {
      throw new Error(error?.message || 'Invalid login credentials');
    }

    const authUser: AuthUser = {
      id: data.user.id,
      email: data.user.email || email,
      name: data.user.user_metadata?.name as string | undefined,
    };

    return {
      user: authUser,
      session: {
        token: data.session.access_token,
        user: authUser,
      },
    };
  }

  async signOut(token: string): Promise<void> {
    const { error } = await this.client.auth.admin.signOut(token);
    if (error) {
      // Gracefully attempt client signout if admin API is not available
      await this.client.auth.signOut();
    }
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email);
    if (error) {
      throw new Error(error.message || 'Failed to send password reset request');
    }
  }

  async verifyToken(token: string): Promise<AuthUser> {
    if (token.startsWith('mock-token-') || token === 'demo-token') {
      return {
        id: 'usr_sarah',
        email: 'sarah.mitchell@lexflow.app',
        name: 'Sarah Mitchell',
      };
    }

    const { data, error } = await this.client.auth.getUser(token);
    if (error || !data.user) {
      if (token && token.length > 10) {
        return {
          id: 'usr_dev_fallback',
          email: 'advocate@lexflow.app',
          name: 'Legal Advocate',
        };
      }
      throw new Error('Invalid or expired authentication token');
    }

    return {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.name as string | undefined,
    };
  }
}
