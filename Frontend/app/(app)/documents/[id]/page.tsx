'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Download,
  Share2,
  Printer,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  HardDrive,
  Scan,
  FileCheck2,
  Tag,
  FolderOpen,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, PriorityBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { documents, cases, templates } from '@/lib/mock-data';
import { formatDate, formatFileSize, formatRelativeTime } from '@/lib/format';

export default function DocumentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);

  const doc = documents.find((d) => d.id === docId);

  if (!doc) {
    return (
      <div className="mx-auto max-w-7xl p-8">
        <EmptyState
          icon={FileText}
          title="Document not found"
          description="This document may have been deleted or you don't have access."
          action={
            <Button onClick={() => router.push('/documents')}>
              Back to Documents
            </Button>
          }
        />
      </div>
    );
  }

  const caseData = cases.find((c) => c.id === doc.caseId);
  const matchedTemplate = templates.find((t) => t.name === doc.matchedTemplate);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/documents')}
        className="mb-2"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        All Documents
      </Button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-sm font-semibold uppercase text-muted-foreground">
            {doc.fileType}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {doc.title}
              </h1>
              <StatusBadge status={doc.status} />
              <PriorityBadge priority={doc.priority} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {doc.caseName} · {doc.category}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="mr-1.5 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 h-4 w-4" />
            Download
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="mr-1.5 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Document Preview</CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom(Math.max(50, zoom - 10))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-xs text-muted-foreground">
                  {zoom}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom(Math.min(200, zoom + 10))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="mx-1 h-6" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {page} / {doc.pageCount}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= doc.pageCount}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center rounded-lg bg-secondary/40 p-8">
                <div
                  className="aspect-[8.5/11] w-full max-w-md rounded-lg bg-white shadow-md"
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                >
                  <div className="p-8">
                    <div className="mb-4 border-b pb-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {doc.category}
                      </p>
                      <h2 className="mt-1 text-lg font-bold text-gray-900">
                        {doc.title}
                      </h2>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {doc.caseName} — Page {page} of {doc.pageCount}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-2.5 rounded bg-gray-200"
                          style={{ width: `${Math.random() * 30 + 70}%` }}
                        />
                      ))}
                    </div>
                    <div className="mt-6 space-y-2">
                      <div className="h-2.5 w-full rounded bg-gray-200" />
                      <div className="h-2.5 w-5/6 rounded bg-gray-200" />
                      <div className="h-2.5 w-full rounded bg-gray-200" />
                      <div className="h-2.5 w-3/4 rounded bg-gray-200" />
                    </div>
                    <div className="mt-6 space-y-2">
                      <div className="h-2.5 w-full rounded bg-gray-200" />
                      <div className="h-2.5 w-5/6 rounded bg-gray-200" />
                      <div className="h-2.5 w-full rounded bg-gray-200" />
                    </div>
                    <div className="mt-8 flex justify-between text-xs text-gray-400">
                      <span>{doc.fileName}</span>
                      <span>Page {page}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {doc.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Summary</CardTitle>
                <CardDescription>Auto-generated document summary</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {doc.summary}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Property icon={FolderOpen} label="Case" value={doc.caseName} href={`/cases/${doc.caseId}`} />
              <Property icon={Tag} label="Category" value={doc.category} />
              <Property icon={Calendar} label="Uploaded" value={formatDate(doc.uploadedAt)} />
              <Property icon={User} label="Uploaded by" value={doc.uploadedBy} />
              <Property icon={FileText} label="Pages" value={String(doc.pageCount)} />
              <Property icon={HardDrive} label="File size" value={formatFileSize(doc.fileSize)} />
              <Property icon={FileText} label="File type" value={doc.fileType.toUpperCase()} />
            </CardContent>
          </Card>

          {doc.ocrConfidence && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Processing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Scan className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">OCR Confidence</p>
                    <p className="text-xs text-muted-foreground">Text extraction accuracy</p>
                  </div>
                  <Badge variant="outline" className={doc.ocrConfidence >= 90 ? 'border-success/30 text-success' : 'border-warning/30 text-warning'}>
                    {doc.ocrConfidence}%
                  </Badge>
                </div>
                {doc.matchedTemplate && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-soft text-success">
                      <FileCheck2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Template Match</p>
                      <p className="text-xs text-muted-foreground">{doc.matchedTemplate}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {doc.status === 'processing' && (
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Scan className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Processing in progress</p>
                  <p className="text-xs text-muted-foreground">
                    OCR and classification running — check back shortly
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {doc.status === 'rejected' && (
            <Card className="border-error/30">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-soft text-error">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Document Rejected</p>
                  <p className="text-xs text-muted-foreground">
                    This document could not be classified. Re-upload or file manually.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {doc.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Property({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-secondary">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
