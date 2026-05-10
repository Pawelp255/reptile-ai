import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Filter, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EventItem } from '@/components/EventItem';
import { EmptyState } from '@/components/EmptyState';
import { JournalSkeleton } from '@/components/system/SkeletonLoaders';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatLocalDateKey } from '@/lib/date/localDateKey';
import { stripDemoMarkerForDisplay } from '@/lib/display/stripDemoMarker';
import { getAllCareEvents, getAllReptiles, deleteCareEvent, getToday } from '@/lib/storage';
import type { CareEvent, Reptile, EventType } from '@/types';
import { lightHaptic, mediumHaptic } from '@/lib/native/haptics';

interface EventWithReptile extends CareEvent {
  reptile?: Reptile;
}

const eventTypeOptions: { value: EventType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'feeding', label: 'Feeding' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'shedding', label: 'Shedding' },
  { value: 'health', label: 'Health Check' },
  { value: 'handling', label: 'Handling' },
  { value: 'note', label: 'Note' },
];

const eventLabels: Record<EventType, string> = {
  feeding: 'Feeding',
  cleaning: 'Cleaning',
  shedding: 'Shedding',
  health: 'Health Check',
  handling: 'Handling',
  note: 'Note',
};

export default function JournalPage() {
  const [events, setEvents] = useState<EventWithReptile[]>([]);
  const [reptiles, setReptiles] = useState<Reptile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterReptile, setFilterReptile] = useState<string>('all');
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const [selectedEvent, setSelectedEvent] = useState<EventWithReptile | null>(null);
  const [deleteEventOpen, setDeleteEventOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);

  const loadData = async () => {
    try {
      const [allEvents, allReptiles] = await Promise.all([
        getAllCareEvents(),
        getAllReptiles(),
      ]);

      const reptileMap = new Map(allReptiles.map(r => [r.id, r]));
      
      const eventsWithReptiles = allEvents.map(event => ({
        ...event,
        reptile: reptileMap.get(event.reptileId),
      }));

      setEvents(eventsWithReptiles);
      setReptiles(allReptiles);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    setDeletingEvent(true);
    try {
      await mediumHaptic();
      await deleteCareEvent(selectedEvent.id);
      await loadData();
      setDeleteEventOpen(false);
      setSelectedEvent(null);
      toast.success('Event removed', {
        description: 'This update was saved locally on your device.',
      });
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast.error('Failed to delete event');
    } finally {
      setDeletingEvent(false);
    }
  };

  const filteredEvents = events.filter(event => {
    if (filterReptile !== 'all' && event.reptileId !== filterReptile) {
      return false;
    }
    if (filterType !== 'all' && event.eventType !== filterType) {
      return false;
    }
    return true;
  });

  const sortedFilteredEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const byDate = b.eventDate.localeCompare(a.eventDate);
      if (byDate !== 0) return byDate;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [filteredEvents]);

  const journalDateBuckets = useMemo(() => {
    const keys = [...new Set(sortedFilteredEvents.map((e) => e.eventDate))].sort((a, b) =>
      b.localeCompare(a),
    );
    const multiDay = keys.length > 1;
    if (!multiDay) return { multiDay: false as const, groups: [] as { dateKey: string; items: typeof sortedFilteredEvents }[] };
    return {
      multiDay: true as const,
      groups: keys.map((dateKey) => ({
        dateKey,
        items: sortedFilteredEvents.filter((e) => e.eventDate === dateKey),
      })),
    };
  }, [sortedFilteredEvents]);

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="Journal" />
        <div className="page-content page-content-top loading-min-height">
          <JournalSkeleton count={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader 
        title="Journal" 
        subtitle={`${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''}`}
      />

      <div className="p-4">
        {/* Filters */}
        {events.length > 0 && (
          <div className="flex gap-2 mb-4">
            <Select value={filterReptile} onValueChange={setFilterReptile}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="All reptiles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reptiles</SelectItem>
                {reptiles.map((reptile) => (
                  <SelectItem key={reptile.id} value={reptile.id}>
                    {reptile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={(v) => setFilterType(v as EventType | 'all')}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                {eventTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {events.length === 0 ? (
          <div className="premium-surface-elevated rounded-[var(--radius-xl)] p-6 sm:p-8 text-center border border-border/50">
            <EmptyState
              icon={<BookOpen className="w-16 h-16" />}
              title="No entries yet"
              description="Journal is your care timeline — log feeds, sheds, enclosures, handling, and weigh-ins."
              action={
                <Button className="w-full max-w-[280px] mx-auto min-h-[48px] tap-feedback block" asChild>
                  <Link to="/add-event">Log care event</Link>
                </Button>
              }
              secondaryAction={
                <Button variant="outline" className="min-h-[44px] tap-feedback" asChild>
                  <Link to="/reptiles">Browse animals</Link>
                </Button>
              }
            />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="premium-surface-elevated rounded-[var(--radius-xl)] p-6 sm:p-8 text-center border border-border/50">
            <EmptyState
              icon={<Filter className="w-12 h-12" />}
              title="No matching events"
              description="Try another animal or event type, or clear filters to see everything in your journal."
              action={
                <Button
                  type="button"
                  className="w-full max-w-[280px] mx-auto min-h-[48px] tap-feedback"
                  variant="default"
                  onClick={() => {
                    setFilterReptile('all');
                    setFilterType('all');
                  }}
                >
                  Clear filters
                </Button>
              }
              secondaryAction={
                <Button variant="ghost" className="min-h-[44px] text-muted-foreground tap-feedback" asChild>
                  <Link to="/add-event">Log new event</Link>
                </Button>
              }
            />
          </div>
        ) : journalDateBuckets.multiDay ? (
          <div className="space-y-6">
            {journalDateBuckets.groups.map(({ dateKey, items }) => (
              <section key={dateKey} className="relative">
                <div className="sticky top-0 z-10 mb-3 flex items-center justify-between gap-2 border-b border-border/60 bg-background/90 backdrop-blur-md py-2 -mx-1 px-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {formatLocalDateKey(dateKey, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  {dateKey === getToday() && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">Today</span>
                  )}
                </div>
                <div className="space-y-2 border-l-2 border-border/50 pl-3 ml-1">
                  {items.map((event) => (
                    <EventItem
                      key={event.id}
                      eventType={event.eventType}
                      eventDate={event.eventDate}
                      details={event.details}
                      reptileName={event.reptile?.name}
                      photoDataUrl={event.photoDataUrl}
                      showReptileName
                      hideDate
                      onClick={() => setSelectedEvent(event)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="space-y-2 border-l-2 border-border/50 pl-3 ml-1">
            {sortedFilteredEvents.map((event) => (
              <EventItem
                key={event.id}
                eventType={event.eventType}
                eventDate={event.eventDate}
                details={event.details}
                reptileName={event.reptile?.name}
                photoDataUrl={event.photoDataUrl}
                showReptileName
                onClick={() => setSelectedEvent(event)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent && !deleteEventOpen} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Reptile</span>
                  <p className="font-medium">{selectedEvent.reptile?.name || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type</span>
                  <p className="font-medium">{eventLabels[selectedEvent.eventType]}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">
                    {formatLocalDateKey(selectedEvent.eventDate, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Health metrics */}
              {(selectedEvent.weightGrams || selectedEvent.lengthCm) && (
                <div className="grid grid-cols-2 gap-4 text-sm p-3 bg-secondary/30 rounded-lg">
                  {selectedEvent.weightGrams && (
                    <div>
                      <span className="text-muted-foreground">Weight</span>
                      <p className="font-medium">{selectedEvent.weightGrams}g</p>
                    </div>
                  )}
                  {selectedEvent.lengthCm && (
                    <div>
                      <span className="text-muted-foreground">Length</span>
                      <p className="font-medium">{selectedEvent.lengthCm}cm</p>
                    </div>
                  )}
                </div>
              )}

              {/* Supplements */}
              {selectedEvent.supplements && selectedEvent.supplements.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-sm">Supplements</span>
                  <p className="mt-1 text-sm font-medium">
                    {selectedEvent.supplements.map(s => 
                      s === 'calcium' ? 'Calcium' : s === 'd3' ? 'D3' : 'Multivitamin'
                    ).join(', ')}
                  </p>
                </div>
              )}

              {stripDemoMarkerForDisplay(selectedEvent.details) && (
                <div>
                  <span className="text-muted-foreground text-sm">Details</span>
                  <p className="mt-1 text-sm break-words [overflow-wrap:anywhere] leading-snug whitespace-pre-wrap max-h-[min(40vh,12rem)] overflow-y-auto">
                    {stripDemoMarkerForDisplay(selectedEvent.details)}
                  </p>
                </div>
              )}

              {selectedEvent.photoDataUrl && (
                <div>
                  <span className="text-muted-foreground text-sm">Photo</span>
                  <img 
                    src={selectedEvent.photoDataUrl} 
                    alt="Event photo" 
                    className="mt-2 w-full rounded-lg"
                  />
                </div>
              )}

              <div className="pt-2">
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => {
                    void lightHaptic();
                    setDeleteEventOpen(true);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Event
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Event Confirmation */}
      <AlertDialog open={deleteEventOpen} onOpenChange={setDeleteEventOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this care event. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingEvent}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteEvent}
              disabled={deletingEvent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingEvent ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
