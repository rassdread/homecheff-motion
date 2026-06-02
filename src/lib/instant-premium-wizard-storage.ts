import type { BakedTextProtectionDraft } from "@/components/instant/baked-text-protection-panel";
import type {
  InstantMode,
  InstantTransitionSeconds,
} from "@/lib/instant-premium-mode-types";
import type { InstantPremiumContinuityStrength, InstantPremiumStylePreset } from "@/lib/instant-premium-prompt";
import type { SceneOverlayTemplate } from "@/lib/story-overlay-templates";
import type { InstantPremiumChipId } from "@/lib/instant-premium-prompt";
import type { TextImplyingChipId } from "@/lib/locked-text-layer";
import type { LockedTextLayerDraft } from "@/components/instant/locked-text-layers-editor";
import type { OcrScanPhase } from "@/lib/instant-ocr-scan";
import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";
import { isValidHttpUrl } from "@/lib/is-valid-http-url";

const WIZARD_STORAGE_KEY = "hc-instant-wizard:v1";
const DB_NAME = "hc-instant-wizard-blobs";
const DB_VERSION = 1;
const BLOB_STORE = "images";

/** Storyboard copy per scene (localStorage-safe JSON). */
export type PersistedSceneTextDraft = {
  template: SceneOverlayTemplate;
  transitionDurationSeconds: number;
  durationSeconds: number;
  heroText: string;
  title: string;
  subtitle: string;
  extraLines: string[];
  accentWords: string;
  lines: string[];
  heroFinale: boolean;
  heroFinaleText: string;
  finaleFooter: string;
};

export type PersistedWizardImage = {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  remoteWorkingUrl?: string;
  remoteThumbnailUrl?: string;
  remoteStorageKey?: string;
  bakedText: SerializedBakedText;
};

export type SerializedBakedText = {
  enabled: boolean;
  status: BakedTextProtectionDraft["status"];
  blocks: BakedTextBlockRecord[];
  exactText: string;
  positionY: number;
  manualMode: boolean;
  remoteWorkingUrl?: string;
  contentHash?: string;
  autoScanComplete?: boolean;
  needsReview?: boolean;
  reviewOpen?: boolean;
  autoProtected?: boolean;
  userSkipped?: boolean;
  scanPhase?: OcrScanPhase;
  scanRequestId?: string;
  scanStartedAt?: string;
  scanFinishedAt?: string;
  scanDurationMs?: number;
  scanProvider?: string;
  scanBlockCount?: number;
  scanAverageConfidence?: number;
  scanErrorCode?: string;
  scanStatusMessage?: string;
};

export type PersistedWizardState = {
  version: 1;
  savedAt: string;
  /** 2 = creator-first 5-step flow */
  wizardFlowVersion?: number;
  step: number;
  stylePreset: InstantPremiumStylePreset;
  durationSec?: number;
  motionText: string;
  continuityStrength: InstantPremiumContinuityStrength;
  chips: (InstantPremiumChipId | TextImplyingChipId)[];
  lockedTextMode: boolean;
  lockedTextLayers: LockedTextLayerDraft[];
  chipTextBySlot: Partial<Record<TextImplyingChipId, string>>;
  aspectRatio: "9:16" | "16:9";
  fastRenderMode: boolean;
  images: PersistedWizardImage[];
  instantMode?: InstantMode;
  transitionSeconds?: InstantTransitionSeconds;
  sceneTexts?: PersistedSceneTextDraft[];
};

function storageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

function openBlobDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed."));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function writeWizardImageBlobs(
  imageId: string,
  optimized: Blob,
  thumbnail: Blob
): Promise<void> {
  const db = await openBlobDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed."));
    tx.objectStore(BLOB_STORE).put({ optimized, thumbnail }, imageId);
  });
}

/** Safe IndexedDB write — returns false instead of rejecting. */
export async function safeIndexedDbSet(
  imageId: string,
  optimized: Blob,
  thumbnail: Blob
): Promise<boolean> {
  if (!isIndexedDbAvailable()) {
    return false;
  }
  try {
    await writeWizardImageBlobs(imageId, optimized, thumbnail);
    return true;
  } catch (error) {
    console.warn("[indexeddb-cache-failed]", {
      imageId,
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function saveWizardImageBlobs(
  imageId: string,
  optimized: Blob,
  thumbnail: Blob
): Promise<void> {
  const ok = await safeIndexedDbSet(imageId, optimized, thumbnail);
  if (!ok) {
    return;
  }
}

async function readWizardImageBlobs(
  imageId: string
): Promise<{ optimized: Blob; thumbnail: Blob } | null> {
  const db = await openBlobDb();
  const record = await new Promise<{ optimized: Blob; thumbnail: Blob } | undefined>(
    (resolve, reject) => {
      const tx = db.transaction(BLOB_STORE, "readonly");
      const req = tx.objectStore(BLOB_STORE).get(imageId);
      req.onsuccess = () => resolve(req.result as { optimized: Blob; thumbnail: Blob } | undefined);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed."));
      tx.oncomplete = () => db.close();
    }
  );
  if (!record?.optimized || !record.thumbnail) {
    return null;
  }
  return record;
}

/** Safe IndexedDB read — never throws. */
export async function safeIndexedDbGet(
  imageId: string
): Promise<{ optimized: Blob; thumbnail: Blob } | null> {
  if (!isIndexedDbAvailable()) {
    return null;
  }
  try {
    return await readWizardImageBlobs(imageId);
  } catch (error) {
    console.warn("[indexeddb-cache-failed]", {
      imageId,
      op: "get",
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function loadWizardImageBlobs(
  imageId: string
): Promise<{ optimized: Blob; thumbnail: Blob } | null> {
  return safeIndexedDbGet(imageId);
}

export async function listWizardImageBlobIds(): Promise<string[]> {
  if (!isIndexedDbAvailable()) {
    return [];
  }
  try {
    const db = await openBlobDb();
    return await new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction(BLOB_STORE, "readonly");
      const req = tx.objectStore(BLOB_STORE).getAllKeys();
      req.onsuccess = () => resolve((req.result as string[]) ?? []);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB keys failed."));
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn("[indexeddb-cache-failed]", {
      op: "keys",
      message: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/** Delete blob rows not referenced by the current wizard image list. */
export async function pruneOrphanedWizardBlobs(keepImageIds: Iterable<string>): Promise<void> {
  const keep = new Set(keepImageIds);
  const stored = await listWizardImageBlobIds();
  await Promise.all(stored.filter((id) => !keep.has(id)).map((id) => deleteWizardImageBlobs(id)));
}

export async function clearAllWizardImageBlobs(): Promise<void> {
  await pruneOrphanedWizardBlobs([]);
}

export async function deleteWizardImageBlobs(imageId: string): Promise<void> {
  if (!isIndexedDbAvailable()) {
    return;
  }
  try {
    const db = await openBlobDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(BLOB_STORE, "readwrite");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed."));
      tx.objectStore(BLOB_STORE).delete(imageId);
    });
  } catch (error) {
    console.warn("[indexeddb-cache-failed]", {
      imageId,
      op: "delete",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Strip invalid remote URLs persisted from older sessions. */
export function sanitizePersistedRemoteUrl(value: unknown): string | undefined {
  if (!isValidHttpUrl(value)) {
    if (typeof value === "string" && value.trim()) {
      console.warn("[image-url-invalid]", {
        context: "sanitizePersistedRemoteUrl",
        value: value.trim().slice(0, 80),
      });
    }
    return undefined;
  }
  return (value as string).trim();
}

export function readPersistedWizardState(): PersistedWizardState | null {
  if (!storageAvailable()) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PersistedWizardState;
    if (parsed.version !== 1 || !Array.isArray(parsed.images)) {
      return null;
    }
    parsed.images = parsed.images.map((img) => ({
      ...img,
      remoteWorkingUrl: sanitizePersistedRemoteUrl(img.remoteWorkingUrl),
      remoteThumbnailUrl: sanitizePersistedRemoteUrl(img.remoteThumbnailUrl),
      bakedText: {
        ...img.bakedText,
        remoteWorkingUrl: sanitizePersistedRemoteUrl(img.bakedText?.remoteWorkingUrl),
      },
    }));
    return parsed;
  } catch {
    return null;
  }
}

export function writePersistedWizardState(state: PersistedWizardState): void {
  if (!storageAvailable()) {
    return;
  }
  try {
    window.localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("[indexeddb-cache-failed]", {
      op: "localStorage-write",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export function clearPersistedWizardState(): void {
  if (!storageAvailable()) {
    return;
  }
  window.localStorage.removeItem(WIZARD_STORAGE_KEY);
}

/** Mark in-flight scans as interrupted after reload. */
export function normalizeBakedTextAfterRestore(baked: SerializedBakedText): SerializedBakedText {
  const phase = baked.scanPhase;
  if (
    phase === "queued" ||
    phase === "optimizing" ||
    phase === "uploading" ||
    phase === "calling_ocr" ||
    phase === "detecting_blocks"
  ) {
    return {
      ...baked,
      scanPhase: "interrupted",
      autoScanComplete: false,
      scanErrorCode: "interrupted",
      remoteWorkingUrl: sanitizePersistedRemoteUrl(baked.remoteWorkingUrl),
    };
  }
  return {
    ...baked,
    remoteWorkingUrl: sanitizePersistedRemoteUrl(baked.remoteWorkingUrl),
  };
}
