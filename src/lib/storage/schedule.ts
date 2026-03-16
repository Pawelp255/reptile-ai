// ScheduleItem CRUD operations
import { getDB, generateId, getToday, addDays, isOverdue, isDueToday, isWithinDays } from './db';
import type { ScheduleItem, TaskType, CareEvent, EventType } from '@/types';
import { createCareEvent } from './events';

// Get all schedule items
export async function getAllScheduleItems(): Promise<ScheduleItem[]> {
  const db = await getDB();
  return db.getAll('scheduleItems');
}

// Get schedule items for a specific reptile
export async function getScheduleByReptile(reptileId: string): Promise<ScheduleItem[]> {
  const db = await getDB();
  return db.getAllFromIndex('scheduleItems', 'by-reptile', reptileId);
}

// Get tasks due today
export async function getTasksDueToday(): Promise<ScheduleItem[]> {
  const all = await getAllScheduleItems();
  return all.filter(item => isDueToday(item.nextDueDate));
}

// Get overdue tasks
export async function getOverdueTasks(): Promise<ScheduleItem[]> {
  const all = await getAllScheduleItems();
  return all.filter(item => isOverdue(item.nextDueDate));
}

// Get tasks due within next N days (including today)
export async function getUpcomingTasks(days: number): Promise<ScheduleItem[]> {
  const all = await getAllScheduleItems();
  return all
    .filter(item => isWithinDays(item.nextDueDate, days) || isOverdue(item.nextDueDate))
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
}

// Map task type to event type
function taskTypeToEventType(taskType: TaskType): EventType {
  switch (taskType) {
    case 'feed': return 'feeding';
    case 'clean': return 'cleaning';
    case 'check': return 'note';
  }
}

// Get default details for auto-generated events
function getDefaultDetails(taskType: TaskType): string {
  switch (taskType) {
    case 'feed': return 'Feeding completed';
    case 'clean': return 'Enclosure cleaned';
    case 'check': return 'Routine check completed';
  }
}

// Mark a task as done - updates schedule and creates care event
export async function markTaskDone(
  scheduleItemId: string, 
  details?: string
): Promise<{ scheduleItem: ScheduleItem; careEvent: CareEvent }> {
  const db = await getDB();
  const item = await db.get('scheduleItems', scheduleItemId);
  
  if (!item) {
    throw new Error('Schedule item not found');
  }

  const today = getToday();

  // Update schedule item
  const updatedItem: ScheduleItem = {
    ...item,
    lastDoneDate: today,
    nextDueDate: addDays(today, item.frequencyDays),
  };

  await db.put('scheduleItems', updatedItem);

  // Create care event
  const careEvent = await createCareEvent({
    reptileId: item.reptileId,
    eventType: taskTypeToEventType(item.taskType),
    eventDate: today,
    details: details || getDefaultDetails(item.taskType),
  });

  return { scheduleItem: updatedItem, careEvent };
}

// Update schedule item frequency
export async function updateScheduleFrequency(
  scheduleItemId: string, 
  frequencyDays: number
): Promise<ScheduleItem | undefined> {
  const db = await getDB();
  const item = await db.get('scheduleItems', scheduleItemId);
  
  if (!item) return undefined;

  const today = getToday();
  const updated: ScheduleItem = {
    ...item,
    frequencyDays,
    // Recalculate next due date from today
    nextDueDate: addDays(today, frequencyDays),
  };

  await db.put('scheduleItems', updated);
  return updated;
}

// Delete a schedule item
export async function deleteScheduleItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('scheduleItems', id);
}

// Get next feeding date for a reptile
export async function getNextFeedingDate(reptileId: string): Promise<string | undefined> {
  const schedules = await getScheduleByReptile(reptileId);
  const feedSchedule = schedules.find(s => s.taskType === 'feed');
  return feedSchedule?.nextDueDate;
}
