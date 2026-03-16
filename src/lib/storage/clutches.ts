// Clutches storage module
import { getDB, generateId, getNow } from './db';
import type { Clutch, ClutchFormData } from '@/types';

export async function getAllClutches(): Promise<Clutch[]> {
  const db = await getDB();
  return db.getAll('clutches');
}

export async function getClutchById(id: string): Promise<Clutch | undefined> {
  const db = await getDB();
  return db.get('clutches', id);
}

export async function getClutchesByPairing(pairingId: string): Promise<Clutch[]> {
  const db = await getDB();
  return db.getAllFromIndex('clutches', 'by-pairing', pairingId);
}

export async function createClutch(data: ClutchFormData): Promise<Clutch> {
  const db = await getDB();
  const now = getNow();
  
  const clutch: Clutch = {
    id: generateId(),
    pairingId: data.pairingId,
    laidDate: data.laidDate,
    eggCount: data.eggCount,
    incubatorNotes: data.incubatorNotes,
    expectedHatchDate: data.expectedHatchDate,
    createdAt: now,
  };

  await db.put('clutches', clutch);
  return clutch;
}

export async function updateClutch(id: string, data: Partial<ClutchFormData & { hatchCount?: number }>): Promise<Clutch | undefined> {
  const db = await getDB();
  const existing = await db.get('clutches', id);
  
  if (!existing) return undefined;

  const updated: Clutch = {
    ...existing,
    ...data,
  };

  await db.put('clutches', updated);
  return updated;
}

export async function deleteClutch(id: string): Promise<void> {
  const db = await getDB();
  
  // Also delete associated offspring
  const offspring = await db.getAllFromIndex('offspring', 'by-clutch', id);
  for (const o of offspring) {
    await db.delete('offspring', o.id);
  }
  
  await db.delete('clutches', id);
}
