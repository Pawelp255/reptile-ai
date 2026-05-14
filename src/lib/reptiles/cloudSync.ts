import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { getDB } from "@/lib/storage/db";
import {
  ensureInlinePhotoBackedUp,
  getCurrentSupabaseUserId,
  isInlineDataUrl,
  resolveDisplayPhotoForReptile,
} from "@/lib/reptiles/photoStorage";
import {
  ensureScheduleItemsHaveTimestamps,
  ensureScheduleItemsHaveTimestampsForIds,
  normalizeWeekdays,
} from "@/lib/storage/schedule";
import { writeLastSuccessfulCloudSyncMs } from "@/lib/sync/syncTelemetry";
import { trySeedAppleReviewDemoForSession } from "@/lib/review/appleReviewDemoSeed";
import type { CareEvent, EventType, Reptile, ScheduleItem, TaskType } from "@/types";

type CloudReptileRow = {
  id: string;
  user_id: string;
  name: string;
  species: string;
  morph: string | null;
  sex: string;
  birth_date: string | null;
  estimated_age_months: number | null;
  acquisition_date: string | null;
  diet_type: string;
  breeding_status: string;
  notes: string | null;
  photo_path: string | null;
  photo_url: string | null;
  sort_order: number | null;
  data: Json;
  created_at: string;
  updated_at: string;
};

function parseDate(value: string | undefined | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function stripLargeInlinePhotoFromData(reptile: Reptile): Reptile {
  const {
    photoUrlExpiresAt: _omitPhotoUrlExpiresAt,
    photoInlineFallbackUrl: _omitPhotoInlineFallbackUrl,
    photoUrlRefreshFailedAt: _omitPhotoUrlRefreshFailedAt,
    ...withoutLocalOnly
  } = reptile;
  const clean = withoutLocalOnly as Reptile;
  const value = clean.photoUrl?.trim();
  if (!value) return clean;
  if (clean.photoPath && (isInlineDataUrl(value) || value.startsWith("http://") || value.startsWith("https://"))) {
    return {
      ...clean,
      photoUrl: undefined,
    };
  }
  return clean;
}

function toCloudPhotoUrl(reptile: Reptile, effectivePhotoPath: string | null): string | null {
  const value = reptile.photoUrl?.trim();
  if (!value) return null;
  if (isInlineDataUrl(value)) return effectivePhotoPath ? null : value;
  if (effectivePhotoPath && (value.startsWith("http://") || value.startsWith("https://"))) {
    // Signed URLs are temporary display-only URLs and should not be persisted.
    return null;
  }
  return value;
}

function toCloudRecord(
  userId: string,
  reptile: Reptile,
  effectivePhotoPath: string | null,
): TablesInsert<"reptiles"> {
  const cloudData = stripLargeInlinePhotoFromData({
    ...reptile,
    photoPath: effectivePhotoPath ?? undefined,
  });
  return {
    id: reptile.id,
    user_id: userId,
    name: reptile.name,
    species: reptile.species,
    morph: reptile.morph ?? null,
    sex: reptile.sex,
    birth_date: reptile.birthDate ?? null,
    estimated_age_months: reptile.estimatedAgeMonths ?? null,
    acquisition_date: reptile.acquisitionDate ?? null,
    diet_type: reptile.dietType,
    breeding_status: reptile.breedingStatus,
    notes: reptile.notes ?? null,
    photo_path: effectivePhotoPath,
    photo_url: toCloudPhotoUrl(reptile, effectivePhotoPath),
    sort_order: typeof reptile.sortOrder === "number" ? reptile.sortOrder : null,
    data: cloudData as unknown as Json,
    created_at: reptile.createdAt,
    updated_at: reptile.updatedAt,
  };
}

function fromCloudRecord(row: CloudReptileRow): Reptile {
  const payload = (row.data && typeof row.data === "object" && !Array.isArray(row.data)
    ? row.data
    : {}) as Partial<Reptile>;
  const {
    photoUrlExpiresAt: _omitPhotoUrlExpiresAt,
    photoInlineFallbackUrl: _omitPhotoInlineFallbackUrl,
    photoUrlRefreshFailedAt: _omitPhotoUrlRefreshFailedAt,
    ...payloadCloudSafe
  } = payload;

  return {
    ...payloadCloudSafe,
    id: payloadCloudSafe.id ?? row.id,
    name: payloadCloudSafe.name ?? row.name,
    species: payloadCloudSafe.species ?? row.species,
    morph: payloadCloudSafe.morph ?? row.morph ?? undefined,
    sex: payloadCloudSafe.sex ?? (row.sex as Reptile["sex"]),
    birthDate: payloadCloudSafe.birthDate ?? row.birth_date ?? undefined,
    estimatedAgeMonths: payloadCloudSafe.estimatedAgeMonths ?? row.estimated_age_months ?? undefined,
    acquisitionDate: payloadCloudSafe.acquisitionDate ?? row.acquisition_date ?? undefined,
    dietType: payloadCloudSafe.dietType ?? (row.diet_type as Reptile["dietType"]),
    breedingStatus: payloadCloudSafe.breedingStatus ?? (row.breeding_status as Reptile["breedingStatus"]),
    notes: payloadCloudSafe.notes ?? row.notes ?? undefined,
    photoPath: payloadCloudSafe.photoPath ?? row.photo_path ?? undefined,
    photoUrl: payloadCloudSafe.photoUrl ?? row.photo_url ?? undefined,
    sortOrder:
      typeof payload.sortOrder === "number"
        ? payload.sortOrder
        : row.sort_order != null
          ? row.sort_order
          : undefined,
    createdAt: payload.createdAt ?? row.created_at,
    updatedAt: payload.updatedAt ?? row.updated_at,
  };
}

export async function fetchCloudReptiles(userId: string): Promise<Reptile[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("reptiles")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  const hydrated = (data as CloudReptileRow[]).map(fromCloudRecord);
  return Promise.all(
    hydrated.map(async (reptile) => {
      const resolved = await resolveDisplayPhotoForReptile(reptile);
      return resolved.reptile;
    }),
  );
}

export async function upsertCloudReptile(userId: string, reptile: Reptile): Promise<void> {
  if (!supabase) return;

  let effectivePhotoPath: string | null = reptile.photoPath ?? null;
  if (!effectivePhotoPath) {
    const { data, error } = await supabase
      .from("reptiles")
      .select("photo_path")
      .eq("user_id", userId)
      .eq("id", reptile.id)
      .maybeSingle();
    if (error) throw error;
    effectivePhotoPath = (data?.photo_path as string | null | undefined) ?? null;
  }

  const record = toCloudRecord(userId, reptile, effectivePhotoPath);
  const updatePayload: TablesUpdate<"reptiles"> = record;

  const { error } = await supabase
    .from("reptiles")
    .upsert(updatePayload, { onConflict: "id" });

  if (error) throw error;
}

export async function deleteCloudReptile(userId: string, reptileId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("reptiles")
    .delete()
    .eq("user_id", userId)
    .eq("id", reptileId);

  if (error) throw error;
}

export async function hydrateLocalFromCloud(userId: string): Promise<void> {
  const db = await getDB();
  const cloudReptiles = await fetchCloudReptiles(userId);

  for (const cloudReptile of cloudReptiles) {
    const localReptile = await db.get("reptiles", cloudReptile.id);
    if (!localReptile) {
      await db.put("reptiles", cloudReptile);
      continue;
    }

    const localUpdatedAt = parseDate(localReptile.updatedAt);
    const cloudUpdatedAt = parseDate(cloudReptile.updatedAt);
    if (cloudUpdatedAt > localUpdatedAt) {
      await db.put("reptiles", cloudReptile);
    }
  }
}

type CloudCareTaskRow = {
  id: string;
  user_id: string;
  reptile_id: string;
  task_type: string;
  frequency_days: number;
  last_done_date: string | null;
  next_due_date: string;
  auto_generated: boolean;
  data: Json;
  created_at: string;
  updated_at: string;
};

type CloudCareEventRow = {
  id: string;
  user_id: string;
  reptile_id: string;
  event_type: string;
  event_date: string;
  details: string | null;
  data: Json;
  created_at: string;
  updated_at: string;
};

function toCloudCareTaskRecord(userId: string, schedule: ScheduleItem): TablesInsert<"reptile_care_tasks"> {
  const normalizedSchedule =
    schedule.weekdays === undefined ? schedule : { ...schedule, weekdays: normalizeWeekdays(schedule.weekdays) };
  const updatedAt =
    normalizedSchedule.updatedAt && parseDate(normalizedSchedule.updatedAt) > 0
      ? normalizedSchedule.updatedAt
      : new Date().toISOString();
  return {
    id: normalizedSchedule.id,
    user_id: userId,
    reptile_id: normalizedSchedule.reptileId,
    task_type: normalizedSchedule.taskType,
    frequency_days: normalizedSchedule.frequencyDays,
    last_done_date: normalizedSchedule.lastDoneDate ?? null,
    next_due_date: normalizedSchedule.nextDueDate,
    auto_generated: normalizedSchedule.autoGenerated,
    data: normalizedSchedule as unknown as Json,
    updated_at: updatedAt,
  };
}

function fromCloudCareTaskRow(row: CloudCareTaskRow): ScheduleItem {
  const payload = (row.data && typeof row.data === "object" && !Array.isArray(row.data)
    ? row.data
    : {}) as Partial<ScheduleItem>;

  return {
    ...payload,
    id: payload.id ?? row.id,
    reptileId: payload.reptileId ?? row.reptile_id,
    taskType: (payload.taskType ?? row.task_type) as TaskType,
    frequencyDays: payload.frequencyDays ?? row.frequency_days,
    lastDoneDate: payload.lastDoneDate ?? row.last_done_date ?? undefined,
    nextDueDate: payload.nextDueDate ?? row.next_due_date,
    autoGenerated: payload.autoGenerated ?? row.auto_generated,
    updatedAt: payload.updatedAt ?? row.updated_at,
    weekdays: payload.weekdays === undefined ? undefined : normalizeWeekdays(payload.weekdays),
  };
}

export async function fetchCloudCareTasks(userId: string): Promise<ScheduleItem[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("reptile_care_tasks")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return (data as CloudCareTaskRow[]).map(fromCloudCareTaskRow);
}

async function upsertCloudCareTask(userId: string, schedule: ScheduleItem): Promise<void> {
  if (!supabase) return;

  const record = toCloudCareTaskRecord(userId, schedule);
  const updatePayload: TablesUpdate<"reptile_care_tasks"> = record;

  const { error } = await supabase
    .from("reptile_care_tasks")
    .upsert(updatePayload, { onConflict: "id" });

  if (error) throw error;
}

export async function hydrateLocalCareTasksFromCloud(userId: string): Promise<void> {
  const db = await getDB();
  const cloudTasks = await fetchCloudCareTasks(userId);
  await ensureScheduleItemsHaveTimestamps();

  const localReptiles = await db.getAll("reptiles");
  const reptileIds = new Set(localReptiles.map((r) => r.id));

  for (const cloud of cloudTasks) {
    if (!reptileIds.has(cloud.reptileId)) continue;

    const local = await db.get("scheduleItems", cloud.id);
    if (!local) {
      await db.put("scheduleItems", cloud);
      continue;
    }

    const localUpdatedAt = parseDate(local.updatedAt);
    const cloudUpdatedAt = parseDate(cloud.updatedAt);
    if (cloudUpdatedAt > localUpdatedAt) {
      await db.put("scheduleItems", cloud);
    }
  }
}

export async function syncLocalCareTasksToCloud(userId: string): Promise<void> {
  if (!supabase) return;

  const db = await getDB();
  await ensureScheduleItemsHaveTimestamps();
  const [localTasks, cloudTasks] = await Promise.all([
    db.getAll("scheduleItems"),
    fetchCloudCareTasks(userId),
  ]);

  const reptileIds = new Set((await db.getAll("reptiles")).map((r) => r.id));
  const localTasksSynced = localTasks.filter((task) => reptileIds.has(task.reptileId));

  const cloudById = new Map(cloudTasks.map((task) => [task.id, task]));

  for (const local of localTasksSynced) {
    const cloudRow = cloudById.get(local.id);
    const localTs = parseDate(local.updatedAt);
    const noLocalTs = localTs <= 0;
    const cloudTs = cloudRow ? parseDate(cloudRow.updatedAt) : 0;

    if (!cloudRow) {
      await upsertCloudCareTask(userId, local);
      continue;
    }

    if (noLocalTs || localTs > cloudTs) {
      await upsertCloudCareTask(userId, local);
    } else if (cloudTs > localTs) {
      await db.put("scheduleItems", cloudRow);
    }
  }

  for (const cloud of cloudTasks) {
    if (!reptileIds.has(cloud.reptileId)) continue;
    const local = await db.get("scheduleItems", cloud.id);
    if (!local) {
      await db.put("scheduleItems", cloud);
    }
  }
}

function careEventFreshness(event: Pick<CareEvent, "updatedAt" | "createdAt">): number {
  return parseDate(event.updatedAt) || parseDate(event.createdAt);
}

function toCloudCareEventRecord(userId: string, event: CareEvent): TablesInsert<"reptile_care_events"> {
  const updatedAt = careEventFreshness(event) > 0 ? (event.updatedAt ?? event.createdAt) : new Date().toISOString();
  return {
    id: event.id,
    user_id: userId,
    reptile_id: event.reptileId,
    event_type: event.eventType,
    event_date: event.eventDate,
    details: event.details ?? null,
    data: {
      ...event,
      updatedAt,
    } as unknown as Json,
    created_at: event.createdAt,
    updated_at: updatedAt,
  };
}

function fromCloudCareEventRow(row: CloudCareEventRow): CareEvent {
  const payload = (row.data && typeof row.data === "object" && !Array.isArray(row.data)
    ? row.data
    : {}) as Partial<CareEvent>;

  return {
    ...payload,
    id: payload.id ?? row.id,
    reptileId: payload.reptileId ?? row.reptile_id,
    eventType: (payload.eventType ?? row.event_type) as EventType,
    eventDate: payload.eventDate ?? row.event_date,
    details: payload.details ?? row.details ?? undefined,
    createdAt: payload.createdAt ?? row.created_at,
    updatedAt: payload.updatedAt ?? row.updated_at,
  };
}

async function ensureCareEventsHaveTimestamps(): Promise<void> {
  const db = await getDB();
  const events = await db.getAll("careEvents");
  for (const event of events) {
    if (event.updatedAt) continue;
    await db.put("careEvents", {
      ...event,
      updatedAt: event.createdAt,
    });
  }
}

export async function fetchCloudCareEvents(userId: string): Promise<CareEvent[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("reptile_care_events")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return (data as CloudCareEventRow[]).map(fromCloudCareEventRow);
}

async function upsertCloudCareEvent(userId: string, event: CareEvent): Promise<void> {
  if (!supabase) return;

  const record = toCloudCareEventRecord(userId, event);
  const updatePayload: TablesUpdate<"reptile_care_events"> = record;

  const { error } = await supabase
    .from("reptile_care_events")
    .upsert(updatePayload, { onConflict: "id" });

  if (error) throw error;
}

async function deleteCloudCareEvent(userId: string, eventId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("reptile_care_events")
    .delete()
    .eq("user_id", userId)
    .eq("id", eventId);

  if (error) throw error;
}

export async function hydrateLocalCareEventsFromCloud(userId: string): Promise<void> {
  const db = await getDB();
  const cloudEvents = await fetchCloudCareEvents(userId);
  await ensureCareEventsHaveTimestamps();

  const localReptiles = await db.getAll("reptiles");
  const reptileIds = new Set(localReptiles.map((r) => r.id));

  for (const cloud of cloudEvents) {
    if (!reptileIds.has(cloud.reptileId)) continue;

    const local = await db.get("careEvents", cloud.id);
    if (!local) {
      await db.put("careEvents", cloud);
      continue;
    }

    const localFreshness = careEventFreshness(local);
    const cloudFreshness = careEventFreshness(cloud);
    if (cloudFreshness > localFreshness) {
      await db.put("careEvents", cloud);
    }
  }
}

export async function syncLocalCareEventsToCloud(userId: string): Promise<void> {
  if (!supabase) return;

  const db = await getDB();
  await ensureCareEventsHaveTimestamps();
  const [localEvents, cloudEvents] = await Promise.all([
    db.getAll("careEvents"),
    fetchCloudCareEvents(userId),
  ]);

  const reptileIds = new Set((await db.getAll("reptiles")).map((r) => r.id));
  const localEventsSynced = localEvents.filter((event) => reptileIds.has(event.reptileId));
  const cloudById = new Map(cloudEvents.map((event) => [event.id, event]));

  for (const local of localEventsSynced) {
    const cloud = cloudById.get(local.id);
    const localFreshness = careEventFreshness(local);
    const cloudFreshness = cloud ? careEventFreshness(cloud) : 0;

    if (!cloud) {
      await upsertCloudCareEvent(userId, local);
      continue;
    }

    if (localFreshness > cloudFreshness) {
      await upsertCloudCareEvent(userId, local);
    } else if (cloudFreshness > localFreshness) {
      await db.put("careEvents", cloud);
    }
  }

  for (const cloud of cloudEvents) {
    if (!reptileIds.has(cloud.reptileId)) continue;
    const local = await db.get("careEvents", cloud.id);
    if (!local) {
      await db.put("careEvents", cloud);
    }
  }
}

export async function syncLocalReptilesToCloud(userId: string): Promise<void> {
  const db = await getDB();
  const [localReptiles, cloudReptiles] = await Promise.all([
    db.getAll("reptiles"),
    fetchCloudReptiles(userId),
  ]);

  const cloudById = new Map(cloudReptiles.map((reptile) => [reptile.id, reptile]));

  for (const localReptile of localReptiles) {
    const migrated = await ensureInlinePhotoBackedUp({
      reptile: localReptile,
      userId,
    });
    const cloudReptile = cloudById.get(localReptile.id);
    let reptileForSync = migrated.reptile;
    let localRowChanged = migrated.uploaded;
    if (!reptileForSync.photoPath && cloudReptile?.photoPath) {
      reptileForSync = {
        ...reptileForSync,
        photoPath: cloudReptile.photoPath,
      };
      localRowChanged = true;
    }
    if (localRowChanged) {
      await db.put("reptiles", reptileForSync);
    }

    if (!cloudReptile) {
      await upsertCloudReptile(userId, reptileForSync);
      continue;
    }

    const localUpdatedAt = parseDate(reptileForSync.updatedAt);
    const cloudUpdatedAt = parseDate(cloudReptile.updatedAt);

    if (localUpdatedAt > cloudUpdatedAt) {
      await upsertCloudReptile(userId, reptileForSync);
    } else if (cloudUpdatedAt > localUpdatedAt) {
      await db.put("reptiles", cloudReptile);
    }
  }

  for (const cloudReptile of cloudReptiles) {
    const localReptile = await db.get("reptiles", cloudReptile.id);
    if (!localReptile) {
      await db.put("reptiles", cloudReptile);
    }
  }
}

/** Fired on `window` after a full hydrate + push-back sync finishes (Phase 1). Listen to refresh IndexedDB-backed UIs such as My Animals. */
export const REPTILES_CLOUD_SYNC_EVENT = "reptilita:reptiles-cloud-sync";

function dispatchCloudSyncEvent(
  detail:
    | { ok: true; reptileCount: number; scheduleCount: number }
    | { ok: false; error: unknown },
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REPTILES_CLOUD_SYNC_EVENT, { detail }));
}

/** Call after local-only bulk writes (e.g. backup import) so Today / My Animals refresh. */
export function notifyIndexedDbDataChanged(): void {
  dispatchCloudSyncEvent({ ok: true, reptileCount: 0, scheduleCount: 0 });
}

async function getCurrentUserId(): Promise<string | null> {
  return getCurrentSupabaseUserId();
}

/**
 * Hydrate IndexedDB from Supabase, then merge newer local reptiles/schedules upward.
 * First-login merges: prefers newer `updatedAt` per reptile/task; uploads locals when cloud is missing rows.
 * Pass `authenticatedUserId` from `getSession()` / `onAuthStateChange` when available where possible.
 */
export async function syncCurrentUserReptiles(authenticatedUserId?: string): Promise<void> {
  let userId: string | undefined = authenticatedUserId;
  try {
    if (!userId) userId = (await getCurrentUserId()) ?? undefined;
    if (!userId) {
      return;
    }

    await ensureScheduleItemsHaveTimestamps();
    await hydrateLocalFromCloud(userId);
    await hydrateLocalCareTasksFromCloud(userId);
    await hydrateLocalCareEventsFromCloud(userId);
    await syncLocalReptilesToCloud(userId);
    await syncLocalCareTasksToCloud(userId);
    await syncLocalCareEventsToCloud(userId);

    const sessionEmail = supabase
      ? ((await supabase.auth.getSession()).data.session?.user?.email ?? undefined)
      : undefined;
    const didSeedReviewDemo = await trySeedAppleReviewDemoForSession(userId, sessionEmail);
    if (didSeedReviewDemo) {
      await syncLocalReptilesToCloud(userId);
      await syncLocalCareTasksToCloud(userId);
      await syncLocalCareEventsToCloud(userId);
    }

    const db = await getDB();
    const reptileCount = (await db.getAll("reptiles")).length;
    const scheduleCount = (await db.getAll("scheduleItems")).length;
    writeLastSuccessfulCloudSyncMs(Date.now());
    dispatchCloudSyncEvent({ ok: true, reptileCount, scheduleCount });
  } catch (error) {
    console.warn("[CloudSync] failed:", error);
    dispatchCloudSyncEvent({ ok: false, error });
    throw error;
  }
}

/** Download cloud snapshot into IndexedDB without pushing local edits first. */
export async function pullCloudIntoLocal(authenticatedUserId?: string): Promise<void> {
  let userId: string | undefined = authenticatedUserId;
  try {
    if (!userId) userId = (await getCurrentUserId()) ?? undefined;
    if (!userId || !supabase) return;
    await ensureScheduleItemsHaveTimestamps();
    await hydrateLocalFromCloud(userId);
    await hydrateLocalCareTasksFromCloud(userId);
    await hydrateLocalCareEventsFromCloud(userId);
    writeLastSuccessfulCloudSyncMs(Date.now());
    const db = await getDB();
    dispatchCloudSyncEvent({
      ok: true,
      reptileCount: (await db.getAll("reptiles")).length,
      scheduleCount: (await db.getAll("scheduleItems")).length,
    });
  } catch (error) {
    console.warn("[CloudSync] pull failed:", error);
    dispatchCloudSyncEvent({ ok: false, error });
    throw error;
  }
}

/** Merge-push locals that are newer (or absent on the server); still reads cloud rows for merges. */
export async function pushLocalIntoCloud(authenticatedUserId?: string): Promise<void> {
  let userId: string | undefined = authenticatedUserId;
  try {
    if (!userId) userId = (await getCurrentUserId()) ?? undefined;
    if (!userId || !supabase) return;
    await ensureScheduleItemsHaveTimestamps();
    await syncLocalReptilesToCloud(userId);
    await syncLocalCareTasksToCloud(userId);
    await syncLocalCareEventsToCloud(userId);
    writeLastSuccessfulCloudSyncMs(Date.now());
    const db = await getDB();
    dispatchCloudSyncEvent({
      ok: true,
      reptileCount: (await db.getAll("reptiles")).length,
      scheduleCount: (await db.getAll("scheduleItems")).length,
    });
  } catch (error) {
    console.warn("[CloudSync] push failed:", error);
    dispatchCloudSyncEvent({ ok: false, error });
    throw error;
  }
}

export async function upsertCurrentUserCloudReptile(reptile: Reptile): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await upsertCloudReptile(userId, reptile);
}

export async function deleteCurrentUserCloudReptile(reptileId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await deleteCloudReptile(userId, reptileId);
}

export type PushCareTasksToCloudByIdsOpts = {
  authenticatedUserId?: string;
  /** User-initiated flows: brief info toast on failure (local save already succeeded). */
  notifyOnError?: boolean;
};

/**
 * Upserts only the given schedule rows to Supabase (no cloud→local hydrate, no full merge).
 * No-op when unsigned or Supabase unavailable. Errors are caught; use `notifyOnError` for UX hints.
 *
 * Second argument may be a user id string (legacy) or an options object.
 */
export async function pushCareTasksToCloudByIds(
  scheduleItemIds: string[],
  authenticatedUserIdOrOpts?: string | PushCareTasksToCloudByIdsOpts,
): Promise<void> {
  let authenticatedUserId: string | undefined;
  let notifyOnError = false;
  if (typeof authenticatedUserIdOrOpts === "string") {
    authenticatedUserId = authenticatedUserIdOrOpts;
  } else if (authenticatedUserIdOrOpts && typeof authenticatedUserIdOrOpts === "object") {
    authenticatedUserId = authenticatedUserIdOrOpts.authenticatedUserId;
    notifyOnError = !!authenticatedUserIdOrOpts.notifyOnError;
  }

  const ids = [...new Set(scheduleItemIds)].filter(Boolean);
  if (!supabase || ids.length === 0) return;

  try {
    let userId: string | undefined = authenticatedUserId;
    if (!userId) userId = (await getCurrentUserId()) ?? undefined;
    if (!userId) return;

    const db = await getDB();
    await ensureScheduleItemsHaveTimestampsForIds(ids);

    const reptileIds = new Set((await db.getAll("reptiles")).map((r) => r.id));

    for (const id of ids) {
      const local = await db.get("scheduleItems", id);
      if (!local || !reptileIds.has(local.reptileId)) continue;
      await upsertCloudCareTask(userId, local);
    }
  } catch (error) {
    console.warn("[CloudSync] narrow care task push failed:", error);
    if (notifyOnError) {
      toast.info("Saved on this device. Account sync may catch up shortly.", { duration: 3200 });
    }
  }
}

export type PushCareEventsToCloudByIdsOpts = {
  authenticatedUserId?: string;
  /** User-initiated flows: brief info toast on failure (local save already succeeded). */
  notifyOnError?: boolean;
};

/**
 * Upserts only the given Journal rows to Supabase (no cloud→local hydrate, no full merge).
 * No-op when unsigned or Supabase unavailable. Errors are caught; use `notifyOnError` for UX hints.
 */
export async function pushCareEventsToCloudByIds(
  careEventIds: string[],
  authenticatedUserIdOrOpts?: string | PushCareEventsToCloudByIdsOpts,
): Promise<void> {
  let authenticatedUserId: string | undefined;
  let notifyOnError = false;
  if (typeof authenticatedUserIdOrOpts === "string") {
    authenticatedUserId = authenticatedUserIdOrOpts;
  } else if (authenticatedUserIdOrOpts && typeof authenticatedUserIdOrOpts === "object") {
    authenticatedUserId = authenticatedUserIdOrOpts.authenticatedUserId;
    notifyOnError = !!authenticatedUserIdOrOpts.notifyOnError;
  }

  const ids = [...new Set(careEventIds)].filter(Boolean);
  if (!supabase || ids.length === 0) return;

  try {
    let userId: string | undefined = authenticatedUserId;
    if (!userId) userId = (await getCurrentUserId()) ?? undefined;
    if (!userId) return;

    const db = await getDB();
    const reptileIds = new Set((await db.getAll("reptiles")).map((r) => r.id));

    for (const id of ids) {
      const local = await db.get("careEvents", id);
      if (!local || !reptileIds.has(local.reptileId)) continue;
      await upsertCloudCareEvent(userId, {
        ...local,
        updatedAt: local.updatedAt ?? local.createdAt,
      });
    }
  } catch (error) {
    console.warn("[CloudSync] narrow care event push failed:", error);
    if (notifyOnError) {
      toast.info("Saved on this device. Journal sync may catch up shortly.", { duration: 3200 });
    }
  }
}

export async function deleteCurrentUserCloudCareEvent(eventId: string): Promise<void> {
  if (!supabase || !eventId) return;

  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await deleteCloudCareEvent(userId, eventId);
  } catch (error) {
    console.warn("[CloudSync] narrow care event delete failed:", error);
  }
}
