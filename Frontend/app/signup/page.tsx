'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => router.push('/dashboard'), 800);
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Create your workspace
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Start automating your legal document workflows today.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" type="text" placeholder="Jane Doe" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firm">Firm name</Label>
              <Input id="firm" type="text" placeholder="Mitchell & Associates" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" placeholder="you@firm.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
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

      <div className="hidden w-0 flex-1 lg:block">
        <div className="relative flex h-full flex-col justify-center overflow-hidden bg-gradient-to-br from-[hsl(205_80%_20%)] to-[hsl(199_89%_30%)] p-12">
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
