import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Rating({ value, reviews, className }: { value: number; reviews?: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              'h-3.5 w-3.5',
              i < Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-brand-900/10 text-brand-900/10',
            )}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-brand-900/60">
        {value.toFixed(1)}
        {reviews != null && <span className="text-brand-900/40"> ({reviews})</span>}
      </span>
    </div>
  );
}
