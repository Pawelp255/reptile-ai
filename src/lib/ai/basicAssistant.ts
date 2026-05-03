/**
 * Basic (Free) assistant — deterministic summaries from local IndexedDB only.
 * No OpenAI, no Edge Function.
 */

import { format } from 'date-fns';
import type { CareEvent, Reptile, ScheduleItem, TaskType } from '@/types';
import { getAllReptiles } from '@/lib/storage/reptiles';
import { getTasksDueToday, getOverdueTasks, getUpcomingTasks } from '@/lib/storage/schedule';
import { getRecentEvents } from '@/lib/storage/events';

const TASK_LABEL: Record<TaskType, string> = {
  feed: 'Feeding',
  clean: 'Cleaning',
  check: 'Health check',
};

function norm(s: string): string {
  return s.toLowerCase().trim();
}

function hasAny(q: string, keys: string[]): boolean {
  return keys.some((k) => q.includes(k));
}

async function loadSnapshot(focusReptileId?: string | null) {
  const [reptiles, dueToday, overdue, upcoming7, recentEvents] = await Promise.all([
    getAllReptiles(),
    getTasksDueToday(),
    getOverdueTasks(),
    getUpcomingTasks(7),
    getRecentEvents(14),
  ]);

  const nameById = new Map(reptiles.map((r) => [r.id, r.name]));
  const focusReptile =
    focusReptileId && focusReptileId !== '__none__'
      ? reptiles.find((r) => r.id === focusReptileId)
      : undefined;

  const filterByFocus = <T extends { reptileId: string }>(rows: T[]) =>
    focusReptileId && focusReptileId !== '__none__'
      ? rows.filter((x) => x.reptileId === focusReptileId)
      : rows;

  return {
    reptiles,
    dueToday: filterByFocus(dueToday),
    overdue: filterByFocus(overdue),
    upcoming7: filterByFocus(upcoming7),
    recentEvents: filterByFocus(recentEvents),
    nameById,
    focusReptile,
  };
}

function lineTask(t: ScheduleItem, nameById: Map<string, string>): string {
  const who = nameById.get(t.reptileId) ?? 'Animal';
  const when = format(new Date(t.nextDueDate), 'MMM d, yyyy');
  return `• ${who}: ${TASK_LABEL[t.taskType]} (due ${when})`;
}

function lineEvent(e: CareEvent, nameById: Map<string, string>): string {
  const who = nameById.get(e.reptileId) ?? 'Animal';
  const when = format(new Date(e.eventDate), 'MMM d, yyyy');
  const detail = e.details?.trim() ? ` — ${e.details.trim().slice(0, 120)}${e.details.length > 120 ? '…' : ''}` : '';
  return `• ${when} · ${who}: ${e.eventType}${detail}`;
}

function summarizeAnimals(reptiles: Reptile[], focus?: Reptile): string {
  const list = focus ? [focus] : reptiles;
  if (list.length === 0) {
    return 'You have no animals saved yet. Add one from the Today tab or My Animals → Add Animal.';
  }
  const head = focus ? `Focused animal: ${focus.name}` : `You have ${reptiles.length} animal${reptiles.length === 1 ? '' : 's'} saved locally.`;
  const lines = list.slice(0, 25).map((r) => {
    const bits = [r.species];
    if (r.morph?.trim()) bits.push(r.morph.trim());
    return `• ${r.name} (${bits.join(', ')})`;
  });
  return `${head}\n\n${lines.join('\n')}${list.length > 25 ? '\n…' : ''}`;
}

function summarizeTasks(title: string, items: ScheduleItem[], nameById: Map<string, string>): string {
  if (items.length === 0) return `${title}: none right now.`;
  return `${title} (${items.length}):\n${items.slice(0, 30).map((t) => lineTask(t, nameById)).join('\n')}${items.length > 30 ? '\n…' : ''}`;
}

function summarizeEvents(events: CareEvent[], nameById: Map<string, string>): string {
  const sorted = [...events].sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  if (sorted.length === 0) return 'No journal entries in the last two weeks.';
  return `Recent journal / care events (${sorted.length} in range):\n${sorted.slice(0, 20).map((e) => lineEvent(e, nameById)).join('\n')}${sorted.length > 20 ? '\n…' : ''}`;
}

function navigationAnswer(q: string): string | null {
  if (hasAny(q, ['setting', 'account', 'sign out', 'theme'])) {
    return 'Open Settings from the bottom navigation for account, appearance, backup/export, and Plans.\n\nEverything stays on your device unless you use Cloud Sync while signed in.';
  }
  if (hasAny(q, ['backup', 'export', 'import', 'restore'])) {
    return 'Backup & restore live under Settings → Backup (JSON export/import, works offline).\n\nUse Cloud Sync on the same screen if you want animals merged across devices when signed in.';
  }
  if (hasAny(q, ['sync', 'cloud'])) {
    return 'Cloud Sync is under Settings after you sign in — tap Sync now to merge animals with your account.\n\nBackup files are separate from sync (good for archives).';
  }
  if (hasAny(q, ['journal', 'care event']) && hasAny(q, ['where', 'find', 'open'])) {
    return 'Use the Journal tab in the bottom navigation to browse and add care events.';
  }
  if (hasAny(q, ['today', 'dashboard']) && hasAny(q, ['where', 'find'])) {
    return 'The Today tab shows what’s due soon and quick shortcuts (add animal, events, genetics).';
  }
  if (hasAny(q, ['genetic', 'pairing', 'breed'])) {
    return 'Genetics calculator: Today tab → Open Genetics, or Settings → Breeding tools. Pairings live under Breeding from an animal profile.';
  }
  return null;
}

function helpMessage(): string {
  return [
    'Basic assistant summarizes what’s already in Reptilita on this device — no cloud AI.',
    '',
    'Try asking:',
    '• “Summarize my animals”',
    '• “What’s due today?”',
    '• “What’s overdue?”',
    '• “Recent journal entries”',
    '• “Where is backup?”',
    '',
    'Upgrade to Reptilita Pro for the Smart assistant with server-side AI once your account is marked Pro.',
  ].join('\n');
}

function defaultRollup(
  reptiles: Reptile[],
  dueToday: ScheduleItem[],
  overdue: ScheduleItem[],
  recentEvents: CareEvent[],
  nameById: Map<string, string>,
  focus?: Reptile,
): string {
  const parts: string[] = [
    'Local summary (Basic assistant)',
    '',
  ];
  if (focus) parts.push(`Focus: ${focus.name}\n`);

  parts.push(`Animals: ${reptiles.length} saved locally.`);

  if (overdue.length > 0) {
    parts.push('', `Overdue (${overdue.length}) — tackle these first:`);
    overdue.slice(0, 8).forEach((t) => parts.push(lineTask(t, nameById)));
    if (overdue.length > 8) parts.push('…');
  }

  if (dueToday.length > 0) {
    parts.push('', `Due today (${dueToday.length}):`);
    dueToday.slice(0, 8).forEach((t) => parts.push(lineTask(t, nameById)));
    if (dueToday.length > 8) parts.push('…');
  }

  if (recentEvents.length > 0) {
    parts.push('', `Latest journal activity:`);
    recentEvents
      .slice()
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate))
      .slice(0, 5)
      .forEach((e) => parts.push(lineEvent(e, nameById)));
  }

  parts.push(
    '',
    'Open Today for due tasks, Journal for logs, Settings for backup/sync.',
    '',
    'Say “help” for example questions. Reptilita Pro unlocks the Smart AI assistant.',
  );

  return parts.join('\n');
}

export type BasicAssistantOptions = {
  /** Restrict lists to one reptile when set */
  focusReptileId?: string | null;
};

/**
 * Builds a full reply string from local data + simple keyword routing.
 */
export async function buildBasicAssistantReply(
  userMessage: string,
  options: BasicAssistantOptions = {},
): Promise<string> {
  const q = norm(userMessage);
  const snap = await loadSnapshot(options.focusReptileId ?? undefined);
  const { reptiles, dueToday, overdue, upcoming7, recentEvents, nameById, focusReptile } = snap;

  const nav = navigationAnswer(q);
  if (nav) {
    return `Basic assistant (local)\n\n${nav}`;
  }

  if (hasAny(q, ['help', 'what can you', 'commands', 'how does this work'])) {
    return helpMessage();
  }

  if (hasAny(q, ['summarize', 'list my', 'my animal', 'who do i have', 'collection', 'how many animal'])) {
    return `Basic assistant (local)\n\n${summarizeAnimals(reptiles, focusReptile)}`;
  }

  if (hasAny(q, ['due today', 'today task', 'today schedule', 'what is due today'])) {
    return `Basic assistant (local)\n\n${summarizeTasks('Due today', dueToday, nameById)}`;
  }

  if (hasAny(q, ['overdue', 'late task', 'missed'])) {
    return `Basic assistant (local)\n\n${summarizeTasks('Overdue tasks', overdue, nameById)}`;
  }

  if (hasAny(q, ['upcoming', 'next week', 'soon'])) {
    return `Basic assistant (local)\n\n${summarizeTasks('Upcoming (7 days)', upcoming7, nameById)}`;
  }

  if (hasAny(q, ['journal', 'recent event', 'care log', 'history', 'last feeding', 'logged'])) {
    return `Basic assistant (local)\n\n${summarizeEvents(recentEvents, nameById)}`;
  }

  if (hasAny(q, ['remind', 'tip', 'should i'])) {
    const tips: string[] = [
      'Basic assistant — gentle reminders from your data:',
      '',
    ];
    if (overdue.length) tips.push(`• You have ${overdue.length} overdue task(s). Check Today and clear the oldest items first.`);
    else tips.push('• No overdue tasks detected — nice.');

    tips.push('• Log weights and sheds in **Journal** so trends stay visible.');
    tips.push('• For illness or emergencies, contact an **exotics veterinarian** — this assistant is not medical advice.');
    return tips.join('\n');
  }

  return defaultRollup(reptiles, dueToday, overdue, recentEvents, nameById, focusReptile);
}

async function streamChunks(text: string, onChunk: (s: string) => void, step = 48, ms = 12): Promise<void> {
  for (let i = 0; i < text.length; i += step) {
    onChunk(text.slice(i, Math.min(text.length, i + step)));
    await new Promise((r) => setTimeout(r, ms));
  }
}

/**
 * Same streaming UX as Pro path; content is purely local/deterministic.
 */
export async function streamBasicAssistantReply(
  userMessage: string,
  options: BasicAssistantOptions,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): Promise<void> {
  try {
    const full = await buildBasicAssistantReply(userMessage, options);
    await streamChunks(full, onChunk);
    onDone();
  } catch (e) {
    onError(e instanceof Error ? e : new Error(String(e)));
  }
}
