import { useState, useEffect } from 'react';
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
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getAllCareEvents, getAllReptiles, deleteCareEvent } from '@/lib/storage';
import type { CareEvent, Reptile, EventType } from '@/types';

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
      await deleteCareEvent(selectedEvent.id);
      await loadData();
      setDeleteEventOpen(false);
      setSelectedEvent(null);
      toast.success('Event deleted');
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
          <EmptyState
            icon={<BookOpen className="w-16 h-16" />}
            title="No events yet"
            description="Log feedings, sheds, and health checks from Add Event to build your history."
          />
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            icon={<Filter className="w-12 h-12" />}
            title="No matching events"
            description="Change the reptile or event type filter to see more."
          />
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((event) => (
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
                    {format(new Date(selectedEvent.eventDate), 'MMMM d, yyyy')}
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

              {selectedEvent.details && (
                <div>
                  <span className="text-muted-foreground text-sm">Details</span>
                  <p className="mt-1 text-sm">{selectedEvent.details}</p>
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
                  onClick={() => setDeleteEventOpen(true)}
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
