'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, ArrowRight, Check } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
      setError('Please enter both email and password');
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
        const errorMsg = data.error?.message || data.message || 'Invalid email or password';
        setError(errorMsg);
        setLoading(false);
        return;
      }

      const token = data.data?.session?.token || data.data?.token;
      const user = data.data?.user;

      if (token) {
        localStorage.setItem('token', token);
      }
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }

      setLoading(false);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to authentication server';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your LexFlow workspace to continue automating.
          </p>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@firm.com"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-brand hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <button
              onClick={() => router.push('/signup')}
              className="font-medium text-brand hover:underline"
            >
              Create one
            </button>
          </p>
        </div>
      </div>

      <div className="hidden w-0 flex-1 lg:block">
        <div className="relative flex h-full flex-col justify-center overflow-hidden bg-gradient-to-br from-[hsl(205_80%_20%)] to-[hsl(199_89%_30%)] p-12">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-white blur-3xl" />
            <div className="absolute right-0 bottom-10 h-96 w-96 rounded-full bg-white blur-3xl" />
          </div>
          <div className="relative z-10 max-w-md text-white">
            <h2 className="text-3xl font-bold leading-tight">
              Automate your legal document workflows with AI precision.
            </h2>
            <p className="mt-4 text-lg text-white/80">
              Scan, OCR, classify, and file — all in one streamlined platform
              built for modern law firms.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                '87% automation rate on document classification',
                'OCR with 99%+ accuracy on scanned filings',
                'Smart template matching across 50+ document types',
                'Full audit trail and compliance logging',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-white/90">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                    <Check className="h-3 w-3" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
