/**
 * Compact, computed insight lines for Pro AI (local data only; no secrets).
 */

import type { Reptile, CareEvent, ScheduleItem, Pairing } from '@/types';

const JOURNAL_LOOKBACK_DAYS = 14;
const FEEDING_GAP_DAYS = 14;
const WEIGHT_LOOKBACK_DAYS = 120;
const MAX_LIST = 12;

export type AssistantInsightsV1 = {
  version: 1;
  generatedAt: string;
  overdueTaskAnimals: { id: string; name: string; overdueTaskCount: number }[];
  noJournalRecent14d: { id: string; name: string }[];
  feedingGapAnimals: { id: string; name: string; daysSinceLastFeed: number | null }[];
  weightTrends: {
    id: string;
    name: string;
    trend: 'gaining' | 'losing' | 'stable' | 'insufficient_data';
    detail?: string;
  }[];
  incompleteProfiles: { id: string; name: string; missingFields: string[] }[];
  breedingPairingSummary: {
    active: number;
    planned: number;
    completed: number;
    cancelled: number;
    /** Short human-readable lines for the model */
    highlights: string[];
  };
};

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + 'T12:00:00').getTime();
  const b = new Date(toIso + 'T12:00:00').getTime();
  return Math.floor((b - a) / (24 * 60 * 60 * 1000));
}

function overdueCountByReptile(overdueTasks: { reptileId: string }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of overdueTasks) {
    m.set(t.reptileId, (m.get(t.reptileId) ?? 0) + 1);
  }
  return m;
}

function lastFeedingByReptile(events: CareEvent[]): Map<string, string> {
  const sorted = [...events].filter((e) => e.eventType === 'feeding').sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  const m = new Map<string, string>();
  for (const e of sorted) {
    if (!m.has(e.reptileId)) m.set(e.reptileId, e.eventDate);
  }
  return m;
}

function lastAnyEventByReptile(events: CareEvent[], sinceIso: string): Map<string, string> {
  const recent = events.filter((e) => e.eventDate >= sinceIso).sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  const m = new Map<string, string>();
  for (const e of recent) {
    if (!m.has(e.reptileId)) m.set(e.reptileId, e.eventDate);
  }
  return m;
}

function weightReadingsWindow(
  events: CareEvent[],
  reptileId: string,
  sinceIso: string,
): { date: string; grams: number }[] {
  const rows = events
    .filter((e) => e.reptileId === reptileId && e.weightGrams != null && e.eventDate >= sinceIso)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.id.localeCompare(b.id));
  const out: { date: string; grams: number }[] = [];
  for (const e of rows) {
    if (e.weightGrams == null) continue;
    if (out.length && out[out.length - 1].date === e.eventDate && out[out.length - 1].grams === e.weightGrams) continue;
    out.push({ date: e.eventDate, grams: e.weightGrams });
  }
  return out.slice(-24);
}

function classifyWeightTrend(readings: { date: string; grams: number }[]): {
  trend: 'gaining' | 'losing' | 'stable' | 'insufficient_data';
  detail?: string;
} {
  if (readings.length < 2) return { trend: 'insufficient_data' };
  const first = readings[0];
  const last = readings[readings.length - 1];
  if (first.grams <= 0) return { trend: 'insufficient_data' };
  const pct = ((last.grams - first.grams) / first.grams) * 100;
  let trend: 'gaining' | 'losing' | 'stable';
  if (Math.abs(pct) < 2) trend = 'stable';
  else if (pct > 0) trend = 'gaining';
  else trend = 'losing';
  return {
    trend,
    detail: `${first.grams}g (${first.date}) → ${last.grams}g (${last.date})`,
  };
}

const PROFILE_FIELDS: { key: keyof Reptile; label: string }[] = [
  { key: 'habitatType', label: 'habitat type' },
  { key: 'temperaturePreference', label: 'temperature preference' },
  { key: 'humidityPreference', label: 'humidity preference' },
  { key: 'uvbRequirement', label: 'UVB requirement' },
];

function missingProfileFields(r: Reptile): string[] {
  const missing: string[] = [];
  for (const { key, label } of PROFILE_FIELDS) {
    const v = r[key as keyof Reptile];
    if (v == null || v === '') missing.push(label);
  }
  if (r.sex === 'unknown') missing.push('sex (unknown)');
  if (!r.birthDate && (r.estimatedAgeMonths == null || r.estimatedAgeMonths === undefined)) {
    missing.push('age (no birth date or estimated age)');
  }
  return missing;
}

export function buildAssistantInsights(params: {
  reptiles: Reptile[];
  events: CareEvent[];
  overdueTasks: { reptileId: string }[];
  pairings: Pairing[];
  reptileNames: Map<string, string>;
}): AssistantInsightsV1 {
  const day = todayIso();
  const journalSince = addDaysIso(day, -JOURNAL_LOOKBACK_DAYS);
  const weightSince = addDaysIso(day, -WEIGHT_LOOKBACK_DAYS);

  const all = params.reptiles;
  const nameOf = (id: string) => params.reptileNames.get(id) ?? 'Unknown';

  const overdueMap = overdueCountByReptile(params.overdueTasks);
  const overdueTaskAnimals = all
    .map((r) => {
      const c = overdueMap.get(r.id) ?? 0;
      return c > 0 ? { id: r.id, name: r.name, overdueTaskCount: c } : null;
    })
    .filter(Boolean) as AssistantInsightsV1['overdueTaskAnimals'];
  overdueTaskAnimals.sort((a, b) => b.overdueTaskCount - a.overdueTaskCount);

  const recentEventByReptile = lastAnyEventByReptile(params.events, journalSince);
  const noJournalRecent14d = all
    .filter((r) => !recentEventByReptile.has(r.id))
    .map((r) => ({ id: r.id, name: r.name }));

  const lastFeed = lastFeedingByReptile(params.events);
  const feedingGapAnimals: AssistantInsightsV1['feedingGapAnimals'] = [];
  for (const r of all) {
    const lf = lastFeed.get(r.id);
    if (!lf) {
      feedingGapAnimals.push({ id: r.id, name: r.name, daysSinceLastFeed: null });
      continue;
    }
    const gap = daysBetween(lf, day);
    if (gap >= FEEDING_GAP_DAYS) {
      feedingGapAnimals.push({ id: r.id, name: r.name, daysSinceLastFeed: gap });
    }
  }

  const weightTrends: AssistantInsightsV1['weightTrends'] = [];
  for (const r of all) {
    const readings = weightReadingsWindow(params.events, r.id, weightSince);
    const { trend, detail } = classifyWeightTrend(readings);
    if (trend !== 'insufficient_data') {
      weightTrends.push({ id: r.id, name: r.name, trend, detail });
    }
  }

  const incompleteProfiles: AssistantInsightsV1['incompleteProfiles'] = [];
  for (const r of all) {
    const missingFields = missingProfileFields(r);
    if (missingFields.length) {
      incompleteProfiles.push({ id: r.id, name: r.name, missingFields: missingFields.slice(0, 8) });
    }
  }

  const counts = { active: 0, planned: 0, completed: 0, cancelled: 0 };
  const highlights: string[] = [];
  for (const p of params.pairings) {
    if (p.status === 'active') counts.active++;
    else if (p.status === 'planned') counts.planned++;
    else if (p.status === 'completed') counts.completed++;
    else if (p.status === 'cancelled') counts.cancelled++;
    if (p.status === 'active' && highlights.length < 5) {
      highlights.push(
        `${nameOf(p.parentAId)} × ${nameOf(p.parentBId)} (active, since ${p.startDate})`,
      );
    }
  }
  if (counts.planned > 0 && highlights.length < 5) {
    for (const p of params.pairings) {
      if (p.status !== 'planned' || highlights.length >= 5) continue;
      highlights.push(`${nameOf(p.parentAId)} × ${nameOf(p.parentBId)} (planned)`);
    }
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    overdueTaskAnimals: overdueTaskAnimals.slice(0, MAX_LIST),
    noJournalRecent14d: noJournalRecent14d.slice(0, MAX_LIST),
    feedingGapAnimals: feedingGapAnimals.slice(0, MAX_LIST),
    weightTrends: weightTrends.slice(0, MAX_LIST),
    incompleteProfiles: incompleteProfiles.slice(0, MAX_LIST),
    breedingPairingSummary: {
      ...counts,
      highlights: highlights.slice(0, 5),
    },
  };
}

/** Overdue schedule rows (same rule as assistantAppContext partition). */
export function listOverdueTasksForInsights(items: ScheduleItem[], reptileIds: Set<string>): ScheduleItem[] {
  const day = todayIso();
  return items.filter((i) => i.nextDueDate < day && reptileIds.has(i.reptileId));
}
