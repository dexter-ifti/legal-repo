'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { useUserProfile } from '@/lib/use-user';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cases', label: 'Cases', icon: FolderOpen },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/documents', label: 'Documents', icon: FileText },
];

const COLLAPSED_KEY = 'lexflow-sidebar-collapsed';

/**
 * Self-collapsing application sidebar. Works on every screen size:
 * on desktop it folds into an icon rail; inside the mobile sheet it
 * collapses the same way. Preference persists across sessions.
 */
export function Sidebar({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  const { user } = useUserProfile();
  const [collapsed, setCollapsed] = useState(false);

  // Restore saved preference after mount (avoid SSR mismatch).
  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === 'true');
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  };

  const linkBase = cn(
    'group flex items-center rounded-lg text-sm font-medium transition-colors',
    collapsed ? 'mx-auto h-10 w-10 justify-center p-0' : 'gap-3 px-3 py-2.5'
  );

  const renderItem = (
    active: boolean,
    content: React.ReactNode,
    label: string
  ): React.ReactNode =>
    collapsed ? (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    ) : (
      content
    );

  const renderNavLink = (
    href: string,
    label: string,
    Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  ) => {
    const active = pathname === href || pathname.startsWith(href + '/');
    const content = (
      <Link
        href={href}
        onClick={onItemClick}
        title={collapsed ? label : undefined}
        className={cn(
          linkBase,
          active
            ? 'bg-brand-soft text-brand'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        )}
      >
        <Icon
          className="h-[1.125rem] w-[1.125rem] shrink-0"
          style={{ width: '1.125rem', height: '1.125rem' }}
        />
        {!collapsed && (
          <>
            {label}
            {active && <ChevronRight className="ml-auto h-4 w-4 text-brand" />}
          </>
        )}
      </Link>
    );
    return renderItem(active, content, label);
  };

  const renderActionLink = (
    opts: {
      href: string;
      label: string;
      icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
      destructive?: boolean;
      onClick?: () => void;
    }
  ) => {
    const { href, label, icon: Icon, destructive, onClick } = opts;
    const active = pathname === href && href !== '#';
    const content = (
      <Link
        href={href}
        onClick={
          onClick ??
          (() => {
            onItemClick?.();
          })
        }
        title={collapsed ? label : undefined}
        className={cn(
          linkBase,
          destructive
            ? 'text-destructive transition-colors hover:bg-destructive/10'
            : active
            ? 'bg-brand-soft text-brand'
            : 'text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground'
        )}
      >
        <Icon
          className="h-[1.125rem] w-[1.125rem] shrink-0"
          style={{ width: '1.125rem', height: '1.125rem' }}
        />
        {!collapsed && label}
      </Link>
    );
    return renderItem(active, content, label);
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex h-full flex-col bg-card transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-[68px]' : 'w-64'
        )}
      >
        {/* Brand + collapse toggle */}
        <div
          className={cn(
            'flex h-16 shrink-0 items-center border-b',
            collapsed ? 'justify-center px-2' : 'justify-between px-4'
          )}
        >
          {!collapsed && (
            <Link href="/dashboard" onClick={onItemClick}>
              <Logo />
            </Link>
          )}
          <button
            type="button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggleCollapsed}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
              collapsed && 'mt-1'
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4.5 w-4.5" />
            ) : (
              <PanelLeftClose className="h-4.5 w-4.5" />
            )}
          </button>
        </div>

        {/* Primary navigation */}
        <nav
          className={cn(
            'flex-1 space-y-1 overflow-x-hidden overflow-y-auto py-4',
            collapsed ? 'px-2' : 'px-3'
          )}
        >
          {collapsed && (
            <Link
              href="/dashboard"
              onClick={onItemClick}
              className="mb-3 flex justify-center"
              title="LexFlow"
            >
              <Logo showText={false} />
            </Link>
          )}
          {navItems.map((item) => (
            <div key={item.href}>{renderNavLink(item.href, item.label, item.icon)}</div>
          ))}
        </nav>

        {/* Secondary navigation */}
        <div className={cn('space-y-1 border-t py-4', collapsed ? 'px-2' : 'px-3')}>
          {renderActionLink({ href: '/settings', label: 'Settings', icon: Settings })}
          {renderActionLink({ href: '#', label: 'Help & Support', icon: LifeBuoy })}
          {renderActionLink({
            href: '/login',
            label: 'Sign out',
            icon: LogOut,
            destructive: true,
            onClick: () => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
              }
              onItemClick?.();
            },
          })}
        </div>

        {/* User card */}
        <div className={cn('border-t py-3', collapsed ? 'px-2' : 'px-4')}>
          {collapsed ? (
            renderItem(
              false,
              <Link
                href="/settings"
                onClick={onItemClick}
                className="flex justify-center"
                title={`${user.name} — ${user.role}`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(199_89%_30%)] to-[hsl(205_80%_20%)] text-sm font-semibold text-white">
                  {user.initials}
                </div>
              </Link>,
              `${user.name} — ${user.role}`
            )
          ) : (
            <Link
              href="/settings"
              onClick={onItemClick}
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(199_89%_30%)] to-[hsl(205_80%_20%)] text-sm font-semibold text-white">
                {user.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.role}</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
