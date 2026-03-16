import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Edit, Calendar, Utensils, RefreshCw, Pencil, Scale, Ruler, Heart, Plus, FileText, Bot, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';
import { PageMotion } from '@/components/motion/PageMotion';
import { EventItem } from '@/components/EventItem';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  getReptileById,
  deleteReptile,
  getScheduleByReptile,
  getCareEventsByReptile,
  updateScheduleFrequency,
  getLastEventByType,
  deleteCareEvent,
  getPairingsByReptile,
} from '@/lib/storage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { downloadVetPdf } from '@/lib/export/vetPdf';
import { ProfileSkeleton } from '@/components/system/SkeletonLoaders';
import type { Reptile, ScheduleItem, CareEvent, TaskType, EventType, Pairing } from '@/types';

const taskLabels: Record<TaskType, string> = {
  feed: 'Feeding',
  clean: 'Cleaning',
  check: 'Health Check',
};

const eventLabels: Record<EventType, string> = {
  feeding: 'Feeding',
  cleaning: 'Cleaning',
  shedding: 'Shedding',
  health: 'Health Check',
  handling: 'Handling',
  note: 'Note',
};

const sexLabels = {
  unknown: 'Unknown',
  male: 'Male',
  female: 'Female',
};

const dietLabels: Record<string, string> = {
  insects: 'Insects',
  rodents: 'Rodents',
  fish: 'Fish',
  herbivore: 'Herbivore',
  omnivore: 'Omnivore',
  pellets: 'Pellets / Prepared',
  mixed: 'Mixed',
};

const breedingStatusLabels = {
  pet: 'Pet',
  breeder: 'Breeder',
  hold: 'Hold',
};

const breedingStatusColors = {
  pet: 'bg-blue-500/10 text-blue-600',
  breeder: 'bg-green-500/10 text-green-600',
  hold: 'bg-amber-500/10 text-amber-600',
};

const pairingStatusColors = {
  planned: 'bg-blue-500/10 text-blue-600',
  active: 'bg-green-500/10 text-green-600',
  completed: 'bg-purple-500/10 text-purple-600',
  cancelled: 'bg-gray-500/10 text-gray-600',
};

interface PairingWithPartner extends Pairing {
  partner?: Reptile;
}

export default function ReptileProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [reptile, setReptile] = useState<Reptile | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [pairings, setPairings] = useState<PairingWithPartner[]>([]);
  const [lastFeeding, setLastFeeding] = useState<CareEvent | null>(null);
  const [lastShedding, setLastShedding] = useState<CareEvent | null>(null);
  const [lastWeight, setLastWeight] = useState<number | undefined>(undefined);
  const [lastLength, setLastLength] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [tempFrequency, setTempFrequency] = useState<number>(0);
  const [selectedEvent, setSelectedEvent] = useState<CareEvent | null>(null);
  const [deleteEventOpen, setDeleteEventOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);

  const loadData = async () => {
    if (!id) return;

    try {
      const [reptileData, scheduleData, eventsData, pairingsData] = await Promise.all([
        getReptileById(id),
        getScheduleByReptile(id),
        getCareEventsByReptile(id),
        getPairingsByReptile(id),
      ]);

      if (!reptileData) {
        navigate('/reptiles');
        return;
      }

      setReptile(reptileData);
      setSchedule(scheduleData);
      setEvents(eventsData);

      // Load partner info for each pairing
      const pairingsWithPartners = await Promise.all(
        pairingsData.map(async (pairing) => {
          const partnerId = pairing.parentAId === id ? pairing.parentBId : pairing.parentAId;
          const partner = await getReptileById(partnerId);
          return { ...pairing, partner };
        })
      );
      setPairings(pairingsWithPartners);

      // Get last feeding and shedding
      const [feeding, shedding] = await Promise.all([
        getLastEventByType(id, 'feeding'),
        getLastEventByType(id, 'shedding'),
      ]);
      setLastFeeding(feeding || null);
      setLastShedding(shedding || null);

      // Phase 1.5 Fix: Sort health events by date desc and find most recent with weight/length
      const healthEvents = eventsData
        .filter(e => e.eventType === 'health')
        .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
      
      const lastWeightEvent = healthEvents.find(e => e.weightGrams !== undefined);
      const lastLengthEvent = healthEvents.find(e => e.lengthCm !== undefined);
      setLastWeight(lastWeightEvent?.weightGrams);
      setLastLength(lastLengthEvent?.lengthCm);
    } catch (error) {
      console.error('Failed to load reptile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;

    setDeleting(true);
    try {
      await deleteReptile(id);
      navigate('/reptiles');
    } catch (error) {
      console.error('Failed to delete reptile:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleEditFrequency = (item: ScheduleItem) => {
    setEditingSchedule(item.id);
    setTempFrequency(item.frequencyDays);
  };

  const handleSaveFrequency = async (itemId: string) => {
    if (tempFrequency < 1) return;

    try {
      await updateScheduleFrequency(itemId, tempFrequency);
      await loadData();
      setEditingSchedule(null);
    } catch (error) {
      console.error('Failed to update frequency:', error);
    }
  };

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

  if (loading || !reptile) {
    return (
      <PageMotion className="page-container">
        <PageHeader title="Loading…" />
        <div className="page-content page-content-top loading-min-height">
          <ProfileSkeleton />
        </div>
      </PageMotion>
    );
  }

  return (
    <PageMotion className="page-container">
      <PageHeader 
        title={reptile.name}
        subtitle={
          reptile.commonName
            ? `${reptile.commonName}${reptile.morph ? ` • ${reptile.morph}` : ''}`
            : `${reptile.species}${reptile.morph ? ` • ${reptile.morph}` : ''}`
        }
        rightContent={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Link to={`/reptiles/${id}/edit`}>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Pencil className="w-4 h-4" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setDeleteOpen(true)}
              className="text-destructive shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      {/* Hero area — breeding badge */}
      {reptile.breedingStatus && (
        <div className="page-content pt-1 pb-0 animate-in-slide-up">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${breedingStatusColors[reptile.breedingStatus] || breedingStatusColors.pet}`}>
            {breedingStatusLabels[reptile.breedingStatus] || 'Pet'}
          </span>
        </div>
      )}

      <Tabs defaultValue="overview" className="page-content pt-5 animate-in-slide-up">
        <TabsList className="grid w-full grid-cols-4 h-11 min-h-[44px] gap-1 p-1 rounded-[var(--radius-lg)] glass-panel">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs sm:text-sm">Schedule</TabsTrigger>
          <TabsTrigger value="journal" className="text-xs sm:text-sm">Journal</TabsTrigger>
          <TabsTrigger value="breeding" className="text-xs sm:text-sm">Breeding</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-7">
          {/* Basic Info — premium panel (staggered sequence) */}
          <div className="bg-card rounded-[var(--radius-xl)] p-4 sm:p-5 border border-border/70 shadow-[var(--shadow-card)] animate-in-slide-up">
            <h3 className="section-header">Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {reptile.species && (
                <div>
                  <span className="text-muted-foreground">Species</span>
                  <p className="font-medium">{reptile.species}</p>
                </div>
              )}
              {reptile.scientificName && (
                <div>
                  <span className="text-muted-foreground">Scientific Name</span>
                  <p className="font-medium italic">{reptile.scientificName}</p>
                </div>
              )}
              {reptile.speciesGroup && (
                <div>
                  <span className="text-muted-foreground">Group</span>
                  <p className="font-medium">{reptile.speciesGroup}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Sex</span>
                <p className="font-medium">{sexLabels[reptile.sex]}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Diet</span>
                <p className="font-medium">{dietLabels[reptile.dietType] ?? reptile.dietType}</p>
              </div>
              {reptile.birthDate && (
                <div>
                  <span className="text-muted-foreground">Birth Date</span>
                  <p className="font-medium">{format(new Date(reptile.birthDate), 'MMM d, yyyy')}</p>
                </div>
              )}
              {reptile.estimatedAgeMonths && (
                <div>
                  <span className="text-muted-foreground">Est. Age</span>
                  <p className="font-medium">{reptile.estimatedAgeMonths} months</p>
                </div>
              )}
              {reptile.acquisitionDate && (
                <div>
                  <span className="text-muted-foreground">Acquired</span>
                  <p className="font-medium">{format(new Date(reptile.acquisitionDate), 'MMM d, yyyy')}</p>
                </div>
              )}
            </div>
            {reptile.notes && (
              <div className="mt-4 pt-4 border-t border-border">
                <span className="text-muted-foreground text-sm">Notes</span>
                <p className="text-sm mt-1">{reptile.notes}</p>
              </div>
            )}
            {/* Genetics Info */}
            {(reptile.hets?.length || reptile.geneticsNotes) && (
              <div className="mt-4 pt-4 border-t border-border">
                <span className="text-muted-foreground text-sm">Genetics</span>
                {reptile.hets && reptile.hets.length > 0 && (
                  <p className="text-sm mt-1">Het: {reptile.hets.join(', ')}</p>
                )}
                {reptile.geneticsNotes && (
                  <p className="text-sm mt-1 text-muted-foreground">{reptile.geneticsNotes}</p>
                )}
              </div>
            )}
          </div>

          {/* Quick Stats — premium panel (staggered sequence) */}
          <div className="premium-surface rounded-[var(--radius-xl)] p-4 sm:p-5 animate-in-slide-up motion-delay-1">
            <h3 className="section-header">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/10">
                  <Utensils className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <span className="text-muted-foreground text-sm">Last Feeding</span>
                  <p className="font-medium text-sm">
                    {lastFeeding 
                      ? format(new Date(lastFeeding.eventDate), 'MMM d, yyyy')
                      : 'No record'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/10">
                  <RefreshCw className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <span className="text-muted-foreground text-sm">Last Shedding</span>
                  <p className="font-medium text-sm">
                    {lastShedding 
                      ? format(new Date(lastShedding.eventDate), 'MMM d, yyyy')
                      : 'No record'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-500/10">
                  <Scale className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <span className="text-muted-foreground text-sm">Last Weight</span>
                  <p className="font-medium text-sm">
                    {lastWeight ? `${lastWeight}g` : 'No record'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/10">
                  <Ruler className="w-4 h-4 text-cyan-500" />
                </div>
                <div>
                  <span className="text-muted-foreground text-sm">Last Length</span>
                  <p className="font-medium text-sm">
                    {lastLength ? `${lastLength}cm` : 'No record'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons — primary Share Care Card, secondary Vet PDF / AI (staggered) */}
          <div className="space-y-2 animate-in-slide-up motion-delay-2">
            <Link to={`/care-card/${id}`} className="block">
              <Button className="w-full min-h-[48px]" size="lg">
                <Share2 className="w-4 h-4 mr-2" />
                Share Care Card
              </Button>
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="min-h-[44px]"
                onClick={async () => {
                  try {
                    await downloadVetPdf(reptile.id, reptile.name);
                    toast.success('Vet PDF exported');
                  } catch (e) {
                    console.error(e);
                    toast.error('Failed to export PDF');
                  }
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Vet PDF
              </Button>
              <Link to={`/ai?reptileId=${id}`}>
                <Button variant="outline" className="w-full min-h-[44px]">
                  <Bot className="w-4 h-4 mr-2" />
                  AI Assistant
                </Button>
              </Link>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="mt-5">
          <div className="space-y-3 stagger-children">
            {schedule.map((item) => (
              <div key={item.id} className="bg-card rounded-[var(--radius-xl)] p-4 sm:p-5 border border-border/70 shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{taskLabels[item.taskType]}</h4>
                    <p className="text-sm text-muted-foreground">
                      Every {item.frequencyDays} days
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Next: {format(new Date(item.nextDueDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  
                  {editingSchedule === item.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={tempFrequency}
                        onChange={(e) => setTempFrequency(parseInt(e.target.value) || 1)}
                        className="w-20 h-8"
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleSaveFrequency(item.id)}
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditFrequency(item)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="journal" className="mt-5">
          {events.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-12 h-12" />}
              title="No events yet"
              description="Use Add Event to log feedings, sheds, and health checks for this animal."
            />
          ) : (
            <div className="space-y-2.5 stagger-children">
              {events.map((event) => (
                <EventItem
                  key={event.id}
                  eventType={event.eventType}
                  eventDate={event.eventDate}
                  details={event.details}
                  photoDataUrl={event.photoDataUrl}
                  onClick={() => setSelectedEvent(event)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="breeding" className="mt-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="section-header">Pairings</h3>
              <Link to={`/breeding/pairings/new?reptileId=${id}`}>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  New Pairing
                </Button>
              </Link>
            </div>

            {pairings.length === 0 ? (
              <EmptyState
                icon={<Heart className="w-12 h-12" />}
                title="No pairings yet"
                description="Add a pairing from Breeding to track clutches and offspring."
              />
            ) : (
              <div className="space-y-2">
                {pairings.map((pairing) => (
                  <Link
                    key={pairing.id}
                    to={`/breeding/pairings/${pairing.id}`}
                    className="block premium-surface rounded-[var(--radius-xl)] p-4 sm:p-5 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {reptile.name} × {pairing.partner?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Started {format(new Date(pairing.startDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pairingStatusColors[pairing.status]}`}>
                        {pairing.status.charAt(0).toUpperCase() + pairing.status.slice(1)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Reptile Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {reptile.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {reptile.name} and all their care events and schedule. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  <span className="text-muted-foreground">Type</span>
                  <p className="font-medium">{eventLabels[selectedEvent.eventType]}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">
                    {format(new Date(selectedEvent.eventDate), 'MMM d, yyyy')}
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
    </PageMotion>
  );
}
