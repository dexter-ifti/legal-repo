'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  Loader2,
  Scan,
  FileCheck2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cases, templates } from '@/lib/mock-data';
import { formatFileSize } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type UploadStage = 'select' | 'uploading' | 'processing' | 'review' | 'done';

interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'uploading' | 'uploaded' | 'error';
}

interface ProcessedDoc {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  pageCount: number;
  ocrConfidence: number;
  matchedTemplate: string;
  matchScore: number;
  suggestedCategory: string;
  suggestedTitle: string;
  extractedFields: { label: string; value: string; confidence: number }[];
  preview: string;
  confirmed: boolean;
}

export default function UploadPage() {
  const router = useRouter();
  const [stage, setStage] = useState<UploadStage>('select');
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [selectedCase, setSelectedCase] = useState<string>('');
  const [processedDocs, setProcessedDocs] = useState<ProcessedDoc[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newFiles: UploadFile[] = Array.from(fileList).map((file, i) => ({
      id: `f${Date.now()}_${i}`,
      name: file.name,
      size: file.size,
      type: file.name.split('.').pop() || 'pdf',
      progress: 0,
      status: 'uploading',
    }));
    setFiles((prev) => [...prev, ...newFiles]);

    newFiles.forEach((f) => {
      let prog = 0;
      const interval = setInterval(() => {
        prog += Math.random() * 25 + 10;
        if (prog >= 100) {
          prog = 100;
          clearInterval(interval);
          setFiles((prev) =>
            prev.map((p) =>
              p.id === f.id ? { ...p, progress: 100, status: 'uploaded' } : p
            )
          );
        } else {
          setFiles((prev) =>
            prev.map((p) => (p.id === f.id ? { ...p, progress: prog } : p))
          );
        }
      }, 200);
    });
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function startProcessing() {
    setStage('uploading');
    setTimeout(() => {
      setStage('processing');
      const template = templates[0];
      const mockProcessed: ProcessedDoc[] = files.map((f, i) => ({
        id: `pd${i}`,
        fileName: f.name,
        fileSize: f.size,
        fileType: f.type,
        pageCount: Math.floor(Math.random() * 30) + 2,
        ocrConfidence: Math.floor(Math.random() * 15) + 84,
        matchedTemplate: templates[i % templates.length].name,
        matchScore: Math.floor(Math.random() * 12) + 86,
        suggestedCategory: templates[i % templates.length].category,
        suggestedTitle: f.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
        extractedFields: [
          { label: 'Document Date', value: '2026-08-14', confidence: 98 },
          { label: 'Parties', value: 'Plaintiff v. Defendant', confidence: 92 },
          { label: 'Jurisdiction', value: 'Superior Court', confidence: 95 },
          { label: 'Case Reference', value: '2024-CV-00342', confidence: 89 },
        ],
        preview: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        confirmed: true,
      }));
      setProcessedDocs(mockProcessed);
      setTimeout(() => setStage('review'), 2500);
    }, 800);
  }

  function toggleConfirm(id: string) {
    setProcessedDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, confirmed: !d.confirmed } : d))
    );
  }

  function fileDocuments() {
    const confirmed = processedDocs.filter((d) => d.confirmed);
    setStage('done');
    toast.success(`${confirmed.length} document${confirmed.length > 1 ? 's' : ''} filed successfully`, {
      description: `Filed to ${cases.find((c) => c.id === selectedCase)?.name || 'case'}`,
    });
  }

  const allUploaded = files.length > 0 && files.every((f) => f.status === 'uploaded');

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Upload Documents
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan, OCR, classify, and file — LexFlow handles the entire pipeline.
        </p>
      </div>

      <StepIndicator stage={stage} />

      {stage === 'select' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Destination Case</CardTitle>
              <CardDescription>Choose which case these documents belong to</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedCase} onValueChange={setSelectedCase}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a case..." />
                </SelectTrigger>
                <SelectContent>
                  {cases.filter((c) => c.status !== 'closed').map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.caseNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload Files</CardTitle>
              <CardDescription>Drag and drop or browse — PDF, DOCX, TIFF, JPG supported</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 transition-colors',
                  dragActive
                    ? 'border-brand bg-brand-soft'
                    : 'border-border hover:border-brand hover:bg-secondary/50'
                )}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">
                  Drop files here or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Maximum 50 files, up to 50MB each
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                  accept=".pdf,.docx,.tiff,.jpg,.png"
                />
              </div>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 rounded-lg border bg-card p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold uppercase text-muted-foreground">
                        {f.type}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {f.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(f.size)}
                        </p>
                        {f.status === 'uploading' && (
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-brand transition-all"
                              style={{ width: `${f.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                      {f.status === 'uploaded' ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <Loader2 className="h-5 w-5 animate-spin text-brand" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              disabled={!allUploaded || !selectedCase || files.length === 0}
              onClick={startProcessing}
            >
              <Scan className="mr-2 h-4 w-4" />
              Process {files.length} File{files.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {stage === 'uploading' && (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-brand" />
            <p className="mt-4 text-lg font-semibold text-foreground">Uploading files...</p>
            <p className="mt-1 text-sm text-muted-foreground">Securely transferring to processing pipeline</p>
          </CardContent>
        </Card>
      )}

      {stage === 'processing' && (
        <Card>
          <CardContent className="py-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-20" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <Sparkles className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">AI Processing Pipeline</p>
                  <p className="text-sm text-muted-foreground">Running OCR, classification, and template matching</p>
                </div>
              </div>

              {[
                { label: 'OCR text extraction', icon: Scan },
                { label: 'Document classification', icon: FileText },
                { label: 'Template matching', icon: FileCheck2 },
                { label: 'Field extraction', icon: Sparkles },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <step.icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-foreground">
                    {step.label}
                  </span>
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stage === 'review' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Processing complete — {processedDocs.length} document{processedDocs.length !== 1 ? 's' : ''} ready for review
                </p>
                <p className="text-xs text-muted-foreground">
                  Review the AI suggestions below and confirm before filing
                </p>
              </div>
            </CardContent>
          </Card>

          {processedDocs.map((doc) => (
            <Card key={doc.id} className={cn(!doc.confirmed && 'opacity-60')}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-xs font-semibold uppercase text-muted-foreground">
                      {doc.fileType}
                    </div>
                    <div>
                      <CardTitle className="text-base">{doc.suggestedTitle}</CardTitle>
                      <CardDescription>{doc.fileName}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant={doc.confirmed ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleConfirm(doc.id)}
                  >
                    {doc.confirmed ? (
                      <>
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        Confirmed
                      </>
                    ) : (
                      <>
                        <X className="mr-1.5 h-4 w-4" />
                        Excluded
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label="OCR Confidence" value={`${doc.ocrConfidence}%`} good={doc.ocrConfidence >= 90} />
                  <Metric label="Template Match" value={`${doc.matchScore}%`} good={doc.matchScore >= 90} />
                  <Metric label="Pages" value={String(doc.pageCount)} />
                  <Metric label="Size" value={formatFileSize(doc.fileSize)} />
                </div>

                <div className="rounded-lg border bg-secondary/40 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-brand" />
                    <span className="text-sm font-semibold text-foreground">
                      Matched Template: {doc.matchedTemplate}
                    </span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {doc.suggestedCategory}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {doc.preview}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Extracted Fields
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {doc.extractedFields.map((field) => (
                      <div
                        key={field.label}
                        className="flex items-center justify-between rounded-lg border bg-card p-2.5"
                      >
                        <div>
                          <p className="text-xs text-muted-foreground">{field.label}</p>
                          <p className="text-sm font-medium text-foreground">{field.value}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            field.confidence >= 90
                              ? 'border-success/30 text-success'
                              : 'border-warning/30 text-warning'
                          )}
                        >
                          {field.confidence}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStage('select')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={fileDocuments}
              disabled={processedDocs.filter((d) => d.confirmed).length === 0}
            >
              <FileCheck2 className="mr-2 h-4 w-4" />
              File {processedDocs.filter((d) => d.confirmed).length} Document{processedDocs.filter((d) => d.confirmed).length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {stage === 'done' && (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-foreground">
              Documents Filed Successfully
            </h2>
            <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
              {processedDocs.filter((d) => d.confirmed).length} document{processedDocs.filter((d) => d.confirmed).length !== 1 ? 's have' : ' has'} been filed to {cases.find((c) => c.id === selectedCase)?.name || 'the case'}.
              You can view them in the case folder.
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={() => { setStage('select'); setFiles([]); setProcessedDocs([]); }}>
                Upload More
              </Button>
              <Button asChild>
                <span onClick={() => router.push('/dashboard')}>
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepIndicator({ stage }: { stage: UploadStage }) {
  const steps = [
    { key: 'select', label: 'Upload' },
    { key: 'processing', label: 'Process' },
    { key: 'review', label: 'Review' },
    { key: 'done', label: 'File' },
  ];
  const activeIndex = steps.findIndex((s) => s.key === stage);
  const displayIndex = stage === 'uploading' ? 1 : activeIndex;

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const completed = i < displayIndex;
        const active = i === displayIndex;
        return (
          <div key={step.key} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                completed && 'bg-success text-success-foreground',
                active && 'bg-brand text-white',
                !completed && !active && 'bg-secondary text-muted-foreground'
              )}
            >
              {completed ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={cn(
                'text-sm font-medium',
                active ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 rounded-full',
                  completed ? 'bg-success' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Metric({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-lg font-bold',
          good === true && 'text-success',
          good === false && 'text-warning',
          good === undefined && 'text-foreground'
        )}
      >
        {value}
      </p>
    </div>
  );
}
