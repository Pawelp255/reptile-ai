/**
 * Structured Pro assistant payload built from local IndexedDB data.
 * No secrets; no base64 image bodies; bounded size for Edge + OpenAI.
 */

import { stripDemoMarkerForDisplay } from '@/lib/display/stripDemoMarker';
import {
  getAllReptiles,
  getAllCareEvents,
  getAllScheduleItems,
  getAllPairings,
  getAllClutches,
} from '@/lib/storage';
import type { Reptile, CareEvent, ScheduleItem, Pairing, Clutch } from '@/types';
import type { GeneticGene } from '@/types/genetics';
import type { ContextOptions } from '@/lib/ai/contextBuilder';
import { buildAssistantInsights, listOverdueTasksForInsights, type AssistantInsightsV1 } from '@/lib/ai/assistantInsights';

const MAX_ANIMALS = 36;
const MAX_TASKS_PER_BUCKET = 28;
const MAX_JOURNAL_EVENTS = 42;
const MAX_PAIRINGS = 16;
const MAX_NOTES_CHARS = 480;
const MAX_JSON_CHARS = 22_000;

export type AssistantAppContextV1 = {
  version: 1;
  generatedAt: string;
  currentPage: string;
  selectedReptileId?: string | null;
  selectedPairingId?: string | null;
  /** Multimodal vision off until product sends image parts to the model */
  imageVisionAvailable: boolean;
  /** Honest, user-facing capability line(s) for the model */
  imageCapabilitySummary: string;
  insights: AssistantInsightsV1;
  meta: {
    animalCount: number;
    tasksDueToday: number;
    tasksOverdue: number;
    tasksUpcoming7d: number;
    journalRecent14d: number;
    imageUrlsAvailable: number;
    imagesLocalOnly: number;
  };
  animals: AssistantAnimalSnapshot[];
  schedules?: {
    dueToday: AssistantTaskSnapshot[];
    overdue: AssistantTaskSnapshot[];
    upcoming7d: AssistantTaskSnapshot[];
  };
  journalRecent?: AssistantJournalSnapshot[];
  breeding?: {
    pairings: AssistantPairingSnapshot[];
  };
};

export type AssistantAnimalSnapshot = {
  id: string;
  name: string;
  species: string;
  morph?: string;
  sex: string;
  birthDate?: string;
  estimatedAgeMonths?: number;
  notes?: string;
  geneticsNotes?: string;
  hets?: string[];
  genes?: string;
  lastWeightGrams?: number;
  lastWeightDate?: string;
  photo?: {
    httpUrl?: string;
    localOnly?: boolean;
    reason?: string;
  };
};

export type AssistantTaskSnapshot = {
  id: string;
  reptileId: string;
  reptileName: string;
  taskType: string;
  nextDueDate: string;
  frequencyDays: number;
};

export type AssistantJournalSnapshot = {
  id: string;
  eventDate: string;
  eventType: string;
  reptileId: string;
  reptileName: string;
  details?: string;
  weightGrams?: number;
  hasPhotoLocalOnly?: boolean;
};

export type AssistantPairingSnapshot = {
  id: string;
  parentAId: string;
  parentBId: string;
  parentAName: string;
  parentBName: string;
  status: string;
  startDate: string;
  notes?: string;
  clutchCount: number;
};

export type AssistantContextBuildResult = {
  appContext: AssistantAppContextV1;
  /** Slim list for legacy Edge field + action tooling */
  animalsMinimal: { id: string; name: string; species: string }[];
};

function buildImageCapabilitySummary(meta: AssistantAppContextV1['meta'], imageVisionAvailable: boolean): string {
  if (imageVisionAvailable) {
    return 'Image vision may be available when enabled; follow imageVisionAvailable and snapshot fields.';
  }
  const parts: string[] = [];
  if (meta.imagesLocalOnly > 0) {
    parts.push('Images stored locally — AI cannot view them yet.');
  }
  if (meta.imageUrlsAvailable > 0) {
    parts.push('Image URLs available — AI can reference URLs only.');
  }
  if (parts.length === 0) {
    parts.push('No http(s) photo URLs in this export; the assistant has no image pixels or URLs to fetch.');
  }
  return parts.join(' ');
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function clip(s: string | undefined, max: number): string | undefined {
  if (!s) return undefined;
  const t = stripDemoMarkerForDisplay(s).trim();
  if (!t) return undefined;
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function formatGenesCompact(genes: GeneticGene[] | undefined): string | undefined {
  if (!genes?.length) return undefined;
  const parts = genes
    .filter((g) => g.state !== 'none')
    .map((g) => `${g.name}:${g.mode}:${g.state}`)
    .slice(0, 24);
  return parts.length ? parts.join('; ') : undefined;
}

function classifyPhoto(photoUrl?: string): AssistantAnimalSnapshot['photo'] {
  if (!photoUrl?.trim()) return undefined;
  const p = photoUrl.trim();
  if (p.startsWith('https://') || p.startsWith('http://')) {
    return { httpUrl: p.length > 800 ? `${p.slice(0, 800)}…` : p };
  }
  if (p.startsWith('data:')) {
    return { localOnly: true, reason: 'data_url_local_device_only_not_sent_to_ai' };
  }
  if (p.startsWith('blob:')) {
    return { localOnly: true, reason: 'blob_url_not_accessible_from_server' };
  }
  return { localOnly: true, reason: 'non_http_reference_local_app_storage_only' };
}

function partitionSchedule(
  items: ScheduleItem[],
  reptileNames: Map<string, string>,
): AssistantAppContextV1['schedules'] & {
  _counts: { overdue: number; dueToday: number; upcoming7d: number };
} {
  const day = todayIso();
  const weekEnd = addDaysIso(day, 7);

  const overdue: AssistantTaskSnapshot[] = [];
  const dueToday: AssistantTaskSnapshot[] = [];
  const upcoming7d: AssistantTaskSnapshot[] = [];

  for (const i of items) {
    const snap: AssistantTaskSnapshot = {
      id: i.id,
      reptileId: i.reptileId,
      reptileName: reptileNames.get(i.reptileId) ?? 'Unknown',
      taskType: i.taskType,
      nextDueDate: i.nextDueDate,
      frequencyDays: i.frequencyDays,
    };
    if (i.nextDueDate < day) overdue.push(snap);
    else if (i.nextDueDate === day) dueToday.push(snap);
    else if (i.nextDueDate > day && i.nextDueDate <= weekEnd) upcoming7d.push(snap);
  }

  overdue.sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
  dueToday.sort((a, b) => a.reptileName.localeCompare(b.reptileName));
  upcoming7d.sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

  const counts = { overdue: overdue.length, dueToday: dueToday.length, upcoming7d: upcoming7d.length };

  return {
    overdue: overdue.slice(0, MAX_TASKS_PER_BUCKET),
    dueToday: dueToday.slice(0, MAX_TASKS_PER_BUCKET),
    upcoming7d: upcoming7d.slice(0, MAX_TASKS_PER_BUCKET),
    _counts: counts,
  };
}

function latestWeightsByReptile(events: CareEvent[]): Map<string, { grams: number; date: string }> {
  const sorted = [...events].sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  const m = new Map<string, { grams: number; date: string }>();
  for (const e of sorted) {
    if (e.weightGrams == null || m.has(e.reptileId)) continue;
    m.set(e.reptileId, { grams: e.weightGrams, date: e.eventDate });
  }
  return m;
}

function journalLast14Days(
  events: CareEvent[],
  reptileNames: Map<string, string>,
  includeNotes: boolean,
  includeWeights: boolean,
): AssistantJournalSnapshot[] {
  const cutoff = addDaysIso(todayIso(), -14);
  return events
    .filter((e) => e.eventDate >= cutoff)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate))
    .slice(0, MAX_JOURNAL_EVENTS)
    .map((e) => ({
      id: e.id,
      eventDate: e.eventDate,
      eventType: e.eventType,
      reptileId: e.reptileId,
      reptileName: reptileNames.get(e.reptileId) ?? 'Unknown',
      details: includeNotes ? clip(e.details, MAX_NOTES_CHARS) : undefined,
      weightGrams: includeWeights ? e.weightGrams : undefined,
      hasPhotoLocalOnly: !!(e.photoDataUrl && String(e.photoDataUrl).trim().length > 0),
    }));
}

function trimPayloadToMaxChars(ctx: AssistantAppContextV1): AssistantAppContextV1 {
  let s = JSON.stringify(ctx);
  if (s.length <= MAX_JSON_CHARS) return ctx;

  const clone: AssistantAppContextV1 = structuredClone(ctx);
  while (s.length > MAX_JSON_CHARS && clone.journalRecent && clone.journalRecent.length > 3) {
    clone.journalRecent.pop();
    s = JSON.stringify(clone);
  }
  while (s.length > MAX_JSON_CHARS && clone.schedules) {
    if (clone.schedules.upcoming7d.length > 2) clone.schedules.upcoming7d.pop();
    else if (clone.schedules.overdue.length > 2) clone.schedules.overdue.pop();
    else if (clone.schedules.dueToday.length > 2) clone.schedules.dueToday.pop();
    else break;
    s = JSON.stringify(clone);
  }
  while (s.length > MAX_JSON_CHARS && clone.animals.length > 4) {
    clone.animals.pop();
    s = JSON.stringify(clone);
  }
  while (s.length > MAX_JSON_CHARS && clone.insights) {
    const ins = clone.insights;
    if (ins.incompleteProfiles.length > 2) ins.incompleteProfiles.pop();
    else if (ins.feedingGapAnimals.length > 2) ins.feedingGapAnimals.pop();
    else if (ins.noJournalRecent14d.length > 2) ins.noJournalRecent14d.pop();
    else if (ins.overdueTaskAnimals.length > 2) ins.overdueTaskAnimals.pop();
    else if (ins.weightTrends.length > 2) ins.weightTrends.pop();
    else if (ins.breedingPairingSummary.highlights.length > 1) ins.breedingPairingSummary.highlights.pop();
    else break;
    s = JSON.stringify(clone);
  }
  return clone;
}

export async function buildAssistantAppContext(
  options: ContextOptions & { currentPage?: string },
): Promise<AssistantContextBuildResult> {
  const [reptiles, events, scheduleItems, pairings, clutches] = await Promise.all([
    getAllReptiles(),
    getAllCareEvents(),
    getAllScheduleItems(),
    getAllPairings(),
    getAllClutches(),
  ]);

  const includeNotes = options.includeNotes ?? true;
  const includeWeights = options.includeWeights ?? true;
  const weightsMap = latestWeightsByReptile(events);

  const reptileNames = new Map(reptiles.map((r) => [r.id, r.name]));

  const animalsSlice = reptiles.slice(0, MAX_ANIMALS);
  let imageUrlsAvailable = 0;
  let imagesLocalOnly = 0;

  const animals: AssistantAnimalSnapshot[] = animalsSlice.map((r) => {
    const ext = r as Reptile & { photoDataUrl?: string };
    const primaryPhoto = ext.photoDataUrl?.trim() ? ext.photoDataUrl : r.photoUrl;
    const photo = classifyPhoto(primaryPhoto);
    if (photo?.httpUrl) imageUrlsAvailable += 1;
    if (photo?.localOnly) imagesLocalOnly += 1;

    const lw = weightsMap.get(r.id);
    return {
      id: r.id,
      name: r.name,
      species: r.species,
      morph: r.morph,
      sex: r.sex,
      birthDate: r.birthDate,
      estimatedAgeMonths: r.estimatedAgeMonths,
      notes: includeNotes ? clip(r.notes, MAX_NOTES_CHARS) : undefined,
      geneticsNotes: includeNotes ? clip(r.geneticsNotes, MAX_NOTES_CHARS) : undefined,
      hets: r.hets?.length ? r.hets.slice(0, 40) : undefined,
      genes: formatGenesCompact(r.genes),
      lastWeightGrams: includeWeights ? lw?.grams : undefined,
      lastWeightDate: includeWeights ? lw?.date : undefined,
      photo: photo && (photo.httpUrl || photo.localOnly) ? photo : undefined,
    };
  });

  let schedulePartition:
    | (NonNullable<AssistantAppContextV1['schedules']> & {
        _counts: { overdue: number; dueToday: number; upcoming7d: number };
      })
    | undefined;

  if (options.includeUpcomingTasks === true) {
    schedulePartition = partitionSchedule(scheduleItems, reptileNames);
  }

  const schedules = schedulePartition
    ? {
        overdue: schedulePartition.overdue,
        dueToday: schedulePartition.dueToday,
        upcoming7d: schedulePartition.upcoming7d,
      }
    : undefined;

  const journalRecentAll =
    options.includeJournal === true
      ? journalLast14Days(events, reptileNames, includeNotes, includeWeights)
      : undefined;

  const journalRecent = journalRecentAll;

  const clutchByPairing = new Map<string, number>();
  for (const c of clutches) {
    clutchByPairing.set(c.pairingId, (clutchByPairing.get(c.pairingId) ?? 0) + 1);
  }

  const pairingSnapshots: AssistantPairingSnapshot[] = pairings.slice(0, MAX_PAIRINGS).map((p) => {
    const pa = reptiles.find((r) => r.id === p.parentAId);
    const pb = reptiles.find((r) => r.id === p.parentBId);
    return {
      id: p.id,
      parentAId: p.parentAId,
      parentBId: p.parentBId,
      parentAName: pa?.name ?? 'Unknown',
      parentBName: pb?.name ?? 'Unknown',
      status: p.status,
      startDate: p.startDate,
      notes: includeNotes ? clip(p.notes, MAX_NOTES_CHARS) : undefined,
      clutchCount: clutchByPairing.get(p.id) ?? 0,
    };
  });

  const meta = {
    animalCount: reptiles.length,
    tasksDueToday: schedulePartition?._counts.dueToday ?? 0,
    tasksOverdue: schedulePartition?._counts.overdue ?? 0,
    tasksUpcoming7d: schedulePartition?._counts.upcoming7d ?? 0,
    journalRecent14d: journalRecentAll?.length ?? 0,
    imageUrlsAvailable,
    imagesLocalOnly,
  };

  const reptileIdSet = new Set(reptiles.map((r) => r.id));
  const overdueForInsights = listOverdueTasksForInsights(scheduleItems, reptileIdSet);
  const insights = buildAssistantInsights({
    reptiles,
    events,
    overdueTasks: overdueForInsights,
    pairings,
    reptileNames,
  });

  const imageVisionAvailable = false;
  const imageCapabilitySummary = buildImageCapabilitySummary(meta, imageVisionAvailable);

  const raw: AssistantAppContextV1 = {
    version: 1,
    generatedAt: new Date().toISOString(),
    currentPage: options.currentPage ?? 'ai-assistant',
    selectedReptileId:
      options.includeReptile && options.includeReptile !== '__none__' ? options.includeReptile : null,
    selectedPairingId:
      options.includePairing && options.includePairing !== '__none__' ? options.includePairing : null,
    imageVisionAvailable,
    imageCapabilitySummary,
    insights,
    meta,
    animals,
    schedules,
    journalRecent,
    breeding: pairingSnapshots.length ? { pairings: pairingSnapshots } : undefined,
  };

  const appContext = trimPayloadToMaxChars(raw);

  const animalsMinimal = appContext.animals.map((a) => ({
    id: a.id,
    name: a.name,
    species: a.species,
  }));

  return { appContext, animalsMinimal };
}
