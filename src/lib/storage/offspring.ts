// Offspring storage module
import { getDB, generateId, getNow } from './db';
import type { Offspring, OffspringFormData } from '@/types';

export async function getAllOffspring(): Promise<Offspring[]> {
  const db = await getDB();
  return db.getAll('offspring');
}

export async function getOffspringById(id: string): Promise<Offspring | undefined> {
  const db = await getDB();
  return db.get('offspring', id);
}

export async function getOffspringByClutch(clutchId: string): Promise<Offspring[]> {
  const db = await getDB();
  return db.getAllFromIndex('offspring', 'by-clutch', clutchId);
}

export async function createOffspring(data: OffspringFormData): Promise<Offspring> {
  const db = await getDB();
  const now = getNow();
  
  const offspring: Offspring = {
    id: generateId(),
    clutchId: data.clutchId,
    name: data.name,
    sex: data.sex || 'unknown',
    morph: data.morph,
    hets: data.hets,
    notes: data.notes,
    createdAt: now,
  };

  await db.put('offspring', offspring);
  return offspring;
}

export async function updateOffspring(id: string, data: Partial<OffspringFormData>): Promise<Offspring | undefined> {
  const db = await getDB();
  const existing = await db.get('offspring', id);
  
  if (!existing) return undefined;

  const updated: Offspring = {
    ...existing,
    ...data,
  };

  await db.put('offspring', updated);
  return updated;
}

export async function deleteOffspring(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('offspring', id);
}
