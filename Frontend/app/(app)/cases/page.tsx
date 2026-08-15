'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FolderOpen, Search, Plus, Calendar, FileText, CheckCircle2, Clock } from 'lucide-react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/shared/empty-state';
import { cases } from '@/lib/mock-data';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function CasesPage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = cases.filter((c) => {
    const matchesQuery =
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(query.toLowerCase()) ||
      c.client.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {cases.length} cases · {cases.filter(c => c.status === 'active').length} active
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Case
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by case name, number, or client..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <EmptyState
              icon={FolderOpen}
              title="No cases found"
              description="Try adjusting your search or filter to find what you're looking for."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/cases/${c.id}`}
              className="group rounded-xl border bg-card p-5 transition-all hover:border-brand hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-medium',
                    c.status === 'active' && 'bg-success-soft text-success',
                    c.status === 'pending' && 'bg-warning-soft text-warning',
                    c.status === 'closed' && 'bg-neutral-soft text-neutral-status'
                  )}
                >
                  {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                </span>
              </div>

              <h3 className="mt-4 truncate text-base font-semibold text-foreground group-hover:text-brand">
                {c.name}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {c.caseNumber} · {c.practiceArea}
              </p>
              <p className="mt-2 truncate text-sm text-muted-foreground">
                Client: {c.client}</p>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-foreground">{c.documentCount}</span>
                  <span className="text-muted-foreground">Total</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-success">{c.filedCount}</span>
                  <span className="text-muted-foreground">Filed</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-warning">{c.reviewCount}</span>
                  <span className="text-muted-foreground">Review</span>
                </div>
              </div>

              {c.nextHearing && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Next hearing: {formatDate(c.nextHearing)}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
