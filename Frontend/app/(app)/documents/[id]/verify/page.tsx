'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  ExternalLink,
  FileText,
  ScanSearch,
  Hash,
  Landmark,
  User,
  Users,
  CalendarDays,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
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
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import {
  MatchingCandidatesCard,
  CaseCandidate,
} from '@/components/documents/matching-candidates-card';
import { toast } from 'sonner';

interface MetadataField {
  fieldName: string;
  fieldValue: string | null;
  confidence: number | null;
  source: string | null;
}

interface VerifyDoc {
  id: string;
  originalFilename: string;
  documentType: string | null;
  processingStatus: string;
  matchStatus: string;
  matchConfidence: number | null;
  caseId: string | null;
  case?: { id: string; title: string } | null;
  metadata: MetadataField[];
}

const FIELD_CONFIG: Array<{
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: 'case_number', label: 'Case Number', icon: Hash },
  { key: 'cnr_number', label: 'CNR Number', icon: ShieldCheck },
  { key: 'court', label: 'Court / Forum', icon: Landmark },
  { key: 'client_name', label: 'Client / Petitioner', icon: User },
  { key: 'opposing_party', label: 'Opposing Party / Respondent', icon: Users },
  { key: 'filing_date', label: 'Filing Date', icon: CalendarDays },
];

const ENTITY_FIELDS = FIELD_CONFIG.map((f) => f.key);

export default function DocumentVerifyPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;

  const [doc, setDoc] = useState<VerifyDoc | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const authHeaders = useCallback((): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const loadDoc = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/documents/${docId}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || `Document not found (Status ${res.status})`);
      }
      const payload = await res.json();
      setDoc(payload.data as VerifyDoc);
      return payload.data as VerifyDoc;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load document');
      return null;
    }
  }, [API_URL, docId, authHeaders]);

  const loadPreviewUrl = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/documents/${docId}/download`, {
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.data?.downloadUrl) {
        setPreviewUrl(body.data.downloadUrl);
      }
    } catch {
      // Preview stays unavailable; the right panel still works.
    }
  }, [API_URL, docId, authHeaders]);

  useEffect(() => {
    if (!docId) return;
    setLoading(true);
    Promise.all([loadDoc(), loadPreviewUrl()]).finally(() => setLoading(false));
  }, [docId, loadDoc, loadPreviewUrl]);

  const runExtraction = async () => {
    setExtracting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/documents/${docId}/extract`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || 'Extraction failed');
      }
      toast.success('Extraction complete — review the fields below.');
      await loadDoc();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
        <span className="text-sm text-muted-foreground">Loading verification view...</span>
      </div>
    );
  }

  if (!doc || error) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <EmptyState
          icon={FileText}
          title="Document not found"
          description={error || 'This document may have been deleted or you lack access.'}
          action={<Button onClick={() => router.push('/documents')}>Back to Documents</Button>}
        />
      </div>
    );
  }

  const fieldMap = new Map<string, MetadataField>();
  (doc.metadata || []).forEach((m) => fieldMap.set(m.fieldName, m));

  const entityFields = ENTITY_FIELDS.filter((key) => fieldMap.has(key));
  const hasEntityData = entityFields.length > 0;

  let candidates: CaseCandidate[] = [];
  const rawCandidates = fieldMap.get('matching_candidates')?.fieldValue;
  if (rawCandidates) {
    try {
      candidates = JSON.parse(rawCandidates);
    } catch {
      candidates = [];
    }
  }

  const isPending =
    doc.processingStatus === 'UPLOADED' ||
    doc.processingStatus === 'QUEUED' ||
    doc.processingStatus === 'EXTRACTING' ||
    doc.processingStatus === 'MATCHING' ||
    doc.processingStatus === 'CLASSIFYING';
  const isFailed = doc.processingStatus === 'PROCESSING_FAILED' || doc.processingStatus === 'OCR_FAILED';

  const showCandidates =
    !doc.caseId &&
    (doc.matchStatus === 'CONFIRMATION_REQUIRED' || doc.matchStatus === 'NO_MATCH') &&
    candidates.length > 0;

  return (
    <div className="mx-auto max-w-[100rem] space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/documents/${docId}`)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
          <div className="min-w-0 border-l pl-3">
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
              Extraction Verification
            </h1>
            <p className="truncate text-xs text-muted-foreground">{doc.originalFilename}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs capitalize">
            {doc.documentType?.toLowerCase() || 'unclassified'}
          </Badge>
          <StatusBadge
            status={
              doc.matchStatus === 'AUTO_MATCHED' || doc.matchStatus === 'CONFIRMED'
                ? 'filed'
                : doc.matchStatus === 'CONFIRMATION_REQUIRED'
                ? 'review'
                : 'uploaded'
            }
          />
          <Button asChild variant="outline" size="sm">
            <Link href={`/documents/${docId}`}>
              <FileText className="mr-1.5 h-4 w-4" />
              Details View
            </Link>
          </Button>
        </div>
      </div>

      {/* Side-by-side workspace */}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {/* LEFT: Original document */}
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Original Document</CardTitle>
              <CardDescription>Verify every value against the source</CardDescription>
            </div>
            {previewUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(previewUrl, '_blank')}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                Open
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex justify-center rounded-lg bg-secondary/40 p-2 md:p-3">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="h-[70vh] w-full rounded-lg border bg-white shadow-md"
                  title={doc.originalFilename}
                />
              ) : (
                <div className="flex h-[50vh] flex-col items-center justify-center gap-2 rounded-lg border bg-white p-8 text-center shadow-sm">
                  <AlertCircle className="h-6 w-6 text-warning" />
                  <p className="text-sm font-medium text-foreground">Preview unavailable</p>
                  <p className="text-xs text-muted-foreground">
                    The stored file may be missing from cloud storage. Field data below still reflects the last extraction.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: Extracted data for verification */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ScanSearch className="h-4 w-4 text-brand" />
                    Extracted Data
                  </CardTitle>
                  <CardDescription>
                    Confirm these values match the original before filing
                  </CardDescription>
                </div>
                {(isPending || isFailed || !hasEntityData) && (
                  <Button size="sm" onClick={runExtraction} disabled={extracting}>
                    {extracting ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        {hasEntityData ? 'Re-extract' : 'Run Extraction'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!hasEntityData ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <ScanSearch className="mx-auto h-6 w-6 text-muted-foreground opacity-60" />
                  <p className="mt-2 text-sm font-medium text-foreground">No extracted data yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isPending
                      ? 'Processing is in progress — this view updates after you re-extract.'
                      : 'Run extraction to pull legal entities from this document.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {FIELD_CONFIG.map(({ key, label, icon: Icon }) => {
                    const field = fieldMap.get(key);
                    return (
                      <FieldRow
                        key={key}
                        icon={Icon}
                        label={label}
                        value={field?.fieldValue}
                        confidence={field?.confidence ?? null}
                      />
                    );
                  })}
                </div>
              )}

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  Processing status:{' '}
                  <span className="font-medium text-foreground">{doc.processingStatus}</span>
                </div>
                <div>
                  Match status:{' '}
                  <span className="font-medium text-foreground">
                    {doc.matchStatus.replace(/_/g, ' ').toLowerCase()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filing action when human decision is needed */}
          {showCandidates && (
            <MatchingCandidatesCard
              documentId={doc.id}
              documentTitle={doc.originalFilename}
              matchStatus={doc.matchStatus}
              matchConfidence={doc.matchConfidence}
              candidates={candidates}
              onConfirmSuccess={() => window.location.reload()}
            />
          )}

          {/* Already filed confirmation */}
          {doc.caseId && doc.case && (
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                <div className="text-sm">
                  Filed into{' '}
                  <Link href={`/cases/${doc.case.id}`} className="font-medium text-brand hover:underline">
                    {doc.case.title}
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  icon: Icon,
  label,
  value,
  confidence,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
  confidence: number | null;
}) {
  const found = !!value;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 ${
        found ? 'border-transparent bg-card' : 'border-dashed border-warning/40 bg-warning-soft/30'
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${found ? 'text-brand' : 'text-warning'}`} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {found ? (
          <p className="truncate text-sm font-medium text-foreground" title={value || ''}>
            {value}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground">Not found in document</p>
        )}
      </div>
      {found && confidence != null && (
        <Badge
          variant="outline"
          className={`shrink-0 text-[10px] ${
            confidence >= 0.9
              ? 'border-success/40 text-success'
              : confidence >= 0.75
              ? 'border-warning/40 text-warning'
              : 'border-error/40 text-error'
          }`}
        >
          {Math.round(confidence * 100)}%
        </Badge>
      )}
    </div>
  );
}
