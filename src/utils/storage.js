
import { get, set } from 'idb-keyval';
import { SETS } from '../data/sets';

/**
 * Migrates data from localStorage to IndexedDB if it exists.
 * Returns the migrated data or null if no migration occurred.
 */
async function migrateFromLocalStorage(key) {
  const localData = localStorage.getItem(key);
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      await set(key, parsed);
      localStorage.removeItem(key); // clear to save space
      console.log(`Successfully migrated ${key} to IndexedDB.`);
      return parsed;
    } catch (e) {
      console.error(`Error migrating ${key}:`, e);
      return null;
    }
  }
  return null;
}

export const loadMasterSets = async () => {
  // Priority: 1. Migration, 2. IndexedDB, 3. Default Constant
  const migrated = await migrateFromLocalStorage('master-sets');
  if (migrated) return migrated;

  const stored = await get('master-sets');
  // Check if stored data is valid (sometimes it might be empty object?)
  if (stored && Array.isArray(stored) && stored.length > 0) {
    return stored;
  }
  
  // Logic from App.jsx: if total cards is 0 but defaults exist, use defaults
  if (stored) {
      const totalCards = stored.reduce((acc, s) => acc + (s.cards || []).length, 0);
      const defaultTotalCards = SETS.reduce((acc, s) => acc + (s.cards || []).length, 0);
       if (totalCards === 0 && defaultTotalCards > 0) {
        return SETS;
      }
      return stored;
  }

  return SETS;
};

export const saveMasterSets = async (sets) => {
  await set('master-sets', sets);
};

export const loadCollection = async () => {
  const migrated = await migrateFromLocalStorage('card-collection');
  if (migrated) return migrated;

  const stored = await get('card-collection');
  return stored || {};
};

export const saveCollection = async (collection) => {
  await set('card-collection', collection);
};

// Also handle other large objects if needed, but these are small usually:
// gold-coins, claimed-codes, db_reset_flag_v1
// We can keep them in localStorage for performance/simplicity as they are small strings/numbers.
