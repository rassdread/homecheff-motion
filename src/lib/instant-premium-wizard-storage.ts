import type { BakedTextProtectionDraft } from "@/components/instant/baked-text-protection-panel";
import type { InstantPremiumContinuityStrength, InstantPremiumStylePreset } from "@/lib/instant-premium-prompt";
import type { InstantPremiumChipId } from "@/lib/instant-premium-prompt";
import type { TextImplyingChipId } from "@/lib/locked-text-layer";
import type { LockedTextLayerDraft } from "@/components/instant/locked-text-layers-editor";
import type { OcrScanPhase } from "@/lib/instant-ocr-scan";
import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";

const WIZARD_STORAGE_KEY = "hc-instant-wizard:v1";
const DB_NAME = "hc-instant-wizard-blobs";
const DB_VERSION = 1;
const BLOB_STORE = "images";

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
  step: number;
  stylePreset: InstantPremiumStylePreset;
  durationSec: 8 | 15;
  motionText: string;
  continuityStrength: InstantPremiumContinuityStrength;
  chips: (InstantPremiumChipId | TextImplyingChipId)[];
  lockedTextMode: boolean;
  lockedTextLayers: LockedTextLayerDraft[];
  chipTextBySlot: Partial<Record<TextImplyingChipId, string>>;
  aspectRatio: "9:16" | "16:9";
  fastRenderMode: boolean;
  images: PersistedWizardImage[];
};

function storageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
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

export async function saveWizardImageBlobs(
  imageId: string,
  optimized: Blob,
  thumbnail: Blob
): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }
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

export async function loadWizardImageBlobs(
  imageId: string
): Promise<{ optimized: Blob; thumbnail: Blob } | null> {
  if (typeof indexedDB === "undefined") {
    return null;
  }
  try {
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
  } catch {
    return null;
  }
}

export async function deleteWizardImageBlobs(imageId: string): Promise<void> {
  if (typeof indexedDB === "undefined") {
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
  } catch {
    // ignore
  }
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
  } catch {
    // quota
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
    };
  }
  return baked;
}
