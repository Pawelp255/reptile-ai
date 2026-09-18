import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { createCareEvent } from '@/lib/storage/events';
import { getAllReptiles } from '@/lib/storage/reptiles';
import {
  getAllScheduleItems,
  isStrictRecurringCareTask,
  markTaskDone,
} from '@/lib/storage/schedule';
import { getToday, isDueToday, isOverdue } from '@/lib/storage/db';
import { pushCareTasksToCloudByIds, REPTILES_CLOUD_SYNC_EVENT } from '@/lib/reptiles/cloudSync';
import type { Reptile, ScheduleItem, TaskType } from '@/types';

type WatchQuickActionType = 'feed' | 'clean' | 'mist';

type WatchTodayTask = {
  id: string;
  taskType: TaskType;
  animalId: string;
  animalName?: string;
  dueDate: string;
  isOverdue: boolean;
  title?: string;
};

export type WatchTodaySnapshot = {
  version: 1;
  generatedAt: string;
  date: string;
  overdueCount: number;
  dueTodayCount: number;
  completedTodayCount: number;
  nextImportantTask?: WatchTodayTask;
  animalName?: string;
};

export type WatchNativeSendResult = {
  ok?: boolean;
  snapshot?: WatchTodaySnapshot;
  status?: Record<string, unknown>;
  error?: string;
  [key: string]: unknown;
};

type WatchTaskAction = {
  type?: string;
  actionId?: string;
  action?: WatchQuickActionType;
  taskType?: WatchQuickActionType;
  taskId?: string;
  animalId?: string;
};

type ReptilitaWatchBridgePlugin = {
  getStatus(): Promise<Record<string, unknown>>;
  updateTodaySnapshot(options: { snapshot: WatchTodaySnapshot }): Promise<Record<string, unknown>>;
  requestTodaySnapshot(): Promise<Record<string, unknown>>;
  clearTodaySnapshot(): Promise<Record<string, unknown>>;
  acknowledgeAction(options: {
    ok: boolean;
    actionId?: string;
    message?: string;
    snapshot?: WatchTodaySnapshot;
  }): Promise<Record<string, unknown>>;
  addListener(
    eventName: 'watchTaskAction',
    listenerFunc: (event: WatchTaskAction) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'watchSnapshotRequested' | 'watchBridgeStatusChanged',
    listenerFunc: (event: Record<string, unknown>) => void,
  ): Promise<PluginListenerHandle>;
};

const WatchBridge = registerPlugin<ReptilitaWatchBridgePlugin>('ReptilitaWatchBridge');

const SNAPSHOT_REFRESH_MS = 10 * 60 * 1000;
const WATCH_SYNC_DEBUG = import.meta.env.DEV;
let started = false;
let lastSnapshotPushMs = 0;
let refreshTimer: number | undefined;

type JsonSafeValue = string | number | boolean | JsonSafeValue[] | { [key: string]: JsonSafeValue };

function sanitizeForWatchPayload(value: unknown, path = 'snapshot', seen = new WeakSet<object>()): JsonSafeValue | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    throw new Error(`Watch snapshot contains unsupported value at ${path}: ${typeof value}`);
  }
  if (Array.isArray(value)) {
    return value
      .map((item, index) => sanitizeForWatchPayload(item, `${path}[${index}]`, seen))
      .filter((item): item is JsonSafeValue => item !== undefined);
  }
  if (typeof value === 'object') {
    if (seen.has(value)) {
      throw new Error(`Watch snapshot contains circular reference at ${path}`);
    }
    seen.add(value);
    const result: { [key: string]: JsonSafeValue } = {};
    for (const [key, child] of Object.entries(value)) {
      const sanitized = sanitizeForWatchPayload(child, `${path}.${key}`, seen);
      if (sanitized !== undefined) result[key] = sanitized;
    }
    seen.delete(value);
    return result;
  }
  throw new Error(`Watch snapshot contains unsupported value at ${path}: ${typeof value}`);
}

function normalizeWatchSnapshot(snapshot: WatchTodaySnapshot): WatchTodaySnapshot {
  const sanitized = sanitizeForWatchPayload(snapshot);
  if (!sanitized || Array.isArray(sanitized) || typeof sanitized !== 'object') {
    throw new Error('Watch snapshot did not normalize to an object.');
  }
  return sanitized as WatchTodaySnapshot;
}

function debugWatchSync(message: string, detail?: Record<string, unknown>): void {
  if (!WATCH_SYNC_DEBUG) return;
  if (detail) {
    console.info(`[WatchTodaySync] ${message}`, detail);
    return;
  }
  console.info(`[WatchTodaySync] ${message}`);
}

function taskPriority(task: ScheduleItem): number {
  if (isOverdue(task.nextDueDate)) return 0;
  if (isDueToday(task.nextDueDate)) return 1;
  return 2;
}

function toWatchTask(task: ScheduleItem, reptilesById: Map<string, Reptile>): WatchTodayTask {
  const reptile = reptilesById.get(task.reptileId);
  return {
    id: task.id,
    taskType: task.taskType,
    animalId: task.reptileId,
    animalName: reptile?.name,
    dueDate: task.nextDueDate,
    isOverdue: isOverdue(task.nextDueDate),
  };
}

export async function buildWatchTodaySnapshot(): Promise<WatchTodaySnapshot> {
  const today = getToday();
  const [scheduleItems, reptiles] = await Promise.all([
    getAllScheduleItems(),
    getAllReptiles(),
  ]);
  const reptilesById = new Map(reptiles.map((reptile) => [reptile.id, reptile]));

  const activeTasks = scheduleItems
    .filter((task) => isStrictRecurringCareTask(task) && (isOverdue(task.nextDueDate) || isDueToday(task.nextDueDate)))
    .sort((a, b) => {
      const priorityDelta = taskPriority(a) - taskPriority(b);
      if (priorityDelta !== 0) return priorityDelta;
      return a.nextDueDate.localeCompare(b.nextDueDate);
    });

  const nextImportantTask = activeTasks[0] ? toWatchTask(activeTasks[0], reptilesById) : undefined;

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    date: today,
    overdueCount: activeTasks.filter((task) => isOverdue(task.nextDueDate)).length,
    dueTodayCount: activeTasks.filter((task) => isDueToday(task.nextDueDate)).length,
    completedTodayCount: scheduleItems.filter((task) => task.lastDoneDate === today).length,
    nextImportantTask,
    animalName: nextImportantTask?.animalName,
  };
}

export async function pushWatchTodaySnapshot(force = false): Promise<WatchTodaySnapshot | undefined> {
  debugWatchSync('pushWatchTodaySnapshot entered', {
    force,
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
  });
  if (!Capacitor.isNativePlatform()) return undefined;

  const now = Date.now();
  if (!force && now - lastSnapshotPushMs < 30_000) {
    debugWatchSync('Skipping Today snapshot push; throttle active');
    return undefined;
  }

  debugWatchSync('Building Today snapshot', { force });
  const rawSnapshot = await buildWatchTodaySnapshot();
  const snapshot = normalizeWatchSnapshot(rawSnapshot);
  const serializedSnapshot = JSON.stringify(snapshot);
  debugWatchSync('Serialized Today snapshot', {
    byteLength: new Blob([serializedSnapshot]).size,
    overdueCount: snapshot.overdueCount,
    dueTodayCount: snapshot.dueTodayCount,
    completedTodayCount: snapshot.completedTodayCount,
  });
  lastSnapshotPushMs = now;
  debugWatchSync('Calling native updateTodaySnapshot', {
    overdueCount: snapshot.overdueCount,
    dueTodayCount: snapshot.dueTodayCount,
    completedTodayCount: snapshot.completedTodayCount,
    nextTaskType: snapshot.nextImportantTask?.taskType,
  });
  const status = await WatchBridge.updateTodaySnapshot({ snapshot });
  debugWatchSync('Native updateTodaySnapshot resolved', status);
  return snapshot;
}

export async function sendRealWatchSnapshot(): Promise<WatchNativeSendResult | undefined> {
  debugWatchSync('sendRealWatchSnapshot entered', {
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
  });
  if (!Capacitor.isNativePlatform()) return undefined;

  const rawSnapshot = await buildWatchTodaySnapshot();
  const snapshot = normalizeWatchSnapshot(rawSnapshot);
  const serializedSnapshot = JSON.stringify(snapshot);
  debugWatchSync('Sending real Watch snapshot', {
    byteLength: new Blob([serializedSnapshot]).size,
    overdueCount: snapshot.overdueCount,
    dueTodayCount: snapshot.dueTodayCount,
    completedTodayCount: snapshot.completedTodayCount,
  });
  const status = await WatchBridge.updateTodaySnapshot({ snapshot });
  debugWatchSync('Real updateTodaySnapshot resolved', status);
  return {
    ok: true,
    snapshot,
    status,
  };
}

function actionToTaskType(action: WatchQuickActionType | undefined): TaskType | undefined {
  if (action === 'feed' || action === 'clean') return action;
  return undefined;
}

/**
 * Resolve the exact task a Watch quick action targets.
 *
 * Safety contract: only ever completes the specific task the Watch displayed
 * (`taskId` + `animalId` must both be present and match an existing, due/overdue
 * recurring task of the right type). We never guess a "most overdue" task across
 * animals — that could complete care for the wrong animal.
 */
async function findTaskForAction(action: WatchTaskAction): Promise<ScheduleItem | undefined> {
  const taskType = actionToTaskType(action.action ?? action.taskType);
  if (!taskType) return undefined;
  if (!action.taskId || !action.animalId) return undefined;

  const scheduleItems = await getAllScheduleItems();
  const exact = scheduleItems.find(
    (task) =>
      task.id === action.taskId &&
      task.reptileId === action.animalId &&
      task.taskType === taskType &&
      isStrictRecurringCareTask(task),
  );
  if (!exact) return undefined;
  if (!(isOverdue(exact.nextDueDate) || isDueToday(exact.nextDueDate))) return undefined;
  return exact;
}

/** Log a misting note for the explicit animal shown on the Watch. Never falls back to an arbitrary animal. */
async function logMistingForAnimal(action: WatchTaskAction): Promise<void> {
  if (!action.animalId) {
    throw new Error('No animal selected for misting. Open Reptilita on iPhone.');
  }

  const reptiles = await getAllReptiles();
  const reptile = reptiles.find((candidate) => candidate.id === action.animalId);
  if (!reptile) {
    throw new Error('That animal is no longer available for misting.');
  }

  await createCareEvent({
    reptileId: reptile.id,
    eventType: 'note',
    eventDate: getToday(),
    details: 'Misting completed from Apple Watch',
  });
}

async function handleWatchTaskAction(action: WatchTaskAction): Promise<void> {
  debugWatchSync('Received watch action', { type: action.type, action: action.action ?? action.taskType });
  const actionType = action.action ?? action.taskType;
  let ok = false;
  let message = 'Action was not applied.';
  let pushedTaskId: string | undefined;

  try {
    if (actionType === 'mist') {
      await logMistingForAnimal(action);
      ok = true;
      message = 'Misting logged.';
    } else {
      const task = await findTaskForAction(action);
      if (!task) {
        throw new Error('No matching due task. Open Reptilita on iPhone.');
      }

      const result = await markTaskDone(task.id, 'Completed from Apple Watch');
      pushedTaskId = result.scheduleItem.id;
      ok = true;
      message = 'Task completed.';
    }
  } catch (error) {
    message = error instanceof Error ? error.message : 'Action failed.';
  }

  const snapshot = await pushWatchTodaySnapshot(true);
  if (pushedTaskId) {
    void pushCareTasksToCloudByIds([pushedTaskId], { notifyOnError: true });
  }

  await WatchBridge.acknowledgeAction({
    ok,
    actionId: action.actionId,
    message,
    snapshot,
  });
}

function scheduleRefresh(): void {
  window.clearInterval(refreshTimer);
  refreshTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      void pushWatchTodaySnapshot();
    }
  }, SNAPSHOT_REFRESH_MS);
}

export function startWatchTodaySync(): void {
  if (started || Capacitor.getPlatform() !== 'ios') return;
  started = true;

  debugWatchSync('Starting Watch Today sync');
  void WatchBridge.getStatus().then((status) => {
    debugWatchSync('Initial bridge status', status);
  });
  scheduleRefresh();

  void WatchBridge.addListener('watchTaskAction', (event) => {
    void handleWatchTaskAction(event);
  });

  void WatchBridge.addListener('watchSnapshotRequested', () => {
    debugWatchSync('Watch requested Today snapshot');
    void pushWatchTodaySnapshot(true);
  });

  void WatchBridge.addListener('watchBridgeStatusChanged', () => {
    debugWatchSync('Bridge status changed');
    void pushWatchTodaySnapshot();
  });

  void WatchBridge.requestTodaySnapshot().then((result) => {
    debugWatchSync('Drained native Watch snapshot request state', result);
  });
  void pushWatchTodaySnapshot(true);

  window.addEventListener('focus', () => {
    debugWatchSync('Window focus snapshot refresh');
    void pushWatchTodaySnapshot();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      debugWatchSync('App foreground snapshot refresh');
      void pushWatchTodaySnapshot(true);
    }
  });

  window.addEventListener(REPTILES_CLOUD_SYNC_EVENT, () => {
    debugWatchSync('Cloud sync event snapshot refresh');
    void pushWatchTodaySnapshot(true);
  });
}

/**
 * Blank the cached Today snapshot on the paired Watch (and the phone-side cache).
 * Call on sign-out and account deletion so the Watch never shows a previous
 * session's care data. No-op off-device.
 */
export async function clearWatchTodaySnapshot(): Promise<void> {
  if (Capacitor.getPlatform() !== 'ios') return;
  lastSnapshotPushMs = 0;
  try {
    await WatchBridge.clearTodaySnapshot();
    debugWatchSync('Cleared Watch Today snapshot');
  } catch (error) {
    debugWatchSync('clearTodaySnapshot failed', { error: String(error) });
  }
}
