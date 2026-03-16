// CareEvent CRUD operations
import { getDB, generateId, getNow, getToday } from './db';
import type { CareEvent, CareEventFormData, EventType } from '@/types';

// Create a new care event
export async function createCareEvent(data: CareEventFormData): Promise<CareEvent> {
  const db = await getDB();
  
  const event: CareEvent = {
    id: generateId(),
    reptileId: data.reptileId,
    eventType: data.eventType,
    eventDate: data.eventDate || getToday(),
    details: data.details,
    photoDataUrl: data.photoDataUrl,
    weightGrams: data.weightGrams,
    lengthCm: data.lengthCm,
    supplements: data.supplements,
    createdAt: getNow(),
  };

  await db.put('careEvents', event);
  return event;
}

// Get all care events
export async function getAllCareEvents(): Promise<CareEvent[]> {
  const db = await getDB();
  const events = await db.getAll('careEvents');
  // Sort by date descending (newest first)
  return events.sort((a, b) => 
    new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime() ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Get care events for a specific reptile
export async function getCareEventsByReptile(reptileId: string): Promise<CareEvent[]> {
  const db = await getDB();
  const events = await db.getAllFromIndex('careEvents', 'by-reptile', reptileId);
  // Sort by date descending
  return events.sort((a, b) => 
    new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime() ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Get care events filtered by type
export async function getCareEventsByType(eventType: EventType): Promise<CareEvent[]> {
  const db = await getDB();
  const events = await db.getAllFromIndex('careEvents', 'by-type', eventType);
  return events.sort((a, b) => 
    new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  );
}

// Get the last event of a specific type for a reptile
export async function getLastEventByType(reptileId: string, eventType: EventType): Promise<CareEvent | undefined> {
  const events = await getCareEventsByReptile(reptileId);
  return events.find(e => e.eventType === eventType);
}

// Get care events for last N days
export async function getRecentEvents(days: number): Promise<CareEvent[]> {
  const db = await getDB();
  const all = await db.getAll('careEvents');
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];
  
  return all
    .filter(e => e.eventDate >= cutoffStr)
    .sort((a, b) => 
      new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
    );
}

// Delete a care event
export async function deleteCareEvent(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('careEvents', id);
}

// Get a single care event
export async function getCareEventById(id: string): Promise<CareEvent | undefined> {
  const db = await getDB();
  return db.get('careEvents', id);
}
