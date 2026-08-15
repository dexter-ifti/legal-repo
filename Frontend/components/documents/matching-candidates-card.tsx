'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileCheck,
  Building2,
  Scale,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface CandidateSignal {
  type: string;
  description: string;
  score: number;
}

export interface CaseCandidate {
  caseId: string;
  caseNumber: string | null;
  cnrNumber: string | null;
  title: string;
  clientName: string | null;
  opposingParty: string | null;
  court: string | null;
  signals: CandidateSignal[];
  totalScore: number;
}

export interface MatchingCandidatesCardProps {
  documentId: string;
  documentTitle: string;
  matchStatus: string;
  matchConfidence: number | null;
  candidates: CaseCandidate[];
  onConfirmSuccess?: () => void;
  onOpenReassign?: () => void;
}

export function MatchingCandidatesCard({
  documentId,
  documentTitle,
  matchStatus,
  matchConfidence,
  candidates = [],
  onConfirmSuccess,
  onOpenReassign,
}: MatchingCandidatesCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmCandidate = async (caseId: string) => {
    setIsSubmitting(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      const response = await fetch(`${API_URL}/api/v1/documents/${documentId}/confirm-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ caseId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to confirm case match');
      }

      toast.success('Document successfully filed into case!');
      if (onConfirmSuccess) onConfirmSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Match confirmation failed';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    switch (matchStatus) {
      case 'AUTO_MATCHED':
        return (
          <Badge className="bg-emerald-600 text-white flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Auto Matched ({Math.round((matchConfidence || 0) * 100)}%)
          </Badge>
        );
      case 'CONFIRMATION_REQUIRED':
        return (
          <Badge className="bg-amber-500 text-white flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Review Required
          </Badge>
        );
      case 'CONFIRMED':
        return (
          <Badge className="bg-blue-600 text-white flex items-center gap-1">
            <FileCheck className="h-3 w-3" /> Confirmed & Filed
          </Badge>
        );
      case 'REASSIGNED':
        return (
          <Badge className="bg-purple-600 text-white flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> Reassigned
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <HelpCircle className="h-3 w-3" /> No Candidate Match
          </Badge>
        );
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              Case Candidate Suggestions
            </CardTitle>
            <CardDescription className="text-xs">
              Deterministic matching results for <span className="font-medium text-foreground">{documentTitle}</span>
            </CardDescription>
          </div>
          <div>{getStatusBadge()}</div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {candidates.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <HelpCircle className="mx-auto h-8 w-8 text-muted-foreground opacity-50" />
            <p className="mt-2 text-sm font-medium text-foreground">No candidate cases automatically identified</p>
            <p className="text-xs text-muted-foreground mt-1">
              Extracted document headers did not match any active cases in your organization.
            </p>
            {onOpenReassign && (
              <Button size="sm" variant="outline" className="mt-4" onClick={onOpenReassign}>
                Manually Select Case
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {candidates.map((cand, idx) => {
              const confidencePercent = Math.round(cand.totalScore * 100);
              const isTopMatch = idx === 0;

              return (
                <div
                  key={cand.caseId}
                  className={`rounded-xl border p-4 transition-all ${
                    isTopMatch ? 'border-brand/40 bg-brand-soft/20 shadow-sm' : 'border-border bg-card'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-brand" />
                        <h4 className="text-sm font-semibold text-foreground">{cand.title}</h4>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {cand.caseNumber && (
                          <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground">
                            {cand.caseNumber}
                          </span>
                        )}
                        {cand.cnrNumber && (
                          <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground">
                            CNR: {cand.cnrNumber}
                          </span>
                        )}
                        {cand.court && (
                          <span className="flex items-center gap-1">
                            <Scale className="h-3 w-3" /> {cand.court}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground">Match Score</span>
                        <p className="text-sm font-bold text-brand">{confidencePercent}%</p>
                      </div>
                      <Button
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => handleConfirmCandidate(cand.caseId)}
                      >
                        Confirm Filing
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Signals List */}
                  {cand.signals.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap gap-1.5">
                      {cand.signals.map((sig, sIdx) => (
                        <Badge key={sIdx} variant="secondary" className="text-[11px] font-normal">
                          ✓ {sig.description}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {onOpenReassign && (
              <div className="flex justify-end pt-1">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onOpenReassign}>
                  Select different case or reassign...
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
