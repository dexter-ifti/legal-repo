'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Search, Filter, ArrowUpDown } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

export default function DocumentsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  let filtered = documents.filter((d) => {
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
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {documents.length} documents across all cases
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents..."
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="uploaded">Uploaded</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="review">In Review</SelectItem>
            <SelectItem value="filed">Filed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-40">
            <ArrowUpDown className="mr-1.5 h-4 w-4" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="title">Title (A-Z)</SelectItem>
            <SelectItem value="case">Case (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <EmptyState
              icon={FileText}
              title="No documents found"
              description="Try adjusting your search or filters."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-1 p-2 sm:p-4">
            {filtered.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-secondary"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold uppercase text-muted-foreground">
                  {doc.fileType}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {doc.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {doc.caseName} · {doc.category} · {doc.pageCount} pages · {formatFileSize(doc.fileSize)} · {formatRelativeTime(doc.uploadedAt)}
                  </p>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  {doc.ocrConfidence && (
                    <Badge variant="outline" className="text-xs">
                      {doc.ocrConfidence}% OCR
                    </Badge>
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
