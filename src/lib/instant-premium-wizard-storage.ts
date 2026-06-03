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
import {
  clearAllWizardImagePreviews,
  ensureWizardPreviewUrls,
  purgeWizardImagePreview,
} from "@/lib/instant-wizard-preview-src";
import {
  clearWizardBlobMemoryCache,
  getWizardBlobMemoryCache,
  listWizardBlobMemoryCacheIds,
  setWizardBlobMemoryCache,
} from "@/lib/instant-wizard-blob-memory-cache";
import {
  warnIndexedDbCacheFailed,
  warnInvalidImageUrl,
  warnWizardStorageFailed,
} from "@/lib/instant-cache-diagnostics";
import { isValidHttpUrl } from "@/lib/is-valid-http-url";

const WIZARD_STORAGE_KEY = "hc-instant-wizard:v1";

/** Stable id for the current local wizard draft — rotated on explicit “new project”. */
export function createWizardDraftId(): string {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}
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
  headlineBeats?: string[];
  titleBeats?: string[];
  subtitleBeats?: string[];
  heroTextBeats?: string[];
  finaleTextBeats?: string[];
  extraLines: string[];
  accentWords: string;
  lines: string[];
  heroFinale: boolean;
  heroFinaleText: string;
  finaleFooter: string;
  emotionMode?: string;
  emotion?: string;
  autoEmotion?: string;
  actingIntensity?: string;
  overlayLayerStyles?: import("@/lib/story-overlay-layer-styles").StoryOverlayLayerStyles;
};

/** Decoupled scene slot — text + optional image metadata. */
export type PersistedWizardSceneSlot = {
  sceneId: string;
  text: PersistedSceneTextDraft;
  image: PersistedWizardImage | null;
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
  /** Rotates when the user explicitly starts a new project. */
  draftId?: string;
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
  /** v2: decoupled storyboard slots (text + optional image). */
  sceneSlots?: PersistedWizardSceneSlot[];
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

let indexedDbWriteDisabled = false;

function disableIndexedDbWrites(reason: string, details: Record<string, unknown>): void {
  indexedDbWriteDisabled = true;
  warnIndexedDbCacheFailed("write-disabled", { reason, ...details });
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

/** Safe IndexedDB write — returns false instead of rejecting; memory preview is registered separately. */
export async function safeIndexedDbSet(
  imageId: string,
  optimized: Blob,
  thumbnail: Blob
): Promise<boolean> {
  if (!getWizardBlobMemoryCache(imageId)) {
    setWizardBlobMemoryCache(imageId, optimized, thumbnail);
    ensureWizardPreviewUrls(imageId);
  }

  if (!isIndexedDbAvailable() || indexedDbWriteDisabled) {
    return false;
  }
  try {
    await writeWizardImageBlobs(imageId, optimized, thumbnail);
    return true;
  } catch (error) {
    disableIndexedDbWrites(error instanceof Error ? error.message : String(error), { imageId });
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

/** Safe IndexedDB read — never throws; falls back to in-memory cache. */
export async function safeIndexedDbGet(
  imageId: string
): Promise<{ optimized: Blob; thumbnail: Blob } | null> {
  const fromMemory = getWizardBlobMemoryCache(imageId);
  if (fromMemory) {
    return fromMemory;
  }
  if (!isIndexedDbAvailable()) {
    return null;
  }
  try {
    const fromDb = await readWizardImageBlobs(imageId);
    if (fromDb) {
      setWizardBlobMemoryCache(imageId, fromDb.optimized, fromDb.thumbnail);
    }
    return fromDb;
  } catch (error) {
    warnIndexedDbCacheFailed("get", {
      imageId,
      message: error instanceof Error ? error.message : String(error),
    });
    return getWizardBlobMemoryCache(imageId);
  }
}

export async function loadWizardImageBlobs(
  imageId: string
): Promise<{ optimized: Blob; thumbnail: Blob } | null> {
  return safeIndexedDbGet(imageId);
}

export async function listWizardImageBlobIds(): Promise<string[]> {
  const memoryIds = listWizardBlobMemoryCacheIds();
  if (!isIndexedDbAvailable()) {
    return memoryIds;
  }
  try {
    const db = await openBlobDb();
    const idbIds = await new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction(BLOB_STORE, "readonly");
      const req = tx.objectStore(BLOB_STORE).getAllKeys();
      req.onsuccess = () => resolve((req.result as string[]) ?? []);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB keys failed."));
      tx.oncomplete = () => db.close();
    });
    return [...new Set([...memoryIds, ...idbIds])];
  } catch (error) {
    warnIndexedDbCacheFailed("keys", {
      message: error instanceof Error ? error.message : String(error),
    });
    return memoryIds;
  }
}

/** Delete blob rows not referenced by the current wizard image list. */
export async function pruneOrphanedWizardBlobs(keepImageIds: Iterable<string>): Promise<void> {
  const keep = new Set(keepImageIds);
  const stored = await listWizardImageBlobIds();
  await Promise.all(stored.filter((id) => !keep.has(id)).map((id) => deleteWizardImageBlobs(id)));
}

export async function clearAllWizardImageBlobs(): Promise<void> {
  clearAllWizardImagePreviews();
  clearWizardBlobMemoryCache();
  await pruneOrphanedWizardBlobs([]);
}

export async function deleteWizardImageBlobs(imageId: string): Promise<void> {
  purgeWizardImagePreview(imageId);
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
    warnIndexedDbCacheFailed("delete", {
      imageId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Strip invalid remote URLs persisted from older sessions. */
export function sanitizePersistedRemoteUrl(value: unknown): string | undefined {
  if (!isValidHttpUrl(value)) {
    if (typeof value === "string" && value.trim()) {
      warnInvalidImageUrl("sanitizePersistedRemoteUrl", {
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
    warnWizardStorageFailed("localStorage-write", {
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
