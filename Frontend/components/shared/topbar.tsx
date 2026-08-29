'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Menu, Plus, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from '@/components/shared/sidebar';
import { useUserProfile } from '@/lib/use-user';

export function Topbar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { user } = useUserProfile();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-fit p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <form onSubmit={handleSearch} className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a case, party, or document…"
          className="pl-10"
          aria-label="Search"
        />
      </form>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Help"
          className="hidden sm:inline-flex"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
        <Button
          size="sm"
          className="hidden sm:flex"
          onClick={() => router.push('/upload')}
        >
          <Plus className="h-4 w-4" />
          Upload
        </Button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">
          {user.initials}
        </div>
      </div>
    </header>
  );
}