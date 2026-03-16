// Parse and validate AI-proposed actions from assistant responses

import type { TaskType, EventType, Supplement } from '@/types';

export interface ScheduleAction {
  type: 'schedule';
  taskType: TaskType;
  reptileId: string;
  frequencyDays: number;
  nextDueDate: string;
  notes?: string;
}

export interface EventAction {
  type: 'event';
  eventType: EventType;
  reptileId: string;
  eventDate: string;
  details?: string;
  weightGrams?: number;
  supplements?: Supplement[];
}

export type AIAction = ScheduleAction | EventAction;

const VALID_TASK_TYPES: TaskType[] = ['feed', 'clean', 'check'];
const VALID_EVENT_TYPES: EventType[] = ['feeding', 'cleaning', 'shedding', 'health', 'handling', 'note'];
const VALID_SUPPLEMENTS: Supplement[] = ['calcium', 'd3', 'multivitamin'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(d: string): boolean {
  return DATE_REGEX.test(d) && !isNaN(Date.parse(d));
}

function validateScheduleAction(raw: any, validReptileIds: string[]): ScheduleAction | null {
  if (
    raw.type !== 'schedule' ||
    !VALID_TASK_TYPES.includes(raw.taskType) ||
    !validReptileIds.includes(raw.reptileId) ||
    typeof raw.frequencyDays !== 'number' || raw.frequencyDays < 1 ||
    !isValidDate(raw.nextDueDate)
  ) return null;

  return {
    type: 'schedule',
    taskType: raw.taskType,
    reptileId: raw.reptileId,
    frequencyDays: raw.frequencyDays,
    nextDueDate: raw.nextDueDate,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
  };
}

function validateEventAction(raw: any, validReptileIds: string[]): EventAction | null {
  if (
    raw.type !== 'event' ||
    !VALID_EVENT_TYPES.includes(raw.eventType) ||
    !validReptileIds.includes(raw.reptileId) ||
    !isValidDate(raw.eventDate)
  ) return null;

  return {
    type: 'event',
    eventType: raw.eventType,
    reptileId: raw.reptileId,
    eventDate: raw.eventDate,
    details: typeof raw.details === 'string' ? raw.details : undefined,
    weightGrams: typeof raw.weightGrams === 'number' ? raw.weightGrams : undefined,
    supplements: Array.isArray(raw.supplements) 
      ? raw.supplements.filter((s: any) => VALID_SUPPLEMENTS.includes(s))
      : undefined,
  };
}

// Extract JSON actions block from AI response text
export function extractActions(text: string, validReptileIds: string[]): AIAction[] {
  // Look for ```json ... ``` blocks
  const jsonBlockRegex = /```json\s*([\s\S]*?)```/g;
  const actions: AIAction[] = [];

  let match;
  while ((match = jsonBlockRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const rawActions = Array.isArray(parsed.actions) ? parsed.actions : [];
      
      for (const raw of rawActions) {
        if (raw.type === 'schedule') {
          const valid = validateScheduleAction(raw, validReptileIds);
          if (valid) actions.push(valid);
        } else if (raw.type === 'event') {
          const valid = validateEventAction(raw, validReptileIds);
          if (valid) actions.push(valid);
        }
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  return actions;
}

// Remove JSON blocks from text for cleaner display
export function stripActionBlocks(text: string): string {
  return text.replace(/```json\s*[\s\S]*?```/g, '').trim();
}
