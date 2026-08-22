'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2, ArrowRight, MailCheck } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  // Resolve invite context so the form can welcome the recipient and
  // pre-fill their email and organization name.
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
      setError('Password must be at least 8 characters long');
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
        const errorMsg = data.error?.message || data.message || 'Registration failed';
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
            {invite ? `Join ${invite.organizationName}` : 'Create your workspace'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {invite
              ? `You've been invited as ${invite.role?.toLowerCase() || 'a member'}.`
              : 'Start automating your legal document workflows today.'}
          </p>

          {invite && (
            <Alert className="mt-4 border-success/40 bg-success-soft/40">
              <MailCheck className="h-4 w-4 text-success" />
              <AlertDescription className="text-xs">
                Invited to join <strong>{invite.organizationName}</strong> as{' '}
                <strong>{invite.role?.toLowerCase()}</strong> — your email is pre-filled below.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
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
                <Label htmlFor="firm">Firm name</Label>
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              {loading ? 'Creating workspace...' : 'Create workspace'}
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
      </div>

      <div className="hidden w-0 flex-1 lg:block">        <div className="relative flex h-full flex-col justify-center overflow-hidden bg-gradient-to-br from-[hsl(205_80%_20%)] to-[hsl(199_89%_30%)] p-12">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-white blur-3xl" />
            <div className="absolute right-0 bottom-10 h-96 w-96 rounded-full bg-white blur-3xl" />
          </div>
          <div className="relative z-10 max-w-md text-white">
            <h2 className="text-3xl font-bold leading-tight">
              Join hundreds of firms saving 140+ hours per month.
            </h2>
            <p className="mt-4 text-lg text-white/80">
              LexFlow eliminates manual document processing so your team can
              focus on what matters — your clients.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-6">
              <div>
                <p className="text-3xl font-bold">87%</p>
                <p className="mt-1 text-sm text-white/70">Automation rate</p>
              </div>
              <div>
                <p className="text-3xl font-bold">99%</p>
                <p className="mt-1 text-sm text-white/70">OCR accuracy</p>
              </div>
              <div>
                <p className="text-3xl font-bold">140h</p>
                <p className="mt-1 text-sm text-white/70">Saved monthly</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
