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
let started = false;
let lastSnapshotPushMs = 0;
let refreshTimer: number | undefined;

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

async function pushTodaySnapshot(force = false): Promise<WatchTodaySnapshot | undefined> {
  if (!Capacitor.isNativePlatform()) return undefined;

  const now = Date.now();
  if (!force && now - lastSnapshotPushMs < 30_000) return undefined;

  console.info('[WatchTodaySync] Building Today snapshot', { force });
  const snapshot = await buildWatchTodaySnapshot();
  lastSnapshotPushMs = now;
  console.info('[WatchTodaySync] Sending Today snapshot', {
    overdueCount: snapshot.overdueCount,
    dueTodayCount: snapshot.dueTodayCount,
    completedTodayCount: snapshot.completedTodayCount,
    nextTaskType: snapshot.nextImportantTask?.taskType,
  });
  await WatchBridge.updateTodaySnapshot({ snapshot });
  return snapshot;
}

function actionToTaskType(action: WatchQuickActionType | undefined): TaskType | undefined {
  if (action === 'feed' || action === 'clean') return action;
  return undefined;
}

async function findTaskForAction(action: WatchTaskAction): Promise<ScheduleItem | undefined> {
  const taskType = actionToTaskType(action.action ?? action.taskType);
  if (!taskType) return undefined;

  const scheduleItems = await getAllScheduleItems();
  if (action.taskId) {
    const exact = scheduleItems.find((task) => task.id === action.taskId && task.taskType === taskType);
    if (exact) return exact;
  }

  return scheduleItems
    .filter((task) => {
      if (!isStrictRecurringCareTask(task)) return false;
      if (task.taskType !== taskType) return false;
      if (action.animalId && task.reptileId !== action.animalId) return false;
      return isOverdue(task.nextDueDate) || isDueToday(task.nextDueDate);
    })
    .sort((a, b) => {
      const priorityDelta = taskPriority(a) - taskPriority(b);
      if (priorityDelta !== 0) return priorityDelta;
      return a.nextDueDate.localeCompare(b.nextDueDate);
    })[0];
}

async function logMistingFallback(action: WatchTaskAction): Promise<void> {
  const reptiles = await getAllReptiles();
  const reptile = action.animalId
    ? reptiles.find((candidate) => candidate.id === action.animalId)
    : reptiles[0];

  if (!reptile) {
    throw new Error('No animal is available for misting.');
  }

  await createCareEvent({
    reptileId: reptile.id,
    eventType: 'note',
    eventDate: getToday(),
    details: 'Misting completed from Apple Watch',
  });
}

async function handleWatchTaskAction(action: WatchTaskAction): Promise<void> {
  console.info('[WatchTodaySync] Received watch action', action);
  const actionType = action.action ?? action.taskType;
  let ok = false;
  let message = 'Action was not applied.';
  let pushedTaskId: string | undefined;

  try {
    if (actionType === 'mist') {
      await logMistingFallback(action);
      ok = true;
      message = 'Misting logged.';
    } else {
      const task = await findTaskForAction(action);
      if (!task) {
        throw new Error('No due matching task found.');
      }

      const result = await markTaskDone(task.id, 'Completed from Apple Watch');
      pushedTaskId = result.scheduleItem.id;
      ok = true;
      message = 'Task completed.';
    }
  } catch (error) {
    message = error instanceof Error ? error.message : 'Action failed.';
  }

  const snapshot = await pushTodaySnapshot(true);
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
      void pushTodaySnapshot();
    }
  }, SNAPSHOT_REFRESH_MS);
}

export function startWatchTodaySync(): void {
  if (started || !Capacitor.isNativePlatform()) return;
  started = true;

  console.info('[WatchTodaySync] Starting Watch Today sync');
  void WatchBridge.getStatus().then((status) => {
    console.info('[WatchTodaySync] Initial bridge status', status);
  });
  scheduleRefresh();

  void WatchBridge.addListener('watchTaskAction', (event) => {
    void handleWatchTaskAction(event);
  });

  void WatchBridge.addListener('watchSnapshotRequested', () => {
    console.info('[WatchTodaySync] Watch requested Today snapshot');
    void pushTodaySnapshot(true);
  });

  void WatchBridge.addListener('watchBridgeStatusChanged', () => {
    console.info('[WatchTodaySync] Bridge status changed');
    void pushTodaySnapshot();
  });

  void WatchBridge.requestTodaySnapshot().then((result) => {
    console.info('[WatchTodaySync] Drained native Watch snapshot request state', result);
  });
  void pushTodaySnapshot(true);

  window.addEventListener('focus', () => {
    console.info('[WatchTodaySync] Window focus snapshot refresh');
    void pushTodaySnapshot();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.info('[WatchTodaySync] App foreground snapshot refresh');
      void pushTodaySnapshot(true);
    }
  });

  window.addEventListener(REPTILES_CLOUD_SYNC_EVENT, () => {
    console.info('[WatchTodaySync] Cloud sync event snapshot refresh');
    void pushTodaySnapshot(true);
  });
}
