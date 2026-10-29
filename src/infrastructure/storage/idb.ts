// Tiny promise wrapper over IndexedDB. Everything stays on the device.
const DB_NAME = "strivr-cards";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("cards")) db.createObjectStore("cards", { keyPath: "id" });
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

function run<T>(
  store: "cards" | "kv",
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        t.oncomplete = () => resolve(req.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

export function kvGet<T>(key: string): Promise<T | undefined> {
  return run<T | undefined>("kv", "readonly", (s) => s.get(key));
}
export function kvSet(key: string, value: unknown): Promise<IDBValidKey> {
  return run("kv", "readwrite", (s) => s.put(value, key));
}
export function kvDel(key: string): Promise<undefined> {
  return run<undefined>("kv", "readwrite", (s) => s.delete(key));
}

export interface CardRecord {
  id: string;
  fileName: string;
  mime: string;
  size: number;
  savedAt: number;
  blob: Blob;
}

export function cardsAll(): Promise<CardRecord[]> {
  return run<CardRecord[]>("cards", "readonly", (s) => s.getAll());
}
export function cardPut(rec: CardRecord): Promise<IDBValidKey> {
  return run("cards", "readwrite", (s) => s.put(rec));
}
export function cardDelete(id: string): Promise<undefined> {
  return run<undefined>("cards", "readwrite", (s) => s.delete(id));
}
