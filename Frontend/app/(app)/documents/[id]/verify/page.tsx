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
  Pencil,
  MapPin,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  pageNumber?: number | null;
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

  // Persists a user correction for one extracted field (PATCH metadata)
  // and updates local state so the UI reflects the saved value instantly.
  const saveField = useCallback(
    async (fieldName: string, fieldValue: string): Promise<boolean> => {
      try {
        const res = await fetch(`${API_URL}/api/v1/documents/${docId}/metadata`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ fieldName, fieldValue }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(body?.error?.message || `Failed to save (Status ${res.status})`);
        }
        const saved = body?.data?.metadata as MetadataField | undefined;
        setDoc((prev) =>
          prev
            ? {
                ...prev,
                metadata: [
                  ...prev.metadata.filter((m) => m.fieldName !== fieldName),
                  ...(saved ? [saved] : []),
                ],
              }
            : prev
        );
        toast.success('Field updated');
        return true;
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to save field');
        return false;
      }
    },
    [API_URL, docId, authHeaders]
  );

  const runExtraction = async () => {
    setExtracting(true);
    try {
      // Async staged pipeline: start it, then poll for completion. Large
      // scanned bundles take minutes — never hold the HTTP request open.
      const res = await fetch(`${API_URL}/api/v1/documents/${docId}/process`, {
        method: 'POST',
        headers: authHeaders(),
      });

      if (res.status === 409) {
        toast.info('Processing is already running — showing live progress.');
      } else if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || 'Failed to start processing');
      } else {
        toast.success('Processing started — this can take a few minutes for large scans.');
      }

      // Poll until terminal state (READY / FAILED variants) or timeout.
      const deadline = Date.now() + 15 * 60 * 1000;
      let done = false;
      while (Date.now() < deadline && !done) {
        await new Promise((r) => setTimeout(r, 3000));
        const latest = await loadDoc();
        const stageStatus = latest?.processingStatus || '';
        if (
          stageStatus === 'READY' ||
          stageStatus === 'PROCESSING_FAILED' ||
          stageStatus === 'OCR_FAILED' ||
          stageStatus === 'UNSUPPORTED'
        ) {
          done = true;
        }
      }

      if (!done) {
        toast.info('Still processing in the background — refresh to check progress.');
      } else if ((await loadDoc())?.processingStatus === 'READY') {
        toast.success('Extraction complete — review the fields below.');
      }
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
  const pageCount = fieldMap.get('page_count')?.fieldValue || null;
  const isScanned = fieldMap.get('is_scanned')?.fieldValue === 'true';

  // Extraction pipeline states — each gets an honest, distinct message.
  const isNotProcessed = doc.processingStatus === 'UPLOADED' || doc.processingStatus === 'QUEUED';
  const isInProgress =
    doc.processingStatus === 'EXTRACTING' ||
    doc.processingStatus === 'MATCHING' ||
    doc.processingStatus === 'CLASSIFYING';
  const isFailed =
    doc.processingStatus === 'PROCESSING_FAILED' ||
    doc.processingStatus === 'OCR_FAILED' ||
    doc.processingStatus === 'UNSUPPORTED';
  // Pipeline ran to completion but no legal entities matched our extractors.
  const extractedNothing = !isNotProcessed && !isInProgress && !isFailed && !hasEntityData;

  let candidates: CaseCandidate[] = [];
  const rawCandidates = fieldMap.get('matching_candidates')?.fieldValue;
  if (rawCandidates) {
    try {
      candidates = JSON.parse(rawCandidates);
    } catch {
      candidates = [];
    }
  }

  const showReExtractButton =
    isNotProcessed || isInProgress || isFailed || extractedNothing || hasEntityData;

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
                    {pageCount
                      ? `Confirm these values match the original — extracted after scanning ${pageCount} page${pageCount === '1' ? '' : 's'} of this document`
                      : 'Confirm these values match the original before filing'}
                  </CardDescription>
                </div>
                {showReExtractButton && (
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
              {isNotProcessed ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <ScanSearch className="mx-auto h-6 w-6 text-muted-foreground opacity-60" />
                  <p className="mt-2 text-sm font-medium text-foreground">Not extracted yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Run extraction to pull legal entities from this document.
                  </p>
                </div>
              ) : isInProgress ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand" />
                  <p className="mt-2 text-sm font-medium text-foreground">
                    Processing in progress
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The pipeline ({doc.processingStatus.toLowerCase()}) is still running — check
                    back shortly or re-run extraction.
                  </p>
                </div>
              ) : isFailed ? (
                <div className="rounded-lg border border-error/40 bg-error-soft/30 p-6 text-center">
                  <AlertCircle className="mx-auto h-6 w-6 text-error" />
                  <p className="mt-2 text-sm font-medium text-foreground">
                    Extraction failed ({doc.processingStatus.replace(/_/g, ' ').toLowerCase()})
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Click Run Extraction to retry. Your original file is untouched.
                  </p>
                </div>
              ) : (
                <>
                  {extractedNothing && (
                    <div className="mb-3 rounded-lg border border-dashed p-4 text-center">
                      <ScanSearch className="mx-auto h-5 w-5 text-muted-foreground opacity-60" />
                      <p className="mt-2 text-sm font-medium text-foreground">
                        No legal entities detected automatically
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Nothing matched the extractors in the{' '}
                        {isScanned ? `OCR'd` : ''} scanned pages — this is expected for non-legal
                        documents. You can fill the fields in manually below.
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    {FIELD_CONFIG.map(({ key, label, icon: Icon }) => {
                      const field = fieldMap.get(key);
                      return (
                        <EditableFieldRow
                          key={key}
                          icon={Icon}
                          label={label}
                          value={field?.fieldValue}
                          confidence={field?.confidence ?? null}
                          source={field?.source ?? null}
                          pageNumber={field?.pageNumber ?? null}
                          onSave={(newValue) => saveField(key, newValue)}
                        />
                      );
                    })}
                  </div>
                </>
              )}

              <Separator className="my-4" />

              {/* Extraction provenance — proof of what the pipeline actually did */}
              <div className="mb-3 flex flex-wrap gap-1.5">
                {pageCount && (
                  <Badge variant="outline" className="text-[10px]">
                    {pageCount} page{pageCount === '1' ? '' : 's'} scanned
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px]">
                  {isScanned ? 'OCR' : 'Native text'}
                </Badge>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {doc.documentType?.toLowerCase() || 'Unclassified'}
                </Badge>
              </div>

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

function EditableFieldRow({
  icon: Icon,
  label,
  value,
  confidence,
  source,
  pageNumber,
  onSave,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
  confidence: number | null;
  source: string | null;
  pageNumber: number | null;
  onSave: (newValue: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const found = !!value;

  const startEdit = () => {
    setDraft(value || '');
    setEditing(true);
  };

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed || saving) return;
    const ok = await onSave(trimmed);
    if (ok) setEditing(false);
  };

  // Provenance: where this value came from. User corrections are marked as
  // such; extracted values show the page the pipeline found them on.
  const provenance =
    source === 'USER'
      ? { text: 'Edited by you', tone: 'border-brand/40 text-brand' }
      : pageNumber != null
      ? { text: `Found on page ${pageNumber}`, tone: 'border-muted-foreground/30 text-muted-foreground' }
      : null;

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-brand/40 bg-card p-3">
        <Icon className="h-4 w-4 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save();
              if (e.key === 'Escape') setEditing(false);
            }}
            disabled={saving}
            className="mt-1 h-8 text-sm"
            maxLength={500}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        </div>
        <Button size="sm" onClick={() => void save()} disabled={saving || !draft.trim()}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border p-3 ${
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
          <button
            onClick={startEdit}
            className="text-left text-sm italic text-muted-foreground hover:text-foreground"
          >
            Not found in document — click to add
          </button>
        )}
      </div>
      {found && provenance && (
        <Badge variant="outline" className={`shrink-0 gap-1 text-[10px] ${provenance.tone}`}>
          <MapPin className="h-3 w-3" />
          {provenance.text}
        </Badge>
      )}
      {!found && (
        <Button size="sm" variant="outline" onClick={startEdit} className="shrink-0 text-xs">
          <Pencil className="mr-1 h-3 w-3" />
          Add
        </Button>
      )}
      {found && confidence != null && Number.isFinite(Number(confidence)) && (
        <Badge
          variant="outline"
          className={`shrink-0 text-[10px] ${
            source === 'USER'
              ? 'border-brand/40 text-brand'
              : confidence >= 0.9
              ? 'border-success/40 text-success'
              : confidence >= 0.75
              ? 'border-warning/40 text-warning'
              : 'border-error/40 text-error'
          }`}
        >
          {Math.round(Number(confidence) * 100)}%
        </Badge>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={startEdit}
        className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
        aria-label={`Edit ${label}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
