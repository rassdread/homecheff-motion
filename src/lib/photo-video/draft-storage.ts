/**
 * PX.4A.3 — local photo-video draft persistence.
 * Pattern mirrors Instant wizard storage (localStorage meta + IndexedDB blobs)
 * with a separate DB so Instant drafts are never mixed.
 *
 * Anonymous: Studio-origin only. No Blob upload. No SSO state payload.
 * Auth: same draft restored after returnTo; ownerUserId bound when known.
 */

import type { PhotoVideoComposition } from "@/lib/photo-video/composition";
import { migrateComposition } from "@/lib/photo-video/composition";
import type { PhotoVideoAudio } from "@/lib/photo-video/audio";
import type { PhotoVideoTextOverlay } from "@/lib/photo-video/text-overlay";
import type { PhotoVideoDurationMode, PhotoVideoMovementMode } from "@/lib/photo-video/constants";
import type { PhotoVideoUserMotionKind } from "@/lib/photo-video/styles";
import type { PhotoVideoResolvedTransition, PhotoVideoTransitionKind } from "@/lib/photo-video/transition-kind";
import { clampVideoState, isVideoPhoto, type PhotoVideoVideoFit } from "@/lib/photo-video/media-clip";
import { revokePhotoVideoObjectUrl } from "@/lib/photo-video/object-url";

export const PHOTO_VIDEO_DRAFT_META_KEY = "hc-px4a-draft:v1";
export const PHOTO_VIDEO_DRAFT_DB = "hc-px4a-draft-blobs";
export const PHOTO_VIDEO_DRAFT_STORE = "media";
export const PHOTO_VIDEO_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const PHOTO_VIDEO_DRAFT_MAX_TOTAL_BYTES = 80 * 1024 * 1024;
export const PHOTO_VIDEO_DRAFT_VERSION = 3;
export const PHOTO_VIDEO_DRAFT_LEGACY_VERSION = 1;
export const PHOTO_VIDEO_DRAFT_ACCEPTED_VERSIONS = [1, 2, 3] as const;

export type PhotoVideoDraftPhotoMeta = {
  id: string;
  source: "HOME_CHEFF_LISTING" | "LOCAL_UPLOAD";
  included: boolean;
  naturalWidth: number;
  naturalHeight: number;
  listingUrl?: string;
  motionKind?: PhotoVideoUserMotionKind | null;
  mediaKind?: "image" | "video";
  video?: {
    sourceDurationSeconds: number;
    trimStartSeconds: number;
    trimEndSeconds: number;
    audioEnabled: boolean;
    volume: number;
    fit?: PhotoVideoVideoFit;
  };
};

export type PhotoVideoDraftAudioMeta =
  | { kind: "none" }
  | {
      kind: "ownMusic";
      startSeconds: number;
      durationSeconds: number;
      trackDurationSeconds: number;
      volume: number;
      fileName?: string;
      peaks?: number[];
    };

export type PhotoVideoDraftCompositionMeta = {
  photos: PhotoVideoDraftPhotoMeta[];
  ratio: PhotoVideoComposition["ratio"];
  pace: PhotoVideoComposition["pace"];
  style: PhotoVideoComposition["style"];
  transitionKind?: PhotoVideoTransitionKind;
  boundaryTransitions?: PhotoVideoResolvedTransition[];
  overlays: PhotoVideoTextOverlay[];
  audio: PhotoVideoDraftAudioMeta;
  endCardSeconds: number;
  durationMode?: PhotoVideoDurationMode;
  durationSeconds?: number;
  movementMode?: PhotoVideoMovementMode;
};

export type PhotoVideoDraftContext = "studio" | "homecheff-item";

export type PhotoVideoDraftMeta = {
  version: number;
  updatedAt: number;
  expiresAt: number;
  ownerUserId: string | null;
  saved: boolean;
  context?: PhotoVideoDraftContext;
  composition: PhotoVideoDraftCompositionMeta;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function photoVideoDraftMetaKey(context: PhotoVideoDraftContext = "studio"): string {
  return context === "homecheff-item" ? `${PHOTO_VIDEO_DRAFT_META_KEY}:item` : PHOTO_VIDEO_DRAFT_META_KEY;
}

export function photoVideoDraftDbName(context: PhotoVideoDraftContext = "studio"): string {
  return context === "homecheff-item" ? `${PHOTO_VIDEO_DRAFT_DB}-item` : PHOTO_VIDEO_DRAFT_DB;
}

function openDraftDb(context: PhotoVideoDraftContext = "studio"): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(photoVideoDraftDbName(context), 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTO_VIDEO_DRAFT_STORE)) {
        db.createObjectStore(PHOTO_VIDEO_DRAFT_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexeddb-open"));
  });
}

async function idbPut(key: string, value: Blob, context: PhotoVideoDraftContext = "studio"): Promise<boolean> {
  if (!isBrowser() || !window.indexedDB) return false;
  try {
    const db = await openDraftDb(context);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PHOTO_VIDEO_DRAFT_STORE, "readwrite");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error ?? new Error("indexeddb-put"));
      tx.objectStore(PHOTO_VIDEO_DRAFT_STORE).put(value, key);
    });
    return true;
  } catch {
    return false;
  }
}

async function idbGet(key: string, context: PhotoVideoDraftContext = "studio"): Promise<Blob | null> {
  if (!isBrowser() || !window.indexedDB) return null;
  try {
    const db = await openDraftDb(context);
    const value = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(PHOTO_VIDEO_DRAFT_STORE, "readonly");
      const req = tx.objectStore(PHOTO_VIDEO_DRAFT_STORE).get(key);
      req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error("indexeddb-get"));
      tx.oncomplete = () => db.close();
    });
    return value;
  } catch {
    return null;
  }
}

async function idbClear(context: PhotoVideoDraftContext = "studio"): Promise<void> {
  if (!isBrowser() || !window.indexedDB) return;
  try {
    const db = await openDraftDb(context);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PHOTO_VIDEO_DRAFT_STORE, "readwrite");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error ?? new Error("indexeddb-clear"));
      tx.objectStore(PHOTO_VIDEO_DRAFT_STORE).clear();
    });
  } catch {
    /* ignore */
  }
}

export function readPhotoVideoDraftMeta(
  context: PhotoVideoDraftContext = "studio"
): PhotoVideoDraftMeta | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(photoVideoDraftMetaKey(context));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PhotoVideoDraftMeta;
    if (!parsed || !PHOTO_VIDEO_DRAFT_ACCEPTED_VERSIONS.includes(parsed.version as 1 | 2 | 3)) {
      return null;
    }
    if (!parsed.composition || !Array.isArray(parsed.composition.photos)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isPhotoVideoDraftExpired(meta: PhotoVideoDraftMeta, now = Date.now()): boolean {
  return !Number.isFinite(meta.expiresAt) || meta.expiresAt <= now;
}

/** Account-switch: do not surface another account's saved local draft. Anonymous drafts (owner null) may resume. */
export function canRestorePhotoVideoDraftForUser(
  meta: PhotoVideoDraftMeta,
  userId: string | null | undefined
): boolean {
  if (!meta.ownerUserId) return true;
  if (!userId) return true;
  return meta.ownerUserId === userId;
}

export function writePhotoVideoDraftMeta(
  meta: PhotoVideoDraftMeta,
  context: PhotoVideoDraftContext = meta.context ?? "studio"
): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(photoVideoDraftMetaKey(context), JSON.stringify(meta));
    return true;
  } catch {
    return false;
  }
}

export function clearPhotoVideoDraftMeta(context: PhotoVideoDraftContext = "studio"): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(photoVideoDraftMetaKey(context));
  } catch {
    /* ignore */
  }
}

export function toDraftCompositionMeta(composition: PhotoVideoComposition): PhotoVideoDraftCompositionMeta {
  const audio: PhotoVideoDraftAudioMeta =
    composition.audio.kind === "none"
      ? { kind: "none" }
      : {
          kind: "ownMusic",
          startSeconds: composition.audio.startSeconds,
          durationSeconds: composition.audio.durationSeconds,
          trackDurationSeconds: composition.audio.trackDurationSeconds,
          volume: composition.audio.volume,
          fileName: composition.audio.fileName,
          peaks: composition.audio.peaks,
        };
  return {
    photos: composition.photos.map((photo) => {
      const video = isVideoPhoto(photo) && photo.video
        ? {
            sourceDurationSeconds: photo.video.sourceDurationSeconds,
            trimStartSeconds: photo.video.trimStartSeconds,
            trimEndSeconds: photo.video.trimEndSeconds,
            audioEnabled: photo.video.audioEnabled,
            volume: photo.video.volume,
            fit: photo.video.fit,
          }
        : undefined;
      return {
        id: photo.id,
        source: photo.source,
        included: photo.included,
        naturalWidth: photo.naturalWidth,
        naturalHeight: photo.naturalHeight,
        listingUrl: photo.listingUrl,
        motionKind: photo.motionKind,
        mediaKind: photo.mediaKind,
        video,
      };
    }),
    ratio: composition.ratio,
    pace: composition.pace,
    style: composition.style,
    transitionKind: composition.transitionKind,
    boundaryTransitions: composition.boundaryTransitions,
    overlays: composition.overlays,
    audio,
    endCardSeconds: composition.endCardSeconds,
    durationMode: composition.durationMode,
    durationSeconds: composition.durationSeconds,
    movementMode: composition.movementMode,
  };
}

export type CommitDraftInput = {
  composition: PhotoVideoComposition;
  photoBlobs: Record<string, Blob>;
  posterBlobs?: Record<string, Blob>;
  audioBlob?: Blob | null;
  ownerUserId?: string | null;
  saved?: boolean;
  context?: PhotoVideoDraftContext;
};

export type CommitDraftResult =
  | { ok: true; meta: PhotoVideoDraftMeta }
  | { ok: false; reason: "empty" | "quota" | "storage" };

export async function commitPhotoVideoDraft(input: CommitDraftInput): Promise<CommitDraftResult> {
  if (input.composition.photos.length === 0) return { ok: false, reason: "empty" };
  let total = 0;
  for (const photo of input.composition.photos) {
    const blob = input.photoBlobs[photo.id];
    if (!blob) continue;
    total += blob.size;
  }
  if (input.audioBlob) total += input.audioBlob.size;
  if (input.posterBlobs) {
    for (const blob of Object.values(input.posterBlobs)) total += blob.size;
  }
  if (total > PHOTO_VIDEO_DRAFT_MAX_TOTAL_BYTES) return { ok: false, reason: "quota" };

  const context = input.context ?? "studio";
  await idbClear(context);
  for (const photo of input.composition.photos) {
    const blob = input.photoBlobs[photo.id];
    if (!blob) continue;
    const ok = await idbPut(`photo:${photo.id}`, blob, context);
    if (!ok) return { ok: false, reason: "storage" };
    const poster = input.posterBlobs?.[photo.id];
    if (poster && isVideoPhoto(photo)) {
      const posterOk = await idbPut(`poster:${photo.id}`, poster, context);
      if (!posterOk) return { ok: false, reason: "storage" };
    }
  }
  if (input.composition.audio.kind === "ownMusic" && input.audioBlob) {
    const ok = await idbPut("audio", input.audioBlob, context);
    if (!ok) return { ok: false, reason: "storage" };
  }

  const now = Date.now();
  const meta: PhotoVideoDraftMeta = {
    version: PHOTO_VIDEO_DRAFT_VERSION,
    updatedAt: now,
    expiresAt: now + PHOTO_VIDEO_DRAFT_TTL_MS,
    ownerUserId: input.ownerUserId ?? null,
    saved: Boolean(input.saved),
    context,
    composition: toDraftCompositionMeta(input.composition),
  };
  if (!writePhotoVideoDraftMeta(meta, context)) return { ok: false, reason: "storage" };
  return { ok: true, meta };
}

export async function clearPhotoVideoDraft(context: PhotoVideoDraftContext = "studio"): Promise<void> {
  clearPhotoVideoDraftMeta(context);
  await idbClear(context);
}

export type RestoredPhotoVideoDraft = {
  meta: PhotoVideoDraftMeta;
  composition: PhotoVideoComposition;
  objectUrls: string[];
};

export async function restorePhotoVideoDraft(
  context: PhotoVideoDraftContext = "studio"
): Promise<RestoredPhotoVideoDraft | null> {
  const meta = readPhotoVideoDraftMeta(context);
  if (!meta) return null;
  if (isPhotoVideoDraftExpired(meta)) {
    await clearPhotoVideoDraft(context);
    return null;
  }

  const objectUrls: string[] = [];
  const photos = [];
  for (const photo of meta.composition.photos) {
    const isVideo = photo.mediaKind === "video" && Boolean(photo.video);
    let previewUrl = photo.listingUrl ?? "";
    let videoObjectUrl = "";
    if (photo.source === "LOCAL_UPLOAD" || !photo.listingUrl) {
      const blob = await idbGet(`photo:${photo.id}`, context);
      if (!blob) {
        await clearPhotoVideoDraft(context);
        return null;
      }
      const sourceUrl = URL.createObjectURL(blob);
      objectUrls.push(sourceUrl);
      if (isVideo) {
        videoObjectUrl = sourceUrl;
        const poster = await idbGet(`poster:${photo.id}`, context);
        if (poster) {
          previewUrl = URL.createObjectURL(poster);
          objectUrls.push(previewUrl);
        } else {
          previewUrl = "";
        }
      } else {
        previewUrl = sourceUrl;
      }
    }
    photos.push({
      id: photo.id,
      source: photo.source,
      previewUrl,
      included: photo.included,
      naturalWidth: photo.naturalWidth,
      naturalHeight: photo.naturalHeight,
      listingUrl: photo.listingUrl,
      motionKind: photo.motionKind,
      mediaKind: photo.mediaKind,
      video:
        isVideo && photo.video
          ? clampVideoState({
              ...photo.video,
              objectUrl: videoObjectUrl,
            })
          : undefined,
    });
  }

  let audio: PhotoVideoAudio = { kind: "none" };
  if (meta.composition.audio.kind === "ownMusic") {
    const blob = await idbGet("audio", context);
    if (!blob) {
      for (const url of objectUrls) revokePhotoVideoObjectUrl(url);
      await clearPhotoVideoDraft(context);
      return null;
    }
    const objectUrl = URL.createObjectURL(blob);
    objectUrls.push(objectUrl);
    audio = {
      kind: "ownMusic",
      startSeconds: meta.composition.audio.startSeconds,
      durationSeconds: meta.composition.audio.durationSeconds,
      trackDurationSeconds: meta.composition.audio.trackDurationSeconds,
      volume: meta.composition.audio.volume,
      fileName: meta.composition.audio.fileName,
      peaks: meta.composition.audio.peaks,
      objectUrl,
    };
  }

  const draftContext = context ?? meta.context ?? "studio";
  const composition = migrateComposition(
    {
      photos,
      ratio: meta.composition.ratio,
      pace: meta.composition.pace,
      style: meta.composition.style,
      transitionKind: meta.composition.transitionKind,
      boundaryTransitions: meta.composition.boundaryTransitions,
      overlays: meta.composition.overlays,
      audio,
      endCardSeconds: meta.composition.endCardSeconds,
      durationMode: meta.composition.durationMode,
      durationSeconds: meta.composition.durationSeconds,
      movementMode: meta.composition.movementMode,
    },
    draftContext
  );
  return { meta, composition, objectUrls };
}

/** Reload Blob handles after restore so later commits still persist media. */
export async function loadPhotoVideoDraftBlobs(
  composition: PhotoVideoComposition,
  context: PhotoVideoDraftContext = "studio"
): Promise<{ photoBlobs: Map<string, Blob>; posterBlobs: Map<string, Blob>; audioBlob: Blob | null }> {
  const photoBlobs = new Map<string, Blob>();
  const posterBlobs = new Map<string, Blob>();
  for (const photo of composition.photos) {
    const blob = await idbGet(`photo:${photo.id}`, context);
    if (blob) photoBlobs.set(photo.id, blob);
    if (isVideoPhoto(photo)) {
      const poster = await idbGet(`poster:${photo.id}`, context);
      if (poster) posterBlobs.set(photo.id, poster);
    }
  }
  const audioBlob =
    composition.audio.kind === "ownMusic" ? await idbGet("audio", context) : null;
  return { photoBlobs, posterBlobs, audioBlob };
}

export function photoVideoDraftReturnTo(resume = true): string {
  return resume ? "/studio/photo-video?resume=1" : "/studio/photo-video";
}
