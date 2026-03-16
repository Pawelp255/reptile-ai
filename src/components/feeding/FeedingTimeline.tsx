import { format } from 'date-fns';
import { Utensils } from 'lucide-react';
import type { CareEvent } from '@/types';

interface Props {
  events: CareEvent[];
}

export function FeedingTimeline({ events }: Props) {
  const feedings = events
    .filter(e => e.eventType === 'feeding')
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  if (feedings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Utensils className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No feeding records yet</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Timeline line */}
      <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-border" />

      {feedings.map((f, i) => (
        <div key={f.id} className="relative pb-4 last:pb-0">
          {/* Dot */}
          <div className="absolute left-[-15px] top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />

          <div className="bg-card rounded-lg p-3 border border-border ml-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                {format(new Date(f.eventDate), 'MMM d, yyyy')}
              </span>
              {f.supplements && f.supplements.length > 0 && (
                <div className="flex gap-1">
                  {f.supplements.map(s => (
                    <span key={s} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded font-medium text-secondary-foreground">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {f.details && <p className="text-sm">{f.details}</p>}
            {!f.details && <p className="text-sm text-muted-foreground italic">No details</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
