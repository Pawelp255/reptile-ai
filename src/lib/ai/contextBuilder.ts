// Context Builder for AI Assistant
// Builds structured context from local IndexedDB data

import {
  getAllReptiles,
  getAllCareEvents,
  getAllScheduleItems,
  getAllPairings,
  getAllClutches,
} from '@/lib/storage';
import type { Reptile, CareEvent, ScheduleItem, Pairing, Clutch } from '@/types';
import { estimateTokens } from './openaiClient';

export interface ContextOptions {
  includeReptile?: string; // reptileId
  includePairing?: string; // pairingId
  includeJournal?: boolean;
  includeUpcomingTasks?: boolean;
  rangeDays?: number; // default 30
  includeNotes?: boolean; // default true
  includeWeights?: boolean; // default true
}

export interface BuiltContext {
  text: string;
  estimatedTokens: number;
  sections: {
    reptile?: boolean;
    pairing?: boolean;
    journal?: boolean;
    tasks?: boolean;
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getRecentEvents(events: CareEvent[], rangeDays: number, reptileId?: string): CareEvent[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - rangeDays);
  const cutoffDate = cutoff.toISOString().split('T')[0];

  return events
    .filter(e => e.eventDate >= cutoffDate)
    .filter(e => !reptileId || e.reptileId === reptileId)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate))
    .slice(0, 50);
}

function getUpcomingTasks(items: ScheduleItem[]): ScheduleItem[] {
  const today = new Date().toISOString().split('T')[0];
  const twoWeeksFromNow = new Date();
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
  const futureDate = twoWeeksFromNow.toISOString().split('T')[0];

  return items
    .filter(i => i.nextDueDate >= today && i.nextDueDate <= futureDate)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
}

function buildReptileContext(
  reptile: Reptile, 
  events: CareEvent[], 
  opts: { includeNotes: boolean; includeWeights: boolean }
): string {
  const lines: string[] = [
    `## Selected Reptile: ${reptile.name}`,
    `- ID: ${reptile.id}`,
    `- Species: ${reptile.species}`,
    `- Sex: ${reptile.sex}`,
    `- Diet type: ${reptile.dietType}`,
    `- Breeding status: ${reptile.breedingStatus}`,
  ];

  if (reptile.morph) lines.push(`- Morph: ${reptile.morph}`);
  if (reptile.birthDate) lines.push(`- Birth date: ${formatDate(reptile.birthDate)}`);
  if (reptile.estimatedAgeMonths) lines.push(`- Estimated age: ${reptile.estimatedAgeMonths} months`);
  if (opts.includeNotes && reptile.notes) lines.push(`- Notes: ${reptile.notes}`);
  if (opts.includeNotes && reptile.geneticsNotes) lines.push(`- Genetics notes: ${reptile.geneticsNotes}`);
  if (reptile.hets?.length) lines.push(`- Het traits: ${reptile.hets.join(', ')}`);
  if (reptile.genes?.length) {
    const geneList = reptile.genes.map(g => `${g.name} (${g.mode}: ${g.state})`).join(', ');
    lines.push(`- Genes: ${geneList}`);
  }

  const reptileEvents = events.filter(e => e.reptileId === reptile.id).slice(0, 20);
  if (reptileEvents.length > 0) {
    lines.push('', '### Recent Care Events:');
    for (const event of reptileEvents) {
      let eventLine = `- ${formatDate(event.eventDate)}: ${event.eventType}`;
      if (opts.includeNotes && event.details) eventLine += ` - ${event.details}`;
      if (opts.includeWeights && event.weightGrams) eventLine += ` (Weight: ${event.weightGrams}g)`;
      lines.push(eventLine);
    }
  }

  return lines.join('\n');
}

async function buildPairingContext(pairingId: string, reptiles: Reptile[]): Promise<string> {
  const pairings = await getAllPairings();
  const clutches = await getAllClutches();
  
  const pairing = pairings.find(p => p.id === pairingId);
  if (!pairing) return '';

  const parentA = reptiles.find(r => r.id === pairing.parentAId);
  const parentB = reptiles.find(r => r.id === pairing.parentBId);
  const pairingClutches = clutches.filter(c => c.pairingId === pairingId);

  const lines: string[] = [
    '## Selected Pairing',
    `- Parent A: ${parentA?.name || 'Unknown'} (${parentA?.species || 'Unknown'})`,
    `- Parent B: ${parentB?.name || 'Unknown'} (${parentB?.species || 'Unknown'})`,
    `- Status: ${pairing.status}`,
    `- Start date: ${formatDate(pairing.startDate)}`,
  ];

  if (pairing.notes) lines.push(`- Notes: ${pairing.notes}`);
  if (parentA?.morph) lines.push(`- Parent A morph: ${parentA.morph}`);
  if (parentB?.morph) lines.push(`- Parent B morph: ${parentB.morph}`);

  if (pairingClutches.length > 0) {
    lines.push('', '### Clutches:');
    for (const clutch of pairingClutches) {
      lines.push(`- Laid ${formatDate(clutch.laidDate)}: ${clutch.eggCount} eggs`);
      if (clutch.expectedHatchDate) lines.push(`  Expected hatch: ${formatDate(clutch.expectedHatchDate)}`);
      if (clutch.hatchCount !== undefined) lines.push(`  Hatched: ${clutch.hatchCount}`);
    }
  }

  return lines.join('\n');
}

function buildJournalContext(
  events: CareEvent[], 
  reptiles: Reptile[], 
  rangeDays: number,
  opts: { includeNotes: boolean; includeWeights: boolean }
): string {
  const recentEvents = getRecentEvents(events, rangeDays);
  if (recentEvents.length === 0) return '';

  const reptileMap = new Map(reptiles.map(r => [r.id, r.name]));
  const lines: string[] = [`## Recent Journal Entries (last ${rangeDays} days)`];
  
  for (const event of recentEvents) {
    const reptileName = reptileMap.get(event.reptileId) || 'Unknown';
    let line = `- ${formatDate(event.eventDate)} [${reptileName}]: ${event.eventType}`;
    if (opts.includeNotes && event.details) line += ` - ${event.details}`;
    if (opts.includeWeights && event.weightGrams) line += ` (Weight: ${event.weightGrams}g)`;
    if (event.supplements?.length) line += ` (Supplements: ${event.supplements.join(', ')})`;
    lines.push(line);
  }

  return lines.join('\n');
}

function buildTasksContext(items: ScheduleItem[], reptiles: Reptile[]): string {
  const upcoming = getUpcomingTasks(items);
  if (upcoming.length === 0) return '';

  const reptileMap = new Map(reptiles.map(r => [r.id, r.name]));
  const today = new Date().toISOString().split('T')[0];

  const lines: string[] = ['## Upcoming Tasks (next 14 days)'];
  
  for (const item of upcoming) {
    const reptileName = reptileMap.get(item.reptileId) || 'Unknown';
    const isOverdue = item.nextDueDate < today;
    const status = isOverdue ? '⚠️ OVERDUE' : item.nextDueDate === today ? '📌 TODAY' : '';
    lines.push(`- ${formatDate(item.nextDueDate)} [${reptileName}]: ${item.taskType} ${status}`);
  }

  return lines.join('\n');
}

export async function buildContext(options: ContextOptions): Promise<BuiltContext> {
  const rangeDays = options.rangeDays ?? 30;
  const includeNotes = options.includeNotes ?? true;
  const includeWeights = options.includeWeights ?? true;
  const opts = { includeNotes, includeWeights };

  const [reptiles, events, scheduleItems] = await Promise.all([
    getAllReptiles(),
    getAllCareEvents(),
    getAllScheduleItems(),
  ]);

  const sections: string[] = [];
  const includedSections: BuiltContext['sections'] = {};

  if (options.includeReptile) {
    const reptile = reptiles.find(r => r.id === options.includeReptile);
    if (reptile) {
      const recentEvents = getRecentEvents(events, rangeDays, reptile.id);
      sections.push(buildReptileContext(reptile, recentEvents, opts));
      includedSections.reptile = true;
    }
  }

  if (options.includePairing) {
    const pairingContext = await buildPairingContext(options.includePairing, reptiles);
    if (pairingContext) {
      sections.push(pairingContext);
      includedSections.pairing = true;
    }
  }

  if (options.includeJournal) {
    const journalContext = buildJournalContext(events, reptiles, rangeDays, opts);
    if (journalContext) {
      sections.push(journalContext);
      includedSections.journal = true;
    }
  }

  if (options.includeUpcomingTasks) {
    const tasksContext = buildTasksContext(scheduleItems, reptiles);
    if (tasksContext) {
      sections.push(tasksContext);
      includedSections.tasks = true;
    }
  }

  const text = sections.length > 0 
    ? `# User Context\nToday's date: ${new Date().toISOString().split('T')[0]}\n\n${sections.join('\n\n')}`
    : '';

  return {
    text,
    estimatedTokens: estimateTokens(text),
    sections: includedSections,
  };
}

export async function getReptileOptions(): Promise<{ id: string; name: string; species: string }[]> {
  const reptiles = await getAllReptiles();
  return reptiles.map(r => ({ id: r.id, name: r.name, species: r.species }));
}

export async function getPairingOptions(): Promise<{ id: string; label: string }[]> {
  const [pairings, reptiles] = await Promise.all([
    getAllPairings(),
    getAllReptiles(),
  ]);
  
  const reptileMap = new Map(reptiles.map(r => [r.id, r.name]));
  
  return pairings.map(p => ({
    id: p.id,
    label: `${reptileMap.get(p.parentAId) || 'Unknown'} × ${reptileMap.get(p.parentBId) || 'Unknown'}`,
  }));
}
