const DB_NAME = 'CardSimDB';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

export const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = event => reject(event.target.error);

    request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
        }
    };

    request.onsuccess = event => resolve(event.target.result);
});

export const db = {
    async get(key) {
        const database = await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async set(key, val) {
        const database = await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(val, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async del(key) {
        const database = await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async clear() {
        const database = await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async keys() {
        const database = await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAllKeys();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
};

// Migration script to move data from localStorage to IndexedDB
export async function migrateFromLocalStorage() {
    // Keys we care about
    const KEYS = ['master-sets', 'card-collection', 'gold-coins', 'claimed-codes'];
    let migrationOccurred = false;

    for (const key of KEYS) {
        const localValue = localStorage.getItem(key);
        if (localValue) {
            console.log(`Migrating ${key} to IndexedDB...`);
            // Parse if it's JSON, but we store everything as is or parse? 
            // Our DB can store objects directly.
            // App expects specific formats. Let's parse JSON if possible to store native objects.
            try {
                const parsed = JSON.parse(localValue);
                await db.set(key, parsed);
            } catch (e) {
                // If not JSON (like gold-coins might be raw string), store as is or number?
                // gold-coins is parseInt in App.jsx.
                // Let's store consistent with how we use it. 
                // However, preserving exact local storage string value works too if we parse on load.
                // Better to standardize on Objects/Values in IDB.
                if (key === 'gold-coins') {
                    await db.set(key, parseInt(localValue));
                } else {
                    await db.set(key, localValue);
                }
            }

            // Should we delete from localStorage?
            // Yes, to prevent double truth and free up space.
            localStorage.removeItem(key);
            migrationOccurred = true;
        }
    }

    if (migrationOccurred) {
        console.log('Migration complete.');
    }
}
