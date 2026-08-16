'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Download,
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
  Loader2,
  ExternalLink,
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
import { documents as mockDocuments, cases as mockCases, templates as mockTemplates } from '@/lib/mock-data';
import { formatDate, formatFileSize } from '@/lib/format';

export default function DocumentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);

  const [doc, setDoc] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) return;

    // 1. Check local mock data first
    const mockDoc = mockDocuments.find((d) => d.id === docId);
    if (mockDoc) {
      setDoc(mockDoc);
      setLoading(false);
      return;
    }

    // 2. Fetch real document from backend API
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    setLoading(true);

    fetch(`${baseUrl}/api/v1/documents/${docId}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Document not found (Status ${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (data?.data) {
          const apiDoc = data.data;
          setDoc({
            id: apiDoc.id,
            title: apiDoc.originalFilename || 'Legal Document',
            caseName: apiDoc.case?.title || 'Unassigned Case',
            caseId: apiDoc.caseId || '',
            category: apiDoc.documentType || 'UNCLASSIFIED',
            fileType: (apiDoc.mimeType || 'pdf').split('/').pop() || 'pdf',
            fileSize: apiDoc.fileSize || 0,
            fileName: apiDoc.originalFilename,
            pageCount: 1,
            uploadedAt: apiDoc.uploadedAt || new Date().toISOString(),
            uploadedBy: apiDoc.uploader?.name || apiDoc.uploadedBy || 'Legal Advocate',
            status:
              apiDoc.matchStatus === 'CONFIRMED' || apiDoc.matchStatus === 'AUTO_MATCH'
                ? 'filed'
                : apiDoc.matchStatus === 'CONFIRMATION_REQUIRED'
                ? 'review'
                : 'uploaded',
            priority: 'medium',
            tags: [apiDoc.documentType || 'Legal Document'],
            summary: apiDoc.sha256 ? `SHA-256 Checksum: ${apiDoc.sha256}` : undefined,
            isReal: true,
          });

          // Also resolve temporary signed download/preview URL
          fetch(`${baseUrl}/api/v1/documents/${docId}/download`, {
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          })
            .then((res) => (res.ok ? res.json() : null))
            .then((dlData) => {
              if (dlData?.data?.downloadUrl) {
                setPreviewUrl(dlData.data.downloadUrl);
              } else {
                setPreviewUrl(`${baseUrl}/api/v1/documents/${docId}/preview?token=${encodeURIComponent(token || '')}`);
              }
            })
            .catch(() => {
              setPreviewUrl(`${baseUrl}/api/v1/documents/${docId}/preview?token=${encodeURIComponent(token || '')}`);
            });
        } else {
          setError('Document details not found');
        }
      })
      .catch((err) => {
        console.warn('[DocumentViewer] Fetch error:', err);
        setError(err.message || 'Unable to retrieve document details');
      })
      .finally(() => setLoading(false));
  }, [docId]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
        <span className="ml-3 text-sm text-muted-foreground">Loading document details...</span>
      </div>
    );
  }

  if (!doc || error) {
    return (
      <div className="mx-auto max-w-7xl p-8">
        <EmptyState
          icon={FileText}
          title="Document not found"
          description="This document may have been deleted or you don't have permission to access it."
          action={
            <Button onClick={() => router.push('/documents')}>
              Back to Documents
            </Button>
          }
        />
      </div>
    );
  }

  const handleDownload = async () => {
    try {
      if (previewUrl) {
        window.open(previewUrl, '_blank');
        return;
      }
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_URL}/api/v1/documents/${docId}/download`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      if (data.data?.downloadUrl) {
        window.open(data.data.downloadUrl, '_blank');
      } else {
        window.open(`${API_URL}/api/v1/documents/${docId}/preview?token=${encodeURIComponent(token || '')}`, '_blank');
      }
    } catch (e) {
      console.error(e);
    }
  };

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
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
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
              {previewUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(previewUrl, '_blank')}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  Open in New Tab
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex justify-center rounded-lg bg-secondary/40 p-2 md:p-4">
                {doc.isReal ? (
                  previewUrl ? (
                    <iframe
                      src={previewUrl}
                      className="h-[650px] w-full rounded-lg border bg-white shadow-md"
                      title={doc.title}
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-brand" />
                      <span className="ml-2 text-xs text-muted-foreground">Loading preview stream...</span>
                    </div>
                  )
                ) : (
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
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {doc.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Document Information</CardTitle>
                <CardDescription>File details and security checksum</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-mono leading-relaxed text-muted-foreground">
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
              {doc.caseId ? (
                <Property icon={FolderOpen} label="Case" value={doc.caseName} href={`/cases/${doc.caseId}`} />
              ) : (
                <Property icon={FolderOpen} label="Case" value={doc.caseName} />
              )}
              <Property icon={Tag} label="Category" value={doc.category} />
              <Property icon={Calendar} label="Uploaded" value={formatDate(doc.uploadedAt)} />
              <Property icon={User} label="Uploaded by" value={doc.uploadedBy} />
              <Property icon={FileText} label="Pages" value={String(doc.pageCount)} />
              <Property icon={HardDrive} label="File size" value={formatFileSize(doc.fileSize)} />
              <Property icon={FileText} label="File type" value={String(doc.fileType).toUpperCase()} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {(doc.tags || ['Legal']).map((tag: string) => (
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
