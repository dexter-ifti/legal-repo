'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FolderOpen, Search, Plus, Gavel, User, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { cases as initialMockCases } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import {
  CreateCaseDialog,
  CreateCaseFormData,
} from '@/components/cases/create-case-dialog';
import { useUserProfile } from '@/lib/use-user';

export interface UICaseItem {
  id: string;
  name: string;
  caseNumber: string;
  cnrNumber?: string;
  practiceArea: string;
  client: string;
  opposingParty?: string;
  court?: string;
  judge?: string;
  status: string;
  documentCount: number;
  filedCount: number;
  reviewCount: number;
  processingCount: number;
  nextHearing?: string;
}

export default function CasesPage() {
  const { user } = useUserProfile();
  const [caseList, setCaseList] = useState<UICaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.isDemo) {
      setCaseList(
        initialMockCases.map((c) => ({
          id: c.id,
          name: c.name,
          caseNumber: c.caseNumber,
          cnrNumber: `CNR/2026/${c.id.toUpperCase()}`,
          practiceArea: c.practiceArea,
          client: c.client,
          opposingParty: 'Opposing Party',
          court: 'High Court',
          judge: 'Presiding Judge',
          status: c.status,
          documentCount: c.documentCount,
          filedCount: c.filedCount,
          reviewCount: c.reviewCount,
          processingCount: c.processingCount,
          nextHearing: c.nextHearing,
        }))
      );
      setLoading(false);
    } else if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      setLoading(true);

      fetch(`${baseUrl}/api/v1/cases`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.data?.cases) {
            setCaseList(
              data.data.cases.map((c: any) => ({
                id: c.id,
                name: c.title,
                caseNumber: c.caseNumber || 'N/A',
                cnrNumber: c.cnrNumber || 'N/A',
                practiceArea: c.caseType || 'General Legal',
                client: c.clientName || 'Unspecified Client',
                opposingParty: c.opposingParty || 'N/A',
                court: c.court || 'Court',
                judge: c.judge || 'Bench',
                status: c.status?.toLowerCase() || 'active',
                documentCount: c._count?.documents || 0,
                filedCount: 0,
                reviewCount: 0,
                processingCount: 0,
              }))
            );
          } else {
            setCaseList([]);
          }
        })
        .catch((err) => console.warn('Error fetching real cases:', err))
        .finally(() => setLoading(false));
    }
  }, [user.isDemo]);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreateCase = async (data: CreateCaseFormData) => {
    if (!user.isDemo && typeof window !== 'undefined') {
      try {
        const token = localStorage.getItem('token');
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${baseUrl}/api/v1/cases`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        const created = await res.json();
        if (res.ok && created.data?.case) {
          const c = created.data.case;
          const newCaseItem: UICaseItem = {
            id: c.id,
            name: c.title,
            caseNumber: c.caseNumber || 'N/A',
            cnrNumber: c.cnrNumber || 'N/A',
            practiceArea: c.caseType || 'General Legal',
            client: c.clientName || 'Unspecified Client',
            opposingParty: c.opposingParty || 'Unspecified',
            court: c.court || 'Court / Tribunal',
            judge: c.judge || 'Hon. Bench',
            status: c.status?.toLowerCase() || 'active',
            documentCount: 0,
            filedCount: 0,
            reviewCount: 0,
            processingCount: 0,
          };
          setCaseList((prev) => [newCaseItem, ...prev]);
          return;
        }
      } catch (err) {
        console.error('Failed to create case on backend:', err);
      }
    }

    const newCaseItem: UICaseItem = {
      id: `case-${Date.now()}`,
      name: data.title,
      caseNumber: data.caseNumber || 'N/A',
      cnrNumber: data.cnrNumber || 'N/A',
      practiceArea: data.caseType || 'General Legal',
      client: data.clientName || 'Unspecified Client',
      opposingParty: data.opposingParty || 'Unspecified',
      court: data.court || 'Court / Tribunal',
      judge: data.judge || 'Hon. Bench',
      status: 'active',
      documentCount: 0,
      filedCount: 0,
      reviewCount: 0,
      processingCount: 0,
    };

    setCaseList((prev) => [newCaseItem, ...prev]);
  };

  const filteredCases = caseList.filter((c) => {
    const q = query.toLowerCase().trim();
    const matchesQuery =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.caseNumber.toLowerCase().includes(q) ||
      (c.cnrNumber && c.cnrNumber.toLowerCase().includes(q)) ||
      c.client.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cases & Matters</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {caseList.length} cases registered · {caseList.filter((c) => c.status === 'active').length} active litigation matters
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
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
            placeholder="Search by case title, filing number, CNR, or client name..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredCases.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={FolderOpen}
              title="No cases found"
              description="No legal cases match your current search criteria or active filters."
              action={
                <Button variant="outline" onClick={() => { setQuery(''); setStatusFilter('all'); }}>
                  Clear Filters
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCases.map((c) => (
            <Link
              key={c.id}
              href={`/cases/${c.id}`}
              className="group flex flex-col justify-between rounded-xl border bg-card p-5 transition-all hover:border-brand hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
                      c.status === 'active' && 'bg-success-soft text-success',
                      c.status === 'pending' && 'bg-warning-soft text-warning',
                      c.status === 'closed' && 'bg-neutral-soft text-neutral-status'
                    )}
                  >
                    {c.status}
                  </span>
                </div>

                <h3 className="mt-4 line-clamp-2 text-base font-bold text-foreground group-hover:text-brand">
                  {c.name}
                </h3>

                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">
                    Filing No: <span className="font-normal text-muted-foreground">{c.caseNumber}</span>
                  </p>
                  {c.cnrNumber && c.cnrNumber !== 'N/A' && (
                    <p className="font-mono text-[11px] text-muted-foreground">
                      CNR: {c.cnrNumber}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 pt-1">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{c.court}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">Client: {c.client}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t pt-3 text-xs">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="block font-bold text-foreground">{c.documentCount}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">Docs</span>
                  </div>
                  <div>
                    <span className="block font-bold text-success">{c.filedCount}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">Filed</span>
                  </div>
                  <div>
                    <span className="block font-bold text-warning">{c.reviewCount}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">Review</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateCaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateCase}
      />
    </div>
  );
}
