/**
 * THE 24-HOUR PAUSED-UPLOAD TRAY (device side).
 *
 * When uploads are paused, a chosen file must not fail and must not vanish on
 * a reload. The bytes are kept in IndexedDB under a stable `id` (the server
 * keeps the matching metadata row in `documentTray`), and both copies expire
 * 24 hours after the file was added.
 *
 * Everything here is best-effort: private mode, a browser without IndexedDB or
 * a quota error simply means the tray is in-memory for this session — the
 * caller never has to branch on it.
 */

export const TRAY_TTL_MS = 24 * 60 * 60 * 1000;

const DB_NAME = "nqas-document-tray";
const DB_VERSION = 1;
const STORE = "files";

export type TrayFile = {
  /** Stable across a reload; the same id is the server `documentTray.trayId`. */
  id: string;
  facilityId: string;
  docKey: string | null;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  addedAt: number;
  expiresAt: number;
  blob: Blob;
};

/** A stable id for one file in the tray. */
export function newTrayId(): string {
  const crypto = globalThis.crypto;
  if (crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `tray-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("by_facility", "facilityId", { unique: false });
        store.createIndex("by_expiry", "expiresAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

/** Every unexpired file this device is holding for the facility. */
export async function listTrayFiles(facilityId: string): Promise<TrayFile[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const request = store.index("by_facility").getAll(facilityId);
      request.onsuccess = () => {
        const now = Date.now();
        const rows = (request.result as TrayFile[] | undefined) ?? [];
        const live = rows.filter((row) => row.expiresAt > now);
        for (const expired of rows) {
          if (expired.expiresAt <= now) store.delete(expired.id);
        }
        resolve(live.sort((a, b) => a.addedAt - b.addedAt));
      };
      request.onerror = () => resolve([]);
      tx.oncomplete = () => db.close();
      tx.onerror = () => resolve([]);
      tx.onabort = () => resolve([]);
    } catch {
      db.close();
      resolve([]);
    }
  });
}

/** Add or update one file in the device tray. Never extends the expiry. */
export async function putTrayFile(row: TrayFile): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const existing = store.get(row.id);
      existing.onsuccess = () => {
        const previous = existing.result as TrayFile | undefined;
        // A re-pick of the same tray id keeps the original 24-hour clock.
        store.put(previous ? { ...row, addedAt: previous.addedAt, expiresAt: previous.expiresAt } : row);
      };
      existing.onerror = () => store.put(row);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      db.close();
      resolve(false);
    }
  });
}

/** Forget one file (uploaded, cancelled or expired). */
export async function removeTrayFile(id: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}

/** Turn a stored row back into a File the existing uploader accepts. */
export function trayFileAsFile(row: TrayFile): File {
  return new File([row.blob], row.name, {
    type: row.type || "application/octet-stream",
    lastModified: row.lastModified || row.addedAt,
  });
}

/** "23 h left" — a short, honest label for the tray. */
export function trayTimeLeft(row: Pick<TrayFile, "expiresAt">, now = Date.now()): string {
  const ms = Math.max(0, row.expiresAt - now);
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours} h left`;
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return `${minutes} min left`;
}
