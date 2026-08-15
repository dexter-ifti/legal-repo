import { cn } from '@/lib/utils';
import type { DocStatus, DocPriority } from '@/lib/types';
import {
  statusClasses,
  statusLabel,
  priorityClasses,
  priorityLabel,
} from '@/lib/format';

export function StatusBadge({
  status,
  className,
}: {
  status: DocStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusClasses(status),
        className
      )}
    >
      {status === 'processing' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
        </span>
      )}
      {status !== 'processing' && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            status === 'filed' && 'bg-success',
            status === 'review' && 'bg-warning',
            status === 'uploaded' && 'bg-neutral-status',
            status === 'rejected' && 'bg-error'
          )}
        />
      )}
      {statusLabel(status)}
    </span>
  );
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: DocPriority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        priorityClasses(priority),
        className
      )}
    >
      {priorityLabel(priority)}
    </span>
  );
}
