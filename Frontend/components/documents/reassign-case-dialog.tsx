'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export interface CaseOption {
  id: string;
  title: string;
  caseNumber?: string | null;
}

export interface ReassignCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
  availableCases: CaseOption[];
  onReassignSuccess?: () => void;
}

export function ReassignCaseDialog({
  open,
  onOpenChange,
  documentId,
  documentTitle,
  availableCases = [],
  onReassignSuccess,
}: ReassignCaseDialogProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReassign = async () => {
    setIsSubmitting(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      const response = await fetch(`${API_URL}/api/v1/documents/${documentId}/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          newCaseId: selectedCaseId === 'detach' ? null : selectedCaseId || null,
          reason,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to reassign document');
      }

      toast.success('Document assignment updated successfully');
      onOpenChange(false);
      if (onReassignSuccess) onReassignSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reassignment failed';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-brand" />
            Reassign Document Case
          </DialogTitle>
          <DialogDescription className="text-xs">
            Change case association or detach <span className="font-semibold text-foreground">{documentTitle}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label htmlFor="case-select" className="text-xs font-semibold">
              Select Destination Case
            </Label>
            <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
              <SelectTrigger id="case-select">
                <SelectValue placeholder="Choose a case..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="detach">❌ Detach (Mark as Unassigned)</SelectItem>
                {availableCases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title} {c.caseNumber ? `(${c.caseNumber})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reassign-reason" className="text-xs font-semibold">
              Reason / Feedback (Optional)
            </Label>
            <Input
              id="reassign-reason"
              placeholder="e.g. Correcting automatic suggestion to main petition"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Feedback helps improve future automatic case candidate scoring.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleReassign} disabled={!selectedCaseId || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Save Case Assignment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
