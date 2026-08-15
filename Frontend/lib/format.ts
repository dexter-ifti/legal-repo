import type { DocStatus, DocPriority } from './types';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date('2026-08-14T17:00:00');
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

export function statusLabel(status: DocStatus): string {
  const labels: Record<DocStatus, string> = {
    uploaded: 'Uploaded',
    processing: 'Processing',
    review: 'In Review',
    filed: 'Filed',
    rejected: 'Rejected',
  };
  return labels[status];
}

export function statusClasses(status: DocStatus): string {
  const classes: Record<DocStatus, string> = {
    uploaded: 'bg-neutral-soft text-neutral-status',
    processing: 'bg-brand-soft text-brand',
    review: 'bg-warning-soft text-warning',
    filed: 'bg-success-soft text-success',
    rejected: 'bg-error-soft text-error',
  };
  return classes[status];
}

export function priorityLabel(priority: DocPriority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function priorityClasses(priority: DocPriority): string {
  const classes: Record<DocPriority, string> = {
    low: 'bg-neutral-soft text-neutral-status',
    medium: 'bg-brand-soft text-brand',
    high: 'bg-warning-soft text-warning',
    urgent: 'bg-error-soft text-error',
  };
  return classes[priority];
}
