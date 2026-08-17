"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PhotoVideoAuthGate } from "@/components/photo-video/photo-video-auth-gate";
import { PhotoVideoPhotoStrip } from "@/components/photo-video/photo-video-photo-strip";
import { PhotoVideoPreviewCanvas } from "@/components/photo-video/photo-video-preview-canvas";
import { PhotoVideoTextControls } from "@/components/photo-video/photo-video-text-controls";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import {
  addPhotos,
  addTextForPhoto,
  canAddPhoto,
  compositionDuration,
  createLocalPhoto,
  createPhotoVideoComposition,
  isCompositionPreviewReady,
  movePhoto,
  moveTextOverlay,
  overlaysForPhoto,
  removePhoto,
  removeTextOverlay,
  reorderPhotos,
  setAudio,
  setMusicStart,
  setMusicVolume,
  setOverlayAlign,
  setOverlayBackground,
  setOverlayColor,
  setOverlayFont,
  setOverlaySize,
  setPace,
  setRatio,
  setStyle,
  updateTextOverlay,
  type PhotoVideoComposition,
} from "@/lib/photo-video/composition";
import { seekTimeForPhoto } from "@/lib/photo-video/clock";
import {
  PHOTO_VIDEO_MAX_LOCAL_IMAGE_BYTES,
  PHOTO_VIDEO_MAX_PHOTOS,
  PHOTO_VIDEO_MAX_SECONDS,
  PHOTO_VIDEO_MIN_PHOTOS,
  PHOTO_VIDEO_PACES,
  PHOTO_VIDEO_PREVIEW_MAX_EDGE,
  PHOTO_VIDEO_RATIOS,
  PHOTO_VIDEO_STYLES,
  type PhotoVideoPace,
  type PhotoVideoRatio,
  type PhotoVideoStyle,
} from "@/lib/photo-video/constants";
import {
  clearPhotoVideoDraft,
  commitPhotoVideoDraft,
  canRestorePhotoVideoDraftForUser,
  loadPhotoVideoDraftBlobs,
  readPhotoVideoDraftMeta,
  restorePhotoVideoDraft,
} from "@/lib/photo-video/draft-storage";
import { trackPhotoVideoFunnelEvent } from "@/lib/photo-video/funnel-analytics";
import { formatPhotoVideoDuration } from "@/lib/photo-video/duration";
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
const STYLE_LABEL: Record<PhotoVideoStyle, TranslationKey> = {
  auto: "px4a.style.auto",
  smooth: "px4a.style.smooth",
  calm: "px4a.style.calm",
  energetic: "px4a.style.energetic",
};

function ChipGroup<T extends string>({
  legend,
  value,
  options,
  onChange,
  testId,
  labelFor,
}: {
  legend: string;
  value: T;
  options: readonly { id: T; label: string; hint?: string }[];
  onChange: (id: T) => void;
  testId: string;
  labelFor: (id: T) => string;
}) {
  return (
    <fieldset className="space-y-2" data-testid={testId}>
      <legend className="text-sm font-semibold text-zinc-900">{legend}</legend>
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

export function PhotoVideoComposer() {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const searchParams = useSearchParams();
  const auth = useAuthSession();
  const fileInputId = useId();
  const [composition, setComposition] = useState<PhotoVideoComposition>(() => createPhotoVideoComposition());
  const [playing, setPlaying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [pickingMusic, setPickingMusic] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [resumeOffer, setResumeOffer] = useState(false);
  const [restoreNotice, setRestoreNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const previewUrlsRef = useRef<string[]>([]);
  const photoBlobsRef = useRef<Map<string, Blob>>(new Map());
  const audioBlobRef = useRef<Blob | null>(null);
  const clockRef = useRef(0);
  const audioUrlRef = useRef<string | undefined>(undefined);
  const compositionRef = useRef(composition);
  const hydratedRef = useRef(false);
  const firstPhotoTracked = useRef(false);

  compositionRef.current = composition;

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
    trackPhotoVideoFunnelEvent("photo_video_opened");
  }, []);

  const applyRestored = useCallback((restored: Awaited<ReturnType<typeof restorePhotoVideoDraft>>) => {
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
    void loadPhotoVideoDraftBlobs(restored.composition).then((blobs) => {
      photoBlobsRef.current = blobs.photoBlobs;
      audioBlobRef.current = blobs.audioBlob;
    });
    return true;
  }, []);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const shouldResume = searchParams.get("resume") === "1";
    void (async () => {
      const meta = readPhotoVideoDraftMeta();
      if (!meta) return;
      if (shouldResume) {
        const restored = await restorePhotoVideoDraft();
        if (applyRestored(restored)) {
          setRestoreNotice(true);
          trackPhotoVideoFunnelEvent("photo_video_auth_completed");
        }
        return;
      }
      setResumeOffer(true);
    })();
  }, [applyRestored, searchParams]);

  useEffect(() => {
    if (!auth.resolved) return;
    const meta = readPhotoVideoDraftMeta();
    if (!meta) return;
    if (!canRestorePhotoVideoDraftForUser(meta, auth.user?.id ?? null)) {
      void clearPhotoVideoDraft();
      setResumeOffer(false);
    }
  }, [auth]);

  useEffect(() => {
    if (!composition.photos.length && composition.audio.kind === "none" && !composition.overlays.length) {
      return;
    }
    const timer = window.setTimeout(() => {
      void commitPhotoVideoDraft({
        composition: compositionRef.current,
        photoBlobs: blobsToRecord(photoBlobsRef.current),
        audioBlob: audioBlobRef.current,
        ownerUserId: auth.resolved ? auth.user?.id ?? null : null,
      }).catch(() => {
        /* quota / private mode — keep editing */
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [composition, auth]);

  const duration = compositionDuration(composition);
  const ready = isCompositionPreviewReady(composition);
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
      clockRef.current = seekTimeForPhoto(composition, photoId);
      setPlaying(false);
      const first = overlaysForPhoto(composition, photoId)[0];
      setSelectedOverlayId(first?.id ?? null);
    },
    [composition]
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
          const next = addPhotos(current, [photo]);
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
        }
      }
    },
    [composition, t]
  );

  const persistDraft = useCallback(
    async (opts?: { saved?: boolean }) => {
      const result = await commitPhotoVideoDraft({
        composition: compositionRef.current,
        photoBlobs: blobsToRecord(photoBlobsRef.current),
        audioBlob: audioBlobRef.current,
        ownerUserId: auth.user?.id ?? null,
        saved: opts?.saved,
      });
      if (!result.ok) throw new Error(result.reason);
    },
    [auth.user?.id]
  );

  const onSave = useCallback(async () => {
    trackPhotoVideoFunnelEvent("photo_video_save_clicked");
    setError(null);
    setSaving(true);
    try {
      await persistDraft();
      if (!authenticated) {
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
  }, [authenticated, persistDraft, t]);

  const onReset = useCallback(async () => {
    if (!window.confirm(t("px4a.draft.resetConfirm"))) return;
    for (const url of previewUrlsRef.current) revokePhotoVideoObjectUrl(url);
    revokePhotoVideoObjectUrl(audioUrlRef.current);
    previewUrlsRef.current = [];
    photoBlobsRef.current.clear();
    audioBlobRef.current = null;
    await clearPhotoVideoDraft();
    setComposition(createPhotoVideoComposition());
    setSelectedPhotoId(null);
    setSelectedOverlayId(null);
    setPickingMusic(false);
    setResumeOffer(false);
    setRestoreNotice(false);
    setSavedNotice(false);
    setError(null);
    firstPhotoTracked.current = false;
  }, [t]);

  const durationLabel = formatPhotoVideoDuration(duration.totalSeconds, locale);
  const remainingLabel = formatPhotoVideoDuration(Math.max(0, duration.remainingSeconds), locale);

  return (
    <div className="space-y-8" data-testid="px4a-composer">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52]" data-testid="px4a-free-label">
          {t("px4a.free.badge")}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{t("px4a.title")}</h1>
        <p className="max-w-xl text-sm leading-relaxed text-zinc-600">{t("px4a.lead")}</p>
        <p className="text-sm text-zinc-600">{t("px4a.free.hint")}</p>
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
                void restorePhotoVideoDraft().then((restored) => {
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
                void clearPhotoVideoDraft().then(() => setResumeOffer(false));
              }}
            >
              {t("px4a.draft.resumeFresh")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4">
        <PhotoVideoPreviewCanvas
          composition={composition}
          playing={playing && ready}
          clockRef={clockRef}
          selectedOverlayId={selectedOverlayId}
          placeholderText={t("px4a.text.placeholder")}
          onSelectOverlay={(id) => {
            setSelectedOverlayId(id);
            if (id) {
              const overlay = composition.overlays.find((item) => item.id === id);
              if (overlay) {
                setSelectedPhotoId(overlay.photoId);
                clockRef.current = seekTimeForPhoto(composition, overlay.photoId);
                setPlaying(false);
              }
            }
          }}
          onMoveOverlay={(id, x, y) => setComposition((current) => moveTextOverlay(current, id, x, y))}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-zinc-800" data-testid="px4a-duration">
            {t("px4a.duration", { duration: durationLabel })}
          </p>
          <p className="text-sm text-zinc-600" data-testid="px4a-remaining">
            {t("px4a.remaining", { remaining: remainingLabel })}
          </p>
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="px4a-save"
          disabled={!ready || saving}
          className="min-h-11 rounded-full bg-[#006D52] px-5 text-sm font-semibold text-white disabled:opacity-50"
          onClick={() => void onSave()}
        >
          {saving ? t("px4a.draft.saving") : t("px4a.draft.save")}
        </button>
        <button
          type="button"
          data-testid="px4a-reset"
          className="min-h-11 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800"
          onClick={() => void onReset()}
        >
          {t("px4a.draft.reset")}
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">{t("px4a.photos.title")}</h2>
        <p className="text-sm text-zinc-600">{t("px4a.photos.hint", { min: PHOTO_VIDEO_MIN_PHOTOS, max: PHOTO_VIDEO_MAX_PHOTOS })}</p>
        <label
          htmlFor={fileInputId}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[#006D52] px-5 text-sm font-semibold text-white"
        >
          {t("px4a.photos.add")}
        </label>
        <input
          id={fileInputId}
          data-testid="px4a-file-input"
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            void onFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <PhotoVideoPhotoStrip
          photos={composition.photos}
          selectedPhotoId={selectedPhotoId}
          onSelect={selectPhoto}
          onReorder={(from, to) => setComposition((current) => reorderPhotos(current, from, to))}
          onMove={(id, delta) => setComposition((current) => movePhoto(current, id, delta))}
          onRemove={(id) =>
            setComposition((current) => {
              const photo = current.photos.find((item) => item.id === id);
              const next = removePhoto(current, id);
              if (photo && next.photos.length < current.photos.length) {
                revokePhotoVideoObjectUrl(photo.previewUrl);
                previewUrlsRef.current = previewUrlsRef.current.filter((url) => url !== photo.previewUrl);
                photoBlobsRef.current.delete(id);
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
        {error ? (
          <p className="text-sm text-red-700" role="status">
            {error}
          </p>
        ) : null}
      </section>

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

      <ChipGroup
        legend={t("px4a.pace.legend")}
        testId="px4a-pace"
        value={composition.pace}
        onChange={(id) => setComposition((current) => setPace(current, id))}
        labelFor={(id) => t(PACE_LABEL[id])}
        options={PHOTO_VIDEO_PACES.map((id) => ({
          id,
          label: t(PACE_LABEL[id]),
        }))}
      />

      <ChipGroup
        legend={t("px4a.style.legend")}
        testId="px4a-style"
        value={composition.style}
        onChange={(id) => setComposition((current) => setStyle(current, id))}
        labelFor={(id) => t(STYLE_LABEL[id])}
        options={PHOTO_VIDEO_STYLES.map((id) => ({
          id,
          label: t(STYLE_LABEL[id]),
        }))}
      />

      <PhotoVideoTextControls
        composition={composition}
        selectedPhotoId={selectedPhotoId}
        selectedPhotoIndex={selectedPhotoIndex}
        selectedOverlay={selectedOverlay}
        onAdd={() => {
          if (!selectedPhotoId) {
            setError(t("px4a.text.needPhoto"));
            return;
          }
          const id = newId("tx");
          setComposition((current) => addTextForPhoto(current, { id, photoId: selectedPhotoId }));
          setSelectedOverlayId(id);
          clockRef.current = seekTimeForPhoto(composition, selectedPhotoId);
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
      />

      <fieldset className="space-y-2" data-testid="px4a-audio">
        <legend className="text-sm font-semibold text-zinc-900">{t("px4a.audio.legend")}</legend>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="px4a-audio-none"
            aria-pressed={composition.audio.kind === "none" && !pickingMusic}
            className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
              composition.audio.kind === "none" && !pickingMusic
                ? "border-[#006D52] bg-[#006D52] text-white"
                : "border-zinc-200 bg-white text-zinc-800"
            }`}
            onClick={() => {
              setPickingMusic(false);
              audioBlobRef.current = null;
              setComposition((current) => {
                if (current.audio.kind === "ownMusic") revokePhotoVideoObjectUrl(current.audio.objectUrl);
                return setAudio(current, { kind: "none" });
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
            onClick={() => setPickingMusic(true)}
          >
            {t("px4a.audio.own")}
          </button>
        </div>
        {showMusic ? (
          <PhotoVideoMusicPanel
            composition={composition}
            clockRef={clockRef}
            playing={playing && ready}
            locale={locale}
            onOwnMusic={(next: PhotoVideoOwnMusic, previousObjectUrl?: string, sourceBlob?: Blob) => {
              if (previousObjectUrl) revokePhotoVideoObjectUrl(previousObjectUrl);
              if (sourceBlob) audioBlobRef.current = sourceBlob;
              setComposition((current) => setAudio(current, next));
              trackPhotoVideoFunnelEvent("photo_video_music_added");
            }}
            onStart={(startSeconds) => setComposition((current) => setMusicStart(current, startSeconds))}
            onVolume={(volume) => setComposition((current) => setMusicVolume(current, volume))}
            onPlayingChange={setPlaying}
          />
        ) : null}
      </fieldset>

      <p className="text-xs text-zinc-500">{t("px4a.watermark.note")}</p>
      <p className="sr-only" data-testid="px4a-max-seconds">
        {PHOTO_VIDEO_MAX_SECONDS}
      </p>

      {gateOpen ? <PhotoVideoAuthGate open={gateOpen} onClose={() => setGateOpen(false)} /> : null}
    </div>
  );
}

export type { PhotoVideoPace, PhotoVideoRatio, PhotoVideoStyle };
