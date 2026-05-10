import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { getDB } from "@/lib/storage/db";
import { ensureScheduleItemsHaveTimestamps } from "@/lib/storage/schedule";
import { writeLastSuccessfulCloudSyncMs } from "@/lib/sync/syncTelemetry";
import type { Reptile, ScheduleItem, TaskType } from "@/types";

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

function toCloudRecord(userId: string, reptile: Reptile): TablesInsert<"reptiles"> {
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
    photo_url: reptile.photoUrl ?? null,
    sort_order: typeof reptile.sortOrder === "number" ? reptile.sortOrder : null,
    data: reptile as unknown as Json,
    created_at: reptile.createdAt,
    updated_at: reptile.updatedAt,
  };
}

function fromCloudRecord(row: CloudReptileRow): Reptile {
  const payload = (row.data && typeof row.data === "object" && !Array.isArray(row.data)
    ? row.data
    : {}) as Partial<Reptile>;

  return {
    ...payload,
    id: payload.id ?? row.id,
    name: payload.name ?? row.name,
    species: payload.species ?? row.species,
    morph: payload.morph ?? row.morph ?? undefined,
    sex: payload.sex ?? (row.sex as Reptile["sex"]),
    birthDate: payload.birthDate ?? row.birth_date ?? undefined,
    estimatedAgeMonths: payload.estimatedAgeMonths ?? row.estimated_age_months ?? undefined,
    acquisitionDate: payload.acquisitionDate ?? row.acquisition_date ?? undefined,
    dietType: payload.dietType ?? (row.diet_type as Reptile["dietType"]),
    breedingStatus: payload.breedingStatus ?? (row.breeding_status as Reptile["breedingStatus"]),
    notes: payload.notes ?? row.notes ?? undefined,
    photoUrl: payload.photoUrl ?? row.photo_url ?? undefined,
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
  return (data as CloudReptileRow[]).map(fromCloudRecord);
}

export async function upsertCloudReptile(userId: string, reptile: Reptile): Promise<void> {
  if (!supabase) return;

  const record = toCloudRecord(userId, reptile);
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

function toCloudCareTaskRecord(userId: string, schedule: ScheduleItem): TablesInsert<"reptile_care_tasks"> {
  const updatedAt =
    schedule.updatedAt && parseDate(schedule.updatedAt) > 0 ? schedule.updatedAt : new Date().toISOString();
  return {
    id: schedule.id,
    user_id: userId,
    reptile_id: schedule.reptileId,
    task_type: schedule.taskType,
    frequency_days: schedule.frequencyDays,
    last_done_date: schedule.lastDoneDate ?? null,
    next_due_date: schedule.nextDueDate,
    auto_generated: schedule.autoGenerated,
    data: schedule as unknown as Json,
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

export async function syncLocalReptilesToCloud(userId: string): Promise<void> {
  const db = await getDB();
  const [localReptiles, cloudReptiles] = await Promise.all([
    db.getAll("reptiles"),
    fetchCloudReptiles(userId),
  ]);

  const cloudById = new Map(cloudReptiles.map((reptile) => [reptile.id, reptile]));

  for (const localReptile of localReptiles) {
    const cloudReptile = cloudById.get(localReptile.id);
    if (!cloudReptile) {
      await upsertCloudReptile(userId, localReptile);
      continue;
    }

    const localUpdatedAt = parseDate(localReptile.updatedAt);
    const cloudUpdatedAt = parseDate(cloudReptile.updatedAt);

    if (localUpdatedAt > cloudUpdatedAt) {
      await upsertCloudReptile(userId, localReptile);
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
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
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
      console.log("[CloudSync] skip (not signed in)");
      return;
    }

    await ensureScheduleItemsHaveTimestamps();
    await hydrateLocalFromCloud(userId);
    await hydrateLocalCareTasksFromCloud(userId);
    await syncLocalReptilesToCloud(userId);
    await syncLocalCareTasksToCloud(userId);

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
