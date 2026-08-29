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
  Inbox,
  Settings,
  LifeBuoy,
  LogOut,
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
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/cases', label: 'Cases', icon: FolderOpen },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/inbox', label: 'Needs attention', icon: Inbox },
  { href: '/documents', label: 'All documents', icon: FileText },
  { href: '/search', label: 'Search', icon: Search },
];

const COLLAPSED_KEY = 'lexflow-sidebar-collapsed';

export function Sidebar({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  const { user } = useUserProfile();
  const [collapsed, setCollapsed] = useState(false);

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
    Icon: React.ComponentType<{ className?: string }>
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
            : 'text-foreground/70 hover:bg-secondary hover:text-foreground'
        )}
      >
        <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
        {!collapsed && <span>{label}</span>}
      </Link>
    );
    return renderItem(active, content, label);
  };

  const renderActionLink = (
    opts: {
      href: string;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      destructive?: boolean;
      onClick?: () => void;
    }
  ) => {
    const { href, label, icon: Icon, destructive, onClick } = opts;
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
            : 'text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground'
        )}
      >
        <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
        {!collapsed && <span>{label}</span>}
      </Link>
    );
    return renderItem(false, content, label);
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
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
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
            <div key={item.href}>
              {renderNavLink(item.href, item.label, item.icon)}
            </div>
          ))}
        </nav>

        {/* Secondary navigation */}
        <div className={cn('space-y-1 border-t py-4', collapsed ? 'px-2' : 'px-3')}>
          {renderActionLink({ href: '/settings', label: 'Settings', icon: Settings })}
          {renderActionLink({ href: '#', label: 'Help & support', icon: LifeBuoy })}
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
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">
                {user.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.role}
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}