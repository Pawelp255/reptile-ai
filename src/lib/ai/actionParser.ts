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

type ActionCandidate = Record<string, unknown>;

function isValidDate(d: string): boolean {
  return DATE_REGEX.test(d) && !isNaN(Date.parse(d));
}

function isActionCandidate(value: unknown): value is ActionCandidate {
  return typeof value === 'object' && value !== null;
}

function isTaskType(value: unknown): value is TaskType {
  return typeof value === 'string' && VALID_TASK_TYPES.includes(value as TaskType);
}

function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && VALID_EVENT_TYPES.includes(value as EventType);
}

function validateScheduleAction(raw: ActionCandidate, validReptileIds: string[]): ScheduleAction | null {
  if (
    raw.type !== 'schedule' ||
    !isTaskType(raw.taskType) ||
    typeof raw.reptileId !== 'string' ||
    !validReptileIds.includes(raw.reptileId) ||
    typeof raw.frequencyDays !== 'number' || raw.frequencyDays < 1 ||
    typeof raw.nextDueDate !== 'string' ||
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

function validateEventAction(raw: ActionCandidate, validReptileIds: string[]): EventAction | null {
  if (
    raw.type !== 'event' ||
    !isEventType(raw.eventType) ||
    typeof raw.reptileId !== 'string' ||
    !validReptileIds.includes(raw.reptileId) ||
    typeof raw.eventDate !== 'string' ||
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
      ? raw.supplements.filter((s): s is Supplement => VALID_SUPPLEMENTS.includes(s as Supplement))
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
      const rawActions = isActionCandidate(parsed) && Array.isArray(parsed.actions) ? parsed.actions : [];
      
      for (const raw of rawActions) {
        if (!isActionCandidate(raw)) continue;
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
