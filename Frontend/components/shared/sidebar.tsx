'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Upload,
  Search,
  FileText,
  Settings,
  LifeBuoy,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { currentUser } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cases', label: 'Cases', icon: FolderOpen },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/documents', label: 'Documents', icon: FileText },
];

export function Sidebar({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" onClick={onItemClick}>
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-soft text-brand'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'h-4.5 w-4.5 shrink-0',
                  active ? 'text-brand' : 'text-muted-foreground group-hover:text-foreground'
                )}
                style={{ width: '1.125rem', height: '1.125rem' }}
              />
              {item.label}
              {active && (
                <ChevronRight className="ml-auto h-4 w-4 text-brand" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t px-3 py-4">
        <Link
          href="/settings"
          onClick={onItemClick}
          className={cn(
            'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            pathname === '/settings'
              ? 'bg-brand-soft text-brand'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          <Settings className="h-4.5 w-4.5" style={{ width: '1.125rem', height: '1.125rem' }} />
          Settings
        </Link>
        <Link
          href="#"
          onClick={onItemClick}
          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LifeBuoy className="h-4.5 w-4.5" style={{ width: '1.125rem', height: '1.125rem' }} />
          Help & Support
        </Link>
        <Link
          href="/login"
          onClick={onItemClick}
          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4.5 w-4.5" style={{ width: '1.125rem', height: '1.125rem' }} />
          Sign out
        </Link>
      </div>

      <div className="border-t px-4 py-3">
        <Link
          href="/settings"
          onClick={onItemClick}
          className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(199_89%_30%)] to-[hsl(205_80%_20%)] text-sm font-semibold text-white">
            {currentUser.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {currentUser.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {currentUser.role}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
