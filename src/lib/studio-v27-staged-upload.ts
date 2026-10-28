/**
 * Local handoff for a file chosen on the homepage.
 * The bytes stay in this browser. They are not uploaded to Production storage.
 */

export type StagedStudioImage = {
  id: string;
  name: string;
  type: string;
  size: number;
  ownerId: string | null;
  projectId: string | null;
  sceneId: string | null;
  bytes: Uint8Array;
};

export type StagedStudioImageIdentity = {
  id: string;
  name: string;
  type: string;
  size: number;
  ownerId: string | null;
  projectId: string | null;
  sceneId: string | null;
  byteLength: number;
  head: number | null;
  tail: number | null;
};

const DB_NAME = "hc-studio-v27-upload";
const STORE = "files";
const KEY = "handoff";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

let memory: StagedStudioImage | null = null;

export function isAllowedStudioImageType(type: string): boolean {
  return ALLOWED_TYPES.has(type);
}

export function stagedImageIdentity(record: StagedStudioImage): StagedStudioImageIdentity {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    size: record.size,
    ownerId: record.ownerId,
    projectId: record.projectId,
    sceneId: record.sceneId,
    byteLength: record.bytes.byteLength,
    head: record.bytes[0] ?? null,
    tail: record.bytes.length > 0 ? record.bytes[record.bytes.length - 1]! : null,
  };
}

/** A staged file is visible only to the same owner. Anonymous files stay anonymous. */
export function stagedImageVisibleTo(
  record: StagedStudioImage | null,
  ownerId: string | null,
): StagedStudioImage | null {
  if (!record) return null;
  if (record.ownerId !== ownerId) return null;
  return record;
}

export function stageStudioImageRecord(record: StagedStudioImage): void {
  memory = record;
}

export function readStagedStudioImage(ownerId: string | null): StagedStudioImage | null {
  return stagedImageVisibleTo(memory, ownerId);
}

export function clearStagedStudioImage(): void {
  memory = null;
  if (typeof indexedDB === "undefined") return;
  void idbDelete().catch(() => undefined);
}

export async function persistStagedStudioImage(
  file: File,
  meta: { ownerId: string | null; projectId?: string | null; sceneId?: string | null },
): Promise<StagedStudioImage | null> {
  if (!isAllowedStudioImageType(file.type)) return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const record: StagedStudioImage = {
    id: `upl_${file.size}_${bytes[0] ?? 0}_${bytes[bytes.length - 1] ?? 0}`,
    name: file.name,
    type: file.type,
    size: file.size,
    ownerId: meta.ownerId,
    projectId: meta.projectId ?? null,
    sceneId: meta.sceneId ?? null,
    bytes,
  };
  stageStudioImageRecord(record);
  if (typeof indexedDB !== "undefined") {
    try {
      await idbPut(record);
    } catch {
      /* memory copy still hands off inside this tab */
    }
  }
  return record;
}

export async function loadPersistedStudioImage(ownerId: string | null): Promise<StagedStudioImage | null> {
  const current = readStagedStudioImage(ownerId);
  if (current) return current;
  if (typeof indexedDB === "undefined") return null;
  try {
    const stored = await idbGet();
    const visible = stagedImageVisibleTo(stored, ownerId);
    if (visible) stageStudioImageRecord(visible);
    return visible;
  } catch {
    return null;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    open.onerror = () => reject(open.error ?? new Error("indexedDB open failed"));
    open.onsuccess = () => resolve(open.result);
  });
}

async function idbPut(record: StagedStudioImage): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("indexedDB put failed"));
  });
  db.close();
}

async function idbGet(): Promise<StagedStudioImage | null> {
  const db = await openDb();
  const record = await new Promise<StagedStudioImage | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve((request.result as StagedStudioImage | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("indexedDB get failed"));
  });
  db.close();
  return record;
}

async function idbDelete(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("indexedDB delete failed"));
  });
  db.close();
}
