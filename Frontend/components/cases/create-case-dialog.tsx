'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export interface CreateCaseFormData {
  title: string;
  caseNumber?: string;
  cnrNumber?: string;
  court?: string;
  judge?: string;
  clientName?: string;
  opposingParty?: string;
  caseType?: string;
  notes?: string;
}

interface CreateCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCaseFormData) => Promise<void> | void;
}

export function CreateCaseDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateCaseDialogProps) {
  const [formData, setFormData] = useState<CreateCaseFormData>({
    title: '',
    caseNumber: '',
    cnrNumber: '',
    court: '',
    judge: '',
    clientName: '',
    opposingParty: '',
    caseType: 'Civil',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof CreateCaseFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Case title is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(formData);
      setFormData({
        title: '',
        caseNumber: '',
        cnrNumber: '',
        court: '',
        judge: '',
        clientName: '',
        opposingParty: '',
        caseType: 'Civil',
        notes: '',
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create case';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create New Legal Case</DialogTitle>
          <DialogDescription>
            Register a new case record to track legal documents, hearings, and court filings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="rounded-lg bg-destructive/15 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">
              Case Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g. State of Maharashtra vs. Rajesh Sharma"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="caseNumber">Case / Filing Number</Label>
              <Input
                id="caseNumber"
                placeholder="e.g. WP/2026/1042"
                value={formData.caseNumber}
                onChange={(e) => handleChange('caseNumber', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnrNumber">CNR Number</Label>
              <Input
                id="cnrNumber"
                placeholder="e.g. MHHC010023452026"
                value={formData.cnrNumber}
                onChange={(e) => handleChange('cnrNumber', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="court">Court / Forum</Label>
              <Input
                id="court"
                placeholder="e.g. Bombay High Court"
                value={formData.court}
                onChange={(e) => handleChange('court', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="judge">Presiding Judge</Label>
              <Input
                id="judge"
                placeholder="e.g. Hon. Justice K. R. Vyas"
                value={formData.judge}
                onChange={(e) => handleChange('judge', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                placeholder="e.g. Rajesh Sharma"
                value={formData.clientName}
                onChange={(e) => handleChange('clientName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="opposingParty">Opposing Party</Label>
              <Input
                id="opposingParty"
                placeholder="e.g. State of Maharashtra"
                value={formData.opposingParty}
                onChange={(e) => handleChange('opposingParty', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="caseType">Case Type / Category</Label>
            <Select
              value={formData.caseType}
              onValueChange={(val) => handleChange('caseType', val)}
            >
              <SelectTrigger id="caseType">
                <SelectValue placeholder="Select case type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Civil">Civil Suit</SelectItem>
                <SelectItem value="Criminal">Criminal Appeal / Bail</SelectItem>
                <SelectItem value="Writ Petition">Writ Petition</SelectItem>
                <SelectItem value="Arbitration">Arbitration</SelectItem>
                <SelectItem value="Corporate">Corporate / Commercial</SelectItem>
                <SelectItem value="Family">Family / Matrimonial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Case Notes / Brief Summary</Label>
            <Textarea
              id="notes"
              placeholder="Add key facts, interim orders, or hearing preparation notes..."
              rows={3}
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Case
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
