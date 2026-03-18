// ICS Calendar Export
import type { ScheduleItem, Reptile, TaskType } from '@/types';
import { addDays } from '../storage/db';

const taskLabels: Record<TaskType, string> = {
  feed: 'Feeding',
  clean: 'Cleaning',
  check: 'Health Check',
};

function formatICSDate(dateStr: string): string {
  // Format: YYYYMMDD
  return dateStr.replace(/-/g, '');
}

function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@reptilita.com`;
}

function escapeICS(text: string): string {
  return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
}

export function generateICS(scheduleItems: ScheduleItem[], reptiles: Reptile[]): string {
  const reptileMap = new Map(reptiles.map(r => [r.id, r]));
  const today = new Date().toISOString().split('T')[0];
  
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Reptilita//Care Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Reptilita Care Schedule',
  ];

  // Generate events for next 30 days
  for (const item of scheduleItems) {
    const reptile = reptileMap.get(item.reptileId);
    if (!reptile) continue;

    // Calculate all occurrences within next 30 days
    let currentDate = item.nextDueDate;
    const endDate = addDays(today, 30);
    
    while (currentDate <= endDate) {
      if (currentDate >= today) {
        const summary = `${taskLabels[item.taskType]} - ${reptile.name}`;
        const description = `${taskLabels[item.taskType]} for ${reptile.name} (${reptile.species})`;
        
        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${generateUID()}`);
        lines.push(`DTSTAMP:${formatICSDate(today)}T000000Z`);
        lines.push(`DTSTART;VALUE=DATE:${formatICSDate(currentDate)}`);
        lines.push(`DTEND;VALUE=DATE:${formatICSDate(addDays(currentDate, 1))}`);
        lines.push(`SUMMARY:${escapeICS(summary)}`);
        lines.push(`DESCRIPTION:${escapeICS(description)}`);
        lines.push('END:VEVENT');
      }
      
      // Move to next occurrence
      currentDate = addDays(currentDate, item.frequencyDays);
    }
  }

  lines.push('END:VCALENDAR');
  
  return lines.join('\r\n');
}
