'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FolderOpen,
  Upload,
  FileText,
  Loader2,
  User,
  Gavel,
  Building2,
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
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { cases, documents } from '@/lib/mock-data';
import type { DocStatus } from '@/lib/types';
import { useUserProfile } from '@/lib/use-user';
import { formatFileSize, formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface CaseView {
  name: string;
  caseNumber: string;
  cnrNumber: string;
  client: string;
  opposingParty: string;
  court: string;
  judge: string;
  status: string;
  notes: string;
}

interface CaseDocView {
  id: string;
  title: string;
  fileType: string;
  category: string;
  pageCount: number;
  fileSize: number;
  uploadedAt: string;
  ocrConfidence?: number | null;
  status: DocStatus;
}

const docStatusFromMatchStatus = (matchStatus: string | null | undefined): DocStatus => {
  if (matchStatus === 'AUTO_MATCHED' || matchStatus === 'CONFIRMED') return 'filed';
  if (matchStatus === 'CONFIRMATION_REQUIRED') return 'review';
  return 'processing';
};

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: userLoading } = useUserProfile();
  const caseId = params.id as string;
  const [activeTab, setActiveTab] = useState('all');

  const [apiCase, setApiCase] = useState<CaseView | null>(null);
  const [apiDocs, setApiDocs] = useState<CaseDocView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hasError, setHasError] = useState(false);

  const loadCase = useCallback(async () => {
    if (user.isDemo) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setNotFound(false);
    setHasError(false);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      const [caseRes, docsRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/cases/${caseId}`, { headers }),
        fetch(`${API_URL}/api/v1/documents`, { headers }),
      ]);

      if (caseRes.status === 404) {
        setNotFound(true);
        return;
      }
      if (!caseRes.ok) {
        setHasError(true);
        return;
      }

      const casePayload = await caseRes.json();
      const c = casePayload.data?.case;
      if (!c) {
        setNotFound(true);
        return;
      }

      setApiCase({
        name: c.title || 'Untitled Case',
        caseNumber: c.caseNumber || 'N/A',
        cnrNumber: c.cnrNumber || 'N/A',
        client: c.clientName || 'Unspecified Client',
        opposingParty: c.opposingParty || 'N/A',
        court: c.court || 'N/A',
        judge: c.judge || 'N/A',
        status: c.status?.toLowerCase() || 'active',
        notes: c.notes || 'No specific notes attached to this legal case.',
      });

      if (docsRes.ok) {
        const docsPayload = await docsRes.json();
        const allDocs = docsPayload.data || [];
        setApiDocs(
          allDocs
            .filter((d: any) => d.caseId === caseId)
            .map(
              (d: any): CaseDocView => ({
                id: d.id,
                title: d.originalFilename,
                fileType: (d.mimeType || 'pdf').split('/').pop() || 'pdf',
                category: d.documentType || 'UNCLASSIFIED',
                pageCount: d.pageCount || 1,
                fileSize: d.fileSize ? Number(d.fileSize) : 0,
                uploadedAt: d.uploadedAt,
                ocrConfidence: null,
                status: docStatusFromMatchStatus(d.matchStatus),
              })
            )
        );
      }
    } catch (err) {
      console.error('Failed to load case detail:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [caseId, user.isDemo]);

  useEffect(() => {
    if (!userLoading) {
      loadCase();
    }
  }, [userLoading, loadCase]);

  // Demo mode keeps the mock experience; real users only ever see API data.
  const usingMock = user.isDemo;

  const rawMockCase = usingMock ? cases.find((c) => c.id === caseId) : undefined;
  const caseData: CaseView = usingMock
    ? rawMockCase
      ? {
          name: rawMockCase.name,
          caseNumber: rawMockCase.caseNumber,
          cnrNumber: 'N/A',
          client: rawMockCase.client,
          opposingParty: 'N/A',
          court: 'N/A',
          judge: 'N/A',
          status: rawMockCase.status,
          notes: 'No specific notes attached to this legal case.',
        }
      : {
          name: 'State vs. Rajesh Sharma & Ors.',
          caseNumber: 'WP/2026/808',
          cnrNumber: `MHHC0100${caseId.slice(-4).toUpperCase()}2026`,
          client: 'Rajesh Sharma',
          opposingParty: 'State of Maharashtra & Anr.',
          court: 'Bombay High Court',
          judge: 'Hon. Justice K. R. Vyas',
          status: 'active',
          notes: 'Interim stay granted on notice. Final arguments scheduled before Division Bench.',
        }
    : apiCase || {
        name: '',
        caseNumber: '',
        cnrNumber: '',
        client: '',
        opposingParty: '',
        court: '',
        judge: '',
        status: 'active',
        notes: '',
      };

  const caseDocs: CaseDocView[] = usingMock
    ? documents
        .filter((d) => d.caseId === caseId)
        .map((d) => ({
          id: d.id,
          title: d.title,
          fileType: d.fileType,
          category: d.category,
          pageCount: d.pageCount,
          fileSize: d.fileSize,
          uploadedAt: d.uploadedAt,
          ocrConfidence: d.ocrConfidence ?? null,
          status: d.status,
        }))
    : apiDocs;

  const filteredDocs =
    activeTab === 'all'
      ? caseDocs
      : caseDocs.filter((d) => d.status === activeTab);

  const filedCount = caseDocs.filter((d) => d.status === 'filed').length;
  const reviewCount = caseDocs.filter((d) => d.status === 'review').length;
  const processingCount = caseDocs.filter((d) => d.status === 'processing').length;
  const completionRate = caseDocs.length
    ? Math.round((filedCount / caseDocs.length) * 100)
    : 0;

  if (!usingMock && isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!usingMock && (notFound || hasError)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6 lg:p-8">
        <Button variant="ghost" size="sm" onClick={() => router.push('/cases')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Cases
        </Button>
        <EmptyState
          icon={FolderOpen}
          title={notFound ? 'Case not found' : 'Failed to load case'}
          description={
            notFound
              ? 'This case does not exist in your organization or has been deleted.'
              : 'We could not reach the server. Your data was not changed — please retry.'
          }
          action={
            notFound ? (
              <Button asChild>
                <Link href="/cases">Back to Cases</Link>
              </Button>
            ) : (
              <Button onClick={loadCase}>Retry</Button>
            )
          }
        />
      </div>
    );
  }

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
              Filing No: <span className="font-medium text-foreground">{caseData.caseNumber}</span> · CNR: <span className="font-mono">{caseData.cnrNumber}</span>
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
        <InfoCard icon={FileQuestion} label="Opposing Party" value={caseData.opposingParty} />
        <InfoCard icon={Building2} label="Court / Forum" value={caseData.court} />
        <InfoCard icon={Gavel} label="Presiding Judge" value={caseData.judge} />
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
            <p className="whitespace-pre-wrap leading-relaxed">{caseData.notes}</p>
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
              <div>Total: <span className="font-semibold text-foreground">{caseDocs.length}</span></div>
              <div>Filed: <span className="font-semibold text-success">{filedCount}</span></div>
              <div>Review: <span className="font-semibold text-warning">{reviewCount}</span></div>
              <div>Processing: <span className="font-semibold text-brand">{processingCount}</span></div>
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
              <TabsTrigger value="review">Review ({reviewCount})</TabsTrigger>
              <TabsTrigger value="filed">Filed ({filedCount})</TabsTrigger>
              <TabsTrigger value="processing">Processing ({processingCount})</TabsTrigger>
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
                        {doc.ocrConfidence != null && (
                          <Badge variant="outline" className="text-xs">
                            {doc.ocrConfidence}% OCR
                          </Badge>
                        )}
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
