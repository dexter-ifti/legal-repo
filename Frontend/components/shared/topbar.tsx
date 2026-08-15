'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Menu, Bell, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from '@/components/shared/sidebar';
import { useUserProfile } from '@/lib/use-user';

export function Topbar({ title }: { title?: string }) {
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {title && (
        <h1 className="hidden text-lg font-semibold md:block lg:hidden">
          {title}
        </h1>
      )}

      <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents, cases..."
          className="pl-9"
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          className="hidden sm:flex"
          onClick={() => router.push('/upload')}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Upload
        </Button>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />
        </Button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(199_89%_30%)] to-[hsl(205_80%_20%)] text-sm font-semibold text-white">
          {user.initials}
        </div>
      </div>
    </header>
  );
}
