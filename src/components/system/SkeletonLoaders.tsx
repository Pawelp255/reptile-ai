import { Skeleton } from '@/components/ui/skeleton';

export function ReptileListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="reptile-card">
          <Skeleton className="w-12 h-12 rounded-[var(--radius-xl)] shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-5 w-5 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for Today page task list — reduces layout jump */
export function TodayTasksSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-24 rounded" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="task-card flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-[var(--radius-lg)] shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-9 w-20 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-[var(--radius-xl)] p-4 sm:p-5 border border-border/60 shadow-[var(--shadow-card)] space-y-3">
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-card rounded-[var(--radius-xl)] p-4 sm:p-5 border border-border shadow-[var(--shadow-card)] space-y-3">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AIResultSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-20 w-full rounded-lg" />
    </div>
  );
}

export function FeedingTimelineSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="event-item">
          <div className="event-dot" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-card rounded-[var(--radius-xl)] p-4 sm:p-5 border border-border/60 shadow-[var(--shadow-card)]">
      <Skeleton className="h-4 w-32 mb-4 rounded" />
      <Skeleton className="h-48 w-full rounded-[var(--radius-lg)]" />
    </div>
  );
}

/** Generic content block skeleton for detail/form pages */
export function ContentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-card rounded-[var(--radius-xl)] p-4 border border-border/60 shadow-[var(--shadow-card)] space-y-3">
        <Skeleton className="h-5 w-1/3 rounded" />
        <Skeleton className="h-10 w-full rounded-[var(--radius-lg)]" />
        <Skeleton className="h-10 w-full rounded-[var(--radius-lg)]" />
        <Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />
      </div>
    </div>
  );
}

/** Journal / event list skeleton */
export function JournalSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="event-item flex gap-3">
          <Skeleton className="w-2 h-2 rounded-full shrink-0 mt-1.5" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full max-w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
