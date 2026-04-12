import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables, TablesInsert } from "@/integrations/supabase/types";
import {
  getCareEventsByReptile,
  getLastEventByType,
  getReptileById,
  getScheduleByReptile,
} from "@/lib/storage";
import { buildPublicShareUrl } from "@/lib/share/shareUrls";
import type { CareEvent, Reptile, ScheduleItem } from "@/types";

export type PublicShareType = "profile" | "passport" | "care-card";
export type PublicShareRecord = Tables<"public_share_records">;
export type PublicShareLifecycleState = "active" | "expired" | "revoked" | "local-only";

export type PublicShareStatus = {
  state: PublicShareLifecycleState;
  record: PublicShareRecord | null;
  isStale: boolean;
};

export type PublicSharePayload = {
  branding: "Reptilita";
  version: 1;
  shareType: PublicShareType;
  animal: {
    name: string;
    species: string;
    commonName?: string;
    scientificName?: string;
    animalCategory?: string;
    speciesGroup?: string;
    morph?: string;
    sex?: string;
    birthDate?: string;
    estimatedAgeMonths?: number;
    acquisitionDate?: string;
    dietType?: string;
    breedingStatus?: string;
    notes?: string;
    habitatType?: string;
    humidityPreference?: string;
    temperaturePreference?: string;
    uvbRequirement?: string;
    waterRequirement?: string;
    handlingProfile?: string;
    isVenomous?: boolean;
    isDangerous?: boolean;
    isAmphibian?: boolean;
    geneticsSummary?: string;
    photoUrl?: string;
    photoStorage?: "remote-url" | "inline-data-url" | "omitted-large-inline";
    updatedAt: string;
  };
  care: {
    lastFeeding?: PublicCareEventSummary;
    lastShedding?: PublicCareEventSummary;
    latestHealth?: PublicCareEventSummary;
    upcomingTasks: PublicScheduleSummary[];
  };
};

type PublicCareEventSummary = {
  eventDate: string;
  details?: string;
  weightGrams?: number;
  lengthCm?: number;
};

type PublicScheduleSummary = {
  taskType: "feed" | "clean" | "check";
  frequencyDays: number;
  nextDueDate: string;
};

type PublicShareInput = {
  reptileId: string;
  shareType: PublicShareType;
  expiresAt?: string | null;
};

type PublicShareResult = {
  record: PublicShareRecord;
  url: string;
};

const MAX_INLINE_PUBLIC_PHOTO_CHARS = 450_000;

function requireSupabase() {
  if (!supabase) {
    throw new Error("Public sharing is unavailable until Supabase is configured.");
  }
  return supabase;
}

function isExpired(record: Pick<PublicShareRecord, "expires_at">): boolean {
  return Boolean(record.expires_at && new Date(record.expires_at).getTime() <= Date.now());
}

function isPublicSnapshotStale(record: PublicShareRecord, localUpdatedAt?: string): boolean {
  if (!localUpdatedAt) return false;
  const localTime = new Date(localUpdatedAt).getTime();
  const publicTime = new Date(record.updated_at).getTime();
  if (Number.isNaN(localTime) || Number.isNaN(publicTime)) return false;
  return localTime > publicTime;
}

function getRecordState(record: PublicShareRecord): Exclude<PublicShareLifecycleState, "local-only"> {
  if (record.revoked) return "revoked";
  if (isExpired(record)) return "expired";
  return "active";
}

function generateSlug(): string {
  const random = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(random, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function preparePublicPhoto(photoUrl?: string): {
  photoUrl?: string;
  photoStorage?: PublicSharePayload["animal"]["photoStorage"];
} {
  const value = cleanText(photoUrl);
  if (!value) return {};
  if (!value.startsWith("data:")) return { photoUrl: value, photoStorage: "remote-url" };
  if (value.length <= MAX_INLINE_PUBLIC_PHOTO_CHARS) {
    return { photoUrl: value, photoStorage: "inline-data-url" };
  }
  return { photoStorage: "omitted-large-inline" };
}

function cleanText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function summarizeGenes(reptile: Reptile): string | undefined {
  const parts = [
    cleanText(reptile.morph),
    reptile.genes?.map((gene) => gene.name).filter(Boolean).join(", "),
    reptile.hets?.length ? `Het ${reptile.hets.join(", ")}` : undefined,
    cleanText(reptile.geneticsNotes),
  ].filter(Boolean);

  return parts.join(" | ") || undefined;
}

function summarizeEvent(event: CareEvent | null | undefined): PublicCareEventSummary | undefined {
  if (!event) return undefined;
  return {
    eventDate: event.eventDate,
    details: cleanText(event.details),
    weightGrams: event.weightGrams,
    lengthCm: event.lengthCm,
  };
}

function latestHealthEvent(events: CareEvent[]): CareEvent | undefined {
  return events
    .filter((event) => event.eventType === "health")
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate))[0];
}

function summarizeSchedule(schedule: ScheduleItem[]): PublicScheduleSummary[] {
  const today = new Date().toISOString().split("T")[0];
  return schedule
    .filter((item) => item.nextDueDate >= today)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
    .slice(0, 4)
    .map((item) => ({
      taskType: item.taskType,
      frequencyDays: item.frequencyDays,
      nextDueDate: item.nextDueDate,
    }));
}

function buildPayload(args: {
  reptile: Reptile;
  schedule: ScheduleItem[];
  events: CareEvent[];
  lastFeeding?: CareEvent;
  lastShedding?: CareEvent;
  shareType: PublicShareType;
}): PublicSharePayload {
  const { reptile, schedule, events, lastFeeding, lastShedding, shareType } = args;
  const publicPhoto = preparePublicPhoto(reptile.photoUrl);

  return {
    branding: "Reptilita",
    version: 1,
    shareType,
    animal: {
      name: reptile.name,
      species: reptile.species,
      commonName: cleanText(reptile.commonName),
      scientificName: cleanText(reptile.scientificName),
      animalCategory: reptile.animalCategory,
      speciesGroup: cleanText(reptile.speciesGroup),
      morph: cleanText(reptile.morph),
      sex: reptile.sex,
      birthDate: reptile.birthDate,
      estimatedAgeMonths: reptile.estimatedAgeMonths,
      acquisitionDate: reptile.acquisitionDate,
      dietType: reptile.dietType,
      breedingStatus: reptile.breedingStatus,
      notes: cleanText(reptile.notes),
      habitatType: reptile.habitatType,
      humidityPreference: reptile.humidityPreference,
      temperaturePreference: reptile.temperaturePreference,
      uvbRequirement: reptile.uvbRequirement,
      waterRequirement: reptile.waterRequirement,
      handlingProfile: reptile.handlingProfile,
      isVenomous: reptile.isVenomous || undefined,
      isDangerous: reptile.isDangerous || undefined,
      isAmphibian: reptile.isAmphibian || undefined,
      geneticsSummary: summarizeGenes(reptile),
      photoUrl: publicPhoto.photoUrl,
      photoStorage: publicPhoto.photoStorage,
      updatedAt: reptile.updatedAt,
    },
    care: {
      lastFeeding: summarizeEvent(lastFeeding),
      lastShedding: summarizeEvent(lastShedding),
      latestHealth: summarizeEvent(latestHealthEvent(events)),
      upcomingTasks: summarizeSchedule(schedule),
    },
  };
}

async function buildPayloadForReptile(
  reptileId: string,
  shareType: PublicShareType,
): Promise<{ reptile: Reptile; payload: PublicSharePayload }> {
  const [reptile, schedule, events, lastFeeding, lastShedding] = await Promise.all([
    getReptileById(reptileId),
    getScheduleByReptile(reptileId),
    getCareEventsByReptile(reptileId),
    getLastEventByType(reptileId, "feeding"),
    getLastEventByType(reptileId, "shedding"),
  ]);

  if (!reptile) throw new Error("Animal record not found on this device.");

  return {
    reptile,
    payload: buildPayload({
      reptile,
      schedule,
      events,
      lastFeeding,
      lastShedding,
      shareType,
    }),
  };
}

export async function getPublicShareForAnimal(
  reptileId: string,
  shareType: PublicShareType,
): Promise<PublicShareRecord | null> {
  const status = await getPublicShareStatusForAnimal(reptileId, shareType);
  return status.state === "active" ? status.record : null;
}

export async function getPublicShareStatusForAnimal(
  reptileId: string,
  shareType: PublicShareType,
  localUpdatedAt?: string,
): Promise<PublicShareStatus> {
  if (!supabase) {
    return { state: "local-only", record: null, isStale: false };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { state: "local-only", record: null, isStale: false };

  const { data, error } = await supabase
    .from("public_share_records")
    .select("*")
    .eq("user_id", user.id)
    .eq("reptile_id", reptileId)
    .eq("share_type", shareType)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { state: "local-only", record: null, isStale: false };

  return {
    state: getRecordState(data),
    record: data,
    isStale: isPublicSnapshotStale(data, localUpdatedAt),
  };
}

export async function createOrUpdatePublicShare({
  reptileId,
  shareType,
  expiresAt = null,
}: PublicShareInput): Promise<PublicShareResult> {
  const client = requireSupabase();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    throw new Error("Sign in to create public share links.");
  }

  const [{ payload, reptile }, shareStatus] = await Promise.all([
    buildPayloadForReptile(reptileId, shareType),
    getPublicShareStatusForAnimal(reptileId, shareType),
  ]);
  const existing = shareStatus.record && shareStatus.state !== "revoked" ? shareStatus.record : null;

  const title = `${reptile.name} | Reptilita ${shareType === "care-card" ? "Care Card" : shareType === "passport" ? "Passport" : "Profile"}`;
  const summary = [reptile.commonName || reptile.species, reptile.morph].filter(Boolean).join(" | ") || null;

  if (existing) {
    const { data, error } = await client
      .from("public_share_records")
      .update({
        title,
        summary,
        payload: payload as unknown as Json,
        expires_at: expiresAt,
        revoked: false,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw error;
    return { record: data, url: buildPublicShareUrl(shareType, data.slug) };
  }

  const insert: TablesInsert<"public_share_records"> = {
    user_id: user.id,
    reptile_id: reptileId,
    share_type: shareType,
    slug: generateSlug(),
    title,
    summary,
    payload: payload as unknown as Json,
    expires_at: expiresAt,
  };

  const { data, error } = await client
    .from("public_share_records")
    .insert(insert)
    .select("*")
    .single();

  if (error) throw error;
  return { record: data, url: buildPublicShareUrl(shareType, data.slug) };
}

export async function regeneratePublicShare(input: PublicShareInput): Promise<PublicShareResult> {
  const current = await getPublicShareStatusForAnimal(input.reptileId, input.shareType);
  if (current.record) {
    await revokePublicShare(current.record.id);
  }
  return createOrUpdatePublicShare(input);
}

export async function revokePublicShare(recordId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("public_share_records")
    .update({ revoked: true })
    .eq("id", recordId);

  if (error) throw error;
}

export async function getPublicShareBySlug(
  shareType: PublicShareType,
  slug: string,
): Promise<PublicShareRecord | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("public_share_records")
    .select("*")
    .eq("share_type", shareType)
    .eq("slug", slug)
    .eq("revoked", false)
    .maybeSingle();

  if (error) throw error;

  if (data && isExpired(data)) {
    return null;
  }

  return data;
}

export function parsePublicSharePayload(payload: Json): PublicSharePayload | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const candidate = payload as Partial<PublicSharePayload>;
  if (candidate.branding !== "Reptilita" || candidate.version !== 1 || !candidate.animal?.name) {
    return null;
  }
  return candidate as PublicSharePayload;
}
