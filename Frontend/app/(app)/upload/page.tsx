'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  DocumentUploadDropzone,
  UploadedDocumentResult,
  CaseOption,
} from '@/components/documents/document-upload-dropzone';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cases } from '@/lib/mock-data';
import { useUserProfile } from '@/lib/use-user';
import { ArrowRight, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUserProfile();
  const [recentUploads, setRecentUploads] = useState<UploadedDocumentResult[]>([]);
  const [availableCases, setAvailableCases] = useState<CaseOption[]>([]);

  // Demo users get mock cases; real users get their tenant's cases from the API.
  useEffect(() => {
    if (userLoading) return;

    if (user.isDemo) {
      setAvailableCases(
        cases.map((c) => ({
          id: c.id,
          title: c.name,
          caseNumber: c.caseNumber,
        }))
      );
      return;
    }

    const fetchCases = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch(`${API_URL}/api/v1/cases`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (res.ok) {
          const casesData = await res.json();
          setAvailableCases(
            (casesData.data?.cases || []).map((caseItem: any) => ({
              id: caseItem.id,
              title: caseItem.title,
              caseNumber: caseItem.caseNumber || null,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to fetch cases for upload:', err);
      }
    };

    fetchCases();
  }, [user.isDemo, userLoading]);

  const handleUploadSuccess = (doc: UploadedDocumentResult) => {
    setRecentUploads((prev) => [doc, ...prev]);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Document Ingestion & Upload
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload legal PDFs instantly with zero required pre-case selection.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/documents')}>
          <FileText className="mr-2 h-4 w-4" />
          View All Documents
        </Button>
      </div>

      {/* Main Upload Dropzone Component */}
      <DocumentUploadDropzone
        availableCases={availableCases}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Recent Session Uploads Section */}
      {recentUploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Uploaded in this Session ({recentUploads.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Documents ingested during your current session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUploads.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border bg-card p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand font-bold text-xs">
                    PDF
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {doc.originalFilename}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Status: {doc.processingStatus}</span>
                      <span>•</span>
                      <span>{doc.caseId ? 'Case Assigned' : 'Unassigned'}</span>
                      {doc.isDuplicate && (
                        <Badge variant="outline" className="border-warning/30 text-warning text-[10px]">
                          Duplicate
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/documents/${doc.id}`)}
                >
                  Details
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
