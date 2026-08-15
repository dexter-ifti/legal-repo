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
  Building2,
  FileCheck2,
  FileQuestion,
  StickyNote,
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

  const rawCaseData = cases.find((c) => c.id === caseId);

  // Fallback case object when custom created or mocked
  const caseData = rawCaseData || {
    id: caseId,
    name: 'State vs. Rajesh Sharma & Ors.',
    caseNumber: 'WP/2026/808',
    cnrNumber: `MHHC0100${caseId.slice(-4).toUpperCase()}2026`,
    practiceArea: 'Writ Petition / Constitutional',
    client: 'Rajesh Sharma',
    opposingParty: 'State of Maharashtra & Anr.',
    court: 'Bombay High Court',
    judge: 'Hon. Justice K. R. Vyas',
    status: 'active',
    documentCount: 4,
    filedCount: 2,
    reviewCount: 1,
    processingCount: 1,
    nextHearing: '2026-09-15',
    notes: 'Interim stay granted on notice. Final arguments scheduled before Division Bench.',
  };

  const cnrNumber = (caseData as { cnrNumber?: string }).cnrNumber || `MHHC0100${caseId.slice(-4).toUpperCase()}2026`;
  const opposingParty = (caseData as { opposingParty?: string }).opposingParty || 'Opposing Counsel';
  const court = (caseData as { court?: string }).court || 'High Court of Judicature';
  const judge = (caseData as { judge?: string }).judge || 'Hon. Bench';
  const notes = (caseData as { notes?: string }).notes || 'No specific notes attached to this legal case.';

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
        Back to Cases
      </Button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <FolderOpen className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {caseData.name}
              </h1>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
                  caseData.status === 'active' && 'bg-success-soft text-success',
                  caseData.status === 'pending' && 'bg-warning-soft text-warning',
                  caseData.status === 'closed' && 'bg-neutral-soft text-neutral-status'
                )}
              >
                {caseData.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Filing No: <span className="font-medium text-foreground">{caseData.caseNumber}</span> · CNR: <span className="font-mono">{cnrNumber}</span>
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Link>
        </Button>
      </div>

      {/* Case Metadata Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={User} label="Client" value={caseData.client} />
        <InfoCard icon={FileQuestion} label="Opposing Party" value={opposingParty} />
        <InfoCard icon={Building2} label="Court / Forum" value={court} />
        <InfoCard icon={Gavel} label="Presiding Judge" value={judge} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <StickyNote className="h-4 w-4 text-brand" />
              Case Brief & Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="whitespace-pre-wrap leading-relaxed">{notes}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Document Progress</CardTitle>
            <CardDescription>Legal filings completion rate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Filing Status</span>
              <span className="font-semibold text-foreground">{completionRate}% Completed</span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-brand transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2">
              <div>Total: <span className="font-semibold text-foreground">{caseData.documentCount}</span></div>
              <div>Filed: <span className="font-semibold text-success">{caseData.filedCount}</span></div>
              <div>Review: <span className="font-semibold text-warning">{caseData.reviewCount}</span></div>
              <div>Processing: <span className="font-semibold text-brand">{caseData.processingCount}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Associated Case Documents Roster */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Associated Legal Documents</CardTitle>
          <CardDescription>
            Documents linked to this case ({caseDocs.length} files total)
          </CardDescription>
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
                  title="No documents in this view"
                  description="Upload documents or select a different filter tab."
                  action={
                    <Button asChild>
                      <Link href="/upload">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Document
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
        <p className="mt-2 text-sm font-semibold text-foreground truncate">{value}</p>
      </CardContent>
    </Card>
  );
}
