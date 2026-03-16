import { Skeleton } from '@/components/ui/skeleton';

/**
 * Full-page loading fallback for React.lazy + Suspense.
 * Keeps layout stable (page container + header placeholder) while the route chunk loads.
 */
export function RouteFallback() {
  return (
    <div className="page-container">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border px-4 py-3.5">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48 mt-1" />
      </header>
      <div className="page-content page-content-top loading-min-height flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    </div>
  );
}
