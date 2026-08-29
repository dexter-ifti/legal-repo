'use client';

import { useState, useEffect } from 'react';
import {
  FileCheck,
  Search,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  MatchingCandidatesCard,
  CaseCandidate,
} from '@/components/documents/matching-candidates-card';
import {
  ReassignCaseDialog,
  CaseOption,
} from '@/components/documents/reassign-case-dialog';
import { toast } from 'sonner';

export interface InboxDocument {
  id: string;
  originalFilename: string;
  systemFilename: string | null;
  documentType: string | null;
  processingStatus: string;
  matchStatus: string;
  matchConfidence: number | null;
  uploadedAt: string;
  case?: { id: string; title: string; caseNumber: string | null } | null;
  metadata?: Array<{ fieldName: string; fieldValue: string | null }>;
}

type FilterKey = 'ALL_PENDING' | 'CONFIRMATION_REQUIRED' | 'NO_MATCH' | 'FILED';

export default function NeedsAttentionPage() {
  const [documents, setDocuments] = useState<InboxDocument[]>([]);
  const [availableCases, setAvailableCases] = useState<CaseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('ALL_PENDING');

  const [reassignDoc, setReassignDoc] = useState<InboxDocument | null>(null);

  const fetchInboxData = async () => {
    setIsLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      const [docsRes, casesRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/documents`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        }),
        fetch(`${API_URL}/api/v1/cases`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        }),
      ]);

      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData.data || []);
      }
      if (casesRes.ok) {
        const casesData = await casesRes.json();
        setAvailableCases(
          (casesData.data?.cases || []).map((caseItem: any) => ({
            id: caseItem.id,
            title: caseItem.title,
            caseNumber: caseItem.caseNumber || null,
          }))
        );
      }
    } catch (err: unknown) {
      console.error('Failed to fetch inbox items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInboxData();
  }, []);

  const counts = {
    ALL_PENDING: documents.filter(
      (d) =>
        d.matchStatus === 'CONFIRMATION_REQUIRED' ||
        d.matchStatus === 'NO_MATCH' ||
        !d.case
    ).length,
    CONFIRMATION_REQUIRED: documents.filter(
      (d) => d.matchStatus === 'CONFIRMATION_REQUIRED'
    ).length,
    NO_MATCH: documents.filter((d) => d.matchStatus === 'NO_MATCH').length,
    FILED: documents.filter(
      (d) => d.matchStatus === 'CONFIRMED' || d.matchStatus === 'AUTO_MATCHED'
    ).length,
  };

  const pendingDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.documentType || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'ALL_PENDING') {
      return (
        doc.matchStatus === 'CONFIRMATION_REQUIRED' ||
        doc.matchStatus === 'NO_MATCH' ||
        !doc.case
      );
    }
    if (filter === 'CONFIRMATION_REQUIRED')
      return doc.matchStatus === 'CONFIRMATION_REQUIRED';
    if (filter === 'NO_MATCH') return doc.matchStatus === 'NO_MATCH';
    if (filter === 'FILED')
      return (
        doc.matchStatus === 'CONFIRMED' || doc.matchStatus === 'AUTO_MATCHED'
      );

    return true;
  });

  return (
    <div className="page-shell space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Needs your attention
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Documents we couldn’t file automatically. Pick the right case — or
          choose a different one.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search uploads…"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div
            role="tablist"
            className="flex flex-wrap items-center gap-1 rounded-lg bg-secondary p-1 text-sm font-medium"
          >
            {(
              [
                { key: 'ALL_PENDING', label: 'All', count: counts.ALL_PENDING },
                { key: 'CONFIRMATION_REQUIRED', label: 'Confirm', count: counts.CONFIRMATION_REQUIRED },
                { key: 'NO_MATCH', label: 'No match', count: counts.NO_MATCH },
                { key: 'FILED', label: 'Filed', count: counts.FILED },
              ] as Array<{ key: FilterKey; label: string; count: number }>
            ).map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={filter === tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all',
                  filter === tab.key
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    filter === tab.key
                      ? 'bg-brand-soft text-brand'
                      : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32 rounded-xl bg-secondary/30" />
            </Card>
          ))}
        </div>
      ) : pendingDocuments.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft text-success">
                <FileCheck className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                You’re all caught up
              </h3>
              <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
                Every document in your workspace is filed. New uploads will
                appear here if we ever need your input.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pendingDocuments.map((doc) => {
            const candidatesMeta = doc.metadata?.find(
              (m) => m.fieldName === 'matching_candidates'
            );
            let candidates: CaseCandidate[] = [];
            if (candidatesMeta?.fieldValue) {
              try {
                candidates = JSON.parse(candidatesMeta.fieldValue);
              } catch {
                candidates = [];
              }
            }

            return (
              <div key={doc.id} className="space-y-3">
                <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">
                        {doc.originalFilename}
                      </h3>
                      {doc.documentType && (
                        <Badge variant="outline" className="text-[11px]">
                          {doc.documentType}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReassignDoc(doc)}
                  >
                    Pick a different case
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <MatchingCandidatesCard
                  documentId={doc.id}
                  documentTitle={doc.originalFilename}
                  matchStatus={doc.matchStatus}
                  matchConfidence={doc.matchConfidence}
                  candidates={candidates}
                  onConfirmSuccess={fetchInboxData}
                  onOpenReassign={() => setReassignDoc(doc)}
                />
              </div>
            );
          })}
        </div>
      )}

      {reassignDoc && (
        <ReassignCaseDialog
          open={!!reassignDoc}
          onOpenChange={(open) => {
            if (!open) setReassignDoc(null);
          }}
          documentId={reassignDoc.id}
          documentTitle={reassignDoc.originalFilename}
          availableCases={availableCases}
          onReassignSuccess={fetchInboxData}
        />
      )}
    </div>
  );
}