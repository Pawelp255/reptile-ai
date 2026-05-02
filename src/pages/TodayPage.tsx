import { useState, useEffect, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowUpRight, Bug, Sparkles } from 'lucide-react';
import { getDisplayEmoji } from '@/lib/animals/taxonomy';
import { PageHeader } from '@/components/PageHeader';
import { PageMotion } from '@/components/motion/PageMotion';
import { StaggerList, StaggerItem } from '@/components/motion/StaggerList';
import { TaskCard } from '@/components/TaskCard';
import { EmptyState } from '@/components/EmptyState';
import { MarkDoneModal } from '@/components/MarkDoneModal';
import { DemoBadge } from '@/components/DemoBadge';
import { TodayTasksSkeleton } from '@/components/system/SkeletonLoaders';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  getAllScheduleItems,
  getAllReptiles,
  getToday,
  markTaskDone,
  isOverdue,
  isDueToday,
  isWithinDays,
  getSettings,
  seedExpoDemo,
  updateSettings,
} from '@/lib/storage';
import type { ScheduleItem, Reptile } from '@/types';

interface TaskWithReptile extends ScheduleItem {
  reptile: Reptile;
}

type FilterMode = 'today' | 'week';

export default function TodayPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [tasks, setTasks] = useState<TaskWithReptile[]>([]);
  const [reptiles, setReptiles] = useState<Map<string, Reptile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>('today');
  const [isExpoDemo, setIsExpoDemo] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    task: TaskWithReptile | null;
  }>({ isOpen: false, task: null });
  const [saving, setSaving] = useState(false);
  const [enablingDemo, setEnablingDemo] = useState(false);

  const loadData = async () => {
    try {
      const [scheduleItems, allReptiles, settings] = await Promise.all([
        getAllScheduleItems(),
        getAllReptiles(),
        getSettings(),
      ]);

      setIsExpoDemo(!!settings.expoDemoMode);
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
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTasks = tasks.filter(task => {
    const overdue = isOverdue(task.nextDueDate);
    const dueToday = isDueToday(task.nextDueDate);
    
    if (filterMode === 'today') {
      return overdue || dueToday;
    } else {
      return overdue || isWithinDays(task.nextDueDate, 7);
    }
  }).sort((a, b) => {
    // Sort overdue first, then by date
    const aOverdue = isOverdue(a.nextDueDate);
    const bOverdue = isOverdue(b.nextDueDate);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
  });

  // Group tasks by reptile
  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const key = task.reptileId;
    if (!acc[key]) {
      acc[key] = { reptile: task.reptile, tasks: [] };
    }
    acc[key].tasks.push(task);
    return acc;
  }, {} as Record<string, { reptile: Reptile; tasks: TaskWithReptile[] }>);

  /** Overdue / due-today backlog for hero stats and badges (not tied to week filter). */
  const backlogTodayTasks = tasks.filter(
    t => t.reptile && (isOverdue(t.nextDueDate) || isDueToday(t.nextDueDate)),
  );
  const overdueTasks = backlogTodayTasks.filter(t => isOverdue(t.nextDueDate));
  const dueTodayTasks = backlogTodayTasks.filter(t => isDueToday(t.nextDueDate));
  const todayImportantTasks = tasks
    .filter(task => isOverdue(task.nextDueDate) || isDueToday(task.nextDueDate))
    .sort((a, b) => {
      const aOverdue = isOverdue(a.nextDueDate);
      const bOverdue = isOverdue(b.nextDueDate);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
    });
  const nextImportantTask = todayImportantTasks[0];
  const reptileList = Array.from(reptiles.values());
  const randomAnimalFallback = reptileList.length > 0
    ? reptileList[new Date().getDate() % reptileList.length]
    : undefined;
  const focusAnimal = nextImportantTask?.reptile ?? randomAnimalFallback;
  const animalsNeedingAttentionCount = new Set(todayImportantTasks.map(task => task.reptileId)).size;
  const animalsClearTodayCount = Math.max(reptiles.size - animalsNeedingAttentionCount, 0);
  const todayStr = getToday();
  const completedTodayCount = tasks.filter(t => t.reptile && t.lastDoneDate === todayStr).length;
  const totalTodayTasks = backlogTodayTasks.length + completedTodayCount;
  const careProgressPercent = totalTodayTasks === 0
    ? 100
    : Math.round((completedTodayCount / totalTodayTasks) * 100);
  const careProgressState = careProgressPercent >= 80
    ? 'on-track'
    : careProgressPercent >= 50
      ? 'in-progress'
      : 'needs-attention';
  const careProgressStatusLabel = careProgressPercent >= 80
    ? 'On track'
    : careProgressPercent >= 50
      ? 'In progress'
      : 'Needs attention';
  const careProgressStatusClass =
    careProgressState === 'on-track'
      ? 'text-muted-foreground'
      : careProgressState === 'in-progress'
        ? 'text-amber-800/90 dark:text-amber-200/85'
        : 'text-[hsl(220_16%_40%)] dark:text-[hsl(217_24%_75%)]';
  const CARE_RING_SIZE = 108;
  const CARE_RING_STROKE = 7;
  const careRingRadius = (CARE_RING_SIZE - CARE_RING_STROKE) / 2;
  const careRingCircumference = 2 * Math.PI * careRingRadius;

  const taskTypeLabels: Record<ScheduleItem['taskType'], string> = {
    feed: 'Feeding',
    clean: 'Cleaning',
    check: 'Routine check',
    shed: 'Shedding',
  };
  const focusAnimalNextTask = focusAnimal
    ? tasks
      .filter(task => task.reptileId === focusAnimal.id)
      .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())[0]
    : undefined;
  const motionSettings = prefersReducedMotion
    ? { initial: false as const }
    : {
      initial: { opacity: 0, y: 6 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const },
    };

  const handleMarkDone = (task: TaskWithReptile) => {
    setModalState({ isOpen: true, task });
  };

  const handleConfirmDone = async (details?: string) => {
    if (!modalState.task) return;

    setSaving(true);
    try {
      await markTaskDone(modalState.task.id, details);
      await loadData();
      setModalState({ isOpen: false, task: null });
    } catch (error) {
      console.error('Failed to mark task done:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEnableDemoMode = async () => {
    setEnablingDemo(true);
    try {
      await seedExpoDemo();
      await updateSettings({ expoDemoMode: true });
      setIsExpoDemo(true);
      toast.success('Demo mode enabled. Seeded data is ready.');
      navigate('/today', { replace: true });
      await loadData();
    } catch (error) {
      console.error('Failed to enable demo mode:', error);
      toast.error('Could not enable demo mode');
    } finally {
      setEnablingDemo(false);
    }
  };

  if (loading) {
    return (
      <PageMotion className="page-container">
        <PageHeader title="Today" rightContent={isExpoDemo ? <DemoBadge /> : undefined} />
        <div className="page-content page-content-top loading-min-height">
          <TodayTasksSkeleton count={4} />
        </div>
      </PageMotion>
    );
  }

  const hasNoTasks = filteredTasks.length === 0;

  return (
    <PageMotion className="page-container">
      <PageHeader 
        title="Today" 
        subtitle={new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        })}
        rightContent={isExpoDemo ? <DemoBadge /> : undefined}
      />

      <div className="page-content page-content-top space-y-6">
        {!isExpoDemo && (
          <motion.div
            className="premium-surface rounded-[var(--radius-xl)] p-4 sm:p-5 border border-primary/25"
            {...motionSettings}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-[0.16em] uppercase text-primary/85">Presentation Ready</p>
                <p className="text-card-title mt-1">Enable Demo Mode</p>
                <p className="text-secondary mt-1">
                  Seed realistic sample animals, schedules, and events.
                </p>
              </div>
              <Sparkles className="w-4 h-4 text-primary mt-1 shrink-0" />
            </div>
            <div className="mt-3 flex gap-2">
              <Button onClick={handleEnableDemoMode} disabled={enablingDemo} className="min-h-[40px]">
                {enablingDemo ? 'Enabling…' : 'Enable Demo Mode'}
              </Button>
              <Link to="/settings">
                <Button variant="outline" className="min-h-[40px]">Demo Settings</Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Collection hero */}
        <motion.div
          className="premium-surface-elevated relative overflow-hidden rounded-[var(--radius-xl)] p-4 sm:p-5 shadow-[var(--surface-shadow-deep)]"
          {...motionSettings}
        >
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                'radial-gradient(120% 80% at 10% 0%, hsl(var(--primary) / 0.08) 0%, transparent 60%), radial-gradient(100% 70% at 100% 100%, hsl(var(--accent) / 0.05) 0%, transparent 62%)',
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
                      totalTodayTasks === 0
                        ? 'All clear today — no scheduled tasks due'
                        : `Care completion ${careProgressPercent} percent`
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
                      <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        {totalTodayTasks === 0 ? 'All clear today' : 'completed'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
                  <p className={cn('text-xs font-medium', careProgressStatusClass)}>
                    {totalTodayTasks === 0 ? 'On track' : careProgressStatusLabel}
                  </p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {overdueTasks.length} overdue • {dueTodayTasks.length} due today
                    {completedTodayCount > 0 && (
                      <span>{` • ${completedTodayCount} completed today`}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground/90 pt-1">
                    {reptiles.size === 0
                      ? 'No collection loaded yet.'
                      : `${animalsClearTodayCount} of ${reptiles.size} with no overdue or due-today tasks.`}
                  </p>
                </div>
              </div>
            </div>
            <div className="shrink-0 self-end sm:self-auto rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-right sm:ml-auto">
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
            <div className="rounded-lg border border-border/50 bg-card/70 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Focus Animal of the Day</p>
              {focusAnimal ? (
                <div className="mt-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-secondary/70">
                      {focusAnimal.photoUrl ? (
                        <img src={focusAnimal.photoUrl} alt="" className="h-full w-full object-cover" />
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
                  <p className="mt-2 text-xs text-muted-foreground">
                    {focusAnimalNextTask
                      ? `Next task: ${taskTypeLabels[focusAnimalNextTask.taskType]}`
                      : 'Next task: Add a schedule to start care reminders.'}
                  </p>
                  <Link to={`/reptiles/${focusAnimal.id}`} className="mt-2 inline-block">
                    <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs">Open profile</Button>
                  </Link>
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Add an animal to start today&apos;s plan.</p>
              )}
            </div>
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
            <Link to="/reptiles/new">
              <Button variant="outline" className="w-full min-h-[40px]">Add Animal</Button>
            </Link>
            <Link to="/add-event">
              <Button variant="outline" className="w-full min-h-[40px]">Add Care Event</Button>
            </Link>
            <Link to="/genetics">
              <Button variant="outline" className="w-full min-h-[40px]">Open Genetics</Button>
            </Link>
          </div>

          {isExpoDemo && (
            <div className="relative z-10 mt-4 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary">
              Demo collection loaded
            </div>
          )}

          {!isExpoDemo && reptiles.size === 0 && (
            <div className="relative z-10 mt-4 rounded-lg border border-primary/35 bg-primary/10 px-3 py-3">
              <p className="text-sm font-medium">Load demo collection</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Instantly preview a premium, fully populated care workspace.
              </p>
              <Button onClick={handleEnableDemoMode} disabled={enablingDemo} className="mt-2 min-h-[40px]">
                {enablingDemo ? 'Loading Demo…' : 'Load Demo Collection'}
              </Button>
            </div>
          )}
        </motion.div>

        <motion.div className="rounded-[var(--radius-lg)] border border-border/60 bg-card/60 px-3 py-2.5" {...motionSettings}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Local-first: data stored on this device.</p>
            <Link to="/settings" className="text-xs inline-flex items-center gap-1 text-primary">
              Demo settings
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
                'relative z-10 flex-1 min-h-[40px] rounded-[999px] text-sm font-medium transition-colors duration-200 active:scale-[0.98]',
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
                'relative z-10 flex-1 min-h-[40px] rounded-[999px] text-sm font-medium transition-colors duration-200 active:scale-[0.98]',
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
              <div className="premium-surface-elevated rounded-[var(--radius-xl)] p-6 sm:p-7 text-center">
                <EmptyState
                  icon={<Bug className="w-16 h-16" />}
                  title="All caught up"
                  description={
                    filterMode === 'today'
                      ? "No tasks due today. Switch to Next 7 Days to see what’s coming up."
                      : "No tasks in the next week. Add reptiles and set schedules to get reminders."
                  }
                />
              </div>
            </div>
          ) : (
            <StaggerList className="space-y-5">
              {Object.entries(groupedTasks).map(([reptileId, { reptile, tasks: reptileTasks }]) => {
                const hasOverdueForReptile = reptileTasks.some(task =>
                  isOverdue(task.nextDueDate),
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
                            isOverdue={isOverdue(task.nextDueDate)}
                            onMarkDone={() => handleMarkDone(task)}
                          />
                        ))}
                      </div>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerList>
          )}
        </Fragment>
      </div>

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
