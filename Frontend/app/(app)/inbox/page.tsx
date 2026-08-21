'use client';

import { useState, useEffect } from 'react';
import {
  Inbox,
  FileCheck,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MatchingCandidatesCard, CaseCandidate } from '@/components/documents/matching-candidates-card';
import { ReassignCaseDialog, CaseOption } from '@/components/documents/reassign-case-dialog';
import { toast } from 'sonner';

export interface InboxDocument {
  id: string;
  originalFilename: string;
  systemFilename: string | null;
  documentType: string | null;
  processingStatus: string;
  matchStatus: string;
  matchConfidence: number | null;
  uploadedAt: string;
  case?: { id: string; title: string; caseNumber: string | null } | null;
  metadata?: Array<{ fieldName: string; fieldValue: string | null }>;
}

export default function FilingInboxPage() {
  const [documents, setDocuments] = useState<InboxDocument[]>([]);
  const [availableCases, setAvailableCases] = useState<CaseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL_PENDING');

  const [reassignDoc, setReassignDoc] = useState<InboxDocument | null>(null);

  const fetchInboxData = async () => {
    setIsLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      // Fetch unassigned/review-required documents & available cases
      const [docsRes, casesRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/documents`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        }),
        fetch(`${API_URL}/api/v1/cases`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        }),
      ]);

      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData.data || []);
      }
      if (casesRes.ok) {
        const casesData = await casesRes.json();
        setAvailableCases(
          (casesData.data?.cases || []).map((caseItem: any) => ({
            id: caseItem.id,
            title: caseItem.title,
            caseNumber: caseItem.caseNumber || null,
          }))
        );
      }
    } catch (err: unknown) {
      console.error('Failed to fetch inbox items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInboxData();
  }, []);

  const pendingDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.documentType || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL_PENDING') {
      return doc.matchStatus === 'CONFIRMATION_REQUIRED' || doc.matchStatus === 'NO_MATCH' || !doc.case;
    }
    if (statusFilter === 'CONFIRMATION_REQUIRED') return doc.matchStatus === 'CONFIRMATION_REQUIRED';
    if (statusFilter === 'NO_MATCH') return doc.matchStatus === 'NO_MATCH';
    if (statusFilter === 'FILED') return doc.matchStatus === 'CONFIRMED' || doc.matchStatus === 'AUTO_MATCHED';

    return true;
  });

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Inbox className="h-6 w-6 text-brand" />
            Filing Inbox & Case Matching
          </h1>
          <p className="text-sm text-muted-foreground">
            Review uploaded legal documents, confirm candidate case matches, or reassign filings safely.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchInboxData} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Inbox
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search uploads by filename or type..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex bg-secondary p-1 rounded-lg text-xs font-medium">
              <button
                className={`px-3 py-1.5 rounded-md transition-all ${
                  statusFilter === 'ALL_PENDING' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground'
                }`}
                onClick={() => setStatusFilter('ALL_PENDING')}
              >
                Needs Review ({documents.filter((d) => d.matchStatus === 'CONFIRMATION_REQUIRED' || d.matchStatus === 'NO_MATCH').length})
              </button>
              <button
                className={`px-3 py-1.5 rounded-md transition-all ${
                  statusFilter === 'CONFIRMATION_REQUIRED' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground'
                }`}
                onClick={() => setStatusFilter('CONFIRMATION_REQUIRED')}
              >
                Review ({documents.filter((d) => d.matchStatus === 'CONFIRMATION_REQUIRED').length})
              </button>
              <button
                className={`px-3 py-1.5 rounded-md transition-all ${
                  statusFilter === 'NO_MATCH' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground'
                }`}
                onClick={() => setStatusFilter('NO_MATCH')}
              >
                No Match ({documents.filter((d) => d.matchStatus === 'NO_MATCH').length})
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inbox List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32 bg-secondary/30 rounded-xl" />
            </Card>
          ))}
        </div>
      ) : pendingDocuments.length === 0 ? (
        <Card className="p-12 text-center">
          <FileCheck className="mx-auto h-12 w-12 text-muted-foreground opacity-40" />
          <h3 className="mt-4 text-base font-semibold text-foreground">All Uploaded Documents Filed</h3>
          <p className="text-xs text-muted-foreground mt-1">
            No unassigned or review-pending documents match your current filter.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {pendingDocuments.map((doc) => {
            // Parse candidates stored in metadata if available
            const candidatesMeta = doc.metadata?.find((m) => m.fieldName === 'matching_candidates');
            let candidates: CaseCandidate[] = [];
            if (candidatesMeta?.fieldValue) {
              try {
                candidates = JSON.parse(candidatesMeta.fieldValue);
              } catch {
                candidates = [];
              }
            }

            return (
              <div key={doc.id} className="space-y-3">
                <div className="flex items-center justify-between bg-card border rounded-xl p-4 shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{doc.originalFilename}</h3>
                      {doc.documentType && (
                        <Badge variant="outline" className="text-[11px]">
                          {doc.documentType}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {new Date(doc.uploadedAt).toLocaleDateString()} • Status: <span className="font-mono text-foreground">{doc.processingStatus}</span>
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setReassignDoc(doc)}
                  >
                    Manual Reassign
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Candidate Suggestions Component */}
                <MatchingCandidatesCard
                  documentId={doc.id}
                  documentTitle={doc.originalFilename}
                  matchStatus={doc.matchStatus}
                  matchConfidence={doc.matchConfidence}
                  candidates={candidates}
                  onConfirmSuccess={fetchInboxData}
                  onOpenReassign={() => setReassignDoc(doc)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Reassign Modal Dialog */}
      {reassignDoc && (
        <ReassignCaseDialog
          open={!!reassignDoc}
          onOpenChange={(open) => {
            if (!open) setReassignDoc(null);
          }}
          documentId={reassignDoc.id}
          documentTitle={reassignDoc.originalFilename}
          availableCases={availableCases}
          onReassignSuccess={fetchInboxData}
        />
      )}
    </div>
  );
}
