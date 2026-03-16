import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('empty-state', className)}>
      <div className="mb-6 text-muted-foreground/50 [&_svg]:w-14 [&_svg]:h-14 sm:[&_svg]:w-16 sm:[&_svg]:h-16 [&_svg]:shrink-0 [&_svg]:mx-auto">
        {icon}
      </div>
      <h3 className="text-card-title text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-secondary max-w-[280px] mx-auto leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-7 w-full max-w-[260px]">{action}</div>}
    </div>
  );
}
