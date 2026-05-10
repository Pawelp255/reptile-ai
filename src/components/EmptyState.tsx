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
      <div className="mb-5 text-muted-foreground/45 [&_svg]:w-14 [&_svg]:h-14 sm:[&_svg]:w-[3.65rem] sm:[&_svg]:h-[3.65rem] [&_svg]:shrink-0 [&_svg]:mx-auto">
        {icon}
      </div>
      <h3 className="text-card-title text-foreground mb-2 tracking-tight">{title}</h3>
      {description && (
        <p className="text-secondary mx-auto leading-relaxed text-[15px] sm:text-base">{description}</p>
      )}
      {action && <div className="mt-6 w-full">{action}</div>}
      {secondaryAction && (
        <div className="mt-3 w-full flex flex-wrap justify-center gap-2">{secondaryAction}</div>
      )}
    </div>
  );
}
