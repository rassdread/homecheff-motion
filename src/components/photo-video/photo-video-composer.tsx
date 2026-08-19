"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PhotoVideoAuthGate } from "@/components/photo-video/photo-video-auth-gate";
import { PhotoVideoPhotoStrip } from "@/components/photo-video/photo-video-photo-strip";
import { PhotoVideoPreviewCanvas } from "@/components/photo-video/photo-video-preview-canvas";
import { PhotoVideoExportProgress } from "@/components/photo-video/photo-video-export-progress";
import { PhotoVideoPhotoInspector } from "@/components/photo-video/photo-video-photo-inspector";
import { PhotoVideoTransitionPicker } from "@/components/photo-video/photo-video-transition-picker";
import {
  PhotoVideoEditToolbar,
  type PhotoVideoEditPanel,
} from "@/components/photo-video/photo-video-edit-toolbar";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import {
  addPhotos,
  addTextForPhoto,
  canAddPhoto,
  compositionDuration,
  createListingPhoto,
  createLocalPhoto,
  createLocalVideo,
  createPhotoVideoComposition,
  excludePhoto,
  includePhoto,
  includedPhotos,
  isCompositionPreviewReady,
  movePhoto,
  moveTextOverlay,
  overlaysForPhoto,
  removePhoto,
  removeTextOverlay,
  reorderPhotos,
  setAudio,
  setDurationMode,
  setDurationSeconds,
  setMovementMode,
  setMusicStart,
  setMusicVolume,
  setOverlayAlign,
  setOverlayBackground,
  setOverlayColor,
  setOverlayFont,
  setOverlaySize,
  setPace,
  setPhotoMotionKind,
  setRatio,
  setTransitionKind,
  setVideoAudio,
  setVideoFit,
  setVideoTrim,
  setVideoVolume,
  updateTextOverlay,
  type PhotoVideoComposition,
} from "@/lib/photo-video/composition";
import { firstTransitionSeekTime, seekTimeForPhoto } from "@/lib/photo-video/clock";
import {
  PHOTO_VIDEO_MAX_LOCAL_IMAGE_BYTES,
  PHOTO_VIDEO_MAX_PHOTOS,
  PHOTO_VIDEO_MIN_PHOTOS,
  PHOTO_VIDEO_PACES,
  PHOTO_VIDEO_PREVIEW_MAX_EDGE,
  PHOTO_VIDEO_RATIOS,
  PHOTO_VIDEO_ITEM_DEFAULT_RATIO,
  PHOTO_VIDEO_VIDEO_ACCEPT,
  photoVideoDurationPresets,
  photoVideoMaxSeconds,
  type PhotoVideoMovementMode,
  type PhotoVideoPace,
  type PhotoVideoRatio,
  type PhotoVideoStyle,
} from "@/lib/photo-video/constants";
import {
  classifyLocalVideoFile,
  formatSecondsWhole,
  isVideoPhoto,
  sourceExceedsMax,
} from "@/lib/photo-video/media-clip";
import { probeLocalVideoFile } from "@/lib/photo-video/video-element";
import {
  formatAveragePerPhoto,
  formatPhotoVideoDuration,
} from "@/lib/photo-video/duration";
import {
  clearPhotoVideoDraft,
  commitPhotoVideoDraft,
  canRestorePhotoVideoDraftForUser,
  loadPhotoVideoDraftBlobs,
  readPhotoVideoDraftMeta,
  restorePhotoVideoDraft,
  type PhotoVideoDraftContext,
} from "@/lib/photo-video/draft-storage";
import { exportBusyGuard } from "@/lib/photo-video/export-handoff";
import type { PhotoVideoExportStage } from "@/lib/photo-video/export-settings";
import type { PhotoVideoExportFailReason } from "@/lib/photo-video/export-validate";
import { withItemReturnResult } from "@/lib/photo-video/item-handoff";
import { trackPhotoVideoFunnelEvent } from "@/lib/photo-video/funnel-analytics";
import { revokePhotoVideoObjectUrl } from "@/lib/photo-video/object-url";
import { nudgeOverlay } from "@/lib/photo-video/text-overlay";
import type { PhotoVideoOwnMusic } from "@/lib/photo-video/audio";
import type { TranslationKey } from "@/i18n";

const PhotoVideoMusicPanel = dynamic(
  () => import("@/components/photo-video/photo-video-music-panel").then((mod) => mod.PhotoVideoMusicPanel),
  { ssr: false }
);

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function blobsToRecord(map: Map<string, Blob>): Record<string, Blob> {
  const out: Record<string, Blob> = {};
  for (const [id, blob] of map) out[id] = blob;
  return out;
}

async function previewFromFile(file: File): Promise<{ url: string; width: number; height: number; blob: Blob }> {
  const bitmap = await createImageBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;
  const scale = Math.min(1, PHOTO_VIDEO_PREVIEW_MAX_EDGE / Math.max(width, height));
  const pw = Math.max(1, Math.round(width * scale));
  const ph = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = pw;
  canvas.height = ph;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("canvas");
  }
  ctx.drawImage(bitmap, 0, 0, pw, ph);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("blob"))), "image/jpeg", 0.82);
  });
  return { url: URL.createObjectURL(blob), width, height, blob };
}

function probeListingImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve({
        width: image.naturalWidth || 1080,
        height: image.naturalHeight || 1080,
      });
    image.onerror = () => resolve({ width: 1080, height: 1080 });
    image.src = url;
  });
}

export type PhotoVideoComposerProps = {
  mode?: "studio" | "homecheff-item";
  listingPhotoUrls?: string[];
  returnHref?: string;
  skipAuthGate?: boolean;
  defaultRatio?: PhotoVideoRatio;
};

const RATIO_LABEL: Record<PhotoVideoRatio, TranslationKey> = {
  "9:16": "px4a.ratio.vertical",
  "1:1": "px4a.ratio.square",
  "16:9": "px4a.ratio.landscape",
};
const RATIO_HINT: Record<PhotoVideoRatio, TranslationKey> = {
  "9:16": "px4a.ratio.verticalHint",
  "1:1": "px4a.ratio.squareHint",
  "16:9": "px4a.ratio.landscapeHint",
};
const PACE_LABEL: Record<PhotoVideoPace, TranslationKey> = {
  kort: "px4a.pace.kort",
  normaal: "px4a.pace.normaal",
  rustig: "px4a.pace.rustig",
};
const MOVEMENT_LABEL: Record<PhotoVideoMovementMode, TranslationKey> = {
  auto: "px4a.movement.auto",
  none: "px4a.movement.none",
};
function ChipGroup<T extends string>({
  legend,
  description,
  value,
  options,
  onChange,
  testId,
  labelFor,
}: {
  legend: string;
  description?: string;
  value: T;
  options: readonly { id: T; label: string; hint?: string }[];
  onChange: (id: T) => void;
  testId: string;
  labelFor: (id: T) => string;
}) {
  return (
    <fieldset className="space-y-2" data-testid={testId}>
      <legend className="text-sm font-semibold text-zinc-900">{legend}</legend>
      {description ? <p className="text-sm text-zinc-600">{description}</p> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              aria-label={labelFor(option.id)}
              onClick={() => onChange(option.id)}
              className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium ${
                selected
                  ? "border-[#006D52] bg-[#006D52] text-white"
                  : "border-zinc-200 bg-white text-zinc-800"
              }`}
            >
              <span>{option.label}</span>
              {option.hint ? <span className="mt-0.5 block text-[11px] font-normal opacity-80">{option.hint}</span> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function PhotoVideoComposer({
  mode = "studio",
  listingPhotoUrls = [],
  returnHref,
  skipAuthGate = false,
  defaultRatio,
}: PhotoVideoComposerProps = {}) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const searchParams = useSearchParams();
  const auth = useAuthSession();
  const fileInputId = useId();
  const videoInputId = useId();
  const itemJourney = mode === "homecheff-item";
  const draftContext: PhotoVideoDraftContext = itemJourney ? "homecheff-item" : "studio";
  const durationPresets = photoVideoDurationPresets(draftContext);
  const initialRatio = defaultRatio ?? (itemJourney ? PHOTO_VIDEO_ITEM_DEFAULT_RATIO : undefined);
  const [composition, setComposition] = useState<PhotoVideoComposition>(() =>
    createPhotoVideoComposition(initialRatio ? { ratio: initialRatio } : undefined, draftContext)
  );
  const [playing, setPlaying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [editPanel, setEditPanel] = useState<PhotoVideoEditPanel>("text");
  const [previewCompact, setPreviewCompact] = useState(false);
  const editZoneRef = useRef<HTMLDivElement>(null);
  const previewDockRef = useRef<HTMLDivElement>(null);
  const previewSentinelRef = useRef<HTMLDivElement>(null);
  const [pickingMusic, setPickingMusic] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStage, setExportStage] = useState<PhotoVideoExportStage>("prepare");
  const exportingRef = useRef(false);
  const exportAbortRef = useRef<AbortController | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [resumeOffer, setResumeOffer] = useState(false);
  const [restoreNotice, setRestoreNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const previewUrlsRef = useRef<string[]>([]);
  const photoBlobsRef = useRef<Map<string, Blob>>(new Map());
  const posterBlobsRef = useRef<Map<string, Blob>>(new Map());
  const audioBlobRef = useRef<Blob | null>(null);
  const clockRef = useRef(0);
  const audioUrlRef = useRef<string | undefined>(undefined);
  const compositionRef = useRef(composition);
  const hydratedRef = useRef(false);
  const firstPhotoTracked = useRef(false);

  useEffect(() => {
    compositionRef.current = composition;
  }, [composition]);

  useEffect(() => {
    audioUrlRef.current = composition.audio.kind === "ownMusic" ? composition.audio.objectUrl : undefined;
  }, [composition.audio]);

  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      for (const url of urls) revokePhotoVideoObjectUrl(url);
      revokePhotoVideoObjectUrl(audioUrlRef.current);
    };
  }, []);

  useEffect(() => {
    trackPhotoVideoFunnelEvent(itemJourney ? "photo_video_item_opened" : "photo_video_opened");
  }, [itemJourney]);

  const applyRestored = useCallback(
    (restored: Awaited<ReturnType<typeof restorePhotoVideoDraft>>) => {
      if (!restored) return false;
      for (const url of previewUrlsRef.current) revokePhotoVideoObjectUrl(url);
      revokePhotoVideoObjectUrl(audioUrlRef.current);
      previewUrlsRef.current = restored.objectUrls.slice();
      setComposition(restored.composition);
      setSelectedPhotoId(restored.composition.photos[0]?.id ?? null);
      setSelectedOverlayId(restored.composition.overlays[0]?.id ?? null);
      setPickingMusic(restored.composition.audio.kind === "ownMusic");
      setResumeOffer(false);
      trackPhotoVideoFunnelEvent("photo_video_draft_restored");
      void loadPhotoVideoDraftBlobs(restored.composition, draftContext).then((blobs) => {
        photoBlobsRef.current = blobs.photoBlobs;
        posterBlobsRef.current = blobs.posterBlobs;
        audioBlobRef.current = blobs.audioBlob;
      });
      return true;
    },
    [draftContext, setComposition, setSelectedOverlayId, setPickingMusic]
  );

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const shouldResume = !itemJourney && searchParams.get("resume") === "1";
    void (async () => {
      const meta = readPhotoVideoDraftMeta(draftContext);
      if (meta) {
        if (shouldResume) {
          const restored = await restorePhotoVideoDraft(draftContext);
          if (applyRestored(restored)) {
            setRestoreNotice(true);
            trackPhotoVideoFunnelEvent("photo_video_auth_completed");
          }
          return;
        }
        setResumeOffer(true);
        return;
      }
      if (!itemJourney || listingPhotoUrls.length === 0) return;
      const photos = [];
      for (const url of listingPhotoUrls) {
        const size = await probeListingImageSize(url);
        photos.push(
          createListingPhoto({
            id: newId("pv"),
            listingUrl: url,
            previewUrl: url,
            naturalWidth: size.width,
            naturalHeight: size.height,
          })
        );
      }
      if (!photos.length) return;
      const next = addPhotos(
        createPhotoVideoComposition({ ratio: initialRatio ?? PHOTO_VIDEO_ITEM_DEFAULT_RATIO }, draftContext),
        photos,
        draftContext
      );
      setComposition(next);
      setSelectedPhotoId(next.photos[0]?.id ?? null);
      firstPhotoTracked.current = true;
    })();
  }, [applyRestored, draftContext, initialRatio, itemJourney, listingPhotoUrls, searchParams]);

  useEffect(() => {
    if (!auth.resolved) return;
    const meta = readPhotoVideoDraftMeta(draftContext);
    if (!meta) return;
    if (!canRestorePhotoVideoDraftForUser(meta, auth.user?.id ?? null)) {
      void clearPhotoVideoDraft(draftContext).then(() => {
        setResumeOffer(false);
      });
    }
  }, [auth, draftContext]);

  useEffect(() => {
    if (!composition.photos.length && composition.audio.kind === "none" && !composition.overlays.length) {
      return;
    }
    const timer = window.setTimeout(() => {
      void commitPhotoVideoDraft({
        composition: compositionRef.current,
        photoBlobs: blobsToRecord(photoBlobsRef.current),
        posterBlobs: blobsToRecord(posterBlobsRef.current),
        audioBlob: audioBlobRef.current,
        ownerUserId: auth.resolved ? auth.user?.id ?? null : null,
        context: draftContext,
      }).catch(() => {
        /* quota / private mode — keep editing */
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [composition, auth, draftContext]);

  const duration = compositionDuration(composition, draftContext);
  const ready = isCompositionPreviewReady(composition, draftContext);
  const selectedOverlay = composition.overlays.find((overlay) => overlay.id === selectedOverlayId) ?? null;
  const selectedPhotoIndex = Math.max(
    0,
    composition.photos.findIndex((photo) => photo.id === selectedPhotoId)
  );
  const showMusic = pickingMusic || composition.audio.kind === "ownMusic";
  const authenticated = auth.resolved && Boolean(auth.user);

  const selectPhoto = useCallback(
    (photoId: string) => {
      setSelectedPhotoId(photoId);
      clockRef.current = seekTimeForPhoto(composition, photoId, draftContext);
      setPlaying(false);
      const first = overlaysForPhoto(composition, photoId)[0];
      setSelectedOverlayId(first?.id ?? null);
    },
    [composition, draftContext, setPlaying, setSelectedOverlayId]
  );

  const onFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return;
      setError(null);
      const additions = [];
      let current = composition;
      for (const file of Array.from(list)) {
        if (!file.type.startsWith("image/")) {
          setError(t("px4a.error.notImage"));
          continue;
        }
        if (file.size > PHOTO_VIDEO_MAX_LOCAL_IMAGE_BYTES) {
          setError(t("px4a.error.tooLarge"));
          continue;
        }
        if (!canAddPhoto(current, 1)) {
          setError(t("px4a.error.limit"));
          break;
        }
        try {
          const preview = await previewFromFile(file);
          const photo = createLocalPhoto({
            id: newId("pv"),
            previewUrl: preview.url,
            naturalWidth: preview.width,
            naturalHeight: preview.height,
          });
          const next = addPhotos(current, [photo], draftContext);
          if (next.photos.length === current.photos.length) {
            revokePhotoVideoObjectUrl(preview.url);
            setError(t("px4a.error.limit"));
            break;
          }
          previewUrlsRef.current.push(preview.url);
          photoBlobsRef.current.set(photo.id, preview.blob);
          additions.push(photo);
          current = next;
        } catch {
          setError(t("px4a.error.notImage"));
        }
      }
      if (additions.length) {
        setComposition(current);
        if (!firstPhotoTracked.current) {
          firstPhotoTracked.current = true;
          trackPhotoVideoFunnelEvent("photo_video_first_photo_added");
        }
        const last = additions[additions.length - 1];
        if (last) {
          setSelectedPhotoId(last.id);
          setSelectedOverlayId(null);
          clockRef.current = seekTimeForPhoto(current, last.id, draftContext);
          setPlaying(false);
        }
      }
    },
    [composition, t, draftContext, setError, setComposition, setSelectedOverlayId, setPlaying]
  );

  const onVideoFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return;
      setError(null);
      const additions = [];
      let current = composition;
      for (const file of Array.from(list)) {
        const classified = classifyLocalVideoFile(file);
        if (classified === "type") {
          setError(t("px4a.error.notVideo"));
          continue;
        }
        if (classified === "size") {
          setError(t("px4a.error.videoTooLarge"));
          continue;
        }
        if (!canAddPhoto(current, 1)) {
          setError(t("px4a.error.limit"));
          break;
        }
        try {
          const probed = await probeLocalVideoFile(file);
          if (sourceExceedsMax(probed.durationSeconds)) {
            revokePhotoVideoObjectUrl(probed.objectUrl);
            revokePhotoVideoObjectUrl(probed.posterUrl);
            setError(t("px4a.error.videoTooLong"));
            continue;
          }
          const photo = createLocalVideo({
            id: newId("pv"),
            previewUrl: probed.posterUrl,
            objectUrl: probed.objectUrl,
            naturalWidth: probed.width,
            naturalHeight: probed.height,
            sourceDurationSeconds: probed.durationSeconds,
          });
          const next = addPhotos(current, [photo], draftContext);
          if (next.photos.length === current.photos.length) {
            revokePhotoVideoObjectUrl(probed.objectUrl);
            revokePhotoVideoObjectUrl(probed.posterUrl);
            setError(t("px4a.error.limit"));
            break;
          }
          previewUrlsRef.current.push(probed.posterUrl, probed.objectUrl);
          photoBlobsRef.current.set(photo.id, file);
          posterBlobsRef.current.set(photo.id, probed.posterBlob);
          additions.push(photo);
          current = next;
        } catch {
          setError(t("px4a.error.videoDecode"));
        }
      }
      if (additions.length) {
        setComposition(current);
        if (!firstPhotoTracked.current) {
          firstPhotoTracked.current = true;
          trackPhotoVideoFunnelEvent("photo_video_first_photo_added");
        }
        const last = additions[additions.length - 1];
        if (last) {
          setSelectedPhotoId(last.id);
          setSelectedOverlayId(null);
          setEditPanel("clip");
          clockRef.current = seekTimeForPhoto(current, last.id, draftContext);
          setPlaying(false);
        }
      }
    },
    [composition, t, draftContext, setError, setComposition, setSelectedOverlayId, setPlaying]
  );

  const persistDraft = useCallback(
    async (opts?: { saved?: boolean }) => {
      const result = await commitPhotoVideoDraft({
        composition: compositionRef.current,
        photoBlobs: blobsToRecord(photoBlobsRef.current),
        posterBlobs: blobsToRecord(posterBlobsRef.current),
        audioBlob: audioBlobRef.current,
        ownerUserId: auth.user?.id ?? null,
        saved: opts?.saved,
        context: draftContext,
      });
      if (!result.ok) throw new Error(result.reason);
    },
    [auth.user?.id, draftContext]
  );

  const onSave = useCallback(async () => {
    trackPhotoVideoFunnelEvent("photo_video_save_clicked");
    setError(null);
    setSaving(true);
    try {
      await persistDraft();
      if (!authenticated && !skipAuthGate) {
        trackPhotoVideoFunnelEvent("photo_video_auth_gate_shown");
        setGateOpen(true);
        return;
      }
      await persistDraft({ saved: true });
      trackPhotoVideoFunnelEvent("photo_video_saved");
      setSavedNotice(true);
    } catch {
      setError(t("px4a.draft.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [authenticated, persistDraft, skipAuthGate, t, setError, setGateOpen]);

  const returnToItem = useCallback(
    async (result: "ready" | "cancel") => {
      if (!returnHref) return;
      await persistDraft().catch(() => undefined);
      trackPhotoVideoFunnelEvent("photo_video_item_returned");
      window.location.assign(withItemReturnResult(returnHref, result));
    },
    [persistDraft, returnHref]
  );

  const exportErrorKey = (reason: PhotoVideoExportFailReason): TranslationKey => {
    if (reason === "unsupported") return "px4a.export.unsupported";
    if (reason === "size") return "px4a.export.size";
    if (reason === "duration") return "px4a.export.duration";
    return "px4a.export.failed";
  };

  const runLocalExport = useCallback(async () => {
    if (exportBusyGuard(exportingRef.current) === "busy") return { ok: false as const, reason: "busy" as const };
    exportingRef.current = true;
    setExporting(true);
    setExportStage("prepare");
    setError(null);
    setPlaying(false);
    await persistDraft().catch(() => undefined);
    const abort = new AbortController();
    exportAbortRef.current = abort;
    let wake: WakeLockSentinel | null = null;
    try {
      wake = (await navigator.wakeLock?.request("screen")) ?? null;
    } catch {
      wake = null;
    }
    try {
      const { encodePhotoVideoLocal } = await import("@/lib/photo-video/export-local");
      let audioBlob = audioBlobRef.current;
      const audio = compositionRef.current.audio;
      if (!audioBlob && audio.kind === "ownMusic" && audio.objectUrl) {
        audioBlob = await fetch(audio.objectUrl).then((res) => res.blob());
      }
      const encoded = await encodePhotoVideoLocal({
        composition: compositionRef.current,
        context: draftContext,
        audioBlob,
        placeholderText: t("px4a.text.placeholder"),
        signal: abort.signal,
        onStage: setExportStage,
      });
      if (!encoded.ok) {
        exportingRef.current = false;
        setExporting(false);
      }
      return encoded;
    } catch {
      exportingRef.current = false;
      setExporting(false);
      return { ok: false as const, reason: "encode" as const };
    } finally {
      await wake?.release().catch(() => undefined);
      if (!exportingRef.current) exportAbortRef.current = null;
    }
  }, [draftContext, persistDraft, setError, setPlaying, t]);

  const onFinishItem = useCallback(async () => {
    if (!ready || duration.videoOverBudget || exportingRef.current) return;
    const encoded = await runLocalExport();
    if (!encoded.ok) {
      if (encoded.reason !== "cancelled" && encoded.reason !== "busy") {
        setError(t(exportErrorKey(encoded.reason)));
      }
      return;
    }
    setExporting(true);
    setExportStage("attach");
    exportingRef.current = true;
    try {
      const { handoffPhotoVideoFileToHomeCheff } = await import("@/lib/photo-video/export-attach-client");
      await handoffPhotoVideoFileToHomeCheff({
        file: encoded.file,
        durationSeconds: encoded.durationSeconds,
        signal: exportAbortRef.current?.signal,
      });
    } catch {
      const cancelled = Boolean(exportAbortRef.current?.signal.aborted);
      exportingRef.current = false;
      setExporting(false);
      exportAbortRef.current = null;
      if (!cancelled) setError(t("px4a.export.failed"));
    }
  }, [duration.videoOverBudget, ready, runLocalExport, t]);

  const onDownloadStudio = useCallback(async () => {
    if (!ready || duration.videoOverBudget || exportingRef.current) return;
    if (!authenticated && !skipAuthGate) {
      await persistDraft().catch(() => undefined);
      setGateOpen(true);
      return;
    }
    const encoded = await runLocalExport();
    if (!encoded.ok) {
      if (encoded.reason !== "cancelled" && encoded.reason !== "busy") {
        setError(t(exportErrorKey(encoded.reason)));
      }
      return;
    }
    const { downloadPhotoVideoFile } = await import("@/lib/photo-video/export-local");
    downloadPhotoVideoFile(encoded.file);
    exportingRef.current = false;
    setExporting(false);
    exportAbortRef.current = null;
  }, [authenticated, duration.videoOverBudget, persistDraft, ready, runLocalExport, skipAuthGate, t]);

  const onReset = useCallback(async () => {
    if (!window.confirm(t("px4a.draft.resetConfirm"))) return;
    for (const url of previewUrlsRef.current) revokePhotoVideoObjectUrl(url);
    revokePhotoVideoObjectUrl(audioUrlRef.current);
    previewUrlsRef.current = [];
    photoBlobsRef.current.clear();
    posterBlobsRef.current.clear();
    audioBlobRef.current = null;
    await clearPhotoVideoDraft(draftContext);
    setComposition(createPhotoVideoComposition(initialRatio ? { ratio: initialRatio } : undefined, draftContext));
    setSelectedPhotoId(null);
    setSelectedOverlayId(null);
    setPickingMusic(false);
    setResumeOffer(false);
    setRestoreNotice(false);
    setSavedNotice(false);
    setError(null);
    firstPhotoTracked.current = false;
  }, [draftContext, initialRatio, t, setComposition, setSelectedOverlayId, setPickingMusic, setError]);

  const durationLabel = formatPhotoVideoDuration(duration.totalSeconds, locale);
  const includedCount = includedPhotos(composition).length;
  const selectedIsVideo = Boolean(
    selectedPhotoId && isVideoPhoto(composition.photos.find((photo) => photo.id === selectedPhotoId))
  );
  const exportReady = ready && !duration.videoOverBudget;
  const activeEditPanel: PhotoVideoEditPanel = selectedIsVideo
    ? editPanel === "motion"
      ? "clip"
      : editPanel
    : editPanel === "clip"
      ? "text"
      : editPanel;
  const durationChipValue =
    composition.durationMode === "auto" ? "auto" : String(composition.durationSeconds);
  const selectedPhotoMotion =
    selectedPhotoId != null
      ? composition.photos.find((photo) => photo.id === selectedPhotoId)?.motionKind ?? "auto"
      : "auto";

  useLayoutEffect(() => {
    const dock = previewDockRef.current;
    const zone = editZoneRef.current;
    if (!dock || !zone) return;
    const sync = () => {
      zone.style.setProperty("--px4a-preview-h", `${dock.offsetHeight}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(dock);
    return () => ro.disconnect();
  }, [previewCompact, composition.ratio]);

  useEffect(() => {
    const sentinel = previewSentinelRef.current;
    if (!sentinel) return;
    const io = new IntersectionObserver(
      ([entry]) => setPreviewCompact(!entry?.isIntersecting),
      { threshold: 0, rootMargin: "-8px 0px 0px 0px" }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  return (
    <div className="space-y-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]" data-testid="px4a-composer">
      <header className="space-y-2">
        {itemJourney && returnHref ? (
          <a
            href={withItemReturnResult(returnHref, "cancel")}
            data-testid="px4a-item-back"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-[#006D52]"
            onClick={(event) => {
              event.preventDefault();
              exportAbortRef.current?.abort();
              void returnToItem("cancel");
            }}
          >
            ← {t("px4a.item.back")}
          </a>
        ) : null}
        <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52]" data-testid="px4a-free-label">
          {itemJourney ? t("px4a.item.brand") : t("px4a.free.badge")}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {itemJourney ? t("px4a.item.title") : t("px4a.title")}
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-zinc-600">
          {itemJourney ? t("px4a.item.lead") : t("px4a.lead")}
        </p>
        {itemJourney ? null : <p className="text-sm text-zinc-600">{t("px4a.free.hint")}</p>}
      </header>

      {restoreNotice ? (
        <p
          className="rounded-xl border border-[#006D52]/30 bg-[#006D52]/8 px-4 py-3 text-sm text-[#004d3a]"
          data-testid="px4a-restore-success"
          role="status"
        >
          {t("px4a.draft.restored")}
        </p>
      ) : null}

      {savedNotice ? (
        <p
          className="rounded-xl border border-[#006D52]/30 bg-[#006D52]/8 px-4 py-3 text-sm text-[#004d3a]"
          data-testid="px4a-saved-notice"
          role="status"
        >
          {t("px4a.draft.savedLocal")}
        </p>
      ) : null}

      {resumeOffer && !restoreNotice ? (
        <div
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          data-testid="px4a-resume-offer"
        >
          <p className="text-sm text-zinc-800">{t("px4a.draft.resumePrompt")}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="px4a-resume-continue"
              className="min-h-11 rounded-full bg-[#006D52] px-4 text-sm font-semibold text-white"
              onClick={() => {
                void restorePhotoVideoDraft(draftContext).then((restored) => {
                  if (applyRestored(restored)) setRestoreNotice(true);
                  else setResumeOffer(false);
                });
              }}
            >
              {t("px4a.draft.resumeContinue")}
            </button>
            <button
              type="button"
              data-testid="px4a-resume-fresh"
              className="min-h-11 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800"
              onClick={() => {
                void clearPhotoVideoDraft(draftContext).then(async () => {
                  setResumeOffer(false);
                  if (!itemJourney || listingPhotoUrls.length === 0) return;
                  const photos = [];
                  for (const url of listingPhotoUrls) {
                    const size = await probeListingImageSize(url);
                    photos.push(
                      createListingPhoto({
                        id: newId("pv"),
                        listingUrl: url,
                        previewUrl: url,
                        naturalWidth: size.width,
                        naturalHeight: size.height,
                      })
                    );
                  }
                  const next = addPhotos(
                    createPhotoVideoComposition({ ratio: initialRatio ?? PHOTO_VIDEO_ITEM_DEFAULT_RATIO }, draftContext),
                    photos,
                    draftContext
                  );
                  setComposition(next);
                  setSelectedPhotoId(next.photos[0]?.id ?? null);
                });
              }}
            >
              {t("px4a.draft.resumeFresh")}
            </button>
          </div>
        </div>
      ) : null}

      <div ref={previewSentinelRef} className="h-px w-full" data-testid="px4a-preview-sentinel" aria-hidden="true" />
      <div
        ref={editZoneRef}
        className="grid gap-4 lg:grid-cols-2 lg:items-start"
        data-testid="px4a-edit-zone"
      >
      <div
        ref={previewDockRef}
        className="max-lg:sticky max-lg:top-[max(0.25rem,env(safe-area-inset-top))] max-lg:z-30 max-lg:bg-white/95 max-lg:backdrop-blur-sm lg:col-start-1 lg:row-start-1 lg:row-span-2"
        data-testid="px4a-preview-dock"
        data-compact={previewCompact ? "true" : "false"}
      >
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4">
        <PhotoVideoPreviewCanvas
          composition={composition}
          playing={playing && ready && !exporting}
          clockRef={clockRef}
          selectedOverlayId={selectedOverlayId}
          placeholderText={t("px4a.text.placeholder")}
          context={draftContext}
          compact={previewCompact}
          onSelectOverlay={(id) => {
            setSelectedOverlayId(id);
            if (id) {
              const overlay = composition.overlays.find((item) => item.id === id);
              if (overlay) {
                setSelectedPhotoId(overlay.photoId);
                clockRef.current = seekTimeForPhoto(composition, overlay.photoId, draftContext);
                setPlaying(false);
              }
            }
          }}
          onMoveOverlay={(id, x, y) => setComposition((current) => moveTextOverlay(current, id, x, y))}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-800" data-testid="px4a-duration">
              {includedCount >= PHOTO_VIDEO_MIN_PHOTOS
                ? t("px4a.videoDuration.summary", {
                    count: includedCount,
                    duration: durationLabel,
                  })
                : t("px4a.duration", { duration: durationLabel })}
            </p>
            {includedCount >= PHOTO_VIDEO_MIN_PHOTOS && !previewCompact && !duration.videoOverBudget ? (
              <p className="text-sm text-zinc-600" data-testid="px4a-duration-average">
                {t("px4a.videoDuration.average", {
                  average: formatAveragePerPhoto(duration.averageSecondsPerPhoto, locale),
                })}
              </p>
            ) : null}
            {duration.videoOverBudget ? (
              <p className="text-sm text-red-700" data-testid="px4a-video-over-budget" role="status">
                {t("px4a.video.overBudget", {
                  used: formatSecondsWhole(duration.videoSeconds),
                  target: formatSecondsWhole(composition.durationSeconds),
                })}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="min-h-11 rounded-full border border-zinc-200 px-4 text-sm font-medium"
            onClick={() => {
              if (!playing) trackPhotoVideoFunnelEvent("photo_video_preview_started");
              setPlaying((value) => !value);
            }}
            disabled={!ready}
          >
            {ready && playing ? t("px4a.preview.pause") : t("px4a.preview.play")}
          </button>
        </div>
        {!ready ? <p className="mt-2 text-sm text-zinc-600">{t("px4a.preview.needPhotos")}</p> : null}
      </div>
      </div>

      <div
        className="min-w-0 space-y-3 max-lg:sticky max-lg:z-20 max-lg:bg-white/95 max-lg:backdrop-blur-sm max-lg:pb-2 lg:static lg:col-start-2 lg:row-start-1"
        data-testid="px4a-strip-dock"
        style={{
          top: "max(0.25rem, calc(env(safe-area-inset-top, 0px) + var(--px4a-preview-h, 0px)))",
        }}
      >
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">
          {itemJourney ? t("px4a.item.photos") : t("px4a.photos.title")}
        </h2>
        <p className="text-sm text-zinc-600 max-lg:hidden">
          {itemJourney
            ? t("px4a.item.photosHint")
            : t("px4a.photos.hint", { min: PHOTO_VIDEO_MIN_PHOTOS, max: PHOTO_VIDEO_MAX_PHOTOS })}
        </p>
        {itemJourney ? <p className="text-sm text-zinc-600 max-lg:hidden">{t("px4a.item.addExtra")}</p> : null}
        <input
          id={fileInputId}
          data-testid="px4a-file-input"
          type="file"
          accept="image/*"
          multiple
          aria-label={`+ ${t("px4a.photos.addTile")}`}
          disabled={!canAddPhoto(composition, 1)}
          className="sr-only"
          onChange={(event) => {
            void onFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          id={videoInputId}
          data-testid="px4a-video-input"
          type="file"
          accept={PHOTO_VIDEO_VIDEO_ACCEPT}
          multiple
          aria-label={`+ ${t("px4a.photos.addVideoTile")}`}
          disabled={!canAddPhoto(composition, 1)}
          className="sr-only"
          onChange={(event) => {
            void onVideoFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <PhotoVideoPhotoStrip
          photos={composition.photos}
          selectedPhotoId={selectedPhotoId}
          itemJourney={itemJourney}
          fileInputId={fileInputId}
          videoInputId={videoInputId}
          canAdd={canAddPhoto(composition, 1)}
          onSelect={selectPhoto}
          onReorder={(from, to) => setComposition((current) => reorderPhotos(current, from, to))}
          onMove={(id, delta) => setComposition((current) => movePhoto(current, id, delta))}
          onToggleIncluded={(id) =>
            setComposition((current) => {
              const photo = current.photos.find((item) => item.id === id);
              if (!photo) return current;
              return photo.included ? excludePhoto(current, id) : includePhoto(current, id, draftContext);
            })
          }
          onRemove={(id) =>
            setComposition((current) => {
              const photo = current.photos.find((item) => item.id === id);
              const next = removePhoto(current, id);
              if (photo && next.photos.length < current.photos.length) {
                if (photo.source === "LOCAL_UPLOAD") {
                  revokePhotoVideoObjectUrl(photo.previewUrl);
                  if (photo.video?.objectUrl) revokePhotoVideoObjectUrl(photo.video.objectUrl);
                  previewUrlsRef.current = previewUrlsRef.current.filter(
                    (url) => url !== photo.previewUrl && url !== photo.video?.objectUrl
                  );
                }
                photoBlobsRef.current.delete(id);
                posterBlobsRef.current.delete(id);
              }
              if (selectedPhotoId === id) {
                const fallback = next.photos[0]?.id ?? null;
                setSelectedPhotoId(fallback);
                setSelectedOverlayId(fallback ? overlaysForPhoto(next, fallback)[0]?.id ?? null : null);
              }
              return next;
            })
          }
        />
        <PhotoVideoEditToolbar panel={activeEditPanel} onPanel={setEditPanel} videoSelected={selectedIsVideo} />
        {error ? (
          <p className="text-sm text-red-700" data-testid="px4a-export-error" role="status">
            {error}
          </p>
        ) : null}
      </section>
      </div>

      <div className="min-w-0 lg:col-start-2 lg:row-start-2">
      <PhotoVideoPhotoInspector
        composition={composition}
        selectedPhotoId={selectedPhotoId}
        selectedPhotoIndex={selectedPhotoIndex}
        photoCount={composition.photos.length}
        selectedOverlay={selectedOverlay}
        selectedPhotoMotion={selectedPhotoMotion}
        panel={activeEditPanel}
        onAddText={() => {
          if (!selectedPhotoId) {
            setError(t("px4a.text.needPhoto"));
            return;
          }
          const id = newId("tx");
          setComposition((current) => addTextForPhoto(current, { id, photoId: selectedPhotoId }));
          setSelectedOverlayId(id);
          clockRef.current = seekTimeForPhoto(composition, selectedPhotoId, draftContext);
          setPlaying(false);
          trackPhotoVideoFunnelEvent("photo_video_text_added");
        }}
        onSelectOverlay={(id) => {
          setSelectedOverlayId(id);
          setPlaying(false);
        }}
        onChangeText={(text) => {
          if (!selectedOverlayId) return;
          setComposition((current) => updateTextOverlay(current, selectedOverlayId, { text }));
        }}
        onDelete={() => {
          if (!selectedOverlayId) return;
          setComposition((current) => removeTextOverlay(current, selectedOverlayId));
          setSelectedOverlayId(null);
        }}
        onFont={(font) => selectedOverlayId && setComposition((current) => setOverlayFont(current, selectedOverlayId, font))}
        onColor={(color) => selectedOverlayId && setComposition((current) => setOverlayColor(current, selectedOverlayId, color))}
        onSize={(size) => selectedOverlayId && setComposition((current) => setOverlaySize(current, selectedOverlayId, size))}
        onAlign={(align) => selectedOverlayId && setComposition((current) => setOverlayAlign(current, selectedOverlayId, align))}
        onBackground={(background) =>
          selectedOverlayId && setComposition((current) => setOverlayBackground(current, selectedOverlayId, background))
        }
        onNudge={(dx, dy) => {
          if (!selectedOverlay) return;
          const next = nudgeOverlay(selectedOverlay, dx, dy);
          setComposition((current) => moveTextOverlay(current, selectedOverlay.id, next.x, next.y));
        }}
        onMotion={(id) => {
          if (!selectedPhotoId) return;
          setComposition((current) => setPhotoMotionKind(current, selectedPhotoId, id === "auto" ? null : id));
        }}
        onMoveSelected={(delta) => {
          if (!selectedPhotoId) return;
          setComposition((current) => movePhoto(current, selectedPhotoId, delta));
        }}
        onTrim={(startSeconds, endSeconds) => {
          if (!selectedPhotoId) return;
          setComposition((current) => setVideoTrim(current, selectedPhotoId, startSeconds, endSeconds, draftContext));
        }}
        onVideoAudio={(enabled) => {
          if (!selectedPhotoId) return;
          setComposition((current) => setVideoAudio(current, selectedPhotoId, enabled));
        }}
        onVideoVolume={(volume) => {
          if (!selectedPhotoId) return;
          setComposition((current) => setVideoVolume(current, selectedPhotoId, volume));
        }}
        onVideoFit={(fit) => {
          if (!selectedPhotoId) return;
          setComposition((current) => setVideoFit(current, selectedPhotoId, fit));
        }}
      />
      </div>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="px4a-actions">
        {itemJourney ? (
          <>
            <button
              type="button"
              data-testid="px4a-item-finish"
              disabled={!exportReady || exporting}
              className="min-h-11 rounded-full bg-[#006D52] px-5 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => void onFinishItem()}
            >
              {t("px4a.item.finish")}
            </button>
            {returnHref ? (
              <button
                type="button"
                data-testid="px4a-item-cancel"
                className="min-h-11 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800"
                onClick={() => {
                  exportAbortRef.current?.abort();
                  void returnToItem("cancel");
                }}
              >
                {t("px4a.item.back")}
              </button>
            ) : null}
          </>
        ) : (
          <>
            <button
              type="button"
              data-testid="px4a-save"
              disabled={!ready || saving || exporting}
              className="min-h-11 rounded-full bg-[#006D52] px-5 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => void onSave()}
            >
              {saving ? t("px4a.draft.saving") : t("px4a.draft.save")}
            </button>
            <button
              type="button"
              data-testid="px4a-export-download"
              disabled={!exportReady || exporting}
              className="min-h-11 rounded-full border border-[#006D52] bg-white px-5 text-sm font-semibold text-[#006D52] disabled:opacity-50"
              onClick={() => void onDownloadStudio()}
            >
              {exporting ? t("px4a.export.downloading") : t("px4a.export.download")}
            </button>
          </>
        )}
        <button
          type="button"
          data-testid="px4a-reset"
          className="min-h-11 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800"
          onClick={() => void onReset()}
        >
          {t("px4a.draft.reset")}
        </button>
      </div>
      {itemJourney ? (
        <p className="text-sm text-zinc-600" data-testid="px4a-item-finish-hint">
          {t("px4a.item.finishHint")} {t("px4a.item.finishPending")}
        </p>
      ) : null}

      <section className="space-y-4" data-testid="px4a-global-video" aria-labelledby="px4a-global-heading">
      <div className="space-y-1">
        <h2 id="px4a-global-heading" className="text-base font-semibold text-zinc-900">
          {t("px4a.global.legend")}
        </h2>
        <p className="text-sm text-zinc-600">{t("px4a.global.lead")}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4">
      <ChipGroup
        legend={t("px4a.videoDuration.legend")}
        testId="px4a-video-duration"
        value={durationChipValue}
        onChange={(id) => {
          if (id === "auto") {
            setComposition((current) => setDurationMode(current, "auto", draftContext));
            return;
          }
          const seconds = Number(id);
          if (!Number.isFinite(seconds)) return;
          setComposition((current) => setDurationSeconds(current, seconds, draftContext));
        }}
        labelFor={(id) =>
          id === "auto" ? t("px4a.videoDuration.auto") : t("px4a.videoDuration.sec", { seconds: id })
        }
        options={[
          { id: "auto", label: t("px4a.videoDuration.auto") },
          ...durationPresets.map((seconds) => ({
            id: String(seconds),
            label: t("px4a.videoDuration.sec", { seconds }),
          })),
        ]}
      />
      {itemJourney ? (
        <p className="text-sm text-zinc-600" data-testid="px4a-video-duration-homecheff-hint">
          {t("px4a.videoDuration.homecheffMax")}
        </p>
      ) : null}
      {composition.durationMode === "auto" ? (
        <ChipGroup
          legend={t("px4a.pace.legend")}
          description={t("px4a.pace.autoHint")}
          testId="px4a-pace"
          value={composition.pace}
          onChange={(id) => setComposition((current) => setPace(current, id, draftContext))}
          labelFor={(id) => t(PACE_LABEL[id])}
          options={PHOTO_VIDEO_PACES.map((id) => ({
            id,
            label: t(PACE_LABEL[id]),
          }))}
        />
      ) : null}
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4">
      <ChipGroup
        legend={t("px4a.ratio.legend")}
        testId="px4a-ratio"
        value={composition.ratio}
        onChange={(id) => setComposition((current) => setRatio(current, id))}
        labelFor={(id) => t(RATIO_LABEL[id])}
        options={PHOTO_VIDEO_RATIOS.map((id) => ({
          id,
          label: t(RATIO_LABEL[id]),
          hint: t(RATIO_HINT[id]),
        }))}
      />
      </div>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4">
      <PhotoVideoTransitionPicker
        value={composition.transitionKind}
        previewDisabled={!ready}
        t={t}
        onChange={(kind) => {
          setComposition((current) => {
            const next = setTransitionKind(current, kind, draftContext);
            clockRef.current = firstTransitionSeekTime(next, draftContext);
            return next;
          });
        }}
        onPreview={() => {
          clockRef.current = firstTransitionSeekTime(composition, draftContext);
          if (!playing) trackPhotoVideoFunnelEvent("photo_video_preview_started");
          setPlaying(true);
        }}
      />
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4">
      <ChipGroup
        legend={t("px4a.movement.global")}
        description={t("px4a.movement.globalHint")}
        testId="px4a-movement"
        value={composition.movementMode}
        onChange={(id) => setComposition((current) => setMovementMode(current, id))}
        labelFor={(id) => t(MOVEMENT_LABEL[id])}
        options={(["auto", "none"] as const).map((id) => ({
          id,
          label: t(MOVEMENT_LABEL[id]),
        }))}
      />
      </div>

      <fieldset className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4" data-testid="px4a-audio">
        <legend className="text-sm font-semibold text-zinc-900">{t("px4a.audio.legend")}</legend>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="px4a-audio-none"
            aria-pressed={composition.audio.kind === "none" && !pickingMusic && !catalogOpen}
            className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
              composition.audio.kind === "none" && !pickingMusic && !catalogOpen
                ? "border-[#006D52] bg-[#006D52] text-white"
                : "border-zinc-200 bg-white text-zinc-800"
            }`}
            onClick={() => {
              setPickingMusic(false);
              setCatalogOpen(false);
              audioBlobRef.current = null;
              setComposition((current) => {
                if (current.audio.kind === "ownMusic") revokePhotoVideoObjectUrl(current.audio.objectUrl);
                return setAudio(current, { kind: "none" }, draftContext);
              });
            }}
          >
            {t("px4a.audio.none")}
          </button>
          <button
            type="button"
            data-testid="px4a-audio-own"
            aria-pressed={showMusic}
            className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
              showMusic ? "border-[#006D52] bg-[#006D52] text-white" : "border-zinc-200 bg-white text-zinc-800"
            }`}
            onClick={() => {
              setCatalogOpen(false);
              setPickingMusic(true);
            }}
          >
            {t("px4a.audio.own")}
          </button>
          <button
            type="button"
            data-testid="px4a-audio-catalog"
            aria-pressed={catalogOpen}
            className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
              catalogOpen ? "border-[#006D52] bg-[#006D52] text-white" : "border-zinc-200 bg-white text-zinc-800"
            }`}
            onClick={() => {
              setPickingMusic(false);
              setCatalogOpen(true);
            }}
          >
            {t("px4a.audio.catalog")}
          </button>
        </div>
        {catalogOpen ? (
          <p className="text-sm text-zinc-600" data-testid="px4a-audio-catalog-empty">
            {t("px4a.audio.catalogEmpty")}
          </p>
        ) : null}
        {showMusic ? (
          <PhotoVideoMusicPanel
            composition={composition}
            clockRef={clockRef}
            playing={playing && ready}
            locale={locale}
            onOwnMusic={(next: PhotoVideoOwnMusic, previousObjectUrl?: string, sourceBlob?: Blob) => {
              if (previousObjectUrl) revokePhotoVideoObjectUrl(previousObjectUrl);
              if (sourceBlob) audioBlobRef.current = sourceBlob;
              setComposition((current) => setAudio(current, next, draftContext));
              trackPhotoVideoFunnelEvent("photo_video_music_added");
            }}
            onStart={(startSeconds) =>
              setComposition((current) => setMusicStart(current, startSeconds, draftContext))
            }
            onVolume={(volume) => setComposition((current) => setMusicVolume(current, volume))}
            onPlayingChange={setPlaying}
          />
        ) : null}
      </fieldset>

      {composition.durationMode !== "auto" ? (
        <details className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4" data-testid="px4a-global-more">
          <summary className="min-h-11 cursor-pointer list-outside text-sm font-semibold text-zinc-900">
            {t("px4a.global.more")}
          </summary>
          <div className="mt-3">
            <ChipGroup
              legend={t("px4a.pace.legend")}
              description={t("px4a.pace.hint")}
              testId="px4a-pace"
              value={composition.pace}
              onChange={(id) => setComposition((current) => setPace(current, id, draftContext))}
              labelFor={(id) => t(PACE_LABEL[id])}
              options={PHOTO_VIDEO_PACES.map((id) => ({
                id,
                label: t(PACE_LABEL[id]),
              }))}
            />
          </div>
        </details>
      ) : null}

      </section>

      <p className="text-xs text-zinc-500">{t("px4a.watermark.note")}</p>
      <p className="sr-only" data-testid="px4a-max-seconds">
        {photoVideoMaxSeconds(draftContext)}
      </p>

      {gateOpen && !skipAuthGate ? <PhotoVideoAuthGate open={gateOpen} onClose={() => setGateOpen(false)} /> : null}
      {exporting ? (
        <PhotoVideoExportProgress
          stage={exportStage}
          includeMusic={composition.audio.kind === "ownMusic"}
          includeAttach={itemJourney}
          title={t("px4a.export.progress")}
          stageLabel={(stage) =>
            t(
              stage === "prepare"
                ? "px4a.export.stage.prepare"
                : stage === "frames"
                  ? "px4a.export.stage.frames"
                  : stage === "music"
                    ? "px4a.export.stage.music"
                    : stage === "mux"
                      ? "px4a.export.stage.mux"
                      : "px4a.export.stage.attach"
            )
          }
          cancelLabel={t("px4a.export.cancel")}
          onCancel={() => exportAbortRef.current?.abort()}
        />
      ) : null}
    </div>
  );
}

export type { PhotoVideoPace, PhotoVideoRatio, PhotoVideoStyle };
