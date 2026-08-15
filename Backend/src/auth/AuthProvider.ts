export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  organizationId?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface IAuthProvider {
  signUp(email: string, password: string, name?: string): Promise<{ user: AuthUser; session?: AuthSession }>;
  signIn(email: string, password: string): Promise<{ user: AuthUser; session: AuthSession }>;
  signOut(token: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  verifyToken(token: string): Promise<AuthUser>;
}
