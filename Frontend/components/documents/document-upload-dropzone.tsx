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
  ShieldCheck,
  Building2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  const [uploadResult, setUploadResult] = useState<UploadedDocumentResult | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    setErrorMessage(null);
    setUploadResult(null);

    // Validate PDF file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      const msg = 'Invalid file type. Only PDF legal documents (.pdf) are supported.';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    // Validate 50MB file size limit
    if (file.size > 50 * 1024 * 1024) {
      const msg = 'File exceeds maximum 50MB limit.';
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
    setUploadProgress(15);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (selectedCaseId && selectedCaseId !== 'unassigned') {
        formData.append('caseId', selectedCaseId);
      }
      if (documentType) {
        formData.append('documentType', documentType);
      }

      // Simulate upload progress steps
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 85 ? 85 : prev + 15));
      }, 150);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      const response = await fetch(`${API_URL}/api/v1/documents/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok && !data.data?.isDuplicate) {
        throw new Error(data.error?.message || 'Failed to upload document');
      }

      const result: UploadedDocumentResult = data.data;
      setUploadResult(result);
      setIsUploading(false);

      if (result.isDuplicate) {
        toast.warning('Duplicate file detected in your organization.');
      } else {
        toast.success('Document uploaded successfully!');
      }

      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (err: unknown) {
      setIsUploading(false);
      setUploadProgress(0);
      const msg = err instanceof Error ? err.message : 'Document upload failed';
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload First Info Banner */}
      <Alert className="border-brand/30 bg-brand-soft/40 text-foreground">
        <ShieldCheck className="h-4 w-4 text-brand" />
        <AlertTitle className="text-sm font-semibold">Upload First Principle Active</AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground">
          You can upload legal documents immediately without pre-selecting a case. Case matching or manual assignment can be completed anytime later.
        </AlertDescription>
      </Alert>

      {/* Case Destination & Document Category Options */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Target Case (Optional)
            </CardTitle>
            <CardDescription className="text-xs">
              Leave unassigned to upload first & match later
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
              <SelectTrigger id="case-select-trigger">
                <SelectValue placeholder="Unassigned (Upload First)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">
                  ✨ Unassigned (Upload First)
                </SelectItem>
                {availableCases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title} {c.caseNumber ? `(${c.caseNumber})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Document Classification
            </CardTitle>
            <CardDescription className="text-xs">
              Optional legal document classification tag
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger id="doctype-select-trigger">
                <SelectValue placeholder="UNCLASSIFIED" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNCLASSIFIED">UNCLASSIFIED</SelectItem>
                <SelectItem value="PETITION">PETITION / WRIT</SelectItem>
                <SelectItem value="AFFIDAVIT">AFFIDAVIT</SelectItem>
                <SelectItem value="NOTICE">COURT NOTICE / SUMMONS</SelectItem>
                <SelectItem value="CONTRACT">AGREEMENT / CONTRACT</SelectItem>
                <SelectItem value="EVIDENCE">EVIDENCE / EXHIBIT</SelectItem>
                <SelectItem value="JUDGMENT">ORDER / JUDGMENT</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Main Drag & Drop Zone */}
      {!uploadResult && (
        <Card>
          <CardContent className="pt-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 px-6 transition-all',
                dragActive
                  ? 'border-brand bg-brand-soft/60 scale-[1.01]'
                  : selectedFile
                  ? 'border-brand/40 bg-card'
                  : 'border-border hover:border-brand hover:bg-secondary/40'
              )}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand shadow-sm">
                <UploadCloud className="h-7 w-7" />
              </div>
              <p className="mt-4 text-sm font-semibold text-foreground">
                {selectedFile ? selectedFile.name : 'Drop PDF document here or click to browse'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Only PDF files supported — Maximum size 50MB
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-sm font-semibold">Upload Error</AlertTitle>
                <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* Selected File Details & Upload Action */}
            {selectedFile && !uploadResult && (
              <div className="mt-6 space-y-4 rounded-xl border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand text-xs font-bold uppercase">
                    PDF
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isUploading}
                    onClick={resetUploadState}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {isUploading && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                      <span>Uploading to private vault...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-brand transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    disabled={isUploading}
                    onClick={resetUploadState}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={isUploading}
                    onClick={handleUploadSubmit}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Upload PDF Document
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Duplicate File Alert Banner & State */}
      {uploadResult && uploadResult.isDuplicate && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle className="text-base font-semibold">
                Duplicate File Detected
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              An identical document matching SHA-256 hash <code className="font-mono text-foreground">{uploadResult.sha256.slice(0, 16)}...</code> already exists in your organization vault.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-card p-3 space-y-1">
              <p className="text-sm font-medium text-foreground">
                {uploadResult.originalFilename}
              </p>
              <p className="text-xs text-muted-foreground">
                Status: <Badge variant="outline">{uploadResult.processingStatus}</Badge> • Storage Key: <span className="font-mono">{uploadResult.storageKey}</span>
              </p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" size="sm" onClick={resetUploadState}>
                Upload Another Document
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(`/documents/${uploadResult.id}`)}
              >
                View Existing Document
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fresh Upload Success Card */}
      {uploadResult && !uploadResult.isDuplicate && (
        <Card className="border-success/50 bg-success/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <CardTitle className="text-base font-semibold">
                Document Uploaded Successfully
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Document securely ingested and persisted to private storage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Original Filename</p>
                <p className="text-sm font-semibold text-foreground truncate">
                  {uploadResult.originalFilename}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">SHA-256 Checksum</p>
                <p className="text-xs font-mono text-foreground truncate">
                  {uploadResult.sha256}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Processing Status</p>
                <Badge className="mt-1 bg-brand text-white">{uploadResult.processingStatus}</Badge>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Assigned Case</p>
                <p className="text-xs font-medium text-foreground">
                  {uploadResult.caseId ? uploadResult.caseId : 'Unassigned (Upload First)'}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" size="sm" onClick={resetUploadState}>
                Upload Another Document
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(`/documents/${uploadResult.id}`)}
              >
                View Document
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
