import { useState, useEffect, Fragment, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  Bug,
  Check,
  FastForward,
  ListChecks,
  MoreVertical,
  NotebookPen,
  Send,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { getDisplayEmoji } from '@/lib/animals/taxonomy';
import { PageHeader } from '@/components/PageHeader';
import { PageMotion } from '@/components/motion/PageMotion';
import { StaggerList, StaggerItem } from '@/components/motion/StaggerList';
import { TaskCard } from '@/components/TaskCard';
import { EmptyState } from '@/components/EmptyState';
import { MarkDoneModal } from '@/components/MarkDoneModal';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TodayTasksSkeleton } from '@/components/system/SkeletonLoaders';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { lightHaptic, mediumHaptic } from '@/lib/native/haptics';
import { pushWatchTodaySnapshot, sendFakeWatchSnapshot } from '@/lib/native/watchTodaySync';
import {
  getAllScheduleItems,
  getAllReptiles,
  getToday,
  markTaskDone,
  isOverdue,
  isDueToday,
  isWithinDays,
  seedExpoDemo,
  updateSettings,
  isSampleDatasetEnabled,
  advanceOverdueRecurringTasksStartFresh,
  advanceOverdueRecurringTasksSkipOverdue,
  isFlexibleScheduleItem,
  isStrictRecurringCareTask,
  markOverdueRecurringTasksDoneBulk,
} from '@/lib/storage';
import { pushCareTasksToCloudByIds, REPTILES_CLOUD_SYNC_EVENT } from '@/lib/reptiles/cloudSync';
import type { ScheduleItem, Reptile } from '@/types';

interface TaskWithReptile extends ScheduleItem {
  reptile: Reptile;
}

/** Warm, specific copy for the Focus Animal card (display only). */
function focusAnimalCarePhrase(animalName: string, task: TaskWithReptile | undefined): string {
  if (!task) return 'Add a schedule to start tailored reminders.';
  const n = animalName;
  switch (task.taskType) {
    case 'feed':
      return `${n} needs feeding today.`;
    case 'clean':
      return `${n} could use a fresh enclosure cleanup.`;
    case 'check':
      return `${n} is due for a routine check today.`;
    default:
      return `${n} has care waiting.`;
  }
}

type FilterMode = 'today' | 'week';

type OverdueBulkIntent = 'startFresh' | 'skipOverdue' | 'markDone';

export default function TodayPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [tasks, setTasks] = useState<TaskWithReptile[]>([]);
  const [reptiles, setReptiles] = useState<Map<string, Reptile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>('today');
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    task: TaskWithReptile | null;
  }>({ isOpen: false, task: null });
  const [saving, setSaving] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const markDoneInFlightRef = useRef(false);
  const bulkOverdueInFlightRef = useRef(false);
  const [overdueDrawerOpen, setOverdueDrawerOpen] = useState(false);
  const [overdueBulkIntent, setOverdueBulkIntent] = useState<OverdueBulkIntent | null>(null);
  const [overdueBulkSaving, setOverdueBulkSaving] = useState(false);
  const [watchSnapshotPushing, setWatchSnapshotPushing] = useState(false);
  const [fakeWatchSnapshotPushing, setFakeWatchSnapshotPushing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [scheduleItems, allReptiles] = await Promise.all([
        getAllScheduleItems(),
        getAllReptiles(),
      ]);

      const reptileMap = new Map(allReptiles.map(r => [r.id, r]));
      setReptiles(reptileMap);

      const tasksWithReptiles = scheduleItems
        .map(item => ({
          ...item,
          reptile: reptileMap.get(item.reptileId)!,
        }))
        .filter(t => t.reptile);

      setTasks(tasksWithReptiles);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const onCloudSyncFinished = (event: Event) => {
      const detail = (event as CustomEvent<{ ok?: boolean }>).detail;
      if (detail?.ok) void loadData();
    };
    window.addEventListener(REPTILES_CLOUD_SYNC_EVENT, onCloudSyncFinished);
    return () => window.removeEventListener(REPTILES_CLOUD_SYNC_EVENT, onCloudSyncFinished);
  }, [loadData]);

  const strictFilteredTasks = tasks.filter(task => {
    const strict = isStrictRecurringCareTask(task);
    const overdue = strict && isOverdue(task.nextDueDate);
    const dueToday = isDueToday(task.nextDueDate);

    if (filterMode === 'today') {
      return strict && (overdue || dueToday);
    } else {
      return strict && (overdue || isWithinDays(task.nextDueDate, 7));
    }
  }).sort((a, b) => {
    // Sort overdue first, then by date
    const aOverdue = isStrictRecurringCareTask(a) && isOverdue(a.nextDueDate);
    const bOverdue = isStrictRecurringCareTask(b) && isOverdue(b.nextDueDate);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return a.nextDueDate.localeCompare(b.nextDueDate);
  });

  // Group tasks by reptile
  const groupedTasks = strictFilteredTasks.reduce((acc, task) => {
    const key = task.reptileId;
    if (!acc[key]) {
      acc[key] = { reptile: task.reptile, tasks: [] };
    }
    acc[key].tasks.push(task);
    return acc;
  }, {} as Record<string, { reptile: Reptile; tasks: TaskWithReptile[] }>);

  /** Overdue / due-today backlog for hero stats and badges (not tied to week filter). */
  const backlogTodayTasks = tasks.filter(
    t =>
      t.reptile &&
      isStrictRecurringCareTask(t) &&
      (isOverdue(t.nextDueDate) || isDueToday(t.nextDueDate)),
  );
  const overdueTasks = backlogTodayTasks.filter(t => isOverdue(t.nextDueDate));
  const overdueRecurringTasks = useMemo(
    () => overdueTasks.filter(t => isStrictRecurringCareTask(t)),
    [overdueTasks],
  );
  const dueTodayTasks = backlogTodayTasks.filter(t => isDueToday(t.nextDueDate));
  const todayStr = getToday();
  const suggestedFlexibleTasks = tasks
    .filter(
      (task) =>
        task.reptile &&
        isFlexibleScheduleItem(task) &&
        (task.nextDueDate <= todayStr || isDueToday(task.nextDueDate)),
    )
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
  const todayImportantTasks = tasks
    .filter(
      (task) =>
        isStrictRecurringCareTask(task) &&
        (isOverdue(task.nextDueDate) || isDueToday(task.nextDueDate)),
    )
    .sort((a, b) => {
      const aOverdue = isOverdue(a.nextDueDate);
      const bOverdue = isOverdue(b.nextDueDate);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return a.nextDueDate.localeCompare(b.nextDueDate);
    });
  const nextImportantTask = todayImportantTasks[0];
  const reptileList = Array.from(reptiles.values());
  const randomAnimalFallback = reptileList.length > 0
    ? reptileList[new Date().getDate() % reptileList.length]
    : undefined;
  const focusAnimal = nextImportantTask?.reptile ?? randomAnimalFallback;
  const animalsNeedingAttentionCount = new Set(todayImportantTasks.map(task => task.reptileId)).size;
  const animalsClearTodayCount = Math.max(reptiles.size - animalsNeedingAttentionCount, 0);
  const completedTodayCount = tasks.filter(t => t.reptile && t.lastDoneDate === todayStr).length;
  const totalTodayTasks = backlogTodayTasks.length + completedTodayCount;
  const hasScheduledTodayWork = totalTodayTasks > 0;
  const careProgressPercent = totalTodayTasks === 0
    ? 100
    : Math.round((completedTodayCount / totalTodayTasks) * 100);

  const careEncouragementLabel = (() => {
    if (!hasScheduledTodayWork) return 'All clear today';
    if (careProgressPercent === 0) return 'Start your day';
    if (careProgressPercent < 50) return 'In progress';
    if (careProgressPercent < 80) return 'Good progress';
    return 'Great work';
  })();

  const careEncouragementClass = (() => {
    if (!hasScheduledTodayWork) return 'text-muted-foreground';
    if (careProgressPercent === 0) return 'text-[hsl(220_16%_42%)] dark:text-[hsl(217_24%_78%)]';
    if (careProgressPercent < 50) return 'text-amber-800/90 dark:text-amber-200/85';
    if (careProgressPercent < 80) return 'text-teal-800/90 dark:text-teal-200/85';
    return 'text-[hsl(168_32%_32%)] dark:text-[hsl(167_36%_55%)]';
  })();

  const careRingSubLabel = (() => {
    if (!hasScheduledTodayWork) return 'All clear today';
    if (careProgressPercent === 0) return 'Nothing completed yet';
    return 'completed';
  })();
  const CARE_RING_SIZE = 108;
  const CARE_RING_STROKE = 7;
  const careRingRadius = (CARE_RING_SIZE - CARE_RING_STROKE) / 2;
  const careRingCircumference = 2 * Math.PI * careRingRadius;

  const taskTypeLabels: Record<ScheduleItem['taskType'], string> = {
    feed: 'Feeding',
    clean: 'Cleaning',
    check: 'Routine check',
  };
  const focusAnimalNextTask = focusAnimal
    ? tasks
      .filter(task => task.reptileId === focusAnimal.id)
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))[0]
    : undefined;
  const focusAnimalCareLine = focusAnimal
    ? focusAnimalCarePhrase(focusAnimal.name, focusAnimalNextTask)
    : '';
  const motionSettings = prefersReducedMotion
    ? { initial: false as const }
    : {
      initial: { opacity: 0, y: 6 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const },
    };
  const focusAnimalCardMotion = prefersReducedMotion
    ? { initial: false as const }
    : {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.38, ease: [0.25, 0.1, 0.25, 1] as const, delay: 0.06 },
    };

  const handleMarkDone = (task: TaskWithReptile) => {
    setModalState({ isOpen: true, task });
  };

  const handleConfirmDone = async (details?: string) => {
    if (!modalState.task) return;
    if (markDoneInFlightRef.current) return;
    markDoneInFlightRef.current = true;

    setSaving(true);
    try {
      await markTaskDone(modalState.task.id, details);
      void pushCareTasksToCloudByIds([modalState.task.id], { notifyOnError: true });
      await loadData();
      await lightHaptic();
      toast.success('Task saved locally', {
        description: 'Marked complete and synced when available.',
      });
      setModalState({ isOpen: false, task: null });
    } catch (error) {
      console.error('Failed to mark task done:', error);
      toast.error('Could not save task — try again');
    } finally {
      markDoneInFlightRef.current = false;
      setSaving(false);
    }
  };

  const openOverdueBulkDrawer = useCallback((intent: OverdueBulkIntent) => {
    setOverdueBulkIntent(intent);
    setOverdueDrawerOpen(true);
  }, []);

  const handleOverdueBulkConfirm = useCallback(async () => {
    if (!overdueBulkIntent || overdueRecurringTasks.length === 0) return;
    if (bulkOverdueInFlightRef.current) return;
    bulkOverdueInFlightRef.current = true;
    setOverdueBulkSaving(true);
    try {
      const ids = overdueRecurringTasks.map(t => t.id);
      let pushed: string[] = [];
      if (overdueBulkIntent === 'startFresh') {
        pushed = await advanceOverdueRecurringTasksStartFresh(ids);
      } else if (overdueBulkIntent === 'skipOverdue') {
        pushed = await advanceOverdueRecurringTasksSkipOverdue(ids);
      } else {
        const r = await markOverdueRecurringTasksDoneBulk(ids);
        pushed = r.scheduleItemIds;
      }
      await loadData();
      const uniquePushed = [...new Set(pushed)].filter(Boolean);
      if (uniquePushed.length === 0) {
        toast.info('Nothing to update', {
          description: 'Looks like everything was already up to date.',
        });
      } else {
        void pushCareTasksToCloudByIds(uniquePushed, { notifyOnError: true });
        await lightHaptic();
        const n = uniquePushed.length;
        if (overdueBulkIntent === 'startFresh') {
          toast.success('Schedule updated', {
            description: n === 1 ? 'Next reminder moved forward from today.' : `Updated ${n} repeating reminders from today.`,
          });
        } else if (overdueBulkIntent === 'skipOverdue') {
          toast.success('Reminders updated', {
            description: n === 1 ? 'Past due window rolled forward.' : `Rolled ${n} reminders forward on the calendar.`,
          });
        } else {
          toast.success('Logged for today', {
            description: n === 1 ? 'Task and journal entry saved locally.' : `${n} tasks logged with journal entries.`,
          });
        }
      }
      setOverdueDrawerOpen(false);
      setOverdueBulkIntent(null);
    } catch (error) {
      console.error('Bulk overdue update failed:', error);
      toast.error('Could not update tasks — try again');
    } finally {
      bulkOverdueInFlightRef.current = false;
      setOverdueBulkSaving(false);
    }
  }, [overdueBulkIntent, overdueRecurringTasks, loadData]);

  const overdueBulkSheet = useMemo(() => {
    const n = overdueRecurringTasks.length;
    if (!overdueBulkIntent || n === 0) return null;
    const taskWord = n === 1 ? 'repeating reminder' : 'repeating reminders';
    if (overdueBulkIntent === 'startFresh') {
      return {
        title: 'Reset reminders from today?',
        description: `This moves ${n} behind-schedule ${taskWord} forward so your next due dates start from today's rhythm. Nothing is added to your journal.`,
        confirm: 'Reset from today',
      };
    }
    if (overdueBulkIntent === 'skipOverdue') {
      return {
        title: 'Roll past due dates forward?',
        description: `This advances ${n} behind-schedule ${taskWord} along the calendar until they are current. Nothing is added to your journal.`,
        confirm: 'Roll forward',
      };
    }
    return {
      title: 'Log overdue as done for today?',
      description: `This marks ${n} behind-schedule ${taskWord} complete for today and adds the usual journal entries for your animals, same as marking each task done.`,
      confirm: 'Log as done today',
    };
  }, [overdueBulkIntent, overdueRecurringTasks.length]);

  const handleLoadSampleData = async () => {
    setLoadingSample(true);
    try {
      await seedExpoDemo();
      await updateSettings({ expoDemoMode: true });
      await mediumHaptic();
      toast.success('Starter setup ready', {
        description: 'Sample data was loaded on this device.',
      });
      navigate('/today', { replace: true });
      await loadData();
    } catch (error) {
      console.error('Failed to load sample data:', error);
      toast.error('Could not load sample data');
    } finally {
      setLoadingSample(false);
    }
  };

  useEffect(() => {
    void pushWatchTodaySnapshot(true);
  }, []);

  const handlePushWatchSnapshot = async () => {
    setWatchSnapshotPushing(true);
    try {
      const snapshot = await pushWatchTodaySnapshot(true);
      await lightHaptic();
      toast.success('Watch snapshot pushed', {
        description: snapshot
          ? `${snapshot.overdueCount} overdue, ${snapshot.dueTodayCount} due today.`
          : 'Native Watch bridge is only available on iPhone.',
      });
    } catch (error) {
      console.error('Failed to push Watch snapshot:', error);
      toast.error('Could not push Watch snapshot');
    } finally {
      setWatchSnapshotPushing(false);
    }
  };

  const handleSendFakeWatchSnapshot = async () => {
    setFakeWatchSnapshotPushing(true);
    try {
      const snapshot = await sendFakeWatchSnapshot();
      await lightHaptic();
      toast.success('Fake Watch snapshot sent', {
        description: snapshot
          ? `${snapshot.animalName}: ${snapshot.overdueCount} overdue, ${snapshot.dueTodayCount} due.`
          : 'Native Watch bridge is only available on iPhone.',
      });
    } catch (error) {
      console.error('Failed to send fake Watch snapshot:', error);
      toast.error('Could not send fake Watch snapshot');
    } finally {
      setFakeWatchSnapshotPushing(false);
    }
  };

  if (loading) {
    return (
      <PageMotion className="page-container relative">
        <PageHeader quiet title="Today" />
        <div className="page-content page-content-top loading-min-height !pt-2 sm:!pt-2.5">
          <TodayTasksSkeleton count={4} />
        </div>
      </PageMotion>
    );
  }

  const hasNoTasks = strictFilteredTasks.length === 0 && (filterMode !== 'today' || suggestedFlexibleTasks.length === 0);
  const showFirstRunOnboarding = reptiles.size === 0;

  return (
    <PageMotion className="page-container relative">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-15%,hsl(var(--primary)/0.09),transparent_58%),radial-gradient(ellipse_65%_40%_at_100%_35%,hsl(var(--accent)/0.06),transparent_52%),radial-gradient(ellipse_55%_35%_at_0%_80%,hsl(var(--primary)/0.04),transparent_50%)] dark:bg-[radial-gradient(ellipse_90%_50%_at_50%_-15%,hsl(var(--primary)/0.11),transparent_58%),radial-gradient(ellipse_65%_40%_at_100%_35%,hsl(var(--accent)/0.08),transparent_52%),radial-gradient(ellipse_55%_35%_at_0%_80%,hsl(var(--primary)/0.06),transparent_50%)]"
        />
      </div>

      <div className="relative z-10">
        <PageHeader
          quiet
          title="Today"
          subtitle={new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        />

        <div className="page-content page-content-top space-y-5 !pt-2 sm:!pt-2.5">
          {showFirstRunOnboarding ? (
            <>
              <motion.div
                className="premium-surface-elevated relative overflow-hidden rounded-[var(--radius-xl)] p-5 sm:p-6 shadow-[var(--surface-shadow-deep),0_0_48px_-16px_hsl(var(--primary)/0.14)] dark:shadow-[var(--surface-shadow-deep),0_0_56px_-14px_hsl(var(--primary)/0.2)] border border-primary/10"
                {...motionSettings}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-80"
                  aria-hidden
                  style={{
                    background:
                      'radial-gradient(120% 80% at 10% 0%, hsl(var(--primary) / 0.12) 0%, transparent 58%), radial-gradient(100% 70% at 100% 100%, hsl(var(--accent) / 0.08) 0%, transparent 62%)',
                  }}
                />
                <div className="relative z-10 text-center sm:text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/85">Get started</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-[1.35rem]">
                    Welcome to Reptilita
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-md mx-auto sm:mx-0">
                    Your local-first companion for daily reptile &amp; amphibian care.
                  </p>
                  <ul className="mt-6 space-y-4 text-left max-w-[20rem] mx-auto">
                    {[
                      { icon: UserPlus, title: 'Add your animals', body: 'Name, species, and photos live on this device.' },
                      { icon: ListChecks, title: 'Track care tasks', body: 'See what’s due today and mark chores done.' },
                      { icon: NotebookPen, title: 'Keep records over time', body: 'Journal feedings, sheds, and notes in one timeline.' },
                    ].map(({ icon: Icon, title, body }) => (
                      <li key={title} className="flex gap-3 tap-feedback-soft">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/15">
                          <Icon className="h-[18px] w-[18px]" aria-hidden />
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            <Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden />
                            {title}
                          </p>
                          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{body}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-col gap-2.5 max-w-[20rem] mx-auto">
                    <Link
                      to="/reptiles/new"
                      className="w-full tap-feedback"
                      onClick={() => {
                        void lightHaptic();
                      }}
                    >
                      <Button className="w-full min-h-[48px] text-[15px] font-medium rounded-[var(--radius-lg)] shadow-sm">
                        Add your first animal
                      </Button>
                    </Link>
                    {isSampleDatasetEnabled() && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full min-h-[48px] text-muted-foreground tap-feedback rounded-[var(--radius-lg)]"
                        onClick={handleLoadSampleData}
                        disabled={loadingSample}
                      >
                        {loadingSample ? 'Loading…' : 'Load sample data'}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
              <motion.div className="rounded-[var(--radius-lg)] border border-border/60 bg-card/60 px-3 py-2.5" {...motionSettings}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Local-first: changes save on this iPhone first, then sync if you choose.</p>
                  <Link to="/settings" className="text-xs inline-flex items-center gap-1 text-primary tap-feedback whitespace-nowrap">
                    Settings
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            </>
          ) : (
            <>
          {/* Collection hero */}
          <motion.div
            className="premium-surface-elevated relative overflow-hidden rounded-[var(--radius-xl)] p-4 sm:p-5 shadow-[var(--surface-shadow-deep),0_0_48px_-16px_hsl(var(--primary)/0.14)] dark:shadow-[var(--surface-shadow-deep),0_0_56px_-14px_hsl(var(--primary)/0.2)]"
            {...motionSettings}
          >
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                'radial-gradient(120% 80% at 10% 0%, hsl(var(--primary) / 0.1) 0%, transparent 60%), radial-gradient(100% 70% at 100% 100%, hsl(var(--accent) / 0.07) 0%, transparent 62%), linear-gradient(180deg, hsl(var(--background) / 0.04) 0%, transparent 45%)',
            }}
          />

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-xs font-medium tracking-[0.18em] uppercase text-muted-foreground/80">
                  Today&apos;s Care Progress
                </p>
                <p className="text-secondary mt-1 text-xs sm:text-sm">
                  Care tasks completed
                </p>
              </div>
              <div className="flex flex-row items-start gap-4 sm:gap-5">
                <div className="shrink-0">
                  <div
                    className="relative"
                    role="progressbar"
                    aria-valuenow={careProgressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={
                      !hasScheduledTodayWork
                        ? 'All clear today — no scheduled tasks due'
                        : careProgressPercent === 0
                          ? `Care progress ${careProgressPercent} percent. Nothing completed yet — start your day`
                          : `Care completion ${careProgressPercent} percent, ${careEncouragementLabel}`
                    }
                  >
                    <svg
                      width={CARE_RING_SIZE}
                      height={CARE_RING_SIZE}
                      viewBox={`0 0 ${CARE_RING_SIZE} ${CARE_RING_SIZE}`}
                      className="rotate-[-90deg] shrink-0"
                      aria-hidden
                    >
                      <circle
                        cx={CARE_RING_SIZE / 2}
                        cy={CARE_RING_SIZE / 2}
                        r={careRingRadius}
                        fill="none"
                        stroke="hsl(var(--muted))"
                        strokeWidth={CARE_RING_STROKE}
                        className="text-muted/55"
                        strokeOpacity={0.45}
                      />
                      <motion.circle
                        cx={CARE_RING_SIZE / 2}
                        cy={CARE_RING_SIZE / 2}
                        r={careRingRadius}
                        fill="none"
                        strokeWidth={CARE_RING_STROKE}
                        strokeLinecap="round"
                        className="text-[hsl(168_32%_38%)] dark:text-[hsl(167_36%_48%)]"
                        stroke="currentColor"
                        strokeDasharray={careRingCircumference}
                        initial={
                          prefersReducedMotion
                            ? { strokeDashoffset: careRingCircumference * (1 - careProgressPercent / 100) }
                            : { strokeDashoffset: careRingCircumference }
                        }
                        animate={{
                          strokeDashoffset: careRingCircumference * (1 - careProgressPercent / 100),
                        }}
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : { duration: 0.85, ease: [0.25, 0.1, 0.25, 1] }
                        }
                      />
                    </svg>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                      <span className="text-[1.35rem] font-semibold tabular-nums leading-none tracking-tight text-foreground sm:text-[1.55rem]">
                        {careProgressPercent}%
                      </span>
                      <span
                        className={cn(
                          'mt-1 max-w-[5.5rem] text-center font-medium leading-snug text-muted-foreground',
                          careRingSubLabel === 'completed'
                            ? 'text-[10px] uppercase tracking-[0.12em]'
                            : 'text-[10px] sm:text-[11px] normal-case tracking-tight',
                        )}
                      >
                        {careRingSubLabel}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
                  <p className={cn('text-xs font-medium', careEncouragementClass)}>
                    {careEncouragementLabel}
                  </p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {overdueTasks.length} overdue • {dueTodayTasks.length} due today
                    {completedTodayCount > 0 && (
                      <span>{` • ${completedTodayCount} completed today`}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground/90 pt-1">
                    {`${animalsClearTodayCount} of ${reptiles.size} with no overdue or due-today tasks.`}
                  </p>
                </div>
              </div>
            </div>
            <div className="shrink-0 self-end sm:self-auto rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-right shadow-[0_0_28px_-10px_hsl(var(--primary)/0.35)] sm:ml-auto dark:shadow-[0_0_32px_-10px_hsl(var(--primary)/0.28)]">
              <p className="text-[10px] uppercase tracking-[0.14em] text-primary/85">Collection</p>
              <p className="text-sm font-medium">{reptiles.size} animal{reptiles.size === 1 ? '' : 's'}</p>
            </div>
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-3 gap-2.5 text-xs">
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-2">
              <p className="text-muted-foreground">Overdue</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-destructive">{overdueTasks.length}</p>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-2">
              <p className="text-muted-foreground">Due</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-amber-700 dark:text-amber-300">{dueTodayTasks.length}</p>
            </div>
            <div className="rounded-lg border border-teal-500/15 bg-teal-500/[0.08] px-2.5 py-2 dark:bg-teal-500/10">
              <p className="text-muted-foreground">Clear today</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-teal-800/90 dark:text-teal-200/85">{animalsClearTodayCount}</p>
            </div>
          </div>

          {overdueRecurringTasks.length > 0 && (
            <div className="relative z-10 mt-4 rounded-xl border border-border/55 bg-card/85 px-3.5 py-3 shadow-sm backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium text-foreground">Catch up gently</p>
                  <p className="text-[12px] leading-snug text-muted-foreground">
                    {overdueRecurringTasks.length} behind-schedule repeating{' '}
                    {overdueRecurringTasks.length === 1 ? 'reminder' : 'reminders'}. One-off reminders are left as-is.
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full tap-feedback"
                      aria-label="Catch-up options for behind-schedule reminders"
                    >
                      <MoreVertical className="h-4 w-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[min(100vw-2rem,18rem)]">
                    <DropdownMenuItem
                      className="cursor-pointer flex items-center gap-2"
                      onSelect={() => {
                        setTimeout(() => openOverdueBulkDrawer('startFresh'), 0);
                      }}
                    >
                      <Sparkles className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                      <span>Start fresh</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer flex items-center gap-2"
                      onSelect={() => {
                        setTimeout(() => openOverdueBulkDrawer('skipOverdue'), 0);
                      }}
                    >
                      <FastForward className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                      <span>Skip past due dates</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer flex items-center gap-2"
                      onSelect={() => {
                        setTimeout(() => openOverdueBulkDrawer('markDone'), 0);
                      }}
                    >
                      <ListChecks className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                      <span>Mark overdue done</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          <div className="relative z-10 mt-4 grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-lg border border-border/50 bg-card/70 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Next Important Task</p>
              {nextImportantTask ? (
                <p className="mt-1 text-sm font-medium">
                  {taskTypeLabels[nextImportantTask.taskType]} for {nextImportantTask.reptile.name}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No urgent care tasks right now.</p>
              )}
            </div>
            <motion.div
              {...focusAnimalCardMotion}
              className="rounded-lg border border-border/50 bg-card/70 px-3 py-2.5 shadow-[0_0_36px_-14px_hsl(var(--primary)/0.12)] dark:shadow-[0_0_40px_-12px_hsl(var(--primary)/0.18)]"
            >
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Focus Animal of the Day</p>
              {focusAnimal ? (
                <div className="mt-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-primary/15 bg-secondary/70 ring-1 ring-primary/10">
                      {focusAnimal.photoUrl ? (
                        <img src={focusAnimal.photoUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-lg">
                          {getDisplayEmoji(focusAnimal.animalCategory, focusAnimal.species)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{focusAnimal.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{focusAnimal.species}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-foreground/90">
                    {focusAnimalCareLine}
                  </p>
                  <Link to={`/reptiles/${focusAnimal.id}`} className="mt-2 inline-block">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs transition-transform motion-safe:active:scale-[0.97] duration-150"
                    >
                      Open profile
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Add an animal to start today&apos;s plan.</p>
              )}
            </motion.div>
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Link
              to="/reptiles/new"
              onClick={() => {
                void lightHaptic();
              }}
            >
              <Button variant="outline" className="w-full min-h-[40px] tap-feedback">
                Add Animal
              </Button>
            </Link>
            <Link
              to="/add-event"
              onClick={() => {
                void lightHaptic();
              }}
            >
              <Button variant="outline" className="w-full min-h-[40px] tap-feedback">
                Add Care Event
              </Button>
            </Link>
            <Link
              to="/genetics"
              onClick={() => {
                void lightHaptic();
              }}
            >
              <Button
                variant="outline"
                className="w-full min-h-[40px] tap-feedback"
              >
                Open Genetics
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-[40px] tap-feedback gap-1.5"
              disabled={watchSnapshotPushing}
              onClick={() => void handlePushWatchSnapshot()}
            >
              <Send className="h-4 w-4 shrink-0" aria-hidden />
              <span>{watchSnapshotPushing ? 'Pushing…' : 'Push Watch Snapshot'}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-[40px] tap-feedback gap-1.5"
              disabled={fakeWatchSnapshotPushing}
              onClick={() => void handleSendFakeWatchSnapshot()}
            >
              <Send className="h-4 w-4 shrink-0" aria-hidden />
              <span>{fakeWatchSnapshotPushing ? 'Sending…' : 'Send Fake Watch Snapshot'}</span>
            </Button>
          </div>

        </motion.div>

        <motion.div className="rounded-[var(--radius-lg)] border border-border/60 bg-card/60 px-3 py-2.5" {...motionSettings}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Saved locally first. Cloud sync only runs when available.</p>
            <Link to="/settings" className="text-xs inline-flex items-center gap-1 text-primary">
              Settings
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>

        {/* Filter toggle — premium sliding pill */}
        <motion.div className="premium-surface rounded-[var(--radius-xl)] p-3" {...motionSettings}>
          <div className="flex rounded-[999px] bg-muted/50 p-0.5 relative">
            <motion.div
              className="absolute inset-y-0.5 w-[calc(50%-3px)] rounded-[999px] bg-card/95 border border-border/40 shadow-[var(--surface-shadow)]"
              animate={prefersReducedMotion ? undefined : { left: filterMode === 'today' ? 2 : 'calc(50% + 1.5px)' }}
              transition={{ type: 'tween', duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              style={prefersReducedMotion ? { left: filterMode === 'today' ? 2 : 'calc(50% + 1.5px)' } : undefined}
            />
            <button
              type="button"
              onClick={() => setFilterMode('today')}
              className={cn(
                'relative z-10 flex-1 min-h-[40px] rounded-[999px] text-sm font-medium transition-[color,transform] duration-200 motion-safe:active:scale-[0.98]',
                filterMode === 'today' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Due Today
              {(overdueTasks.length > 0 || dueTodayTasks.length > 0) && filterMode !== 'today' && (
                <span className="ml-1.5 tabular-nums">
                  {overdueTasks.length + dueTodayTasks.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('week')}
              className={cn(
                'relative z-10 flex-1 min-h-[40px] rounded-[999px] text-sm font-medium transition-[color,transform] duration-200 motion-safe:active:scale-[0.98]',
                filterMode === 'week' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Next 7 Days
            </button>
          </div>
        </motion.div>

        <Fragment key={filterMode}>
          {hasNoTasks ? (
            <div className="animate-in-fade">
              <div className="premium-surface-elevated rounded-[var(--radius-xl)] p-6 sm:p-8 text-center border border-border/50">
                <EmptyState
                  icon={<Bug className="w-16 h-16 opacity-90" />}
                  title="All caught up"
                  description={
                    filterMode === 'today'
                      ? 'Nothing due today. Log a quick event anytime, or peek at the week ahead.'
                      : 'Nothing scheduled in this window yet. Tasks appear when schedules are due.'
                  }
                  action={
                    <Link to="/add-event" className="block w-full max-w-[280px] mx-auto tap-feedback">
                      <Button className="w-full min-h-[48px]" variant="default">
                        Log care event
                      </Button>
                    </Link>
                  }
                  secondaryAction={
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-[44px] px-5 tap-feedback"
                        onClick={() => setFilterMode(filterMode === 'today' ? 'week' : 'today')}
                      >
                        {filterMode === 'today' ? 'View next 7 days' : 'Back to due today'}
                      </Button>
                      <Link to="/reptiles">
                        <Button type="button" variant="ghost" className="min-h-[44px] text-muted-foreground tap-feedback">
                          Browse animals
                        </Button>
                      </Link>
                    </>
                  }
                />
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <StaggerList className="space-y-5">
                {Object.entries(groupedTasks).map(([reptileId, { reptile, tasks: reptileTasks }]) => {
                  const hasOverdueForReptile = reptileTasks.some(task =>
                    isStrictRecurringCareTask(task) && isOverdue(task.nextDueDate),
                  );

                  return (
                    <StaggerItem key={reptileId}>
                      <div className="premium-surface rounded-[var(--radius-xl)] p-4 sm:p-5">
                        <div className="flex items-baseline justify-between gap-3 mb-3">
                          <h2 className="text-card-title">{reptile.name}</h2>
                          {hasOverdueForReptile && (
                            <span className="px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[11px] font-medium tracking-wide uppercase">
                              Overdue tasks
                            </span>
                          )}
                        </div>
                        <div className="space-y-2.5">
                          {reptileTasks.map(task => (
                            <TaskCard
                              key={task.id}
                              reptileName={reptile.name}
                              taskType={task.taskType}
                              nextDueDate={task.nextDueDate}
                              isOverdue={isStrictRecurringCareTask(task) && isOverdue(task.nextDueDate)}
                              onMarkDone={() => handleMarkDone(task)}
                            />
                          ))}
                        </div>
                      </div>
                    </StaggerItem>
                  );
                })}
              </StaggerList>

              {filterMode === 'today' && suggestedFlexibleTasks.length > 0 && (
                <div className="premium-surface rounded-[var(--radius-xl)] p-4 sm:p-5">
                  <div className="mb-3">
                    <h3 className="text-card-title">Suggested reminders</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Flexible reminders are optional and do not count as overdue.
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {suggestedFlexibleTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        reptileName={task.reptile.name}
                        taskType={task.taskType}
                        nextDueDate={task.nextDueDate}
                        isOverdue={false}
                        onMarkDone={() => handleMarkDone(task)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Fragment>
            </>
          )}
      </div>
      </div>

      <Drawer
        open={overdueDrawerOpen}
        onOpenChange={(open) => {
          setOverdueDrawerOpen(open);
          if (!open) setOverdueBulkIntent(null);
        }}
        shouldScaleBackground={!prefersReducedMotion}
      >
        <DrawerContent className="pb-[max(1rem,env(safe-area-inset-bottom))]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{overdueBulkSheet?.title ?? ''}</DrawerTitle>
            <DrawerDescription className="text-left text-pretty">
              {overdueBulkSheet?.description ?? ''}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="flex-col gap-2 pt-2">
            <Button
              type="button"
              className="w-full min-h-[48px] tap-feedback"
              disabled={overdueBulkSaving || !overdueBulkSheet}
              onClick={() => void handleOverdueBulkConfirm()}
            >
              {overdueBulkSaving ? 'Saving…' : overdueBulkSheet?.confirm}
            </Button>
            <DrawerClose asChild>
              <Button type="button" variant="outline" className="w-full min-h-[48px] tap-feedback" disabled={overdueBulkSaving}>
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <MarkDoneModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, task: null })}
        onConfirm={handleConfirmDone}
        reptileName={modalState.task?.reptile.name || ''}
        taskType={modalState.task?.taskType || 'feed'}
        isLoading={saving}
      />
    </PageMotion>
  );
}
