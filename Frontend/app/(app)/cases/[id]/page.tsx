'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  FolderOpen,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  Loader2,
  User,
  Gavel,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatusBadge, PriorityBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { cases, documents } from '@/lib/mock-data';
import { formatDate, formatFileSize, formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;
  const [activeTab, setActiveTab] = useState('all');

  const caseData = cases.find((c) => c.id === caseId);

  if (!caseData) {
    return (
      <div className="mx-auto max-w-7xl p-8">
        <EmptyState
          icon={FolderOpen}
          title="Case not found"
          description="This case may have been removed or you don't have access."
          action={
            <Button onClick={() => router.push('/cases')}>
              Back to Cases
            </Button>
          }
        />
      </div>
    );
  }

  const caseDocs = documents.filter((d) => d.caseId === caseId);
  const filteredDocs =
    activeTab === 'all'
      ? caseDocs
      : caseDocs.filter((d) => d.status === activeTab);

  const completionRate = caseData.documentCount
    ? Math.round((caseData.filedCount / caseData.documentCount) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/cases')}
        className="mb-2"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        All Cases
      </Button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <FolderOpen className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {caseData.name}
              </h1>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium',
                  caseData.status === 'active' && 'bg-success-soft text-success',
                  caseData.status === 'pending' && 'bg-warning-soft text-warning',
                  caseData.status === 'closed' && 'bg-neutral-soft text-neutral-status'
                )}
              >
                {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {caseData.caseNumber} · {caseData.practiceArea}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload to Case
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={User} label="Client" value={caseData.client} />
        <InfoCard icon={Gavel} label="Practice Area" value={caseData.practiceArea} />
        <InfoCard
          icon={Calendar}
          label="Next Hearing"
          value={caseData.nextHearing ? formatDate(caseData.nextHearing) : 'Not scheduled'}
        />
        <InfoCard
          icon={CheckCircle2}
          label="Completion"
          value={`${completionRate}%`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-soft text-neutral-status">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{caseData.documentCount}</p>
              <p className="text-xs text-muted-foreground">Total documents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-soft text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{caseData.filedCount}</p>
              <p className="text-xs text-muted-foreground">Filed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-soft text-warning">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{caseData.reviewCount}</p>
              <p className="text-xs text-muted-foreground">In review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <Loader2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{caseData.processingCount}</p>
              <p className="text-xs text-muted-foreground">Processing</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Case Documents</CardTitle>
          <CardDescription>{caseDocs.length} documents in this case</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({caseDocs.length})</TabsTrigger>
              <TabsTrigger value="review">Review ({caseData.reviewCount})</TabsTrigger>
              <TabsTrigger value="filed">Filed ({caseData.filedCount})</TabsTrigger>
              <TabsTrigger value="processing">Processing ({caseData.processingCount})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {filteredDocs.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No documents in this filter"
                  description="Upload documents or switch to a different tab."
                  action={
                    <Button asChild>
                      <Link href="/upload">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-1">
                  {filteredDocs.map((doc) => (
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
                          {doc.category} · {doc.pageCount} pages · {formatFileSize(doc.fileSize)} · {formatRelativeTime(doc.uploadedAt)}
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
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
