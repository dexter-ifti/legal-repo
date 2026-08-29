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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

      const response = await fetch(
        `${API_URL}/api/v1/documents/${documentId}/confirm-match`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ caseId }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'We couldn’t file that document.');
      }

      toast.success('Filed! We’ve added it to the case.');
      if (onConfirmSuccess) onConfirmSuccess();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'We couldn’t file that document.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confidencePercent = Math.round((matchConfidence || 0) * 100);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand" />
          What we found
        </CardTitle>
        {matchStatus === 'AUTO_MATCHED' && (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Auto-filed ({confidencePercent}% sure)
          </Badge>
        )}
        {matchStatus === 'CONFIRMATION_REQUIRED' && (
          <Badge variant="warning" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Please confirm
          </Badge>
        )}
        {matchStatus === 'CONFIRMED' && (
          <Badge variant="success" className="gap-1">
            <FileCheck className="h-3 w-3" />
            Filed
          </Badge>
        )}
        {matchStatus === 'REASSIGNED' && (
          <Badge variant="default" className="gap-1">
            <RefreshCw className="h-3 w-3" />
            Reassigned
          </Badge>
        )}
        {(!matchStatus || matchStatus === 'NO_MATCH') && (
          <Badge variant="outline" className="gap-1">
            <HelpCircle className="h-3 w-3" />
            No clear match
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {candidates.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <HelpCircle className="mx-auto h-8 w-8 text-muted-foreground opacity-60" />
            <p className="mt-2 text-sm font-medium text-foreground">
              We couldn’t match this to any of your cases
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick a case manually so it gets filed in the right place.
            </p>
            {onOpenReassign && (
              <Button
                size="sm"
                variant="outline"
                className="mt-4"
                onClick={onOpenReassign}
              >
                Choose a case
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The cases below look similar. Tap the one that’s right and we’ll
              file the document there.
            </p>
            {candidates.map((cand, idx) => {
              const candidateConfidence = Math.round(cand.totalScore * 100);
              const isTopMatch = idx === 0;

              return (
                <div
                  key={cand.caseId}
                  className={`rounded-xl border p-4 transition-all ${
                    isTopMatch
                      ? 'border-brand/40 bg-brand-soft/40 shadow-sm'
                      : 'bg-card'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-brand" />
                        <h4 className="text-base font-semibold text-foreground">
                          {cand.title}
                        </h4>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {cand.caseNumber && (
                          <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-foreground/80">
                            {cand.caseNumber}
                          </span>
                        )}
                        {cand.cnrNumber && (
                          <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-foreground/80">
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
                        <span className="text-xs text-muted-foreground">
                          How sure we are
                        </span>
                        <p className="text-base font-semibold text-brand">
                          {candidateConfidence}%
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => handleConfirmCandidate(cand.caseId)}
                      >
                        File it here
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {cand.signals.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                      {cand.signals.map((sig, sIdx) => (
                        <Badge
                          key={sIdx}
                          variant="secondary"
                          className="text-[11px] font-normal"
                        >
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm text-muted-foreground"
                  onClick={onOpenReassign}
                >
                  None of these — pick a different case
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}