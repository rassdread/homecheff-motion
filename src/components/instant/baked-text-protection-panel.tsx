"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { InstantOcrStatusLine } from "@/components/instant/instant-ocr-status-line";
import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";
import {
  canEnableHeroReproject,
  classifyOcrTextDensity,
  countHeroReprojectBlocks,
  MAX_HERO_OVERLAYS_PER_IMAGE,
} from "@/lib/instant-text-hero-overlay";
import { isActiveOcrScanPhase } from "@/lib/instant-ocr-scan";
import { LOCKED_TEXT_ANIMATIONS, type LockedTextAnimation } from "@/lib/locked-text-layer";
import type { OcrScanPhase } from "@/lib/instant-ocr-scan";

export type BakedTextProtectionDraft = {
  enabled: boolean;
  status: "none" | "detected" | "confirmed" | "skipped";
  blocks: BakedTextBlockRecord[];
  exactText: string;
  positionY: number;
  manualMode: boolean;
  remoteWorkingUrl?: string;
  scanBusy?: boolean;
  maskedPreviewUrl?: string;
  contentHash?: string;
  autoScanComplete?: boolean;
  autoScanState?: "idle" | "scanning" | "done";
  needsReview?: boolean;
  reviewOpen?: boolean;
  autoProtected?: boolean;
  userSkipped?: boolean;
  interrupted?: boolean;
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

type Props = {
  images: Array<{
    id: string;
    originalFileName: string;
    workingPreviewUrl: string;
    bakedText: BakedTextProtectionDraft;
  }>;
  onChange: (imageId: string, patch: Partial<BakedTextProtectionDraft>) => void;
  onScan: (imageId: string, options?: { force?: boolean }) => Promise<void>;
  onConfirm: (imageId: string) => void;
  onSkipProtection?: (imageId: string) => void;
  isAdmin?: boolean;
  onPreviewMask?: (imageId: string) => Promise<void>;
};

const POSITION_OPTIONS = [
  { value: 0.12, labelKey: "instant.bakedText.posTop" as const },
  { value: 0.5, labelKey: "instant.bakedText.posCenter" as const },
  { value: 0.82, labelKey: "instant.bakedText.posBottom" as const },
];

const ANIMATION_LABEL_KEYS: Record<LockedTextAnimation, string> = {
  none: "instant.lockedText.anim.none",
  "fade-in": "instant.lockedText.anim.fadeIn",
  "slide-up": "instant.lockedText.anim.slideUp",
  "slide-left": "instant.lockedText.anim.slideLeft",
  "slide-right": "instant.lockedText.anim.slideRight",
  typewriter: "instant.lockedText.anim.typewriter",
  "letter-pop": "instant.lockedText.anim.letterPop",
  "word-by-word": "instant.lockedText.anim.wordByWord",
  "scale-in": "instant.lockedText.anim.scaleIn",
};

function updateBlock(
  blocks: BakedTextBlockRecord[],
  blockId: string,
  patch: Partial<BakedTextBlockRecord>
): BakedTextBlockRecord[] {
  return blocks.map((b) =>
    b.id === blockId
      ? {
          ...b,
          ...patch,
          ...(patch.editedText !== undefined ? { confirmed: false } : {}),
        }
      : b
  );
}

function ImageWithOverlays({
  src,
  blocks,
}: {
  src: string;
  blocks: BakedTextBlockRecord[];
}) {
  const visible = blocks.filter((b) => b.kept);
  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
      <Image src={src} alt="" fill className="object-cover" unoptimized sizes="220px" />
      {visible.map((block) => (
        <div
          key={block.id}
          className="pointer-events-none absolute border-2 border-sky-500/90 bg-sky-400/20"
          style={{
            left: `${block.bbox.x * 100}%`,
            top: `${block.bbox.y * 100}%`,
            width: `${block.bbox.width * 100}%`,
            height: `${block.bbox.height * 100}%`,
          }}
          title={block.editedText}
        />
      ))}
    </div>
  );
}

export function BakedTextProtectionPanel({
  images,
  onChange,
  onScan,
  onConfirm,
  onSkipProtection,
  isAdmin,
  onPreviewMask,
}: Props) {
  const t = useActiveTranslator();
  const [expandedManual, setExpandedManual] = useState<Record<string, boolean>>({});

  const visibleImages = useMemo(
    () =>
      images.filter((i) => {
        const bt = i.bakedText;
        return (
          isActiveOcrScanPhase(bt.scanPhase) ||
          bt.scanBusy ||
          bt.autoScanState === "scanning" ||
          bt.enabled ||
          bt.needsReview ||
          bt.status === "confirmed" ||
          bt.scanPhase === "timeout" ||
          bt.scanPhase === "failed" ||
          bt.scanPhase === "interrupted"
        );
      }),
    [images]
  );

  const anyEnabled = useMemo(() => visibleImages.some((i) => i.bakedText.enabled), [visibleImages]);
  const anyAutoProtected = useMemo(
    () => visibleImages.some((i) => i.bakedText.autoProtected),
    [visibleImages]
  );

  if (images.length === 0 || visibleImages.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-4 rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
      <div>
        <p className="text-sm font-semibold text-sky-950">{t("instant.textIntegration.blocksTitle")}</p>
        <p className="mt-1 text-xs leading-relaxed text-sky-900/90">{t("instant.textIntegration.blocksIntro")}</p>
        <p className="mt-2 text-xs text-sky-800/80">{t("instant.bakedText.promptOnlyWarning")}</p>
        {anyAutoProtected ? (
          <p className="mt-2 text-xs font-medium text-emerald-800">
            {t("instant.bakedText.autoProtectedNotice")}
          </p>
        ) : null}
      </div>

      {visibleImages.map((image, index) => {
        const bt = image.bakedText;
        const showManual = expandedManual[image.id] ?? bt.manualMode;
        const isScanning =
          isActiveOcrScanPhase(bt.scanPhase) || bt.scanBusy || bt.autoScanState === "scanning";
        const showTimeoutActions =
          bt.scanPhase === "timeout" ||
          bt.scanPhase === "failed" ||
          bt.scanPhase === "interrupted";
        const showReview =
          bt.blocks.length > 0 &&
          (bt.status !== "confirmed" || bt.reviewOpen === true || !bt.autoProtected);
        const keptCount = bt.blocks.filter((b) => b.kept !== false).length;
        const isTextDense = classifyOcrTextDensity(keptCount) === "text_dense";
        const heroCount = countHeroReprojectBlocks(bt.blocks);
        return (
          <div key={image.id} className="rounded-xl border border-sky-200/80 bg-white p-3">
            <p className="text-xs font-semibold text-zinc-700">
              {t("instant.bakedText.image")} #{index + 1} · {image.originalFileName}
            </p>

            <InstantOcrStatusLine bakedText={bt} isAdmin={isAdmin} />

            {showTimeoutActions && onSkipProtection ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-sky-800 px-3 py-1.5 text-xs font-semibold text-white"
                  onClick={() => void onScan(image.id, { force: true })}
                >
                  {t("instant.bakedText.scanRescan")}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-950"
                  onClick={() => onSkipProtection(image.id)}
                >
                  {t("instant.bakedText.continueWithoutProtection")}
                </button>
              </div>
            ) : null}

            {onSkipProtection && bt.enabled && !isScanning && !showTimeoutActions ? (
              <button
                type="button"
                className="mt-2 text-[11px] text-amber-800 underline"
                onClick={() => onSkipProtection(image.id)}
              >
                {t("instant.bakedText.skipImageWarning")}
              </button>
            ) : null}

            {!isScanning ? (
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={bt.enabled}
                onChange={(e) =>
                  onChange(image.id, {
                    enabled: e.target.checked,
                    status: e.target.checked ? bt.status : "none",
                  })
                }
              />
              <span>{t("instant.bakedText.enable")}</span>
            </label>
            ) : null}

            {bt.enabled && !isScanning ? (
              <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={bt.scanBusy}
                    className="rounded-lg bg-sky-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    onClick={() => void onScan(image.id, { force: true })}
                  >
                    {bt.scanBusy
                      ? t("instant.bakedText.scanning")
                      : bt.autoScanComplete
                        ? t("instant.bakedText.scanRescan")
                        : t("instant.bakedText.scanAuto")}
                  </button>
                  {bt.blocks.length > 0 && bt.status !== "confirmed" ? (
                    <button
                      type="button"
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900"
                      onClick={() => onConfirm(image.id)}
                    >
                      {t("instant.bakedText.confirmProtect")}
                    </button>
                  ) : null}
                  {bt.autoProtected && bt.status === "confirmed" && !showReview ? (
                    <button
                      type="button"
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700"
                      onClick={() => onChange(image.id, { reviewOpen: true })}
                    >
                      {t("instant.bakedText.reviewOptional")}
                    </button>
                  ) : null}
                  {isAdmin && onPreviewMask && bt.blocks.some((b) => b.kept) ? (
                    <button
                      type="button"
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700"
                      onClick={() => void onPreviewMask(image.id)}
                    >
                      {t("instant.bakedText.adminPreviewMask")}
                    </button>
                  ) : null}
                </div>

                {bt.autoProtected && bt.status === "confirmed" ? (
                  <p className="text-xs font-medium text-emerald-800">
                    {t("instant.bakedText.autoProtectedImage")}
                  </p>
                ) : bt.status === "confirmed" ? (
                  <p className="text-xs font-medium text-emerald-800">{t("instant.bakedText.confirmed")}</p>
                ) : showReview ? (
                  <p className="text-xs text-amber-800">{t("instant.bakedText.reviewBlocks")}</p>
                ) : null}

                {showReview && isTextDense ? (
                  <p className="text-xs font-medium text-amber-900">
                    {t("instant.bakedText.textDenseHint")}
                  </p>
                ) : null}

                {showReview && heroCount > 0 ? (
                  <p className="text-[11px] text-zinc-600">
                    {t("instant.bakedText.heroCount", {
                      count: String(heroCount),
                      max: String(MAX_HERO_OVERLAYS_PER_IMAGE),
                    })}
                  </p>
                ) : null}

                {showReview ? (
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
                    <ImageWithOverlays src={image.workingPreviewUrl} blocks={bt.blocks} />
                    <div className="space-y-2">
                      {bt.blocks.map((block) => (
                        <div
                          key={block.id}
                          className="rounded-lg border border-zinc-200 p-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="flex items-center gap-2 text-xs font-medium text-zinc-700">
                              <input
                                type="checkbox"
                                checked={block.kept}
                                onChange={(e) =>
                                  onChange(image.id, {
                                    blocks: updateBlock(bt.blocks, block.id, {
                                      kept: e.target.checked,
                                    }),
                                  })
                                }
                              />
                              {t("instant.bakedText.keepBlock")}
                            </label>
                            <span className="text-[10px] text-zinc-500">
                              {Math.round(block.confidence * 100)}%
                            </span>
                          </div>
                          <textarea
                            className="mt-2 w-full rounded-md border border-zinc-200 px-2 py-1 text-xs"
                            rows={2}
                            value={block.editedText}
                            onChange={(e) =>
                              onChange(image.id, {
                                blocks: updateBlock(bt.blocks, block.id, {
                                  editedText: e.target.value,
                                }),
                              })
                            }
                          />
                          <label className="mt-2 flex items-start gap-2 text-[11px] font-medium text-zinc-700">
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={block.reprojectInVideo === true}
                              disabled={
                                !block.kept ||
                                (!block.reprojectInVideo &&
                                  !canEnableHeroReproject(bt.blocks, block.id))
                              }
                              onChange={(e) =>
                                onChange(image.id, {
                                  blocks: updateBlock(bt.blocks, block.id, {
                                    reprojectInVideo: e.target.checked,
                                  }),
                                })
                              }
                            />
                            <span>
                              {t("instant.bakedText.reprojectInVideo")}
                              {!block.reprojectInVideo &&
                              !canEnableHeroReproject(bt.blocks, block.id) ? (
                                <span className="mt-0.5 block font-normal text-amber-800">
                                  {t("instant.bakedText.heroMaxReached", {
                                    max: String(MAX_HERO_OVERLAYS_PER_IMAGE),
                                  })}
                                </span>
                              ) : null}
                            </span>
                          </label>
                          <label className="mt-2 block text-[11px] font-medium text-zinc-600">
                            {t("instant.lockedText.animation")}
                            <select
                              className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1 text-xs"
                              value={block.animation}
                              onChange={(e) =>
                                onChange(image.id, {
                                  blocks: updateBlock(bt.blocks, block.id, {
                                    animation: e.target.value as LockedTextAnimation,
                                  }),
                                })
                              }
                            >
                              {LOCKED_TEXT_ANIMATIONS.map((anim) => (
                                <option key={anim} value={anim}>
                                  {t(ANIMATION_LABEL_KEYS[anim] as never)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            className="mt-1 text-[10px] text-red-700 underline"
                            onClick={() =>
                              onChange(image.id, {
                                blocks: bt.blocks.filter((b) => b.id !== block.id),
                              })
                            }
                          >
                            {t("instant.bakedText.removeBlock")}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : !isScanning ? (
                  <p className="text-[11px] text-zinc-500">{t("instant.bakedText.scanHint")}</p>
                ) : null}

                {bt.maskedPreviewUrl ? (
                  <div>
                    <p className="text-[11px] font-medium text-zinc-600">
                      {t("instant.bakedText.adminPreviewLabel")}
                    </p>
                    <a
                      href={bt.maskedPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-sky-800 underline"
                    >
                      {t("instant.bakedText.openMaskedPreview")}
                    </a>
                  </div>
                ) : null}

                <button
                  type="button"
                  className="text-xs text-zinc-600 underline"
                  onClick={() =>
                    setExpandedManual((prev) => ({
                      ...prev,
                      [image.id]: !showManual,
                    }))
                  }
                >
                  {showManual
                    ? t("instant.bakedText.hideManual")
                    : t("instant.bakedText.showManual")}
                </button>

                {showManual ? (
                  <div className="space-y-2 rounded-lg border border-dashed border-zinc-200 p-2">
                    <p className="text-[11px] text-zinc-500">{t("instant.bakedText.manualHint")}</p>
                    <textarea
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      rows={2}
                      value={bt.exactText}
                      placeholder={t("instant.bakedText.exactTextPlaceholder")}
                      onChange={(e) =>
                        onChange(image.id, { exactText: e.target.value, manualMode: true })
                      }
                    />
                    <select
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      value={String(bt.positionY)}
                      onChange={(e) =>
                        onChange(image.id, {
                          positionY: Number.parseFloat(e.target.value),
                          manualMode: true,
                        })
                      }
                    >
                      {POSITION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={String(opt.value)}>
                          {t(opt.labelKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            ) : !isScanning ? (
              <p className="mt-2 text-[11px] text-zinc-500">{t("instant.bakedText.skipHint")}</p>
            ) : null}
          </div>
        );
      })}

      {anyEnabled ? (
        <p className="text-[11px] text-zinc-600">{t("instant.bakedText.checkoutHint")}</p>
      ) : null}
    </div>
  );
}
