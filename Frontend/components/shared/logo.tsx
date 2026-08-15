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
    size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-12 w-12' : 'h-9 w-9';
  const textSize =
    size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(199_89%_30%)] to-[hsl(205_80%_20%)] text-white shadow-sm',
          iconSize
        )}
      >
        <Scale className={cn(size === 'sm' ? 'h-4 w-4' : 'h-5 w-5')} />
      </div>
      {showText && (
        <span className={cn('font-bold tracking-tight text-foreground', textSize)}>
          LexFlow
        </span>
      )}
    </div>
  );
}
