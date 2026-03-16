// IndexedDB Storage Layer for Reptile AI
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Reptile, CareEvent, ScheduleItem, AppSettings, Pairing, Clutch, Offspring } from '@/types';

interface ReptileAIDB extends DBSchema {
  reptiles: {
    key: string;
    value: Reptile;
    indexes: { 'by-name': string };
  };
  careEvents: {
    key: string;
    value: CareEvent;
    indexes: { 
      'by-reptile': string;
      'by-date': string;
      'by-type': string;
    };
  };
  scheduleItems: {
    key: string;
    value: ScheduleItem;
    indexes: { 
      'by-reptile': string;
      'by-due-date': string;
    };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  // Phase 2: Breeding stores
  pairings: {
    key: string;
    value: Pairing;
    indexes: {
      'by-parent-a': string;
      'by-parent-b': string;
      'by-status': string;
    };
  };
  clutches: {
    key: string;
    value: Clutch;
    indexes: {
      'by-pairing': string;
      'by-laid-date': string;
    };
  };
  offspring: {
    key: string;
    value: Offspring;
    indexes: {
      'by-clutch': string;
    };
  };
}

const DB_NAME = 'reptile-ai-db';
const DB_VERSION = 2; // Incremented for Phase 2

let dbInstance: IDBPDatabase<ReptileAIDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<ReptileAIDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ReptileAIDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      // Reptiles store
      if (!db.objectStoreNames.contains('reptiles')) {
        const reptileStore = db.createObjectStore('reptiles', { keyPath: 'id' });
        reptileStore.createIndex('by-name', 'name');
      }

      // Care Events store
      if (!db.objectStoreNames.contains('careEvents')) {
        const eventStore = db.createObjectStore('careEvents', { keyPath: 'id' });
        eventStore.createIndex('by-reptile', 'reptileId');
        eventStore.createIndex('by-date', 'eventDate');
        eventStore.createIndex('by-type', 'eventType');
      }

      // Schedule Items store
      if (!db.objectStoreNames.contains('scheduleItems')) {
        const scheduleStore = db.createObjectStore('scheduleItems', { keyPath: 'id' });
        scheduleStore.createIndex('by-reptile', 'reptileId');
        scheduleStore.createIndex('by-due-date', 'nextDueDate');
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      // Phase 2: Pairings store
      if (!db.objectStoreNames.contains('pairings')) {
        const pairingStore = db.createObjectStore('pairings', { keyPath: 'id' });
        pairingStore.createIndex('by-parent-a', 'parentAId');
        pairingStore.createIndex('by-parent-b', 'parentBId');
        pairingStore.createIndex('by-status', 'status');
      }

      // Phase 2: Clutches store
      if (!db.objectStoreNames.contains('clutches')) {
        const clutchStore = db.createObjectStore('clutches', { keyPath: 'id' });
        clutchStore.createIndex('by-pairing', 'pairingId');
        clutchStore.createIndex('by-laid-date', 'laidDate');
      }

      // Phase 2: Offspring store
      if (!db.objectStoreNames.contains('offspring')) {
        const offspringStore = db.createObjectStore('offspring', { keyPath: 'id' });
        offspringStore.createIndex('by-clutch', 'clutchId');
      }
    },
  });

  return dbInstance;
}

// Generate UUID
export function generateId(): string {
  return crypto.randomUUID();
}

// Get today's date in ISO format
export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

// Get current ISO datetime
export function getNow(): string {
  return new Date().toISOString();
}

// Add days to a date
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

// Check if date is before or equal to today
export function isOverdue(dateStr: string): boolean {
  const today = getToday();
  return dateStr < today;
}

// Check if date is today
export function isDueToday(dateStr: string): boolean {
  return dateStr === getToday();
}

// Check if date is within next N days
export function isWithinDays(dateStr: string, days: number): boolean {
  const today = getToday();
  const futureDate = addDays(today, days);
  return dateStr <= futureDate && dateStr >= today;
}
