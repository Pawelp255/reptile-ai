import { cn } from '@/lib/utils';
import { isAppStoreReviewMode } from '@/lib/plan/appStoreReviewMode';

type ProBadgeProps = {
  className?: string;
};

export function ProBadge({ className }: ProBadgeProps) {
  if (isAppStoreReviewMode()) return null;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md border border-amber-500/35 bg-amber-500/[0.12] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-900 dark:text-amber-200',
        className,
      )}
    >
      Pro
    </span>
  );
}
