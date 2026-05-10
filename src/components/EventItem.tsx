import { Utensils, Sparkles, Heart, Hand, StickyNote, RefreshCw, Image } from 'lucide-react';
import { formatLocalDateKey } from '@/lib/date/localDateKey';
import { stripDemoMarkerForDisplay } from '@/lib/display/stripDemoMarker';
import { cn } from '@/lib/utils';
import type { EventType } from '@/types';

interface EventItemProps {
  eventType: EventType;
  eventDate: string;
  details?: string;
  reptileName?: string;
  photoDataUrl?: string;
  showReptileName?: boolean;
  /** When a parent shows a date heading, hide the duplicate date line */
  hideDate?: boolean;
  onClick?: () => void;
}

const eventIcons: Record<EventType, React.ComponentType<{ className?: string }>> = {
  feeding: Utensils,
  cleaning: Sparkles,
  shedding: RefreshCw,
  health: Heart,
  handling: Hand,
  note: StickyNote,
};

const eventLabels: Record<EventType, string> = {
  feeding: 'Feeding',
  cleaning: 'Cleaning',
  shedding: 'Shedding',
  health: 'Health Check',
  handling: 'Handling',
  note: 'Note',
};

const eventColors: Record<EventType, string> = {
  feeding: 'bg-amber-500',
  cleaning: 'bg-blue-500',
  shedding: 'bg-purple-500',
  health: 'bg-rose-500',
  handling: 'bg-green-500',
  note: 'bg-gray-500',
};

export function EventItem({
  eventType,
  eventDate,
  details,
  reptileName,
  photoDataUrl,
  showReptileName = false,
  hideDate = false,
  onClick,
}: EventItemProps) {
  const displayDetails = stripDemoMarkerForDisplay(details);
  const Icon = eventIcons[eventType];
  const label = eventLabels[eventType];
  const colorClass = eventColors[eventType];

  return (
    <div 
      className={cn(
        'event-item cursor-pointer min-w-0',
        onClick && 'hover:bg-muted/50 tap-feedback-soft rounded-lg -mx-1 px-1 py-0.5'
      )}
      onClick={onClick}
    >
      <div className={cn('event-dot', colorClass)} />
      
      <div className="ml-2 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-0.5 min-w-0">
          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm text-foreground">{label}</span>
          {showReptileName && reptileName && (
            <span className="text-xs px-2 py-0.5 bg-secondary rounded-full text-secondary-foreground max-w-[12rem] truncate">
              {reptileName}
            </span>
          )}
        </div>
        
        {!hideDate && (
          <p className="text-xs text-muted-foreground mb-1">
            {formatLocalDateKey(eventDate, { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
        
        {displayDetails && (
          <p className="text-sm text-foreground/80 break-words [overflow-wrap:anywhere] leading-snug line-clamp-4">
            {displayDetails}
          </p>
        )}
        
        {photoDataUrl && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Image className="w-3.5 h-3.5" />
            <span>Photo attached</span>
          </div>
        )}
      </div>
    </div>
  );
}
