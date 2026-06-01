"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckoutScanGateDialog } from "@/components/instant/checkout-scan-gate-dialog";
import { InstantWizardContent } from "@/components/instant/instant-wizard-content";
import { InstantWizardFooter } from "@/components/instant/instant-wizard-footer";
import { InstantWizardResetDialog } from "@/components/instant/instant-wizard-reset-dialog";
import { InstantWizardShell } from "@/components/instant/instant-wizard-shell";
import { InstantWizardToast } from "@/components/instant/instant-wizard-toast";
import { isActiveOcrScanPhase } from "@/lib/instant-ocr-scan";
import { useInstantOcrAutoScan } from "@/hooks/use-instant-ocr-auto-scan";
import { useInstantWizardPersist } from "@/hooks/use-instant-wizard-persist";
import {
  purgeAllInstantWizardUploadPersistence,
  purgeInstantWizardImagePersistence,
  revokeWizardImagePreviewUrls,
} from "@/lib/instant-wizard-image-cleanup";
import { safeIndexedDbSet } from "@/lib/instant-premium-wizard-storage";
import { isRenderableImageUrl } from "@/lib/is-valid-http-url";
import { useMounted } from "@/hooks/use-mounted";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import type { BakedTextProtectionDraft } from "@/components/instant/baked-text-protection-panel";
import { AnimationStylePanel } from "@/components/instant/animation-style-panel";
import { AnimationMoodPanel } from "@/components/instant/animation-mood-panel";
import { AdvancedCreatorSettingsPanel } from "@/components/instant/advanced-creator-settings-panel";
import {
  applyAnimationStyleToPosterSettings,
  getAnimationStyle,
  normalizeAnimationStyleId,
} from "@/lib/animation-style-presets";
import { getAnimationStyleIdentity } from "@/lib/animation-style-identity";
import {
  ANIMATION_MOOD_PRESETS,
  applyMoodToPosterSettings,
  normalizeAnimationMoodId,
} from "@/lib/animation-mood-presets";
import {
  CREATOR_WIZARD_STEP_COUNT,
  creatorWizardStepTitleKey,
} from "@/lib/creator-wizard-steps";
import {
  DEFAULT_OVERLAY_STYLE,
  DEFAULT_TEXT_RENDER_MODE,
} from "@/components/instant/text-integration-panel";
import type { OverlayStyle, TextRenderMode } from "@/lib/hybrid-motion-overlay";
import type { PosterMotionSettings } from "@/lib/poster-motion-preserve";
import type { LockedTextLayerDraft } from "@/components/instant/locked-text-layers-editor";
import { buildInstantPremiumBakedTextSnapshot } from "@/lib/build-instant-premium-baked-text-snapshot";
import {
  hasUnfinishedWizardDraftContent,
  isInstantWizardProjectSnapshotComplete,
} from "@/lib/project-display-status";
import {
  getInstantWizardFormDefaults,
  INSTANT_WIZARD_DEFAULT_BAKED_TEXT,
  isInstantWizardVideoProcessingActive,
  readActiveWizardProjectSnapshot,
  resetInstantPremiumWizard,
} from "@/lib/reset-instant-premium-wizard";
import {
  createLockedTextLayer,
  type TextImplyingChipId,
} from "@/lib/locked-text-layer";
import {
  type InstantPremiumContinuityStrength,
  type InstantPremiumChipId,
  type InstantPremiumStylePreset,
} from "@/lib/instant-premium-prompt";
import { brand } from "@/lib/brand";
import { writeActiveInstantProjectId } from "@/lib/instant-premium-progress-cache";
import {
  getClientImagePreprocessOptionsForRole,
  preprocessImageFile,
} from "@/lib/image-preprocess";
import { MAX_RAW_ANIMATION_IMAGE_BYTES } from "@/lib/animation-upload-limits";
import { getMaxWorkingImageBytesForUploadRole } from "@/lib/media-export-constants";
import {
  ImageUploadError,
  postWizardImageUpload,
} from "@/lib/instant-image-upload-client";
import {
  formatInstantPremiumPriceEur,
  MIN_INSTANT_PREMIUM_IMAGES,
} from "@/lib/instant-premium-pricing";
import { resolveInstantPremiumOutputPlan } from "@/lib/instant-premium-output-plan";
import {
  maxImagesForInstantMode,
  type InstantMode,
  type InstantTransitionSeconds,
} from "@/lib/instant-premium-mode-types";
import {
  InstantModePanel,
  type InstantSceneTextDraft,
} from "@/components/instant/instant-mode-panel";
import type {
  CreateAnimationProjectImageInput,
  InstantPremiumCreateAndGenerateErrorBody,
  InstantPremiumCreateAndGenerateOkBody,
  UploadImageResponse,
} from "@/types/animation-api";

function extractInstantPremiumCreateProjectId(body: unknown, pageOrigin: string): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const o = body as Record<string, unknown>;
  const rawId = o.projectId;
  if (typeof rawId === "string" && rawId.trim()) {
    return rawId.trim();
  }
  const route = o.progressRoute;
  if (typeof route !== "string" || !route.trim()) {
    return null;
  }
  const trimmed = route.trim();
  try {
    const url = trimmed.startsWith("http") ? new URL(trimmed) : new URL(trimmed, pageOrigin);
    const id = url.searchParams.get("projectId")?.trim();
    return id && id.length > 0 ? id : null;
  } catch {
    const q = trimmed.indexOf("?");
    if (q < 0) {
      return null;
    }
    const id = new URLSearchParams(trimmed.slice(q + 1)).get("projectId")?.trim();
    return id && id.length > 0 ? id : null;
  }
}

const MIN_IMAGES = MIN_INSTANT_PREMIUM_IMAGES;
const ORDER_ROLE_KEY_SUFFIXES = ["start", "detail", "context", "extra", "end"] as const;

type LocalImage = {
  id: string;
  originalFileName: string;
  workingPreviewUrl: string;
  thumbnailPreviewUrl: string;
  mimeType: string;
  sizeBytes: number;
  optimizedBlob: Blob;
  thumbnailBlob: Blob;
  bakedText: BakedTextProtectionDraft;
  remoteWorkingUrl?: string;
  remoteThumbnailUrl?: string;
  remoteStorageKey?: string;
};

const AUTO_SCAN_DEBOUNCE_MS = 450;

function SortableThumb({
  item,
  index,
  roleLabel,
  dragLabel,
}: {
  item: LocalImage;
  index: number;
  roleLabel: string;
  dragLabel: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative w-[100px] shrink-0 snap-center sm:w-[120px] ${
        isDragging ? "z-20 opacity-90" : ""
      }`}
    >
      <div className="rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-zinc-100">
          {isRenderableImageUrl(item.workingPreviewUrl) ? (
            <Image
              src={item.workingPreviewUrl}
              alt=""
              fill
              className="object-cover"
              sizes="120px"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-zinc-500">
              —
            </div>
          )}
        </div>
        <button
          type="button"
          className="mt-2 w-full touch-none rounded-lg bg-zinc-900 py-2 text-[11px] font-medium text-white active:bg-zinc-700"
          {...attributes}
          {...listeners}
        >
          {dragLabel}
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] font-semibold text-zinc-500">
        {index + 1} · {roleLabel}
      </p>
    </div>
  );
}

export default function InstantPremiumPage() {
  const router = useRouter();
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const session = useAuthSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wizardShellRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<LocalImage[]>([]);
  const [error, setError] = useState("");
  const [preflightNotice, setPreflightNotice] = useState("");
  const [stylePreset, setStylePreset] = useState<InstantPremiumStylePreset>("food_promo");
  const [motionText, setMotionText] = useState("");
  const [continuityStrength, setContinuityStrength] =
    useState<InstantPremiumContinuityStrength>("balanced");
  const [chips, setChips] = useState<(InstantPremiumChipId | TextImplyingChipId)[]>([]);
  const [lockedTextMode, setLockedTextMode] = useState(true);
  const [textRenderMode, setTextRenderMode] = useState<TextRenderMode>(DEFAULT_TEXT_RENDER_MODE);
  const [hybridOverlayStyle, setHybridOverlayStyle] = useState<OverlayStyle>(DEFAULT_OVERLAY_STYLE);
  const [posterMotionSettings, setPosterMotionSettings] = useState<PosterMotionSettings>(() =>
    applyAnimationStyleToPosterSettings("cartoon_animation")
  );
  const [lockedTextLayers, setLockedTextLayers] = useState<LockedTextLayerDraft[]>([]);
  const [chipTextBySlot, setChipTextBySlot] = useState<Partial<Record<TextImplyingChipId, string>>>({});
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [instantMode, setInstantMode] = useState<InstantMode>("transition");
  const [transitionSeconds, setTransitionSeconds] = useState<InstantTransitionSeconds>(5);
  const [sceneTexts, setSceneTexts] = useState<InstantSceneTextDraft[]>([]);
  const [fastRenderMode, setFastRenderMode] = useState(false);
  const [checkoutGateOpen, setCheckoutGateOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [wizardReady, setWizardReady] = useState(false);
  const imagesRef = useRef<LocalImage[]>([]);
  const autoScanDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    wizardShellRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);
  const mounted = useMounted();
  const premiumMode = useMemo<"test" | "paid">(() => {
    if (!mounted || typeof document === "undefined") {
      return "test";
    }
    return document.body.dataset.instantPremiumMode === "paid" ? "paid" : "test";
  }, [mounted]);
  const isAdmin = session.user?.role?.trim() === "admin";

  const maxImages = maxImagesForInstantMode(instantMode);
  const outputPlan = useMemo(
    () =>
      resolveInstantPremiumOutputPlan({
        imageCount: images.length,
        instantMode,
        transitionSeconds,
      }),
    [images.length, instantMode, transitionSeconds]
  );
  const estimatedPriceLabel = useMemo(
    () =>
      formatInstantPremiumPriceEur(Math.max(MIN_IMAGES, images.length), locale === "nl" ? "nl" : "en", {
        durationSeconds: outputPlan.totalDurationSeconds,
        transitionSeconds,
      }),
    [images.length, locale, outputPlan.totalDurationSeconds, transitionSeconds]
  );

  const usesFreeGeneration = premiumMode === "test" || isAdmin;

  const buildValidationPayload = useCallback((): Record<string, unknown> | null => {
    if (images.length < MIN_IMAGES) {
      return null;
    }
    const plan = resolveInstantPremiumOutputPlan({
      imageCount: images.length,
      instantMode,
      transitionSeconds,
    });
    return {
      instantMode,
      instantTransitionSeconds: transitionSeconds,
      instantSceneTexts: sceneTexts.slice(0, images.length),
      images: images.map((img) => {
        const url = img.remoteWorkingUrl ?? img.workingPreviewUrl;
        return {
          fileName: img.originalFileName,
          previewUrl: url,
          workingImageUrl: img.remoteWorkingUrl ?? url,
          mimeType: img.mimeType,
          sizeBytes: img.sizeBytes,
          ...(() => {
            const snapshot = buildInstantPremiumBakedTextSnapshot(img.bakedText);
            return snapshot ? { bakedTextProtection: snapshot } : {};
          })(),
        };
      }),
      stylePreset,
      duration: plan.totalDurationSeconds,
      aspectRatio,
      uiLanguage: locale,
      userIntent: motionText.trim() || null,
      selectedChips: isAdmin ? chips : [],
      continuityStrength,
      lockedTextMode,
      textRenderMode,
      hybridOverlayStyle,
      posterMotionSettings,
    };
  }, [
    images,
    stylePreset,
    aspectRatio,
    locale,
    motionText,
    isAdmin,
    chips,
    continuityStrength,
    lockedTextMode,
    textRenderMode,
    hybridOverlayStyle,
    posterMotionSettings,
    instantMode,
    transitionSeconds,
    sceneTexts,
  ]);

  const animationMood = normalizeAnimationMoodId(posterMotionSettings.animationMood) ?? null;
  const activeStyleVisual = useMemo(
    () =>
      getAnimationStyleIdentity(
        normalizeAnimationStyleId(posterMotionSettings.animationStyleId)
      ).visual,
    [posterMotionSettings.animationStyleId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    setImages((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) {
        return items;
      }
      return arrayMove(items, oldIndex, newIndex);
    });
  }, []);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      const room = maxImages - images.length;
      if (room <= 0) {
        setError(t("instant.errors.maxImages", { max: maxImages }));
        return;
      }
      const take = list.slice(0, room);
      const role = session.user?.role?.trim() || "user";
      const oversized = take.filter((f) => f.size > MAX_RAW_ANIMATION_IMAGE_BYTES).length;
      const safe = take.filter(
        (f) => f.size <= MAX_RAW_ANIMATION_IMAGE_BYTES && f.type.startsWith("image/")
      );
      if (safe.length === 0) {
        setError(
          oversized > 0
            ? t("instant.errors.fileTooLarge")
            : t("instant.errors.invalidImageType")
        );
        return;
      }
      setError("");
      try {
        const processed = await Promise.all(
          safe.map(async (file) => {
            const p = await preprocessImageFile(file, getClientImagePreprocessOptionsForRole(role));
            const id = `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 9)}`;
            return {
              id,
              originalFileName: file.name,
              optimizedBlob: p.optimizedBlob,
              thumbnailBlob: p.thumbnailBlob,
              workingPreviewUrl: URL.createObjectURL(p.optimizedBlob),
              thumbnailPreviewUrl: URL.createObjectURL(p.thumbnailBlob),
              mimeType: p.mimeType,
              sizeBytes: p.optimizedBlob.size,
              bakedText: { ...INSTANT_WIZARD_DEFAULT_BAKED_TEXT },
            } satisfies LocalImage;
          })
        );
        setImages((prev) => {
          const updated = [...prev, ...processed];
          setSceneTexts((st) => {
            const next = [...st];
            while (next.length < updated.length) {
              next.push({ title: "", subtitle: "" });
            }
            return next.slice(0, updated.length);
          });
          return updated;
        });
        for (const img of processed) {
          void safeIndexedDbSet(img.id, img.optimizedBlob, img.thumbnailBlob);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        const maxMb =
          Math.round((getMaxWorkingImageBytesForUploadRole(role) / (1024 * 1024)) * 10) / 10;
        setError(
          msg.includes("too large")
            ? t("instant.errors.autoOptimized")
            : t("instant.errors.processFailed", { max: maxMb })
        );
      }
    },
    [images.length, maxImages, session.user?.role, t]
  );

  const updateBakedText = useCallback((imageId: string, patch: Partial<BakedTextProtectionDraft>) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, bakedText: { ...img.bakedText, ...patch } } : img
      )
    );
  }, []);

  const uploadOcrBlob = useCallback(
    async (img: LocalImage, ocrBlob: Blob): Promise<UploadImageResponse> => {
      const formData = new FormData();
      formData.append(
        "workingImage",
        new File([ocrBlob], `ocr-${img.id}.jpg`, { type: "image/jpeg" })
      );
      formData.append(
        "thumbnailImage",
        new File([img.thumbnailBlob], `thumb-${img.id}`, { type: img.mimeType })
      );
      formData.append("originalFileName", img.originalFileName);
      formData.append("mimeType", "image/jpeg");
      formData.append("sizeBytes", String(ocrBlob.size));
      formData.append("clientUploadId", `${img.id}-ocr`);
      let payload: UploadImageResponse;
      try {
        payload = await postWizardImageUpload(formData);
      } catch (error) {
        if (error instanceof ImageUploadError) {
          const err = new Error(error.message);
          (err as Error & { uploadDetail?: { code: string; requestId?: string } }).uploadDetail = {
            code: error.code,
            requestId: error.requestId,
          };
          throw err;
        }
        throw error;
      }
      setImages((prev) =>
        prev.map((row) =>
          row.id === img.id
            ? {
                ...row,
                bakedText: {
                  ...row.bakedText,
                  remoteWorkingUrl: payload.workingImageUrl,
                },
              }
            : row
        )
      );
      return payload;
    },
    []
  );

  const uploadToBlob = useCallback(async (img: LocalImage): Promise<UploadImageResponse> => {
    const formData = new FormData();
    formData.append(
      "workingImage",
      new File([img.optimizedBlob], `working-${img.id}`, { type: img.mimeType })
    );
    formData.append(
      "thumbnailImage",
      new File([img.thumbnailBlob], `thumb-${img.id}`, { type: img.mimeType })
    );
    formData.append("originalFileName", img.originalFileName);
    formData.append("mimeType", img.mimeType);
    formData.append("sizeBytes", String(img.sizeBytes));
    formData.append("clientUploadId", img.id);
    try {
      const payload = await postWizardImageUpload(formData);
      setImages((prev) =>
        prev.map((row) =>
          row.id === img.id
            ? {
                ...row,
                remoteWorkingUrl: payload.workingImageUrl,
                remoteThumbnailUrl: payload.thumbnailUrl,
                remoteStorageKey: payload.workingStorageKey,
                bakedText: { ...row.bakedText, remoteWorkingUrl: payload.workingImageUrl },
              }
            : row
        )
      );
      return payload;
    } catch (error) {
      setImages((prev) =>
        prev.map((row) =>
          row.id === img.id
            ? {
                ...row,
                remoteWorkingUrl: undefined,
                remoteThumbnailUrl: undefined,
                bakedText: { ...row.bakedText, remoteWorkingUrl: undefined },
              }
            : row
        )
      );
      throw error;
    }
  }, []);

  const {
    scheduleAutoScans,
    skipTextProtection,
    waitForPendingScans,
    cancelOcrScanForImage,
    cancelAllOcrScans,
  } = useInstantOcrAutoScan({
    fastRenderMode,
    t: (key, values) => t(key as never, values as never),
    uploadOcrBlob,
    setImages,
    updateBakedText,
  });

  const { persistNow } = useInstantWizardPersist({
    ready: wizardReady,
    step,
    images,
    stylePreset,
    durationSec: outputPlan.totalDurationSeconds,
    motionText,
    continuityStrength,
    chips,
    lockedTextMode,
    lockedTextLayers,
    chipTextBySlot,
    aspectRatio,
    fastRenderMode,
    onHydrated: () => setWizardReady(true),
    onRestore: (saved) => {
      setImages(saved.images);
      setStep(saved.step);
      setStylePreset(saved.stylePreset);
      setMotionText(saved.motionText);
      setContinuityStrength(saved.continuityStrength);
      setChips(saved.chips);
      setLockedTextMode(saved.lockedTextMode);
      setLockedTextLayers(saved.lockedTextLayers);
      setChipTextBySlot(saved.chipTextBySlot);
      setAspectRatio(saved.aspectRatio);
      setFastRenderMode(saved.fastRenderMode);
      setWizardReady(true);
    },
  });

  const removeUploadedImage = useCallback(
    async (im: LocalImage) => {
      cancelOcrScanForImage(im.id);
      await purgeInstantWizardImagePersistence(im);
      setImages((prev) => {
        const index = prev.findIndex((x) => x.id === im.id);
        const next = prev.filter((x) => x.id !== im.id);
        if (index >= 0) {
          setSceneTexts((st) => st.filter((_, i) => i !== index));
        }
        return next;
      });
      await persistNow();
    },
    [cancelOcrScanForImage, persistNow]
  );

  const clearAllUploads = useCallback(async () => {
    for (const im of imagesRef.current) {
      cancelOcrScanForImage(im.id);
      revokeWizardImagePreviewUrls(im);
    }
    setImages([]);
    setSceneTexts([]);
    await purgeAllInstantWizardUploadPersistence();
    await persistNow();
  }, [cancelOcrScanForImage, persistNow]);

  const applyWizardFormDefaults = useCallback(() => {
    const defaults = getInstantWizardFormDefaults();
    setStep(defaults.step);
    setStylePreset(defaults.stylePreset);
    setMotionText(defaults.motionText);
    setContinuityStrength(defaults.continuityStrength);
    setChips(defaults.chips);
    setLockedTextMode(defaults.lockedTextMode);
    setLockedTextLayers(defaults.lockedTextLayers);
    setChipTextBySlot(defaults.chipTextBySlot);
    setAspectRatio(defaults.aspectRatio);
    setFastRenderMode(defaults.fastRenderMode);
    setTextRenderMode(defaults.textRenderMode);
    setHybridOverlayStyle(defaults.hybridOverlayStyle);
    setPosterMotionSettings(defaults.posterMotionSettings);
    setError("");
    setPreflightNotice("");
    setCheckoutGateOpen(false);
  }, []);

  const savedProjectComplete = isInstantWizardProjectSnapshotComplete(
    readActiveWizardProjectSnapshot()
  );

  const hasUnfinishedDraft = useMemo(
    () =>
      hasUnfinishedWizardDraftContent({
        imagesCount: images.length,
        step,
        motionText,
        chipsCount: chips.length,
        lockedTextLayersCount: lockedTextLayers.length,
      }),
    [images.length, step, motionText, chips.length, lockedTextLayers.length]
  );

  const showWizardSecondaryAction =
    mounted && wizardReady && (savedProjectComplete || hasUnfinishedDraft);

  const wizardSecondaryLabel = savedProjectComplete
    ? t("instant.newVideo.button")
    : t("instant.reset.button");

  const resetProcessingWarning = useMemo(
    () =>
      !savedProjectComplete &&
      isInstantWizardVideoProcessingActive({
        checkoutBusy,
        projectSnapshot: readActiveWizardProjectSnapshot(),
      }),
    [checkoutBusy, savedProjectComplete]
  );

  const performWizardReset = useCallback(async () => {
    const startingNewVideoAfterSave = isInstantWizardProjectSnapshotComplete(
      readActiveWizardProjectSnapshot()
    );
    setResetBusy(true);
    try {
      if (autoScanDebounceRef.current) {
        clearTimeout(autoScanDebounceRef.current);
        autoScanDebounceRef.current = null;
      }
      await resetInstantPremiumWizard({
        images: imagesRef.current,
        cancelOcrScanForImage,
        cancelAllOcrScans,
      });
      setImages([]);
      applyWizardFormDefaults();
      await persistNow();
      setResetDialogOpen(false);
      setToastMessage(
        startingNewVideoAfterSave ? t("instant.newVideo.toast") : t("instant.reset.toast")
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      wizardShellRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } finally {
      setResetBusy(false);
    }
  }, [applyWizardFormDefaults, cancelAllOcrScans, cancelOcrScanForImage, persistNow, t]);

  const openWizardSecondaryAction = useCallback(() => {
    if (savedProjectComplete) {
      void performWizardReset();
      return;
    }
    setResetDialogOpen(true);
  }, [savedProjectComplete, performWizardReset]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (fastRenderMode || !wizardReady) {
      return;
    }
    const needsScan = images.filter((img) => {
      const bt = img.bakedText;
      if (isActiveOcrScanPhase(bt.scanPhase) || bt.scanBusy) {
        return false;
      }
      if (bt.userSkipped || bt.scanPhase === "skipped") {
        return false;
      }
      if (
        bt.scanPhase === "failed" ||
        bt.scanPhase === "timeout" ||
        bt.scanPhase === "auto_protected" ||
        bt.scanPhase === "needs_review" ||
        bt.scanPhase === "no_text_found"
      ) {
        return false;
      }
      if (bt.autoScanComplete && bt.scanPhase !== "interrupted") {
        return false;
      }
      return true;
    });
    if (needsScan.length === 0) {
      return;
    }

    if (autoScanDebounceRef.current) {
      clearTimeout(autoScanDebounceRef.current);
    }

    const ids = needsScan.map((img) => img.id);
    autoScanDebounceRef.current = setTimeout(() => {
      scheduleAutoScans(ids);
    }, AUTO_SCAN_DEBOUNCE_MS);

    return () => {
      if (autoScanDebounceRef.current) {
        clearTimeout(autoScanDebounceRef.current);
      }
    };
  }, [fastRenderMode, images, scheduleAutoScans, wizardReady]);

  const runCheckout = useCallback(
    async (skipPendingScans: boolean) => {
    if (images.length < MIN_IMAGES) {
      setError(t("instant.errors.minImages", { min: MIN_IMAGES }));
      return;
    }
    if (!fastRenderMode && !skipPendingScans) {
      const scansDone = await waitForPendingScans(() => imagesRef.current);
      if (!scansDone) {
        setCheckoutGateOpen(true);
        return;
      }
    }
    for (let i = 0; i < images.length; i += 1) {
      const bt = images[i].bakedText;
      if (fastRenderMode || bt.userSkipped || !bt.enabled || bt.status === "skipped") {
        continue;
      }
      if (bt.scanPhase === "timeout" || bt.scanPhase === "failed" || bt.scanPhase === "interrupted") {
        if (bt.needsReview && bt.blocks.length > 0) {
          setError(t("instant.bakedText.errorConfirm", { index: i + 1 }));
          return;
        }
        continue;
      }
      const confirmedTextBlocks = bt.blocks.filter((b) => b.kept && b.confirmed && b.editedText.trim());
      if (confirmedTextBlocks.length > 0) {
        continue;
      }
      if (bt.manualMode && bt.exactText.trim()) {
        continue;
      }
      if (bt.blocks.length > 0) {
        setError(t("instant.bakedText.errorConfirm", { index: i + 1 }));
        return;
      }
      setError(t("instant.bakedText.errorExactText", { index: i + 1 }));
      return;
    }
    setCheckoutBusy(true);
    setError("");
    setPreflightNotice("");
    try {
      const uploaded: CreateAnimationProjectImageInput[] = [];
      for (const img of images) {
        const up = await uploadToBlob(img);
        uploaded.push({
          fileName: img.originalFileName,
          previewUrl: up.thumbnailUrl,
          storageKey: up.workingStorageKey,
          workingImageUrl: up.workingImageUrl,
          mimeType: img.mimeType,
          sizeBytes: img.sizeBytes,
          ...(() => {
            const snapshot = buildInstantPremiumBakedTextSnapshot(img.bakedText);
            return snapshot ? { bakedTextProtection: snapshot } : {};
          })(),
        });
      }
      const explicitLayers = lockedTextLayers
        .filter((l) => l.text.trim())
        .map((l) =>
          createLockedTextLayer({
            id: l.id,
            text: l.text,
            language: l.language,
            x: l.x,
            y: l.y,
            animation: l.animation,
            startMs: l.startMs,
            durationMs: l.durationMs,
            endMs: l.endMs,
            fontFamily: l.fontFamily,
            fontSize: l.fontSize,
            fontWeight: l.fontWeight,
            color: l.color,
            backgroundColor: l.backgroundColor,
            textAlign: l.textAlign,
          })
        );
      const plan = resolveInstantPremiumOutputPlan({
        imageCount: images.length,
        instantMode,
        transitionSeconds,
      });
      const body = {
        images: uploaded,
        instantMode,
        instantTransitionSeconds: transitionSeconds,
        instantSceneTexts: sceneTexts.slice(0, images.length),
        stylePreset,
        duration: plan.totalDurationSeconds,
        aspectRatio,
        uiLanguage: locale,
        userIntent: motionText.trim() || null,
        selectedChips: isAdmin ? chips : [],
        continuityStrength,
        lockedTextMode,
        lockedTextLayers: explicitLayers,
        chipTextBySlot,
        textRenderMode,
        hybridOverlayStyle,
        posterMotionSettings,
      };

      if (!fastRenderMode) {
        const preflightRes = await fetch("/api/instant-premium/preflight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const preflightData = (await preflightRes.json().catch(() => ({}))) as {
          ok?: boolean;
          blockMessage?: string;
          error?: string;
          warnings?: string[];
        };
        if (!preflightRes.ok) {
          const code = (preflightData as { code?: string }).code;
          if (code === "OPENAI_RATE_LIMITED") {
            throw new Error(
              preflightData.error ??
                preflightData.blockMessage ??
                t("instant.preflight.rateLimited")
            );
          }
          throw new Error(
            preflightData.blockMessage ??
              preflightData.error ??
              t("instant.preflight.failed")
          );
        }
        if (preflightData.warnings && preflightData.warnings.length > 0) {
          setPreflightNotice(preflightData.warnings.join(" "));
        }
      }

      if (usesFreeGeneration) {
        const testResponse = await fetch("/api/instant-premium/create-and-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const responseText = await testResponse.text();
        let parsedBody: unknown = null;
        try {
          parsedBody = responseText ? JSON.parse(responseText) : null;
        } catch {
          parsedBody = null;
        }
        console.info(
          "[hc-instant-premium-client]",
          JSON.stringify({
            action: "test_mode_generate_response",
            httpStatus: testResponse.status,
            responseJson: responseText,
          })
        );
        const pageOrigin =
          typeof window !== "undefined" ? window.location.origin : "http://localhost";
        const resolvedProjectId = extractInstantPremiumCreateProjectId(parsedBody, pageOrigin);
        const isAdmin = session.user?.role?.trim() === "admin";
        const adminSuffix =
          isAdmin && responseText.length > 0
            ? ` ${responseText.length > 4000 ? `${responseText.slice(0, 4000)}…` : responseText}`
            : "";

        if (!testResponse.ok) {
          const errBody = parsedBody as Partial<InstantPremiumCreateAndGenerateErrorBody> | null;
          const msg = errBody?.error ?? t("instant.errors.checkoutFailed");
          throw new Error(`${msg}${adminSuffix}`);
        }

        const okBody = parsedBody as Partial<InstantPremiumCreateAndGenerateOkBody> | null;
        if (!resolvedProjectId) {
          throw new Error(`${t("instant.errors.testModeBadResponse")}${adminSuffix}`);
        }

        const progressRoute =
          typeof okBody?.progressRoute === "string" && okBody.progressRoute.trim()
            ? okBody.progressRoute.trim()
            : `/animate/instant/progress?projectId=${encodeURIComponent(resolvedProjectId)}`;

        console.info("[hc-instant-premium]", {
          action: "redirect_to_progress",
          projectId: resolvedProjectId,
          projectType: "instant_premium",
          progressRoute,
        });
        writeActiveInstantProjectId(resolvedProjectId);
        if (okBody?.warnings && okBody.warnings.length > 0) {
          setPreflightNotice(okBody.warnings.join(" "));
        }
        router.push(progressRoute);
        return;
      }

      const res = await fetch("/api/instant-premium/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        projectId?: string;
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? t("instant.errors.checkoutStartFailed"));
      }
      window.location.href = data.url;
    } catch (e) {
      if (e instanceof ImageUploadError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : t("instant.errors.checkoutFailed"));
      }
    } finally {
      setCheckoutBusy(false);
    }
    },
    [
      aspectRatio,
      chipTextBySlot,
      chips,
      continuityStrength,
      fastRenderMode,
      hybridOverlayStyle,
      images,
      locale,
      lockedTextLayers,
      lockedTextMode,
      motionText,
      router,
      session.user,
      stylePreset,
      textRenderMode,
      posterMotionSettings,
      isAdmin,
      t,
      uploadToBlob,
      waitForPendingScans,
      usesFreeGeneration,
      instantMode,
      transitionSeconds,
      sceneTexts,
    ]
  );

  const startCheckout = useCallback(() => {
    void runCheckout(false);
  }, [runCheckout]);

  const handleCheckoutProceedWithoutScans = useCallback(() => {
    setCheckoutGateOpen(false);
    for (const img of imagesRef.current) {
      if (isActiveOcrScanPhase(img.bakedText.scanPhase)) {
        skipTextProtection(img.id);
      }
    }
    void runCheckout(true);
  }, [runCheckout, skipTextProtection]);

  const handleCheckoutWaitForScans = useCallback(() => {
    setCheckoutGateOpen(false);
    void (async () => {
      const done = await waitForPendingScans(() => imagesRef.current);
      if (done) {
        void runCheckout(true);
      } else {
        setCheckoutGateOpen(true);
      }
    })();
  }, [runCheckout, waitForPendingScans]);

  const wizardNav = useMemo(() => {
    const continueLabel = t("instant.common.continue");
    const generateLabel = checkoutBusy
      ? t("instant.step7.preparing")
      : usesFreeGeneration
        ? isAdmin
          ? t("instant.step7.ctaAdminTest")
          : t("instant.step7.ctaTest")
        : t("instant.step7.ctaPaid", { price: estimatedPriceLabel });
    switch (step) {
      case 1:
        return {
          showBack: false,
          backPlaceholder: true,
          onPrimary: () => setStep(2),
          primaryLabel: continueLabel,
          primaryDisabled: images.length < MIN_IMAGES,
          stackButtons: false,
        };
      case 2:
        return {
          showBack: true,
          onBack: () => setStep(1),
          onPrimary: () => setStep(3),
          primaryLabel: continueLabel,
          primaryDisabled: false,
          stackButtons: false,
        };
      case 3:
        return {
          showBack: true,
          onBack: () => setStep(2),
          onPrimary: () => setStep(4),
          primaryLabel: continueLabel,
          primaryDisabled: false,
          stackButtons: false,
        };
      case 4:
        return {
          showBack: true,
          onBack: () => setStep(3),
          onPrimary: () => setStep(5),
          primaryLabel: continueLabel,
          primaryDisabled: false,
          stackButtons: false,
        };
      case 5:
        return {
          showBack: true,
          onBack: () => setStep(4),
          onPrimary: () => void startCheckout(),
          primaryLabel: generateLabel,
          primaryDisabled: checkoutBusy,
          stackButtons: true,
        };
      default:
        return {
          showBack: false,
          backPlaceholder: true,
          onPrimary: () => setStep(2),
          primaryLabel: continueLabel,
          primaryDisabled: true,
          stackButtons: false,
        };
    }
  }, [checkoutBusy, estimatedPriceLabel, images.length, isAdmin, startCheckout, step, t, usesFreeGeneration]);

  if (!session.resolved) {
    return (
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <div className="mx-auto w-full max-w-lg px-4 py-10">
          <AppCard>
            <p className="text-sm text-zinc-600">{t("instant.loading")}</p>
          </AppCard>
        </div>
      </main>
    );
  }

  if (!session.user) {
    return (
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <div className="mx-auto w-full max-w-lg px-4 py-10">
          <AppCard>
            <h1 className="text-xl font-semibold">{t("instant.auth.requiredTitle")}</h1>
            <p className="mt-2 text-sm text-zinc-600">{t("instant.auth.requiredDescription")}</p>
            <div className="mt-6 flex gap-3">
              <GradientButton href="/login">{t("instant.auth.login")}</GradientButton>
              <Link href="/signup" className="text-sm font-medium text-emerald-800 underline">
                {t("instant.auth.signup")}
              </Link>
            </div>
          </AppCard>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen flex-1 ${brand.softGradientBg}`}>
      <div className="mx-auto w-full max-w-lg px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {brand.productName}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{t("instant.title")}</h1>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {showWizardSecondaryAction ? (
              <button
                type="button"
                className={
                  savedProjectComplete
                    ? "rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
                    : "rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
                }
                onClick={openWizardSecondaryAction}
                disabled={resetBusy || checkoutBusy}
              >
                {wizardSecondaryLabel}
              </button>
            ) : null}
            <Link href="/videos" prefetch={false} className="text-xs font-medium text-zinc-600 underline">
              {t("nav.myVideos")}
            </Link>
          </div>
        </div>

        <div className="mb-4 flex gap-1">
          {Array.from({ length: CREATOR_WIZARD_STEP_COUNT }, (_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                mounted && i + 1 <= step ? activeStyleVisual.progressBar : "bg-zinc-200"
              }`}
              title={t(creatorWizardStepTitleKey(i + 1) as never)}
            />
          ))}
        </div>

        {images.some(
          (im) =>
            isActiveOcrScanPhase(im.bakedText.scanPhase) ||
            im.bakedText.scanBusy ||
            im.bakedText.autoScanState === "scanning"
        ) ? (
          <p className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
            {t("instant.bakedText.autoScanChecking")}
          </p>
        ) : null}

        {error ? (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {preflightNotice ? (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {preflightNotice}
          </p>
        ) : null}

        <AdvancedCreatorSettingsPanel
          isAdmin={mounted && isAdmin}
          showAdminDiagnostics={mounted && isAdmin}
          textRenderMode={textRenderMode}
          overlayStyle={hybridOverlayStyle}
          posterMotionSettings={posterMotionSettings}
          aspectRatio={aspectRatio}
          continuityStrength={continuityStrength}
          chips={chips}
          lockedTextMode={lockedTextMode}
          lockedTextLayers={lockedTextLayers}
          fastRenderMode={fastRenderMode}
          onTextRenderModeChange={setTextRenderMode}
          onOverlayStyleChange={setHybridOverlayStyle}
          onPosterMotionSettingsChange={(patch) =>
            setPosterMotionSettings((prev) => ({ ...prev, ...patch }))
          }
          onStylePresetChange={setStylePreset}
          onAspectRatioChange={setAspectRatio}
          onContinuityStrengthChange={setContinuityStrength}
          onChipsChange={setChips}
          onLockedTextModeChange={setLockedTextMode}
          onLockedTextLayersChange={setLockedTextLayers}
          onFastRenderModeChange={setFastRenderMode}
          buildValidationPayload={buildValidationPayload}
        />

        <InstantWizardShell shellRef={wizardShellRef}>
          <InstantWizardContent>
            {step === 1 ? (
              <>
                <InstantModePanel
                  instantMode={instantMode}
                  onInstantModeChange={(mode) => {
                    setInstantMode(mode);
                    const cap = maxImagesForInstantMode(mode);
                    setImages((prev) => {
                      if (prev.length <= cap) {
                        return prev;
                      }
                      const kept = prev.slice(0, cap);
                      for (const removed of prev.slice(cap)) {
                        cancelOcrScanForImage(removed.id);
                        void purgeInstantWizardImagePersistence(removed);
                        revokeWizardImagePreviewUrls(removed);
                      }
                      setSceneTexts((st) => st.slice(0, cap));
                      return kept;
                    });
                  }}
                  transitionSeconds={transitionSeconds}
                  onTransitionSecondsChange={setTransitionSeconds}
                  imageCount={images.length}
                  transitionCount={outputPlan.transitionCount}
                  totalDurationSeconds={outputPlan.totalDurationSeconds}
                  estimatedPriceLabel={estimatedPriceLabel}
                  sceneTexts={sceneTexts}
                  onSceneTextChange={(index, patch) =>
                    setSceneTexts((prev) =>
                      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
                    )
                  }
                />
                <h2 className="mt-6 text-xl font-semibold tracking-tight">
                  {t("instant.creatorStep.upload")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {t("instant.step1.description")}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{t("instant.step1.uploadHint")}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const fl = e.target.files;
                    if (fl) {
                      void addFiles(fl);
                    }
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 w-full rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 py-8 text-sm font-medium text-emerald-900"
                >
                  {t("instant.step1.pick")}
                </button>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {images.map((im) => (
                    <div key={im.id} className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
                      <Image src={im.workingPreviewUrl} alt="" fill className="object-cover" sizes="120px" unoptimized />
                      <button
                        type="button"
                        className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white"
                        onClick={() => void removeUploadedImage(im)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-center text-xs text-zinc-500">
                  {t("instant.step1.counter", { count: images.length, max: maxImages })}
                </p>
                {images.length > 0 ? (
                  <button
                    type="button"
                    className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800"
                    onClick={() => void clearAllUploads()}
                  >
                    {t("instant.step1.clearAll")}
                  </button>
                ) : null}
                {images.length >= MIN_IMAGES && images.length < maxImages ? (
                  <p className="mt-2 text-xs text-zinc-500">{t("instant.step1.extraTransitionHint")}</p>
                ) : null}
                {images.length >= MIN_IMAGES ? (
                  <div className="mt-8 border-t border-zinc-100 pt-6">
                    <p className="text-sm font-medium text-zinc-800">{t("instant.step2.title")}</p>
                    <p className="mt-1 text-xs text-zinc-500">{t("instant.step2.description")}</p>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                      <SortableContext
                        items={images.map((i) => i.id)}
                        strategy={horizontalListSortingStrategy}
                      >
                        <div className="mt-3 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                          {images.map((im, idx) => (
                            <SortableThumb
                              key={im.id}
                              item={im}
                              index={idx}
                              roleLabel={t(
                                `instant.orderRole.${ORDER_ROLE_KEY_SUFFIXES[Math.min(idx, ORDER_ROLE_KEY_SUFFIXES.length - 1)]}` as never
                              )}
                              dragLabel={t("instant.step2.drag")}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                ) : null}
              </>
            ) : null}

            {step === 2 ? (
              <AnimationStylePanel
                settings={posterMotionSettings}
                imageCount={images.length}
                userIntent={motionText}
                imageHints={images.map((im) => im.originalFileName)}
                showSceneHints={isAdmin}
                onStyleChange={(_id, next) => setPosterMotionSettings(next)}
                onStylePresetChange={setStylePreset}
              />
            ) : null}

            {step === 3 ? (
              <AnimationMoodPanel
                value={animationMood}
                onChange={(mood) =>
                  setPosterMotionSettings((prev) => applyMoodToPosterSettings(prev, mood))
                }
              />
            ) : null}

            {step === 4 ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
                    {t("instant.creatorStep.prompt")}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {t("instant.creatorPrompt.intro")}
                  </p>
                </div>
                <textarea
                  value={motionText}
                  onChange={(e) => setMotionText(e.target.value)}
                  rows={5}
                  maxLength={500}
                  placeholder={t("instant.creatorPrompt.placeholder")}
                  className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm"
                />
                <p className="text-right text-xs text-zinc-400">{motionText.length}/500</p>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
                    {t("instant.creatorStep.generate")}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-600">{t("instant.creatorGenerate.intro")}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <p className="text-sm font-semibold text-emerald-950">
                    {outputPlan.mode === "story_multiframe"
                      ? t("instant.outputPlan.storyMode")
                      : outputPlan.mode === "single_transition"
                        ? t("instant.outputPlan.singleTransition", { seconds: transitionSeconds })
                        : t("instant.outputPlan.cinematicStory", { seconds: transitionSeconds })}
                  </p>
                  <p className="mt-1 text-sm text-emerald-900/90">
                    {t("instant.pricing.estimated", { price: estimatedPriceLabel })}
                  </p>
                  {isAdmin ? (
                    <p className="mt-2 text-xs font-medium text-amber-900">
                      {t("instant.pricing.adminTestMode")}
                    </p>
                  ) : null}
                </div>
                <ul className="space-y-2 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 text-sm text-zinc-700">
                  <li>
                    <span className="text-zinc-500">{t("instant.step7.animationStyle")}:</span>{" "}
                    {t(
                      getAnimationStyle(
                        normalizeAnimationStyleId(posterMotionSettings.animationStyleId)
                      ).labelKey as never
                    )}
                  </li>
                  {animationMood ? (
                    <li>
                      <span className="text-zinc-500">{t("instant.step7.mood")}:</span>{" "}
                      {t(ANIMATION_MOOD_PRESETS[animationMood].labelKey as never)}
                    </li>
                  ) : null}
                  <li>
                    <span className="text-zinc-500">{t("instant.step7.duration")}:</span>{" "}
                    {outputPlan.totalDurationSeconds}s
                  </li>
                  <li>
                    <span className="text-zinc-500">{t("instant.step7.format")}:</span> {aspectRatio}
                  </li>
                  <li>
                    <span className="text-zinc-500">{t("instant.step7.images")}:</span> {images.length}
                  </li>
                  <li>
                    <span className="text-zinc-500">{t("instant.outputPlan.transitions")}:</span>{" "}
                    {outputPlan.transitionCount}
                  </li>
                  <li>
                    <span className="text-zinc-500">{t("instant.mode.perTransition")}:</span>{" "}
                    {transitionSeconds}s
                  </li>
                  <li>
                    <span className="text-zinc-500">{t("instant.mode.modeLabel")}:</span>{" "}
                    {instantMode === "story"
                      ? t("instant.mode.story.title")
                      : t("instant.mode.transition.title")}
                  </li>
                </ul>
                <p className="text-xs text-zinc-500">
                  {usesFreeGeneration
                    ? isAdmin
                      ? t("instant.pricing.adminTestMode")
                      : t("instant.step7.testModeHelp")
                    : t("instant.step7.checkoutHelp")}
                </p>
              </div>
            ) : null}
          </InstantWizardContent>

          <InstantWizardFooter
            backLabel={t("instant.common.back")}
            showBack={wizardNav.showBack}
            backPlaceholder={wizardNav.backPlaceholder}
            onBack={wizardNav.onBack}
            secondaryLabel={showWizardSecondaryAction ? wizardSecondaryLabel : undefined}
            onSecondary={showWizardSecondaryAction ? openWizardSecondaryAction : undefined}
            secondaryDisabled={resetBusy || checkoutBusy}
            primaryLabel={wizardNav.primaryLabel}
            onPrimary={wizardNav.onPrimary}
            primaryDisabled={wizardNav.primaryDisabled}
            stackButtons={wizardNav.stackButtons}
          />
        </InstantWizardShell>
      </div>

      <CheckoutScanGateDialog
        open={checkoutGateOpen}
        onWait={handleCheckoutWaitForScans}
        onProceedWithout={handleCheckoutProceedWithoutScans}
        onBackToReview={() => {
          setCheckoutGateOpen(false);
          setStep(2);
        }}
      />

      <InstantWizardResetDialog
        open={resetDialogOpen}
        processingWarning={resetProcessingWarning}
        busy={resetBusy}
        onCancel={() => setResetDialogOpen(false)}
        onConfirm={() => void performWizardReset()}
      />

      <InstantWizardToast message={toastMessage} />
    </main>
  );
}
