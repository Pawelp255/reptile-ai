// Pairings storage module
import { getDB, generateId, getNow, getToday } from './db';
import type { Pairing, PairingFormData, PairingStatus } from '@/types';

export async function getAllPairings(): Promise<Pairing[]> {
  const db = await getDB();
  return db.getAll('pairings');
}

export async function getPairingById(id: string): Promise<Pairing | undefined> {
  const db = await getDB();
  return db.get('pairings', id);
}

export async function getPairingsByReptile(reptileId: string): Promise<Pairing[]> {
  const db = await getDB();
  const allPairings = await db.getAll('pairings');
  return allPairings.filter(p => p.parentAId === reptileId || p.parentBId === reptileId);
}

export async function getPairingsByStatus(status: PairingStatus): Promise<Pairing[]> {
  const db = await getDB();
  return db.getAllFromIndex('pairings', 'by-status', status);
}

export async function createPairing(data: PairingFormData): Promise<Pairing> {
  const db = await getDB();
  const now = getNow();
  
  const pairing: Pairing = {
    id: generateId(),
    parentAId: data.parentAId,
    parentBId: data.parentBId,
    startDate: data.startDate || getToday(),
    status: data.status || 'planned',
    notes: data.notes,
    createdAt: now,
  };

  await db.put('pairings', pairing);
  return pairing;
}

export async function updatePairing(id: string, data: Partial<PairingFormData>): Promise<Pairing | undefined> {
  const db = await getDB();
  const existing = await db.get('pairings', id);
  
  if (!existing) return undefined;

  const updated: Pairing = {
    ...existing,
    ...data,
  };

  await db.put('pairings', updated);
  return updated;
}

export async function deletePairing(id: string): Promise<void> {
  const db = await getDB();
  
  // Also delete associated clutches and offspring
  const clutches = await db.getAllFromIndex('clutches', 'by-pairing', id);
  for (const clutch of clutches) {
    const offspring = await db.getAllFromIndex('offspring', 'by-clutch', clutch.id);
    for (const o of offspring) {
      await db.delete('offspring', o.id);
    }
    await db.delete('clutches', clutch.id);
  }
  
  await db.delete('pairings', id);
}
