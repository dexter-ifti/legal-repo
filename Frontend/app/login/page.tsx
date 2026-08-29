'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('sarah.mitchell@lexflow.app');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both your email and password.');
      setLoading(false);
      return;
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg =
          data.error?.message || data.message || 'We couldn’t sign you in. Please check your details.';
        setError(errorMsg);
        setLoading(false);
        return;
      }

      const token = data.data?.session?.token || data.data?.token;
      const user = data.data?.user;

      if (token) localStorage.setItem('token', token);
      if (user) localStorage.setItem('user', JSON.stringify(user));

      setLoading(false);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'We couldn’t reach the sign-in service. Please try again.';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
            Welcome back
          </h1>
          <p className="mt-2 text-center text-[15px] text-muted-foreground">
            Sign in to your LexFlow workspace to keep your documents in order.
          </p>

          {error && (
            <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-error/30 bg-error-soft/60 p-3 text-sm text-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@firm.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-sm font-medium text-brand hover:underline"
                  onClick={() =>
                    alert('Please contact your workspace admin to reset your password.')
                  }
                >
                  Forgot?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing you in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 rounded-xl border bg-card p-4">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
              <span>
                New here?{' '}
                <button
                  onClick={() => router.push('/signup')}
                  className="font-medium text-brand hover:underline"
                >
                  Create a workspace
                </button>
                .
              </span>
            </div>
            <div className="mt-3 border-t pt-3">
              <p className="text-xs text-muted-foreground">
                Want to look around first?
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => {
                  setEmail('sarah.mitchell@lexflow.app');
                  setPassword('demo1234');
                  const form = document.querySelector('form');
                  if (form) form.requestSubmit();
                }}
              >
                Try the demo workspace
              </Button>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 pb-6 text-center text-xs text-muted-foreground">
        Your documents are stored in a private, encrypted vault. Only members
        of your workspace can see them.
      </footer>
    </div>
  );
}