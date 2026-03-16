// AI Action Review Card component
import { Check, X, Calendar, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AIAction, ScheduleAction, EventAction } from '@/lib/ai/actionParser';

interface ActionReviewCardProps {
  actions: AIAction[];
  reptileNames: Map<string, string>;
  onApply: () => void;
  onDismiss: () => void;
  applying: boolean;
}

const TASK_LABELS: Record<string, string> = {
  feed: 'Feeding', clean: 'Cleaning', check: 'Health Check',
};

const EVENT_LABELS: Record<string, string> = {
  feeding: 'Feeding', cleaning: 'Cleaning', shedding: 'Shedding',
  health: 'Health Check', handling: 'Handling', note: 'Note',
};

function ScheduleActionRow({ action, reptileName }: { action: ScheduleAction; reptileName: string }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-secondary/50">
      <Calendar className="w-4 h-4 mt-0.5 text-primary shrink-0" />
      <div className="text-sm">
        <span className="font-medium">{TASK_LABELS[action.taskType] || action.taskType}</span>
        <span className="text-muted-foreground"> for {reptileName}</span>
        <div className="text-xs text-muted-foreground">
          Every {action.frequencyDays} days — next: {action.nextDueDate}
        </div>
        {action.notes && <div className="text-xs text-muted-foreground mt-0.5">{action.notes}</div>}
      </div>
    </div>
  );
}

function EventActionRow({ action, reptileName }: { action: EventAction; reptileName: string }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-secondary/50">
      <ClipboardList className="w-4 h-4 mt-0.5 text-primary shrink-0" />
      <div className="text-sm">
        <span className="font-medium">{EVENT_LABELS[action.eventType] || action.eventType}</span>
        <span className="text-muted-foreground"> for {reptileName} on {action.eventDate}</span>
        {action.details && <div className="text-xs text-muted-foreground">{action.details}</div>}
        {action.weightGrams && <div className="text-xs text-muted-foreground">Weight: {action.weightGrams}g</div>}
      </div>
    </div>
  );
}

export function ActionReviewCard({ actions, reptileNames, onApply, onDismiss, applying }: ActionReviewCardProps) {
  if (actions.length === 0) return null;

  return (
    <div className="border border-primary/30 rounded-lg bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-primary">Proposed Actions ({actions.length})</h4>
      </div>
      
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {actions.map((action, i) => {
          const name = reptileNames.get(action.reptileId) || 'Unknown';
          return action.type === 'schedule' 
            ? <ScheduleActionRow key={i} action={action as ScheduleAction} reptileName={name} />
            : <EventActionRow key={i} action={action as EventAction} reptileName={name} />;
        })}
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={onApply} disabled={applying} className="flex-1">
          <Check className="w-3.5 h-3.5 mr-1" />
          {applying ? 'Applying...' : 'Apply All'}
        </Button>
        <Button size="sm" variant="outline" onClick={onDismiss} disabled={applying}>
          <X className="w-3.5 h-3.5 mr-1" />
          Dismiss
        </Button>
      </div>
    </div>
  );
}
