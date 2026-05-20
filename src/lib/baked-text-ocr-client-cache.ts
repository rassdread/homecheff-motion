import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";

type CachedOcrEntry = {
  blocks: BakedTextBlockRecord[];
  autoConfirmed: boolean;
  provider?: string;
  savedAt: string;
};

const ocrByContentHash = new Map<string, CachedOcrEntry>();
const OCR_CACHE_DB = "hc-instant-ocr-cache";
const OCR_CACHE_STORE = "entries";
const OCR_CACHE_VERSION = 1;
const MAX_IDB_ENTRIES = 48;

let idbHydrateStarted = false;

function openOcrCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OCR_CACHE_DB, OCR_CACHE_VERSION);
    request.onerror = () => reject(request.error ?? new Error("OCR cache DB open failed."));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OCR_CACHE_STORE)) {
        db.createObjectStore(OCR_CACHE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function hydrateFromIdb(): Promise<void> {
  if (typeof indexedDB === "undefined" || idbHydrateStarted) {
    return;
  }
  idbHydrateStarted = true;
  try {
    const db = await openOcrCacheDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(OCR_CACHE_STORE, "readonly");
      const store = tx.objectStore(OCR_CACHE_STORE);
      const keysReq = store.getAllKeys();
      keysReq.onerror = () => reject(keysReq.error);
      keysReq.onsuccess = () => {
        const keys = (keysReq.result as string[]) ?? [];
        if (keys.length === 0) {
          resolve();
          return;
        }
        let pending = keys.length;
        for (const hash of keys) {
          const getReq = store.get(hash);
          getReq.onerror = () => reject(getReq.error);
          getReq.onsuccess = () => {
            const entry = getReq.result as CachedOcrEntry | undefined;
            if (entry?.blocks) {
              ocrByContentHash.set(hash, entry);
            }
            pending -= 1;
            if (pending === 0) {
              resolve();
            }
          };
        }
      };
      tx.oncomplete = () => db.close();
    });
  } catch {
    // IndexedDB unavailable or corrupt — memory cache only
  }
}

void hydrateFromIdb();

async function persistToIdb(contentHash: string, entry: CachedOcrEntry): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }
  try {
    const db = await openOcrCacheDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(OCR_CACHE_STORE, "readwrite");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.objectStore(OCR_CACHE_STORE).put(entry, contentHash);
    });
    if (ocrByContentHash.size > MAX_IDB_ENTRIES) {
      const oldest = [...ocrByContentHash.entries()].sort((a, b) =>
        a[1].savedAt.localeCompare(b[1].savedAt)
      )[0]?.[0];
      if (oldest) {
        ocrByContentHash.delete(oldest);
        const db2 = await openOcrCacheDb();
        await new Promise<void>((resolve) => {
          const tx = db2.transaction(OCR_CACHE_STORE, "readwrite");
          tx.oncomplete = () => {
            db2.close();
            resolve();
          };
          tx.objectStore(OCR_CACHE_STORE).delete(oldest);
        });
      }
    }
  } catch {
    // ignore persistence errors
  }
}

export function getCachedBakedTextOcr(
  contentHash: string
): { blocks: BakedTextBlockRecord[]; autoConfirmed: boolean; provider?: string } | null {
  const entry = ocrByContentHash.get(contentHash);
  if (!entry) {
    return null;
  }
  return {
    blocks: entry.blocks.map((b) => ({ ...b })),
    autoConfirmed: entry.autoConfirmed,
    provider: entry.provider,
  };
}

export function setCachedBakedTextOcr(
  contentHash: string,
  blocks: BakedTextBlockRecord[],
  autoConfirmed: boolean,
  provider?: string
): void {
  const entry: CachedOcrEntry = {
    blocks: blocks.map((b) => ({ ...b })),
    autoConfirmed,
    provider,
    savedAt: new Date().toISOString(),
  };
  ocrByContentHash.set(contentHash, entry);
  void persistToIdb(contentHash, entry);
}

export function setCachedBakedTextOcrNoText(contentHash: string): void {
  setCachedBakedTextOcr(contentHash, [], false, "heuristic_skip");
}

export function clearBakedTextOcrCache(): void {
  ocrByContentHash.clear();
}
