import { Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({
  className,
  showText = true,
  size = 'default',
}: {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'default' | 'lg';
}) {
  const iconSize =
    size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-9 w-9';
  const iconInner =
    size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  const textSize =
    size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm',
          iconSize
        )}
      >
        <Scale className={iconInner} strokeWidth={2.25} />
      </div>
      {showText && (
        <span
          className={cn(
            'font-semibold tracking-tight text-foreground',
            textSize
          )}
        >
          LexFlow
        </span>
      )}
    </div>
  );
}