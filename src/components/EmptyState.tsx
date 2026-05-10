import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  /** Primary CTAs row */
  action?: React.ReactNode;
  /** Optional second row (outline / secondary links) */
  secondaryAction?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('empty-state max-w-[min(100%,340px)] sm:max-w-[380px] mx-auto', className)}>
      <div className="mb-5 flex items-center justify-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/15 bg-gradient-to-b from-primary/10 via-primary/[0.06] to-transparent text-primary/80 shadow-[var(--surface-highlight),var(--surface-shadow)] dark:border-primary/20 dark:from-primary/20 dark:via-primary/10">
          <span className="[&_svg]:h-10 [&_svg]:w-10 sm:[&_svg]:h-11 sm:[&_svg]:w-11 [&_svg]:shrink-0">
            {icon}
          </span>
        </span>
      </div>
      <h3 className="text-card-title text-foreground mb-2 tracking-tight">{title}</h3>
      {description && (
        <p className="text-secondary mx-auto max-w-[32ch] leading-relaxed text-[15px] sm:text-base">{description}</p>
      )}
      {action && <div className="mt-6 w-full">{action}</div>}
      {secondaryAction && (
        <div className="mt-3 w-full flex flex-wrap justify-center gap-2">{secondaryAction}</div>
      )}
    </div>
  );
}
