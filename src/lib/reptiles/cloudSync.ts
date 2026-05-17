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

function entityFreshness(value: { updatedAt?: string | null; createdAt?: string | null }): number {
  return parseDate(value.updatedAt) || parseDate(value.createdAt);
}

type ScheduleItemWithCreatedAt = ScheduleItem & { createdAt?: string | null };

function scheduleFreshness(value: Pick<ScheduleItemWithCreatedAt, "updatedAt" | "createdAt">): number {
  return parseDate(value.updatedAt) || parseDate(value.createdAt);
}

function cloudCareTaskFreshness(row: Pick<CloudCareTaskRow, "updated_at" | "created_at">): number {
  return parseDate(row.updated_at) || parseDate(row.created_at);
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

  const { data: existingRow, error: fetchError } = await supabase
    .from("reptiles")
    .select("*")
    .eq("user_id", userId)
    .eq("id", reptile.id)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const existingCloud = existingRow ? fromCloudRecord(existingRow as CloudReptileRow) : null;
  let reptileForRecord = reptile;
  if (existingCloud) {
    const cloudFreshness = entityFreshness(existingCloud);
    const localFreshness = entityFreshness(reptile);
    if (cloudFreshness > localFreshness) return;
    if (cloudFreshness === localFreshness) {
      const localHasNewPhotoPath = !!reptile.photoPath && !existingRow?.photo_path;
      if (!localHasNewPhotoPath) return;
      reptileForRecord = {
        ...existingCloud,
        photoPath: reptile.photoPath,
        photoUrl: reptile.photoUrl ?? existingCloud.photoUrl,
      };
    }
  }

  let effectivePhotoPath: string | null = reptileForRecord.photoPath ?? null;
  if (!effectivePhotoPath) {
    effectivePhotoPath = (existingRow?.photo_path as string | null | undefined) ?? null;
  }

  const record = toCloudRecord(userId, reptileForRecord, effectivePhotoPath);
  const { created_at: _preserveCreatedAt, ...recordWithoutCreatedAt } = record;
  const updatePayload: TablesUpdate<"reptiles"> = existingRow ? recordWithoutCreatedAt : record;

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
  const pendingDeleteIds = new Set(readPendingReptileDeleteIds(userId));

  for (const cloudReptile of cloudReptiles) {
    if (pendingDeleteIds.has(cloudReptile.id)) continue;
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

const PENDING_REPTILE_DELETES_KEY_PREFIX = "reptilita.pendingDeletes.reptiles";
const PENDING_CARE_EVENT_DELETES_KEY_PREFIX = "reptilita.pendingDeletes.events";

function pendingDeleteKey(prefix: string, userId: string): string {
  return `${prefix}.${userId}`;
}

function readPendingDeleteIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((id): id is string => typeof id === "string" && !!id))]
      : [];
  } catch {
    return [];
  }
}

function writePendingDeleteIds(key: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(unique));
}

function queuePendingDelete(key: string, id: string): void {
  writePendingDeleteIds(key, [...readPendingDeleteIds(key), id]);
}

function readPendingReptileDeleteIds(userId: string): string[] {
  return readPendingDeleteIds(pendingDeleteKey(PENDING_REPTILE_DELETES_KEY_PREFIX, userId));
}

function writePendingReptileDeleteIds(userId: string, ids: string[]): void {
  writePendingDeleteIds(pendingDeleteKey(PENDING_REPTILE_DELETES_KEY_PREFIX, userId), ids);
}

function queuePendingReptileDelete(userId: string, id: string): void {
  queuePendingDelete(pendingDeleteKey(PENDING_REPTILE_DELETES_KEY_PREFIX, userId), id);
}

function readPendingCareEventDeleteIds(userId: string): string[] {
  return readPendingDeleteIds(pendingDeleteKey(PENDING_CARE_EVENT_DELETES_KEY_PREFIX, userId));
}

function writePendingCareEventDeleteIds(userId: string, ids: string[]): void {
  writePendingDeleteIds(pendingDeleteKey(PENDING_CARE_EVENT_DELETES_KEY_PREFIX, userId), ids);
}

function queuePendingCareEventDelete(userId: string, id: string): void {
  queuePendingDelete(pendingDeleteKey(PENDING_CARE_EVENT_DELETES_KEY_PREFIX, userId), id);
}

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

  const { data: existingRow, error: fetchError } = await supabase
    .from("reptile_care_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("id", schedule.id)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existingRow) {
    const localFreshness = scheduleFreshness(schedule);
    const cloudFreshness = cloudCareTaskFreshness(existingRow as CloudCareTaskRow);
    if (cloudFreshness >= localFreshness) return;
  }

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
  const [localTasks, cloudTasks] = await Promise.all([
    db.getAll("scheduleItems"),
    fetchCloudCareTasks(userId),
  ]);

  const reptileIds = new Set((await db.getAll("reptiles")).map((r) => r.id));
  const localTasksSynced = localTasks.filter((task) => reptileIds.has(task.reptileId));

  const cloudById = new Map(cloudTasks.map((task) => [task.id, task]));

  for (const local of localTasksSynced) {
    const cloudRow = cloudById.get(local.id);
    const localTs = scheduleFreshness(local);
    const cloudTs = cloudRow ? scheduleFreshness(cloudRow) : 0;

    if (!cloudRow) {
      await upsertCloudCareTask(userId, local);
      continue;
    }

    if (localTs > cloudTs) {
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

  await ensureScheduleItemsHaveTimestamps();
}

function careEventFreshness(event: Pick<CareEvent, "updatedAt" | "createdAt">): number {
  return entityFreshness(event);
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

  const { data: existingRow, error: fetchError } = await supabase
    .from("reptile_care_events")
    .select("*")
    .eq("user_id", userId)
    .eq("id", event.id)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existingRow) {
    const existingCloud = fromCloudCareEventRow(existingRow as CloudCareEventRow);
    if (careEventFreshness(existingCloud) >= careEventFreshness(event)) return;
  }

  const record = toCloudCareEventRecord(userId, event);
  const { created_at: _preserveCreatedAt, ...recordWithoutCreatedAt } = record;
  const updatePayload: TablesUpdate<"reptile_care_events"> = existingRow ? recordWithoutCreatedAt : record;

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

async function flushPendingCloudDeletes(userId: string): Promise<void> {
  const pendingReptileIds = readPendingReptileDeleteIds(userId);
  const remainingReptileIds: string[] = [];
  for (const reptileId of pendingReptileIds) {
    try {
      await deleteCloudReptile(userId, reptileId);
    } catch {
      remainingReptileIds.push(reptileId);
    }
  }
  writePendingReptileDeleteIds(userId, remainingReptileIds);

  const pendingCareEventIds = readPendingCareEventDeleteIds(userId);
  const remainingCareEventIds: string[] = [];
  for (const eventId of pendingCareEventIds) {
    try {
      await deleteCloudCareEvent(userId, eventId);
    } catch {
      remainingCareEventIds.push(eventId);
    }
  }
  writePendingCareEventDeleteIds(userId, remainingCareEventIds);
}

export async function hydrateLocalCareEventsFromCloud(userId: string): Promise<void> {
  const db = await getDB();
  const cloudEvents = await fetchCloudCareEvents(userId);
  const pendingDeleteIds = new Set(readPendingCareEventDeleteIds(userId));
  await ensureCareEventsHaveTimestamps();

  for (const cloud of cloudEvents) {
    if (pendingDeleteIds.has(cloud.id)) continue;

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
  const pendingDeleteIds = new Set(readPendingCareEventDeleteIds(userId));
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
    if (pendingDeleteIds.has(cloud.id)) continue;
    const local = await db.get("careEvents", cloud.id);
    if (!local) {
      await db.put("careEvents", cloud);
    }
  }
}

export async function syncLocalReptilesToCloud(userId: string): Promise<void> {
  const db = await getDB();
  const pendingDeleteIds = new Set(readPendingReptileDeleteIds(userId));
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
    const shouldUploadMissingCloudPhotoPath =
      localUpdatedAt === cloudUpdatedAt && !!reptileForSync.photoPath && !cloudReptile.photoPath;

    if (localUpdatedAt > cloudUpdatedAt || shouldUploadMissingCloudPhotoPath) {
      await upsertCloudReptile(userId, reptileForSync);
    } else if (cloudUpdatedAt > localUpdatedAt) {
      await db.put("reptiles", cloudReptile);
    }
  }

  for (const cloudReptile of cloudReptiles) {
    if (pendingDeleteIds.has(cloudReptile.id)) continue;
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
    | { ok: true; reptileCount: number; scheduleCount: number; careEventCount: number }
    | { ok: false; error: unknown },
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REPTILES_CLOUD_SYNC_EVENT, { detail }));
}

/** Call after local-only bulk writes (e.g. backup import) so Today / My Animals refresh. */
export function notifyIndexedDbDataChanged(): void {
  dispatchCloudSyncEvent({ ok: true, reptileCount: 0, scheduleCount: 0, careEventCount: 0 });
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

    await flushPendingCloudDeletes(userId);
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
    const careEventCount = (await db.getAll("careEvents")).length;
    writeLastSuccessfulCloudSyncMs(Date.now());
    dispatchCloudSyncEvent({ ok: true, reptileCount, scheduleCount, careEventCount });
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
    await flushPendingCloudDeletes(userId);
    await hydrateLocalFromCloud(userId);
    await hydrateLocalCareTasksFromCloud(userId);
    await hydrateLocalCareEventsFromCloud(userId);
    await ensureScheduleItemsHaveTimestamps();
    writeLastSuccessfulCloudSyncMs(Date.now());
    const db = await getDB();
    dispatchCloudSyncEvent({
      ok: true,
      reptileCount: (await db.getAll("reptiles")).length,
      scheduleCount: (await db.getAll("scheduleItems")).length,
      careEventCount: (await db.getAll("careEvents")).length,
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
    await flushPendingCloudDeletes(userId);
    await syncLocalReptilesToCloud(userId);
    await syncLocalCareTasksToCloud(userId);
    await syncLocalCareEventsToCloud(userId);
    writeLastSuccessfulCloudSyncMs(Date.now());
    const db = await getDB();
    dispatchCloudSyncEvent({
      ok: true,
      reptileCount: (await db.getAll("reptiles")).length,
      scheduleCount: (await db.getAll("scheduleItems")).length,
      careEventCount: (await db.getAll("careEvents")).length,
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
  try {
    await deleteCloudReptile(userId, reptileId);
  } catch (error) {
    queuePendingReptileDelete(userId, reptileId);
    throw error;
  }
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

  let userId: string | null = null;
  try {
    userId = await getCurrentUserId();
    if (!userId) return;
    await deleteCloudCareEvent(userId, eventId);
  } catch (error) {
    if (userId) queuePendingCareEventDelete(userId, eventId);
    console.warn("[CloudSync] narrow care event delete failed:", error);
  }
}
