import { addDaysLocal } from '@/lib/date/localDateKey';
import type { CareEvent, ScheduleItem } from '@/types';

export type WeightTrend = 'stable' | 'increasing' | 'decreasing' | 'insufficient_data';
export type FeedingConsistency = 'consistent' | 'irregular' | 'sparse_data';

export interface WeightEntry {
  event: CareEvent;
  date: string;
  grams: number;
}

export interface UpcomingCareSummary {
  overdueCount: number;
  dueTodayCount: number;
  upcomingCount: number;
  nextTask?: ScheduleItem;
  nextTaskDaysAway?: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function compareEventsDesc(a: CareEvent, b: CareEvent): number {
  return (
    b.eventDate.localeCompare(a.eventDate) ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function compareEventsAsc(a: CareEvent, b: CareEvent): number {
  return (
    a.eventDate.localeCompare(b.eventDate) ||
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function dayDiff(fromDateKey: string, toDateKey: string): number {
  const from = new Date(`${fromDateKey}T12:00:00`);
  const to = new Date(`${toDateKey}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function eventIntervals(events: CareEvent[]): number[] {
  const ordered = [...events].sort(compareEventsAsc);
  const intervals: number[] = [];
  for (let index = 1; index < ordered.length; index += 1) {
    const interval = dayDiff(ordered[index - 1].eventDate, ordered[index].eventDate);
    if (interval > 0) intervals.push(interval);
  }
  return intervals;
}

function eventsByType(events: CareEvent[], eventType: CareEvent['eventType']): CareEvent[] {
  return events.filter((event) => event.eventType === eventType).sort(compareEventsDesc);
}

export function getRecentWeights(events: CareEvent[], limit = 3): WeightEntry[] {
  return events
    .filter((event) => typeof event.weightGrams === 'number' && event.weightGrams > 0)
    .sort(compareEventsDesc)
    .slice(0, Math.max(0, limit))
    .map((event) => ({
      event,
      date: event.eventDate,
      grams: event.weightGrams as number,
    }));
}

export function getLatestWeight(events: CareEvent[]): WeightEntry | undefined {
  return getRecentWeights(events, 1)[0];
}

export function getWeightChangePercent(events: CareEvent[], days = 30, todayDateKey?: string): number | undefined {
  const weights = getRecentWeights(events, Number.MAX_SAFE_INTEGER);
  if (weights.length < 2) return undefined;

  const latest = weights[0];
  const cutoff = todayDateKey ? addDaysLocal(todayDateKey, -days) : undefined;
  const inWindow = weights.filter((entry) => (cutoff ? entry.date >= cutoff : true) && entry.date < latest.date);
  const previous = cutoff ? inWindow[inWindow.length - 1] : weights.find((entry) => entry.date < latest.date);

  if (!previous || previous.grams <= 0) return undefined;
  return ((latest.grams - previous.grams) / previous.grams) * 100;
}

export function getWeightTrend(events: CareEvent[]): WeightTrend {
  const weights = getRecentWeights(events, 3);
  if (weights.length < 2) return 'insufficient_data';

  const latest = weights[0];
  const baseline = weights[weights.length - 1];
  if (baseline.grams <= 0) return 'insufficient_data';

  const changePercent = ((latest.grams - baseline.grams) / baseline.grams) * 100;
  if (Math.abs(changePercent) < 3) return 'stable';
  return changePercent > 0 ? 'increasing' : 'decreasing';
}

export function getLastFeedingDate(events: CareEvent[]): string | undefined {
  return eventsByType(events, 'feeding')[0]?.eventDate;
}

export function getAverageFeedingInterval(events: CareEvent[]): number | undefined {
  const intervals = eventIntervals(eventsByType(events, 'feeding'));
  const value = average(intervals);
  return value == null ? undefined : Math.round(value);
}

export function getFeedingConsistency(events: CareEvent[]): FeedingConsistency {
  const feedingEvents = eventsByType(events, 'feeding');
  if (feedingEvents.length < 3) return 'sparse_data';

  const intervals = eventIntervals(feedingEvents);
  const avg = average(intervals);
  if (!avg) return 'sparse_data';

  const tolerance = Math.max(2, avg * 0.35);
  const irregular = intervals.some((interval) => Math.abs(interval - avg) > tolerance);
  return irregular ? 'irregular' : 'consistent';
}

export function getLastShedDate(events: CareEvent[]): string | undefined {
  return eventsByType(events, 'shedding')[0]?.eventDate;
}

export function getAverageShedCycle(events: CareEvent[]): number | undefined {
  const intervals = eventIntervals(eventsByType(events, 'shedding'));
  const value = average(intervals);
  return value == null ? undefined : Math.round(value);
}

export function hasRecentCleaning(events: CareEvent[], days = 14, todayDateKey: string): boolean {
  const cutoff = addDaysLocal(todayDateKey, -days);
  return events.some((event) => event.eventType === 'cleaning' && event.eventDate >= cutoff);
}

export function hasRecentHealthChecks(events: CareEvent[], days = 30, todayDateKey: string): boolean {
  const cutoff = addDaysLocal(todayDateKey, -days);
  return events.some((event) => event.eventType === 'health' && event.eventDate >= cutoff);
}

export function getUpcomingCareSummary(
  schedule: ScheduleItem[],
  todayDateKey: string,
  days = 7,
): UpcomingCareSummary {
  const upcomingCutoff = addDaysLocal(todayDateKey, days);
  const strictItems = schedule.filter((item) => item.scheduleMode !== 'flexible');
  const relevant = strictItems
    .filter((item) => item.nextDueDate <= upcomingCutoff)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
  const nextTask = relevant[0] ?? [...strictItems].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))[0];

  return {
    overdueCount: strictItems.filter((item) => item.nextDueDate < todayDateKey).length,
    dueTodayCount: strictItems.filter((item) => item.nextDueDate === todayDateKey).length,
    upcomingCount: relevant.filter((item) => item.nextDueDate > todayDateKey).length,
    nextTask,
    nextTaskDaysAway: nextTask ? dayDiff(todayDateKey, nextTask.nextDueDate) : undefined,
  };
}
