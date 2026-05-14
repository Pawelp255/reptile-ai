import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Edit, Calendar, Utensils, RefreshCw, Pencil, Scale, Ruler, Heart, Plus, FileText, FileBadge, Bot, Share2, Activity, CheckCircle2, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { isValid } from 'date-fns';
import { formatLocalDateKey, parseLocalDateKey } from '@/lib/date/localDateKey';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { PageMotion } from '@/components/motion/PageMotion';
import { ProBadge } from '@/components/plan/ProBadge';
import { usePlanStatus } from '@/hooks/usePlanStatus';
import { EventItem } from '@/components/EventItem';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { stripDemoMarkerForDisplay } from '@/lib/display/stripDemoMarker';
import {
  getReptileById,
  deleteReptile,
  getScheduleByReptile,
  getCareEventsByReptile,
  computeNextDueDate,
  getScheduleMode,
  isFlexibleScheduleItem,
  updateScheduleRule,
  deleteCareEvent,
  getPairingsByReptile,
  getToday,
  normalizeWeekdays,
} from '@/lib/storage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { pushCareTasksToCloudByIds } from '@/lib/reptiles/cloudSync';
import { ProfileSkeleton } from '@/components/system/SkeletonLoaders';
import { PetProfileShareDialog } from '@/components/PetProfileShareDialog';
import type { Reptile, ScheduleItem, CareEvent, TaskType, EventType, Pairing, ScheduleMode } from '@/types';
import { getDisplayEmoji } from '@/lib/animals/taxonomy';
import {
  getAverageFeedingInterval,
  getAverageShedCycle,
  getFeedingConsistency,
  getLastFeedingDate,
  getLastShedDate,
  getLatestWeight,
  getRecentWeights,
  getUpcomingCareSummary,
  getWeightChangePercent,
  getWeightTrend,
  hasRecentCleaning,
  hasRecentHealthChecks,
  type FeedingConsistency,
  type WeightTrend,
} from '@/lib/careInsights';

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

function formatScheduleFrequency(days: number): string {
  if (days === 1) return 'Daily';
  if (days === 7) return 'Weekly';
  if (days === 14) return 'Every 2 weeks';
  return `Every ${days} days`;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatWeekdayList(weekdays: number[] | undefined): string {
  const values = normalizeWeekdays(weekdays);
  if (values.length === 0) return 'No days selected';
  return values.map((d) => WEEKDAY_LABELS[d]).join(', ');
}

function modeDescription(mode: ScheduleMode): string {
  if (mode === 'weekdays') return 'Due on selected days';
  if (mode === 'flexible') return 'Soft reminder - not counted as overdue';
  return 'Strict recurring care';
}

function parseFrequencyInput(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(1, parsed);
}

function daysBetween(fromDateKey: string, toDateKey: string): number {
  const from = parseLocalDateKey(fromDateKey);
  const to = parseLocalDateKey(toDateKey);
  if (!isValid(from) || !isValid(to)) return 0;
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));
}

function formatDaysAgo(dateKey: string | undefined, todayDateKey: string): string {
  if (!dateKey) return 'No record';
  const days = daysBetween(dateKey, todayDateKey);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function formatRoundedPercent(value: number | undefined): string | undefined {
  if (value == null) return undefined;
  const rounded = Math.round(value);
  if (rounded === 0) return 'Stable';
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function weightTrendLabel(trend: WeightTrend, recentCount: number): string {
  if (trend === 'insufficient_data') return 'Add another weight entry to show a trend';
  if (trend === 'stable') return `Stable over last ${recentCount} entries`;
  if (trend === 'increasing') return `Increasing over last ${recentCount} entries`;
  return `Decreasing over last ${recentCount} entries`;
}

function feedingConsistencyLabel(consistency: FeedingConsistency): string {
  if (consistency === 'consistent') return 'Consistent';
  if (consistency === 'irregular') return 'Irregular';
  return 'More entries needed';
}

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
  const { isPro } = usePlanStatus();
  
  const [reptile, setReptile] = useState<Reptile | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [pairings, setPairings] = useState<PairingWithPartner[]>([]);
  const [lastLength, setLastLength] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [tempFrequency, setTempFrequency] = useState<string>('');
  const [tempScheduleMode, setTempScheduleMode] = useState<ScheduleMode>('interval');
  const [tempWeekdays, setTempWeekdays] = useState<number[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CareEvent | null>(null);
  const [deleteEventOpen, setDeleteEventOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [shareProfileOpen, setShareProfileOpen] = useState(false);

  const loadData = useCallback(async () => {
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

      // Phase 1.5 Fix: Sort health events by date desc and find most recent with weight/length
      const healthEvents = eventsData
        .filter(e => e.eventType === 'health')
        .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
      
      const lastLengthEvent = healthEvents.find(e => e.lengthCm !== undefined);
      setLastLength(lastLengthEvent?.lengthCm);
    } catch (error) {
      console.error('Failed to load reptile:', error);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const todayDateKey = useMemo(() => getToday(), []);
  const recentWeights = useMemo(() => getRecentWeights(events, 3), [events]);
  const latestWeight = useMemo(() => getLatestWeight(events), [events]);
  const weightTrend = useMemo(() => getWeightTrend(events), [events]);
  const weightChangePercent = useMemo(
    () => getWeightChangePercent(events, 30, todayDateKey),
    [events, todayDateKey],
  );
  const lastFeedingDate = useMemo(() => getLastFeedingDate(events), [events]);
  const averageFeedingInterval = useMemo(() => getAverageFeedingInterval(events), [events]);
  const feedingConsistency = useMemo(() => getFeedingConsistency(events), [events]);
  const lastShedDate = useMemo(() => getLastShedDate(events), [events]);
  const averageShedCycle = useMemo(() => getAverageShedCycle(events), [events]);
  const recentCleaning = useMemo(() => hasRecentCleaning(events, 14, todayDateKey), [events, todayDateKey]);
  const recentHealthCheck = useMemo(() => hasRecentHealthChecks(events, 30, todayDateKey), [events, todayDateKey]);
  const upcomingCareSummary = useMemo(
    () => getUpcomingCareSummary(schedule, todayDateKey, 7),
    [schedule, todayDateKey],
  );

  const careInsightLines = useMemo(() => {
    const lines: { icon: typeof Utensils; label: string; detail?: string; tone: string }[] = [];
    const weightChange = formatRoundedPercent(weightChangePercent);
    const cleanTasks = schedule.filter((item) => item.taskType === 'clean' && !isFlexibleScheduleItem(item));
    const cleanTasksCurrent = cleanTasks.length > 0 && cleanTasks.every((item) => item.nextDueDate >= todayDateKey);

    lines.push({
      icon: Utensils,
      label: `Last feeding: ${formatDaysAgo(lastFeedingDate, todayDateKey)}`,
      detail: averageFeedingInterval
        ? `Avg ${averageFeedingInterval} days · ${feedingConsistencyLabel(feedingConsistency).toLowerCase()}`
        : feedingConsistencyLabel(feedingConsistency),
      tone: 'bg-amber-500/10 text-amber-600',
    });

    lines.push({
      icon: weightTrend === 'increasing' ? TrendingUp : weightTrend === 'decreasing' ? TrendingDown : Minus,
      label: weightTrendLabel(weightTrend, recentWeights.length),
      detail: weightChange ? `${weightChange} in last 30 days` : latestWeight ? `${latestWeight.grams}g latest` : undefined,
      tone: 'bg-rose-500/10 text-rose-600',
    });

    lines.push({
      icon: RefreshCw,
      label: `Last shed: ${formatDaysAgo(lastShedDate, todayDateKey)}`,
      detail: averageShedCycle ? `Avg cycle ${averageShedCycle} days` : 'More entries needed for cycle average',
      tone: 'bg-purple-500/10 text-purple-600',
    });

    if (recentCleaning || cleanTasksCurrent) {
      lines.push({
        icon: CheckCircle2,
        label: recentCleaning ? 'Cleaning logged recently' : 'Cleaning tasks are up to date',
        detail:
          upcomingCareSummary.nextTask?.taskType === 'clean' && upcomingCareSummary.nextTaskDaysAway != null
            ? upcomingCareSummary.nextTaskDaysAway === 0
              ? 'Next cleaning today'
              : `Next cleaning in ${upcomingCareSummary.nextTaskDaysAway} days`
            : undefined,
        tone: 'bg-emerald-500/10 text-emerald-600',
      });
    } else if (upcomingCareSummary.nextTask) {
      lines.push({
        icon: Calendar,
        label:
          upcomingCareSummary.dueTodayCount > 0
            ? `${upcomingCareSummary.dueTodayCount} care task${upcomingCareSummary.dueTodayCount === 1 ? '' : 's'} due today`
            : `${upcomingCareSummary.upcomingCount} care task${upcomingCareSummary.upcomingCount === 1 ? '' : 's'} upcoming`,
        detail: upcomingCareSummary.overdueCount > 0 ? `${upcomingCareSummary.overdueCount} task${upcomingCareSummary.overdueCount === 1 ? '' : 's'} waiting` : undefined,
        tone: 'bg-primary/10 text-primary',
      });
    }

    if (recentHealthCheck) {
      lines.push({
        icon: Activity,
        label: 'Health check logged recently',
        detail: 'Within the last 30 days',
        tone: 'bg-cyan-500/10 text-cyan-600',
      });
    }

    return lines.slice(0, 5);
  }, [
    averageFeedingInterval,
    averageShedCycle,
    feedingConsistency,
    lastFeedingDate,
    lastShedDate,
    latestWeight,
    recentCleaning,
    recentHealthCheck,
    recentWeights.length,
    schedule,
    todayDateKey,
    upcomingCareSummary,
    weightChangePercent,
    weightTrend,
  ]);

  const nextCareHighlight = useMemo(() => {
    if (!schedule.length) return null;
    const sorted = [...schedule].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
    const task = sorted[0];
    if (!task) return null;
    const today = getToday();
    const overdue = !isFlexibleScheduleItem(task) && task.nextDueDate < today;
    const dueToday = task.nextDueDate === today;
    let status: string;
    if (overdue) status = 'Overdue';
    else if (dueToday) status = 'Due today';
    else status = 'Upcoming';
    return {
      ...task,
      statusLabel: status,
      overdue,
    };
  }, [schedule]);

  const handleDelete = async () => {
    if (!id) return;

    setDeleting(true);
    try {
      await deleteReptile(id);
      navigate('/reptiles');
    } catch (error) {
      console.error('Failed to delete reptile:', error);
      toast.error('Could not delete animal — try again');
    } finally {
      setDeleting(false);
    }
  };

  const handleEditFrequency = (item: ScheduleItem) => {
    setEditingSchedule(item.id);
    setTempScheduleMode(getScheduleMode(item));
    setTempWeekdays(normalizeWeekdays(item.weekdays));
    setTempFrequency(String(item.frequencyDays));
  };

  const handleSaveFrequency = async (itemId: string) => {
    const nextFrequency = parseFrequencyInput(tempFrequency);
    if ((tempScheduleMode === 'interval' || tempScheduleMode === 'flexible') && !nextFrequency) {
      toast.error('Enter a frequency of at least 1 day');
      return;
    }
    if (tempScheduleMode === 'weekdays' && tempWeekdays.length === 0) {
      toast.error('Select at least one weekday');
      return;
    }

    try {
      await updateScheduleRule(itemId, {
        scheduleMode: tempScheduleMode,
        frequencyDays: nextFrequency ?? 1,
        weekdays: tempScheduleMode === 'weekdays' ? tempWeekdays : undefined,
      });
      void pushCareTasksToCloudByIds([itemId], { notifyOnError: true });
      await loadData();
      setEditingSchedule(null);
    } catch (error) {
      console.error('Failed to update frequency:', error);
      toast.error('Could not save schedule frequency');
    }
  };

  const handleFrequencyBlur = () => {
    if (tempScheduleMode === 'weekdays') return;
    const nextFrequency = parseFrequencyInput(tempFrequency);
    setTempFrequency(String(nextFrequency ?? 1));
  };

  const toggleWeekday = (day: number) => {
    setTempWeekdays((prev) => {
      if (prev.includes(day)) return prev.filter((d) => d !== day);
      return [...prev, day].sort((a, b) => a - b);
    });
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

      <PetProfileShareDialog
        open={shareProfileOpen}
        onOpenChange={setShareProfileOpen}
        reptile={reptile}
      />

      <div className="page-content pt-4 pb-0 animate-in-slide-up space-y-3">
        <div className="mx-auto w-full max-w-[288px] sm:max-w-[300px]">
          <div className="rounded-[calc(var(--radius-xl)+4px)] p-[4px] bg-gradient-to-br from-primary/35 via-transparent to-accent/28 shadow-[var(--surface-shadow-deep)] ring-2 ring-background">
            <div className="aspect-square rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--shadow-elevated)] bg-secondary/50">
              {reptile.photoUrl ? (
                <img src={reptile.photoUrl} alt={reptile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="relative w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-secondary/95 via-muted/85 to-secondary/65">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.15]"
                    aria-hidden
                    style={{
                      backgroundImage: `radial-gradient(circle at 30% 20%, hsl(var(--primary) / 0.55), transparent 55%)`,
                    }}
                  />
                  <span className="relative text-[4.75rem] leading-none drop-shadow-sm select-none" aria-hidden>
                    {getDisplayEmoji(reptile.animalCategory, reptile.species)}
                  </span>
                  <span className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">
                    No photo
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 px-1">
          <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-semibold tracking-wide text-foreground/90 shadow-[var(--shadow-card)]">
            {sexLabels[reptile.sex]}
          </span>
          <span className="inline-flex items-center rounded-full border border-border/60 bg-secondary/60 px-3 py-1 text-[11px] font-medium text-secondary-foreground">
            {dietLabels[reptile.dietType] ?? reptile.dietType}
          </span>
          {reptile.breedingStatus && (
            <span
              className={`inline-flex items-center rounded-full border border-transparent px-3 py-1 text-[11px] font-semibold ${breedingStatusColors[reptile.breedingStatus] || breedingStatusColors.pet}`}
            >
              {breedingStatusLabels[reptile.breedingStatus] || 'Pet'}
            </span>
          )}
        </div>

        {nextCareHighlight && (
          <div
            className={`rounded-[var(--radius-xl)] border p-3.5 sm:p-4 flex gap-3 items-start shadow-[var(--shadow-card)] ${
              nextCareHighlight.overdue
                ? 'border-destructive/35 bg-destructive/[0.06]'
                : 'border-primary/20 bg-primary/[0.05]'
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] ${
                nextCareHighlight.overdue ? 'bg-destructive/12 text-destructive' : 'bg-primary/12 text-primary'
              }`}
            >
              <Calendar className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {nextCareHighlight.statusLabel}
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {taskLabels[nextCareHighlight.taskType]}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {nextCareHighlight.overdue ? 'Was due ' : 'Due '}
                {formatLocalDateKey(nextCareHighlight.nextDueDate, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        )}
      </div>

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
              {reptile.birthDate && isValid(parseLocalDateKey(reptile.birthDate)) && (
                <div>
                  <span className="text-muted-foreground">Birth Date</span>
                  <p className="font-medium">
                    {formatLocalDateKey(reptile.birthDate, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
              {reptile.estimatedAgeMonths && (
                <div>
                  <span className="text-muted-foreground">Est. Age</span>
                  <p className="font-medium">{reptile.estimatedAgeMonths} months</p>
                </div>
              )}
              {reptile.acquisitionDate && isValid(parseLocalDateKey(reptile.acquisitionDate)) && (
                <div>
                  <span className="text-muted-foreground">Acquired</span>
                  <p className="font-medium">
                    {formatLocalDateKey(reptile.acquisitionDate, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
            {stripDemoMarkerForDisplay(reptile.notes) && (
              <div className="mt-4 pt-4 border-t border-border">
                <span className="text-muted-foreground text-sm">Notes</span>
                <p className="text-sm mt-1">{stripDemoMarkerForDisplay(reptile.notes)}</p>
              </div>
            )}
            {/* Genetics Info */}
            {(reptile.hets?.length || stripDemoMarkerForDisplay(reptile.geneticsNotes)) && (
              <div className="mt-4 pt-4 border-t border-border">
                <span className="text-muted-foreground text-sm">Genetics</span>
                {reptile.hets && reptile.hets.length > 0 && (
                  <p className="text-sm mt-1">Het: {reptile.hets.join(', ')}</p>
                )}
                {stripDemoMarkerForDisplay(reptile.geneticsNotes) && (
                  <p className="text-sm mt-1 text-muted-foreground">{stripDemoMarkerForDisplay(reptile.geneticsNotes)}</p>
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
                    {lastFeedingDate
                      ? formatLocalDateKey(lastFeedingDate, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'No record'}
                  </p>
                  {averageFeedingInterval && (
                    <p className="text-xs text-muted-foreground">Average every {averageFeedingInterval} days</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/10">
                  <RefreshCw className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <span className="text-muted-foreground text-sm">Last Shed</span>
                  <p className="font-medium text-sm">
                    {lastShedDate
                      ? formatLocalDateKey(lastShedDate, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'No record'}
                  </p>
                  {averageShedCycle && (
                    <p className="text-xs text-muted-foreground">Average cycle {averageShedCycle} days</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-500/10">
                  <Scale className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <span className="text-muted-foreground text-sm">Last Weight</span>
                  <p className="font-medium text-sm">
                    {latestWeight ? `${latestWeight.grams}g` : 'No record'}
                  </p>
                  {latestWeight && (
                    <p className="text-xs text-muted-foreground">{weightTrendLabel(weightTrend, recentWeights.length)}</p>
                  )}
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

          {/* Care insights — deterministic summaries from local history */}
          <div className="premium-surface rounded-[var(--radius-xl)] p-4 sm:p-5 animate-in-slide-up motion-delay-2">
            <h3 className="section-header">Care insights</h3>
            <div className="space-y-3">
              {careInsightLines.map((insight) => {
                const Icon = insight.icon;
                return (
                  <div key={`${insight.label}-${insight.detail ?? ''}`} className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${insight.tone}`}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug text-foreground">{insight.label}</p>
                      {insight.detail && (
                        <p className="text-xs text-muted-foreground mt-0.5">{insight.detail}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons — share panel, care summary PDF / AI (staggered) */}
          <div className="space-y-2 animate-in-slide-up motion-delay-3">
            <Link to={`/passport/${id}`}>
              <Button
                type="button"
                variant="secondary"
                className="w-full min-h-[48px]"
                size="lg"
              >
                <FileBadge className="w-4 h-4 mr-2" />
                Open Passport
              </Button>
            </Link>
            <Button
              type="button"
              className="w-full min-h-[48px]"
              size="lg"
              onClick={() => setShareProfileOpen(true)}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share profile
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="min-h-[44px]"
                onClick={async () => {
                  try {
                    const { downloadVetPdf } = await import('@/lib/export/vetPdf');
                    await downloadVetPdf(reptile.id, reptile.name);
                    toast.success('Care summary ready — check the share sheet or downloads');
                  } catch (e) {
                    console.error(e);
                    const msg = e instanceof Error ? e.message : 'Could not export the PDF.';
                    toast.error(msg);
                  }
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Care summary (PDF)
              </Button>
              <Link to={`/ai?reptileId=${id}`}>
                <Button variant="outline" className="w-full min-h-[44px] justify-center gap-2">
                  <Bot className="w-4 h-4 shrink-0" />
                  <span className="flex items-center gap-2 flex-wrap justify-center">
                    Assistant
                    {!isPro && <ProBadge />}
                  </span>
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
                      {getScheduleMode(item) === 'weekdays'
                        ? formatWeekdayList(item.weekdays)
                        : formatScheduleFrequency(item.frequencyDays)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{modeDescription(getScheduleMode(item))}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Next:{' '}
                      {formatLocalDateKey(item.nextDueDate, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    {item.lastDoneDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last completed:{' '}
                        {formatLocalDateKey(item.lastDoneDate, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                  
                  {editingSchedule === item.id ? (
                    <div className="w-[248px] space-y-2">
                      <Select
                        value={tempScheduleMode}
                        onValueChange={(value) => setTempScheduleMode(value as ScheduleMode)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="interval">Every X days</SelectItem>
                          <SelectItem value="weekdays">Specific weekdays</SelectItem>
                          <SelectItem value="flexible">Flexible reminder</SelectItem>
                        </SelectContent>
                      </Select>

                      {tempScheduleMode === 'weekdays' ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {WEEKDAY_LABELS.map((dayLabel, dayIndex) => {
                              const active = tempWeekdays.includes(dayIndex);
                              return (
                                <button
                                  key={dayLabel}
                                  type="button"
                                  onClick={() => toggleWeekday(dayIndex)}
                                  className={cn(
                                    'h-7 rounded-md border px-2 text-[11px] font-medium transition-colors',
                                    active
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-border text-muted-foreground hover:text-foreground',
                                  )}
                                >
                                  {dayLabel}
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Next due:{' '}
                            {formatLocalDateKey(
                              computeNextDueDate(
                                { ...item, scheduleMode: tempScheduleMode, weekdays: tempWeekdays },
                                getToday(),
                              ),
                              { month: 'short', day: 'numeric', year: 'numeric' },
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              value={tempFrequency}
                              onChange={(e) => setTempFrequency(e.target.value)}
                              onBlur={handleFrequencyBlur}
                              className="w-20 h-8"
                            />
                            <span className="text-[11px] text-muted-foreground">days</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Next due:{' '}
                            {formatLocalDateKey(
                              computeNextDueDate(
                                {
                                  ...item,
                                  scheduleMode: tempScheduleMode,
                                  frequencyDays: parseFrequencyInput(tempFrequency) ?? 1,
                                },
                                getToday(),
                              ),
                              { month: 'short', day: 'numeric', year: 'numeric' },
                            )}
                          </p>
                        </div>
                      )}

                      <Button
                        size="sm"
                        onClick={() => handleSaveFrequency(item.id)}
                        disabled={
                          tempScheduleMode === 'weekdays'
                            ? tempWeekdays.length === 0
                            : !parseFrequencyInput(tempFrequency)
                        }
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
                          Started{' '}
                          {formatLocalDateKey(pairing.startDate, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
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
                    {formatLocalDateKey(selectedEvent.eventDate, {
                      month: 'short',
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

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigate(
                      `/add-event?eventId=${selectedEvent.id}&returnTo=${encodeURIComponent(`/reptiles/${id}`)}`,
                    );
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Event
                </Button>
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
