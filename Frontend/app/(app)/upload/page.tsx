'use client';

import { useState, useEffect } from 'react';
import {
  DocumentUploadDropzone,
  UploadedDocumentResult,
  CaseOption,
} from '@/components/documents/document-upload-dropzone';
import { cases } from '@/lib/mock-data';
import { useUserProfile } from '@/lib/use-user';
import { Upload as UploadIcon, HelpCircle } from 'lucide-react';

export default function UploadPage() {
  const { user, loading: userLoading } = useUserProfile();
  const [availableCases, setAvailableCases] = useState<CaseOption[]>([]);

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

  const handleUploadSuccess = (_doc: UploadedDocumentResult) => {
    // Toast already shown by the dropzone; nothing else to do here.
  };

  return (
    <div className="page-shell space-y-6">
      <header className="space-y-1.5">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
          <UploadIcon className="h-3.5 w-3.5" />
          Quick upload
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Add a legal document to your workspace
        </h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">
          Drop any PDF — a court order, petition, agreement, or notice. We’ll
          read it, work out which case it belongs to, and file it safely. You
          only need to step in when we’re not sure.
        </p>
      </header>

      <DocumentUploadDropzone
        availableCases={availableCases}
        onUploadSuccess={handleUploadSuccess}
      />

      <details className="group rounded-xl border bg-card px-4 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-foreground">
          <span className="inline-flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            How does automatic filing work?
          </span>
          <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">
            ▼
          </span>
        </summary>
        <div className="mt-3 space-y-2 text-muted-foreground">
          <p>
            Your original PDF is stored safely in a private vault. We never
            change or overwrite it.
          </p>
          <p>
            We then read the text, pick out case details like the filing number
            or parties, and look for the best matching case in your workspace.
          </p>
          <p>
            If we’re highly confident, the document is filed automatically. If
            we find more than one plausible case, we’ll show you the options so
            you can choose.
          </p>
        </div>
      </details>
    </div>
  );
}