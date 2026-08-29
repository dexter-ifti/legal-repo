'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Search, ArrowUpDown } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge, PriorityBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { documents } from '@/lib/mock-data';
import { formatFileSize, formatRelativeTime } from '@/lib/format';
import { useUserProfile } from '@/lib/use-user';

export default function DocumentsPage() {
  const { user } = useUserProfile();
  const [docList, setDocList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token') || 'demo-token';
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      setLoading(true);

      fetch(`${baseUrl}/api/v1/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const apiDocs = data?.data
            ? data.data.map((d: any) => ({
                id: d.id,
                title: d.originalFilename || 'Document',
                caseName: d.case?.title || 'Unassigned case',
                category: d.documentType || 'Legal document',
                fileType: (d.mimeType || 'pdf').split('/').pop() || 'pdf',
                fileSize: Number(d.fileSize || 0),
                pageCount: 1,
                uploadedAt: d.uploadedAt || new Date().toISOString(),
                status:
                  d.matchStatus === 'AUTO_MATCHED' || d.matchStatus === 'CONFIRMED'
                    ? 'filed'
                    : d.matchStatus === 'CONFIRMATION_REQUIRED'
                    ? 'review'
                    : 'uploaded',
                priority: 'medium',
              }))
            : [];

          if (apiDocs.length > 0) {
            setDocList(apiDocs);
          } else if (user.isDemo) {
            setDocList(documents);
          } else {
            setDocList([]);
          }
        })
        .catch((err) => {
          console.warn('Error fetching real documents:', err);
          setDocList(user.isDemo ? documents : []);
        })
        .finally(() => setLoading(false));
    }
  }, [user.isDemo]);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  let filtered = docList.filter((d) => {
    const matchesQuery =
      !query ||
      d.title.toLowerCase().includes(query.toLowerCase()) ||
      d.caseName.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === 'all' || d.status === status;
    return matchesQuery && matchesStatus;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'recent') return b.uploadedAt.localeCompare(a.uploadedAt);
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'case') return a.caseName.localeCompare(b.caseName);
    return 0;
  });

  return (
    <div className="page-shell-wide space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          All your documents
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          {docList.length} {docList.length === 1 ? 'document' : 'documents'} across all your cases.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or case…"
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="uploaded">Just uploaded</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="review">Needs review</SelectItem>
            <SelectItem value="filed">Filed automatically</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-44">
            <ArrowUpDown className="mr-1 h-4 w-4" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="title">Name (A–Z)</SelectItem>
            <SelectItem value="case">Case (A–Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-4">
            <EmptyState
              icon={FileText}
              title={
                query || status !== 'all'
                  ? 'No documents match your filters'
                  : 'No documents yet'
              }
              description={
                query || status !== 'all'
                  ? 'Try a different search term or change the filters.'
                  : 'Drop a PDF on the upload page and we’ll file it for you.'
              }
              action={
                !query && status === 'all' ? (
                  <Button asChild>
                    <Link href="/upload">Upload your first document</Link>
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-1 p-2 sm:p-3">
            {filtered.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-secondary"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-xs font-semibold uppercase text-brand">
                  {doc.fileType}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {doc.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {doc.caseName} · {doc.category} · {doc.pageCount}{' '}
                    {doc.pageCount === 1 ? 'page' : 'pages'} · {formatFileSize(doc.fileSize)} ·{' '}
                    {formatRelativeTime(doc.uploadedAt)}
                  </p>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  {doc.ocrConfidence && (
                    <span className="rounded-md border bg-card px-2 py-0.5 text-xs text-muted-foreground">
                      {doc.ocrConfidence}% readable
                    </span>
                  )}
                  <PriorityBadge priority={doc.priority} />
                </div>
                <StatusBadge status={doc.status} />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}