/**
 * Read-only runtime browser storage audit — localStorage, IndexedDB, editor payloads.
 */

import { ASSISTANT_EDITOR_CONTEXT_STORAGE_KEY } from "@/lib/assistant-editor-context-bridge";
import { EDITOR_CANVAS_SESSIONS_KEY } from "@/lib/editor-local-storage";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export const RUNTIME_STORAGE_WARN_KEY_BYTES = 250 * 1024;
export const RUNTIME_STORAGE_WARN_DOCUMENT_BYTES = 1024 * 1024;
export const RUNTIME_STORAGE_WARN_TOTAL_LOCAL_BYTES = 5 * 1024 * 1024;

export const RUNTIME_STORAGE_TOP_KEYS = 20;

const KNOWN_INDEXED_DB: ReadonlyArray<{ name: string; stores: readonly string[] }> = [
  { name: "hc-instant-wizard-blobs", stores: ["images"] },
  { name: "hc-instant-ocr-cache", stores: ["entries"] },
];

export type RuntimeStorageKeyRow = {
  key: string;
  bytes: number;
  sizeKb: number;
  quotaPercent: number | null;
};

export type RuntimeStorageIndexedDbStoreRow = {
  database: string;
  store: string;
  bytes: number;
  entryCount: number;
};

export type RuntimeStorageIndexedDbRow = {
  name: string;
  bytes: number;
  stores: RuntimeStorageIndexedDbStoreRow[];
};

export type RuntimeStorageEditorMetrics = {
  documentCount: number;
  averageDocumentBytes: number;
  averageVisionHierarchyBytes: number;
  averageSemanticLayersBytes: number;
  averageCopilotContextBytes: number;
  largestDocumentBytes: number;
  largestDocumentSessionId: string | null;
};

export type RuntimeStorageWarning = {
  code: "large_key" | "large_document" | "large_total_local";
  message: string;
  bytes: number;
  key?: string;
  sessionId?: string;
};

export type RuntimeStorageAudit = {
  auditedAt: string;
  localStorage: {
    totalBytes: number;
    keyCount: number;
    quotaBytes: number | null;
    usageBytes: number | null;
    quotaUsedPercent: number | null;
    topKeys: RuntimeStorageKeyRow[];
  };
  indexedDb: {
    totalBytes: number;
    databases: RuntimeStorageIndexedDbRow[];
  };
  editor: RuntimeStorageEditorMetrics;
  warnings: RuntimeStorageWarning[];
};

export function byteSizeOfString(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function byteSizeOfJson(value: unknown): number {
  try {
    return byteSizeOfString(JSON.stringify(value));
  } catch {
    return 0;
  }
}

function estimateValueBytes(value: unknown): number {
  if (value == null) {
    return 0;
  }
  if (typeof value === "string") {
    return byteSizeOfString(value);
  }
  if (value instanceof Blob) {
    return value.size;
  }
  if (value instanceof ArrayBuffer) {
    return value.byteLength;
  }
  if (ArrayBuffer.isView(value)) {
    return value.byteLength;
  }
  if (typeof value === "object") {
    let total = byteSizeOfJson(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      if (nested instanceof Blob) {
        total += nested.size;
      }
    }
    return total;
  }
  return byteSizeOfString(String(value));
}

export function auditLocalStorageKeys(
  storage: Storage,
  quotaBytes: number | null
): { rows: RuntimeStorageKeyRow[]; totalBytes: number } {
  const rows: RuntimeStorageKeyRow[] = [];
  let totalBytes = 0;

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) {
      continue;
    }
    const value = storage.getItem(key) ?? "";
    const bytes = byteSizeOfString(key) + byteSizeOfString(value);
    totalBytes += bytes;
    rows.push({
      key,
      bytes,
      sizeKb: bytes / 1024,
      quotaPercent: quotaBytes && quotaBytes > 0 ? (bytes / quotaBytes) * 100 : null,
    });
  }

  rows.sort((a, b) => b.bytes - a.bytes);
  return { rows, totalBytes };
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function measureEditorDocuments(
  store: Record<string, EditorCanvasDocument>
): Omit<
  RuntimeStorageEditorMetrics,
  "averageCopilotContextBytes"
> & {
  documentSizes: Array<{ sessionId: string; bytes: number }>;
} {
  const documentSizes: Array<{ sessionId: string; bytes: number }> = [];
  const visionSizes: number[] = [];
  const semanticSizes: number[] = [];

  for (const [sessionId, document] of Object.entries(store)) {
    const docBytes = byteSizeOfJson(document);
    documentSizes.push({ sessionId, bytes: docBytes });
    visionSizes.push(byteSizeOfJson(document.visionHierarchy ?? []));
    semanticSizes.push(byteSizeOfJson(document.semanticLayers ?? []));
  }

  const largest = documentSizes.reduce<{ sessionId: string | null; bytes: number }>(
    (best, row) => (row.bytes > best.bytes ? row : best),
    { sessionId: null, bytes: 0 }
  );

  return {
    documentCount: documentSizes.length,
    averageDocumentBytes: average(documentSizes.map((row) => row.bytes)),
    averageVisionHierarchyBytes: average(visionSizes),
    averageSemanticLayersBytes: average(semanticSizes),
    largestDocumentBytes: largest.bytes,
    largestDocumentSessionId: largest.sessionId,
    documentSizes,
  };
}

export function buildRuntimeStorageWarnings(input: {
  localStorageTotalBytes: number;
  topKeys: RuntimeStorageKeyRow[];
  documentSizes: Array<{ sessionId: string; bytes: number }>;
}): RuntimeStorageWarning[] {
  const warnings: RuntimeStorageWarning[] = [];

  if (input.localStorageTotalBytes > RUNTIME_STORAGE_WARN_TOTAL_LOCAL_BYTES) {
    warnings.push({
      code: "large_total_local",
      message: `Total localStorage exceeds ${RUNTIME_STORAGE_WARN_TOTAL_LOCAL_BYTES / (1024 * 1024)}MB`,
      bytes: input.localStorageTotalBytes,
    });
  }

  for (const row of input.topKeys) {
    if (row.bytes > RUNTIME_STORAGE_WARN_KEY_BYTES) {
      warnings.push({
        code: "large_key",
        message: `Key exceeds ${RUNTIME_STORAGE_WARN_KEY_BYTES / 1024}KB`,
        bytes: row.bytes,
        key: row.key,
      });
    }
  }

  for (const doc of input.documentSizes) {
    if (doc.bytes > RUNTIME_STORAGE_WARN_DOCUMENT_BYTES) {
      warnings.push({
        code: "large_document",
        message: `Editor document exceeds ${RUNTIME_STORAGE_WARN_DOCUMENT_BYTES / (1024 * 1024)}MB`,
        bytes: doc.bytes,
        sessionId: doc.sessionId,
      });
    }
  }

  return warnings;
}

function openIndexedDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onerror = () => reject(request.error ?? new Error(`Failed to open ${name}`));
    request.onsuccess = () => resolve(request.result);
  });
}

async function estimateObjectStore(
  db: IDBDatabase,
  storeName: string
): Promise<{ bytes: number; entryCount: number }> {
  if (!db.objectStoreNames.contains(storeName)) {
    return { bytes: 0, entryCount: 0 };
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.openCursor();
    let bytes = 0;
    let entryCount = 0;

    request.onerror = () => reject(request.error ?? new Error(`Cursor failed for ${storeName}`));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve({ bytes, entryCount });
        return;
      }
      entryCount += 1;
      bytes += estimateValueBytes(cursor.key);
      bytes += estimateValueBytes(cursor.value);
      cursor.continue();
    };
  });
}

async function auditKnownIndexedDatabases(): Promise<RuntimeStorageIndexedDbRow[]> {
  const databases: RuntimeStorageIndexedDbRow[] = [];

  for (const config of KNOWN_INDEXED_DB) {
    try {
      const db = await openIndexedDb(config.name);
      const stores: RuntimeStorageIndexedDbStoreRow[] = [];
      let dbBytes = 0;

      for (const storeName of config.stores) {
        const estimate = await estimateObjectStore(db, storeName);
        dbBytes += estimate.bytes;
        stores.push({
          database: config.name,
          store: storeName,
          bytes: estimate.bytes,
          entryCount: estimate.entryCount,
        });
      }

      db.close();
      stores.sort((a, b) => b.bytes - a.bytes);
      databases.push({ name: config.name, bytes: dbBytes, stores });
    } catch {
      databases.push({ name: config.name, bytes: 0, stores: [] });
    }
  }

  if (typeof indexedDB.databases === "function") {
    try {
      const discovered = await indexedDB.databases();
      for (const meta of discovered) {
        if (!meta.name || KNOWN_INDEXED_DB.some((db) => db.name === meta.name)) {
          continue;
        }
        try {
          const db = await openIndexedDb(meta.name);
          const stores: RuntimeStorageIndexedDbStoreRow[] = [];
          let dbBytes = 0;
          for (const storeName of [...db.objectStoreNames]) {
            const estimate = await estimateObjectStore(db, storeName);
            dbBytes += estimate.bytes;
            stores.push({
              database: meta.name,
              store: storeName,
              bytes: estimate.bytes,
              entryCount: estimate.entryCount,
            });
          }
          db.close();
          stores.sort((a, b) => b.bytes - a.bytes);
          databases.push({ name: meta.name, bytes: dbBytes, stores });
        } catch {
          databases.push({ name: meta.name, bytes: 0, stores: [] });
        }
      }
    } catch {
      // ignore discovery failures
    }
  }

  databases.sort((a, b) => b.bytes - a.bytes);
  return databases;
}

function readEditorSessionStore(): Record<string, EditorCanvasDocument> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(EDITOR_CANVAS_SESSIONS_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, EditorCanvasDocument>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readCopilotContextBytes(): number {
  if (typeof window === "undefined") {
    return 0;
  }
  try {
    const raw = window.sessionStorage.getItem(ASSISTANT_EDITOR_CONTEXT_STORAGE_KEY);
    return raw ? byteSizeOfString(raw) : 0;
  } catch {
    return 0;
  }
}

/** Collect a read-only runtime storage audit (browser only). */
export async function auditRuntimeStorage(): Promise<RuntimeStorageAudit> {
  if (typeof window === "undefined") {
    return {
      auditedAt: new Date().toISOString(),
      localStorage: {
        totalBytes: 0,
        keyCount: 0,
        quotaBytes: null,
        usageBytes: null,
        quotaUsedPercent: null,
        topKeys: [],
      },
      indexedDb: { totalBytes: 0, databases: [] },
      editor: {
        documentCount: 0,
        averageDocumentBytes: 0,
        averageVisionHierarchyBytes: 0,
        averageSemanticLayersBytes: 0,
        averageCopilotContextBytes: 0,
        largestDocumentBytes: 0,
        largestDocumentSessionId: null,
      },
      warnings: [],
    };
  }

  let quotaBytes: number | null = null;
  let usageBytes: number | null = null;
  if (navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      quotaBytes = estimate.quota ?? null;
      usageBytes = estimate.usage ?? null;
    } catch {
      // ignore
    }
  }

  const local = auditLocalStorageKeys(window.localStorage, quotaBytes);
  const topKeys = local.rows.slice(0, RUNTIME_STORAGE_TOP_KEYS).map((row) => ({
    ...row,
    quotaPercent:
      quotaBytes && quotaBytes > 0 ? (row.bytes / quotaBytes) * 100 : row.quotaPercent,
  }));

  const editorMeasured = measureEditorDocuments(readEditorSessionStore());
  const { documentSizes, ...editorBase } = editorMeasured;

  const indexedDatabases = await auditKnownIndexedDatabases();
  const indexedDbTotal = indexedDatabases.reduce((sum, db) => sum + db.bytes, 0);

  const warnings = buildRuntimeStorageWarnings({
    localStorageTotalBytes: local.totalBytes,
    topKeys: local.rows,
    documentSizes,
  });

  return {
    auditedAt: new Date().toISOString(),
    localStorage: {
      totalBytes: local.totalBytes,
      keyCount: local.rows.length,
      quotaBytes,
      usageBytes,
      quotaUsedPercent:
        quotaBytes && quotaBytes > 0 ? (local.totalBytes / quotaBytes) * 100 : null,
      topKeys,
    },
    indexedDb: {
      totalBytes: indexedDbTotal,
      databases: indexedDatabases,
    },
    editor: {
      ...editorBase,
      averageCopilotContextBytes: readCopilotContextBytes(),
    },
    warnings,
  };
}

/** Print audit results as grouped console tables (dev/admin). */
export function printRuntimeStorageAuditTable(audit: RuntimeStorageAudit): void {
  if (typeof console === "undefined" || typeof console.group !== "function") {
    return;
  }

  console.group("[hc.storage.audit]");
  console.log("Audited at:", audit.auditedAt);
  console.log("Local storage total:", audit.localStorage.totalBytes, "bytes");
  if (audit.localStorage.quotaBytes != null) {
    console.log(
      "Storage quota:",
      audit.localStorage.quotaBytes,
      "bytes",
      `(${audit.localStorage.quotaUsedPercent?.toFixed(1) ?? "—"}% of localStorage in quota)`
    );
  }

  if (audit.localStorage.topKeys.length > 0) {
    console.table(
      audit.localStorage.topKeys.map((row) => ({
        key: row.key,
        "size KB": row.sizeKb.toFixed(1),
        "% quota": row.quotaPercent != null ? row.quotaPercent.toFixed(2) : "—",
      }))
    );
  }

  if (audit.indexedDb.databases.length > 0) {
    console.table(
      audit.indexedDb.databases.map((db) => ({
        database: db.name,
        "size KB": (db.bytes / 1024).toFixed(1),
        stores: db.stores.length,
      }))
    );
    const largestStores = audit.indexedDb.databases.flatMap((db) => db.stores).slice(0, 10);
    if (largestStores.length > 0) {
      console.table(
        largestStores.map((store) => ({
          database: store.database,
          store: store.store,
          entries: store.entryCount,
          "size KB": (store.bytes / 1024).toFixed(1),
        }))
      );
    }
  }

  console.table([
    {
      metric: "documents",
      averageBytes: Math.round(audit.editor.averageDocumentBytes),
      averageKB: (audit.editor.averageDocumentBytes / 1024).toFixed(1),
    },
    {
      metric: "visionHierarchy",
      averageBytes: Math.round(audit.editor.averageVisionHierarchyBytes),
      averageKB: (audit.editor.averageVisionHierarchyBytes / 1024).toFixed(1),
    },
    {
      metric: "semanticLayers",
      averageBytes: Math.round(audit.editor.averageSemanticLayersBytes),
      averageKB: (audit.editor.averageSemanticLayersBytes / 1024).toFixed(1),
    },
    {
      metric: "copilotContext",
      averageBytes: Math.round(audit.editor.averageCopilotContextBytes),
      averageKB: (audit.editor.averageCopilotContextBytes / 1024).toFixed(1),
    },
  ]);

  if (audit.warnings.length > 0) {
    console.warn("[hc.storage.audit] warnings");
    console.table(
      audit.warnings.map((warning) => ({
        code: warning.code,
        message: warning.message,
        bytes: warning.bytes,
        key: warning.key ?? warning.sessionId ?? "",
      }))
    );
  }

  console.groupEnd();
}

declare global {
  interface Window {
    __hcStorageAudit?: () => Promise<RuntimeStorageAudit>;
  }
}

/** Expose audit helper on window for devtools. */
export function installRuntimeStorageAuditConsoleHook(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.__hcStorageAudit = async () => {
    const audit = await auditRuntimeStorage();
    printRuntimeStorageAuditTable(audit);
    return audit;
  };
}
