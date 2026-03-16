import { useState, useEffect, Fragment } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Calendar, Bug } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PageMotion } from '@/components/motion/PageMotion';
import { StaggerList, StaggerItem } from '@/components/motion/StaggerList';
import { TaskCard } from '@/components/TaskCard';
import { EmptyState } from '@/components/EmptyState';
import { MarkDoneModal } from '@/components/MarkDoneModal';
import { DemoBadge } from '@/components/DemoBadge';
import { TodayTasksSkeleton } from '@/components/system/SkeletonLoaders';
import { Button } from '@/components/ui/button';
import { 
  getAllScheduleItems, 
  getAllReptiles, 
  markTaskDone,
  isOverdue,
  isDueToday,
  isWithinDays,
  getSettings,
} from '@/lib/storage';
import type { ScheduleItem, Reptile, TaskType, AppSettings } from '@/types';

interface TaskWithReptile extends ScheduleItem {
  reptile: Reptile;
}

type FilterMode = 'today' | 'week';

export default function TodayPage() {
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

  const overdueTasks = filteredTasks.filter(t => isOverdue(t.nextDueDate));
  const dueTodayTasks = filteredTasks.filter(t => isDueToday(t.nextDueDate));

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
        {/* Today hero — summary + premium filter pill */}
        <motion.div
          className="premium-surface-elevated rounded-[var(--radius-xl)] p-4 sm:p-5 shadow-[var(--surface-shadow-deep)]"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-[0.18em] uppercase text-muted-foreground/80">
                Today
              </p>
              <p className="text-page-title mt-1">
                Caring for {Object.keys(groupedTasks).length || 0} animal
                {Object.keys(groupedTasks).length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive/90 font-medium tabular-nums">
                {overdueTasks.length} Overdue
              </span>
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary/90 font-medium tabular-nums">
                {dueTodayTasks.length} Due today
              </span>
            </div>
          </div>

          {/* Filter toggle — premium sliding pill */}
          <div className="flex rounded-[999px] bg-muted/50 p-0.5 relative">
            <motion.div
              className="absolute inset-y-0.5 w-[calc(50%-3px)] rounded-[999px] bg-card/95 border border-border/40 shadow-[var(--surface-shadow)]"
              animate={{ left: filterMode === 'today' ? 2 : 'calc(50% + 1.5px)' }}
              transition={{ type: 'tween', duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
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
