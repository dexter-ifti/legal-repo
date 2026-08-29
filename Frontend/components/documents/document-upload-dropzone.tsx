'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  ArrowRight,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Building2,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatFileSize } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface CaseOption {
  id: string;
  title: string;
  caseNumber?: string | null;
}

export interface DocumentUploadDropzoneProps {
  availableCases?: CaseOption[];
  onUploadSuccess?: (doc: UploadedDocumentResult) => void;
}

export interface UploadedDocumentResult {
  id: string;
  organizationId: string;
  caseId: string | null;
  originalFilename: string;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  documentType: string;
  processingStatus: string;
  matchStatus: string;
  uploadedAt: string;
  isDuplicate?: boolean;
  matchedCaseTitle?: string | null;
  matchConfidence?: number | null;
}

const MAX_BYTES = 50 * 1024 * 1024;

const FRIENDLY_TYPE_LABELS: Record<string, string> = {
  UNCLASSIFIED: 'Not sure yet — decide later',
  PETITION: 'Petition / Writ',
  AFFIDAVIT: 'Affidavit',
  NOTICE: 'Court notice / Summons',
  CONTRACT: 'Agreement / Contract',
  EVIDENCE: 'Evidence / Exhibit',
  JUDGMENT: 'Order / Judgment',
};

function friendlyType(value: string): string {
  return FRIENDLY_TYPE_LABELS[value] ?? value;
}

export function DocumentUploadDropzone({
  availableCases = [],
  onUploadSuccess,
}: DocumentUploadDropzoneProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('unassigned');
  const [documentType, setDocumentType] = useState<string>('UNCLASSIFIED');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadResult, setUploadResult] =
    useState<UploadedDocumentResult | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    setErrorMessage(null);
    setUploadResult(null);

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      const msg =
        'We can only accept PDF files right now. Please save your document as a PDF and try again.';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (file.size > MAX_BYTES) {
      const msg = `This file is ${formatFileSize(file.size)} — please use a file under 50 MB.`;
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(5);
    setErrorMessage(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const authHeaders = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const sha256 = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      setUploadProgress(15);

      const initRes = await fetch(`${API_URL}/api/v1/documents/upload/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          filename: selectedFile.name,
          size: selectedFile.size,
          mime_type: selectedFile.type || 'application/pdf',
          ...(selectedCaseId && selectedCaseId !== 'unassigned'
            ? { caseId: selectedCaseId }
            : {}),
          ...(documentType ? { documentType } : {}),
          sha256,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        throw new Error(
          initData.error?.message ||
            'We couldn’t start the upload. Please try again.'
        );
      }

      if (initData.data.isDuplicate) {
        setUploadProgress(100);
        toast.warning(
          'This exact file is already in your workspace — we won’t store a duplicate.'
        );
        setIsUploading(false);
        if (onUploadSuccess) {
          onUploadSuccess({
            ...initData.data.document,
            isDuplicate: true,
          });
        }
        return;
      }

      const { documentId, uploadUrl }: { documentId: string; uploadUrl: string } =
        initData.data;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', selectedFile.type || 'application/pdf');
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(15 + Math.round((event.loaded / event.total) * 70));
          }
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error('The upload didn’t complete. Please try again.'));
        xhr.onerror = () =>
          reject(new Error('We couldn’t reach the file vault. Please try again.'));
        xhr.send(selectedFile);
      });

      setUploadProgress(90);

      const completeRes = await fetch(
        `${API_URL}/api/v1/documents/${documentId}/upload/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ size: selectedFile.size }),
        }
      );

      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(
          completeData.error?.message ||
            'We couldn’t finalise the upload. Please try again.'
        );
      }

      setUploadProgress(100);
      toast.success('File received — we’re reading it now.', {
        description:
          'You can keep working. We’ll match it to the right case in a moment.',
      });
      setIsUploading(false);

      if (onUploadSuccess) {
        onUploadSuccess({
          id: documentId,
          organizationId: '',
          caseId:
            selectedCaseId && selectedCaseId !== 'unassigned'
              ? selectedCaseId
              : null,
          originalFilename: selectedFile.name,
          storageKey: '',
          mimeType: selectedFile.type || 'application/pdf',
          fileSize: selectedFile.size,
          sha256,
          documentType: documentType || 'UNCLASSIFIED',
          processingStatus: 'QUEUED',
          matchStatus: 'NOT_STARTED',
          uploadedAt: new Date().toISOString(),
          isDuplicate: false,
        });
      }
    } catch (err: unknown) {
      setIsUploading(false);
      setUploadProgress(0);
      const msg =
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.';
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  const resetUploadState = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setErrorMessage(null);
    setIsUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Trust strip */}
      <div className="flex items-start gap-3 rounded-xl border border-brand/15 bg-brand-soft/60 px-4 py-3 text-sm">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <div className="text-foreground">
          <p className="font-medium">You don’t need to pick a case first.</p>
          <p className="text-muted-foreground">
            Drop any legal PDF — we’ll read it, figure out which case it
            belongs to, and ask you only if we’re not sure.
          </p>
        </div>
      </div>

      {/* Optional details — collapsed inline so the dropzone is the hero */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <label
            htmlFor="case-select-trigger"
            className="flex items-center gap-2 text-sm font-medium text-foreground"
          >
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Which case is this for?
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            Optional — skip if you’re not sure.
          </p>
          <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
            <SelectTrigger id="case-select-trigger" className="mt-3">
              <SelectValue placeholder="I’m not sure yet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">
                I’m not sure — you figure it out
              </SelectItem>
              {availableCases.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                  {c.caseNumber ? ` (${c.caseNumber})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <label
            htmlFor="doctype-select-trigger"
            className="flex items-center gap-2 text-sm font-medium text-foreground"
          >
            <Tag className="h-4 w-4 text-muted-foreground" />
            What kind of document is it?
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            A rough label helps us file it correctly.
          </p>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger id="doctype-select-trigger" className="mt-3">
              <SelectValue placeholder="Not sure yet" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FRIENDLY_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Hero dropzone */}
      {!uploadResult && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          aria-label="Drop a PDF here, or press Enter to browse files"
          className={cn(
            'group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-all sm:py-20',
            dragActive
              ? 'scale-[1.01] border-brand bg-brand-soft shadow-lg'
              : selectedFile
              ? 'border-brand/40 bg-card'
              : 'border-border bg-card hover:border-brand hover:bg-brand-soft/30'
          )}
        >
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-2xl transition-colors',
              dragActive
                ? 'bg-brand text-brand-foreground'
                : 'bg-brand-soft text-brand group-hover:bg-brand group-hover:text-brand-foreground'
            )}
          >
            <UploadCloud className="h-8 w-8" strokeWidth={1.75} />
          </div>
          <p className="mt-5 text-lg font-semibold text-foreground">
            {selectedFile
              ? selectedFile.name
              : 'Drop your PDF here'}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {selectedFile
              ? `${formatFileSize(selectedFile.size)} · ready to upload`
              : 'or click anywhere in this box to choose a file'}
          </p>
          {!selectedFile && (
            <p className="mt-4 text-xs text-muted-foreground">
              PDF only · Up to 50 MB
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>
      )}

      {/* Inline error */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-error/30 bg-error-soft/60 px-4 py-3 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
          <div>
            <p className="font-medium">We couldn’t upload that file</p>
            <p className="text-muted-foreground">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Ready-to-upload file card */}
      {selectedFile && !uploadResult && (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <FileText className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-foreground">
                {selectedFile.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(selectedFile.size)} · PDF
              </p>

              {isUploading && (
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-muted-foreground">
                    <span>Uploading to your secure vault…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isUploading}
              onClick={(e) => {
                e.stopPropagation();
                resetUploadState();
              }}
              aria-label="Remove selected file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              disabled={isUploading}
              onClick={(e) => {
                e.stopPropagation();
                resetUploadState();
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={isUploading}
              onClick={(e) => {
                e.stopPropagation();
                handleUploadSubmit();
              }}
              size="lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  Upload securely
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Duplicate card */}
      {uploadResult && uploadResult.isDuplicate && (
        <div className="rounded-2xl border border-warning/30 bg-warning-soft/50 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning text-warning-foreground">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-foreground">
                This file is already in your workspace
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                We use a secure fingerprint to detect duplicates so the same
                document isn’t stored twice.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={resetUploadState}>
              Upload a different file
            </Button>
            <Button
              onClick={() => router.push(`/documents/${uploadResult.id}`)}
              variant="soft"
            >
              Open the existing copy
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Success card */}
      {uploadResult && !uploadResult.isDuplicate && (
        <div className="rounded-2xl border border-success/30 bg-success-soft/40 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-foreground">
                Got it — we’re reading it now
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                We saved your original safely. We’re extracting the text and
                figuring out which case it belongs to. This usually takes under
                a minute.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="soft" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Queued for matching
                </Badge>
                <Badge variant="outline">
                  {friendlyType(uploadResult.documentType)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={resetUploadState}>
              Upload another
            </Button>
            <Button
              onClick={() => router.push(`/documents/${uploadResult.id}`)}
              variant="soft"
            >
              Watch it get filed
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}