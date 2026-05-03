/**
 * Full-device JSON backup (IndexedDB) for migration and safety.
 * Secrets (OpenAI key) are excluded; auth tokens are never stored in this file.
 */
import { getDB } from "@/lib/storage/db";
import { getSettings } from "@/lib/storage/settings";
import type {
  AppSettings,
  CareEvent,
  Clutch,
  Offspring,
  Pairing,
  Reptile,
  ScheduleItem,
} from "@/types";

export const REPTILITA_BACKUP_FORMAT = "reptilita_backup_v1" as const;
export type ReptilitaBackupFormatId = typeof REPTILITA_BACKUP_FORMAT;

export type ReptilitaBackupReportsMetaV1 = {
  /** Stored reports are regenerated in-app from journal entries; PDF export outputs are not portable binaries. */
  readme: string;
};

export interface ReptilitaBackupV1 {
  format: ReptilitaBackupFormatId;
  /** Schema version integer for validators. */
  version: 1;
  exportedAt: string;
  appVersion?: string;
  reptiles: Reptile[];
  scheduleItems: ScheduleItem[];
  careEvents: CareEvent[];
  pairings: Pairing[];
  clutches: Clutch[];
  offspring: Offspring[];
  settings: Omit<AppSettings, "openaiApiKey">;
  reportsMeta: ReptilitaBackupReportsMetaV1;
}

function sanitizedSettings(settings: AppSettings): Omit<AppSettings, "openaiApiKey"> {
  const { openaiApiKey: _omit, ...rest } = settings;
  return rest;
}

export async function exportFullBackupJson(): Promise<string> {
  const db = await getDB();
  const [
    reptiles,
    scheduleItems,
    careEvents,
    pairings,
    clutches,
    offspring,
    settings,
  ] = await Promise.all([
    db.getAll("reptiles"),
    db.getAll("scheduleItems"),
    db.getAll("careEvents"),
    db.getAll("pairings"),
    db.getAll("clutches"),
    db.getAll("offspring"),
    getSettings(),
  ]);

  const payload: ReptilitaBackupV1 = {
    format: REPTILITA_BACKUP_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion: __APP_VERSION__,
    reptiles,
    scheduleItems,
    careEvents,
    pairings,
    clutches,
    offspring,
    settings: sanitizedSettings(settings),
    reportsMeta: {
      readme:
        "Growth timelines and printable PDF summaries are regenerated from reptiles plus journal (care_events) inside the app.",
    },
  };

  return JSON.stringify(payload, null, 2);
}
