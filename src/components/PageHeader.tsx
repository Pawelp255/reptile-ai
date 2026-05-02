import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  className?: string;
  /** Lighter typography and spacing — for dense dashboards (e.g. Today). */
  quiet?: boolean;
}

export function PageHeader({ title, subtitle, rightContent, className, quiet }: PageHeaderProps) {
  return (
    <header
      className={cn(
        /* Static header: avoids WebKit/Capacitor overlap when ancestors use transforms (e.g. PageMotion). Top safe inset is body-only in index.css. */
        'glass-shell page-header-glass relative',
        quiet
          ? 'border-b border-border/35 px-4 pb-1.5 pt-2 sm:pb-2 sm:pt-2.5'
          : 'border-b border-border/50 px-4 pb-2 pt-2.5 sm:pb-2.5 sm:pt-3',
        className
      )}
    >
      <div className={cn('flex items-center justify-between gap-3', quiet ? 'min-h-[2.25rem]' : 'min-h-[2.5rem]')}>
        <div className="min-w-0 flex-1">
          <h1
            className={cn(
              'truncate text-foreground',
              quiet
                ? 'text-base font-semibold tracking-tight sm:text-[1.0625rem]'
                : 'text-page-title sm:text-[1.125rem]',
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                'truncate',
                quiet
                  ? 'text-secondary mt-0.5 text-[11px] text-muted-foreground/90'
                  : 'text-secondary mt-0.5 text-[12px]',
              )}
            >
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
