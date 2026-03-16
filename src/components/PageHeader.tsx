import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, rightContent, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'glass-shell page-header-glass sticky top-0 z-40',
        'border-b border-border/50',
        'px-4 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pb-3 sm:pt-[max(0.875rem,env(safe-area-inset-top))]',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 min-h-[2.5rem]">
        <div className="min-w-0 flex-1">
          <h1 className="text-page-title text-foreground truncate sm:text-[1.125rem]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-secondary mt-0.5 truncate text-[12px]">
              {subtitle}
            </p>
          )}
        </div>
        {rightContent && (
          <div className="flex-shrink-0 flex items-center gap-0.5 min-h-[44px]">
            {rightContent}
          </div>
        )}
      </div>
    </header>
  );
}
