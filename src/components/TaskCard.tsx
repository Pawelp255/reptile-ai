import { format } from 'date-fns';
import { AlertCircle, Check, Utensils, Sparkles, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { TaskType } from '@/types';

interface TaskCardProps {
  reptileName: string;
  taskType: TaskType;
  nextDueDate: string;
  isOverdue: boolean;
  onMarkDone: () => void;
  isLoading?: boolean;
}

const taskIcons: Record<TaskType, React.ComponentType<{ className?: string }>> = {
  feed: Utensils,
  clean: Sparkles,
  check: ClipboardCheck,
};

const taskLabels: Record<TaskType, string> = {
  feed: 'Feeding',
  clean: 'Cleaning',
  check: 'Health Check',
};

export function TaskCard({
  reptileName,
  taskType,
  nextDueDate,
  isOverdue,
  onMarkDone,
  isLoading = false,
}: TaskCardProps) {
  const Icon = taskIcons[taskType];
  const label = taskLabels[taskType];

  return (
    <div className={cn(
      'task-card animate-fade-in',
      isOverdue ? 'task-card-overdue' : 'task-card-due'
    )}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn(
            'flex items-center justify-center w-10 h-10 rounded-[var(--radius-lg)] shrink-0',
            isOverdue ? 'bg-overdue/10 text-overdue' : 'bg-primary/10 text-primary'
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-foreground truncate leading-tight">{reptileName}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
            <div className="flex items-center gap-1.5 mt-2">
              {isOverdue && (
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-overdue" />
              )}
              <span className={cn(
                'text-xs font-medium truncate',
                isOverdue ? 'text-overdue' : 'text-muted-foreground'
              )}>
                {isOverdue ? 'Overdue' : 'Due'}: {format(new Date(nextDueDate), 'MMM d')}
              </span>
            </div>
          </div>
        </div>
        <Button
          size="sm"
          onClick={onMarkDone}
          disabled={isLoading}
          className="w-full sm:w-auto shrink-0 min-h-[44px]"
        >
          <Check className="w-4 h-4 mr-1.5" />
          Done
        </Button>
      </div>
    </div>
  );
}
