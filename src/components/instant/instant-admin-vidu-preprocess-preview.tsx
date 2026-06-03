"use client";

import { SafePreviewImage } from "@/components/ui/safe-preview-image";
import { resolvePreviewSrc, resolvePreviewSrcFromUnknown, toWizardPreviewInput } from "@/lib/instant-wizard-preview-src";
import { useEffect, useMemo, useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";
import type { BakedTextProtectionDraft } from "@/components/instant/baked-text-protection-panel";
import { usesHybridPreAiNeutralize, type TextRenderMode } from "@/lib/hybrid-motion-overlay";
import { isActiveOcrScanPhase } from "@/lib/instant-ocr-scan";

type PreviewImage = {
  id: string;
  originalFileName: string;
  bakedText: BakedTextProtectionDraft;
  remoteWorkingUrl?: string;
  remoteThumbnailUrl?: string;
  previewUnavailable?: boolean;
};

type Props = {
  images: PreviewImage[];
  textRenderMode: TextRenderMode;
  onPreviewMask: (imageId: string) => Promise<void>;
};

function blocksPreviewKey(blocks: BakedTextBlockRecord[]): string {
  return JSON.stringify(
    blocks
      .filter((b) => b.kept !== false && b.editedText.trim())
      .map((b) => ({
        id: b.id,
        bbox: b.bbox,
        blockType: b.blockType,
        editedText: b.editedText,
      }))
  );
}

function PreviewFrame({
  label,
  src,
  regions,
  highlight = false,
  emphasize = false,
}: {
  label: string;
  src: string | null | undefined;
  regions?: Array<{ x: number; y: number; width: number; height: number }>;
  highlight?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div className={emphasize ? "sm:col-span-1" : ""}>
      <p
        className={`text-[10px] font-semibold uppercase tracking-wide ${
          emphasize ? "text-emerald-800" : "text-zinc-600"
        }`}
      >
        {label}
      </p>
      <div
        className={`relative mt-1.5 aspect-[3/4] w-full overflow-hidden rounded-lg bg-zinc-100 ${
          emphasize
            ? "ring-2 ring-emerald-500 ring-offset-2"
            : highlight
              ? "border border-amber-200"
              : "border border-zinc-200"
        }`}
      >
        <SafePreviewImage src={src} alt="" fill className="object-cover" sizes="(max-width:768px) 33vw, 200px" />
        {regions?.map((region, idx) => (
          <div
            key={`region-${idx}`}
            className="pointer-events-none absolute border-2 border-amber-500/95 bg-amber-400/25"
            style={{
              left: `${region.x * 100}%`,
              top: `${region.y * 100}%`,
              width: `${region.width * 100}%`,
              height: `${region.height * 100}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ImagePreviewCard({
  image,
  textRenderMode,
  onPreviewMask,
}: {
  image: PreviewImage;
  textRenderMode: TextRenderMode;
  onPreviewMask: (imageId: string) => Promise<void>;
}) {
  const t = useActiveTranslator();
  const bt = image.bakedText;
  const keptBlocks = useMemo(
    () => bt.blocks.filter((b) => b.kept !== false && b.editedText.trim().length > 0),
    [bt.blocks]
  );
  const blocksKey = useMemo(() => blocksPreviewKey(bt.blocks), [bt.blocks]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedKeyRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  const isScanning =
    isActiveOcrScanPhase(bt.scanPhase) || bt.scanBusy || bt.autoScanState === "scanning";

  const runPreview = useMemo(
    () => async (force = false) => {
      if (keptBlocks.length === 0 || inFlightRef.current) {
        return;
      }
      const fetchKey = `${image.id}:${textRenderMode}:${blocksKey}`;
      if (!force && lastFetchedKeyRef.current === fetchKey && bt.maskedPreviewUrl) {
        return;
      }
      inFlightRef.current = true;
      setLoading(true);
      setError(null);
      try {
        await onPreviewMask(image.id);
        lastFetchedKeyRef.current = fetchKey;
      } catch (e) {
        setError(e instanceof Error ? e.message : t("instant.bakedText.previewFailed"));
      } finally {
        setLoading(false);
        inFlightRef.current = false;
      }
    },
    [blocksKey, bt.maskedPreviewUrl, image.id, keptBlocks.length, onPreviewMask, t, textRenderMode]
  );

  useEffect(() => {
    if (isScanning || keptBlocks.length === 0) {
      return;
    }
    const timer = setTimeout(() => {
      void runPreview(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [isScanning, keptBlocks.length, blocksKey, textRenderMode, runPreview]);

  const originalSrc =
    resolvePreviewSrcFromUnknown(bt.debugOriginalUrl) ??
    resolvePreviewSrc(
      toWizardPreviewInput({
        id: image.id,
        remoteWorkingUrl: image.bakedText.remoteWorkingUrl,
        remoteThumbnailUrl: image.remoteThumbnailUrl,
        previewUnavailable: image.previewUnavailable,
      })
    );
  const cleanSrc = resolvePreviewSrcFromUnknown(bt.maskedPreviewUrl);

  return (
    <div className="rounded-xl border border-violet-300/80 bg-violet-50/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-violet-950">
          {image.originalFileName}
          {bt.debugMaskRegionCount != null
            ? ` · ${bt.debugMaskRegionCount} ${t("instant.bakedText.adminDebugRegions")}`
            : ""}
        </p>
        <button
          type="button"
          className="rounded-md border border-violet-300 bg-white px-2 py-1 text-[10px] font-medium text-violet-900 disabled:opacity-50"
          disabled={loading || keptBlocks.length === 0}
          onClick={() => void runPreview(true)}
        >
          {loading ? t("instant.bakedText.adminPreviewLoading") : t("instant.bakedText.adminPreviewRefresh")}
        </button>
      </div>

      {isScanning ? (
        <p className="mt-2 text-[11px] text-violet-800">{t("instant.bakedText.adminPreviewWaitScan")}</p>
      ) : null}

      {error ? (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-800">
          {error}
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PreviewFrame label={t("instant.bakedText.adminDebugOriginal")} src={originalSrc} />
        <PreviewFrame
          label={t("instant.bakedText.adminDebugExpandedMasks")}
          src={originalSrc}
          regions={bt.debugMaskRegions}
          highlight
        />
        {loading && !cleanSrc ? (
          <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50">
            <p className="px-2 text-center text-[11px] font-medium text-emerald-800">
              {t("instant.bakedText.adminPreviewLoading")}
            </p>
          </div>
        ) : cleanSrc ? (
          <PreviewFrame
            label={t("instant.bakedText.adminDebugViduInput")}
            src={cleanSrc}
            emphasize
          />
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white/80">
            <p className="px-2 text-center text-[11px] text-zinc-500">
              {t("instant.bakedText.adminPreviewPending")}
            </p>
          </div>
        )}
      </div>

      {cleanSrc ? (
        <p className="mt-2 text-[10px] leading-relaxed text-emerald-900/90">
          {t("instant.bakedText.adminPreviewViduHint")}
        </p>
      ) : null}
    </div>
  );
}

export function InstantAdminViduPreprocessPreview({ images, textRenderMode, onPreviewMask }: Props) {
  const t = useActiveTranslator();

  const previewImages = useMemo(
    () =>
      images.filter((img) => {
        const kept = img.bakedText.blocks.filter(
          (b) => b.kept !== false && b.editedText.trim().length > 0
        );
        return kept.length > 0 && img.bakedText.enabled;
      }),
    [images]
  );

  if (!usesHybridPreAiNeutralize(textRenderMode) || previewImages.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-violet-300 bg-gradient-to-b from-violet-50 to-white p-3 shadow-sm">
      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-950">
          {t("instant.bakedText.adminPreviewSectionTitle")}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-violet-900/90">
          {t("instant.bakedText.adminPreviewSectionHint")}
        </p>
      </div>
      <div className="space-y-4">
        {previewImages.map((image) => (
          <ImagePreviewCard
            key={image.id}
            image={image}
            textRenderMode={textRenderMode}
            onPreviewMask={onPreviewMask}
          />
        ))}
      </div>
    </div>
  );
}
