'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2, ArrowRight, MailCheck } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface InviteContext {
  email?: string;
  role?: string;
  organizationName?: string;
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [invite, setInvite] = useState<InviteContext | null>(null);
  const [inviteChecked, setInviteChecked] = useState(!inviteToken);
  const [name, setName] = useState('');
  const [firm, setFirm] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    fetch(`${baseUrl}/api/v1/invites/validate/${encodeURIComponent(inviteToken)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (cancelled) return;
        if (body?.data?.valid) {
          setInvite(body.data);
          if (body.data.email) setEmail(body.data.email);
          if (body.data.organizationName) setFirm(body.data.organizationName);
        }
        setInviteChecked(true);
      })
      .catch(() => {
        if (!cancelled) setInviteChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 8) {
      setError('Please use a password with at least 8 characters.');
      setLoading(false);
      return;
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          ...(inviteToken ? { inviteToken } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg =
          data.error?.message || data.message || 'We couldn’t create your workspace. Please try again.';
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
          : 'We couldn’t reach the sign-up service. Please try again.';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
            {invite
              ? `Join ${invite.organizationName}`
              : 'Create your workspace'}
          </h1>
          <p className="mt-2 text-center text-[15px] text-muted-foreground">
            {invite
              ? `You’ve been invited as ${invite.role?.toLowerCase() || 'a member'}. Finish setting up below.`
              : 'Start filing legal documents automatically in minutes.'}
          </p>

          {invite && (
            <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-success/30 bg-success-soft/60 p-3 text-sm text-foreground">
              <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>
                You’re joining <strong>{invite.organizationName}</strong> as{' '}
                <strong>{invite.role?.toLowerCase()}</strong>. We’ve filled in
                your email already.
              </span>
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-error/30 bg-error-soft/60 p-3 text-sm text-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
            {!invite && (
              <div className="space-y-2">
                <Label htmlFor="firm">Firm or chamber name</Label>
                <Input
                  id="firm"
                  type="text"
                  value={firm}
                  onChange={(e) => setFirm(e.target.value)}
                  placeholder="Mitchell & Associates"
                  required
                />
              </div>
            )}
            {invite && (
              <div className="space-y-2">
                <Label htmlFor="firm-invited">Organization</Label>
                <Input id="firm-invited" type="text" value={firm} disabled />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
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
              <Label htmlFor="password">Choose a password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating your workspace…
                </>
              ) : (
                <>
                  Create workspace
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/login')}
              className="font-medium text-brand hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </main>

      <footer className="px-6 pb-6 text-center text-xs text-muted-foreground">
        Your documents are stored in a private, encrypted vault.
      </footer>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}