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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense, type SetStateAction } from "react";
import {
  InstantAssistantPrefillApplier,
  applyAssistantPrefillToInstantMotion,
} from "@/components/assistant/instant-assistant-prefill-applier";
import { MotionActionPresetMotionReadyPrompt } from "@/components/instant/motion-action-preset-motion-ready-prompt";
import { shouldPromptMotionReadyForActionPreset } from "@/lib/motion-action-preset-motion-ready";
import type { AssistantPrefillPackage } from "@/types/assistant-prefill";
import { CheckoutScanGateDialog } from "@/components/instant/checkout-scan-gate-dialog";
import { MotionBeginnerCollectShell } from "@/components/motion/motion-beginner-collect-shell";
import { InstantWizardContent } from "@/components/instant/instant-wizard-content";
import { InstantWizardFooter } from "@/components/instant/instant-wizard-footer";
import { InstantWizardResetDialog } from "@/components/instant/instant-wizard-reset-dialog";
import { InstantWizardShell } from "@/components/instant/instant-wizard-shell";
import { InstantWizardToast } from "@/components/instant/instant-wizard-toast";
import { HcMotionBootstrapBridge } from "@/components/projects/hc-motion-bootstrap-bridge";
import { HcInstantProjectBar } from "@/components/projects/hc-instant-project-bar";
import { EditorMotionBootstrapBridge } from "@/components/editor/editor-motion-bootstrap-bridge";
import { EditorMotionBootstrapApply } from "@/components/instant/editor-motion-bootstrap-apply";
import { isActiveOcrScanPhase } from "@/lib/instant-ocr-scan";
import { useInstantOcrAutoScan } from "@/hooks/use-instant-ocr-auto-scan";
import { useInstantWizardPersist } from "@/hooks/use-instant-wizard-persist";
import {
  purgeInstantWizardImagePersistence,
  revokeWizardImagePreviewUrls,
} from "@/lib/instant-wizard-image-cleanup";
import {
  hasValidWizardImageSourceFromLocal,
  registerWizardImageBlobs,
  toWizardPreviewInput,
} from "@/lib/instant-wizard-preview-src";
import type { InstantWizardLocalImage } from "@/lib/instant-wizard-image-model";
import { safeIndexedDbSet } from "@/lib/instant-premium-wizard-storage";
import { resolveRemoteImageSrc } from "@/lib/is-valid-http-url";
import { SafePreviewImage } from "@/components/ui/safe-preview-image";
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
import { InstantWizardModeToggle } from "@/components/instant/instant-wizard-mode-toggle";
import { InstantWizardPricingStrip } from "@/components/instant/instant-wizard-pricing-strip";
import {
  clampWizardStep,
  resolveWizardView,
  wizardStepCount,
  type InstantWizardFlowOptions,
  wizardStepHintKey,
  wizardStepTitleKey,
} from "@/lib/instant-wizard-flow";
import {
  readInstantWizardMode,
  writeInstantWizardMode,
  type InstantWizardMode,
} from "@/lib/instant-wizard-mode";
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
import { buildStudioProjectImportFromWizard } from "@/lib/studio-project-metadata";
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
import { loginHref } from "@/lib/auth-login-href";
import { brand } from "@/lib/brand";
import { growthSidebarLayoutClasses } from "@/lib/growth-sidebar-layout";
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
  MIN_INSTANT_PREMIUM_IMAGES,
  resolveInstantPremiumPricingSummary,
} from "@/lib/instant-premium-pricing";
import { resolveInstantPremiumOutputPlan } from "@/lib/instant-premium-output-plan";
import {
  maxImagesForInstantMode,
  type InstantMode,
  type InstantSceneText,
  type InstantTransitionSeconds,
} from "@/lib/instant-premium-mode-types";
import {
  emptySceneTextDraft,
  InstantModePanel,
  storyDurationDefault,
  type InstantSceneTextDraft,
} from "@/components/instant/instant-mode-panel";
import { StoryboardEditor } from "@/components/instant/storyboard-editor";
import { STORYBOARD_FRAME_SCROLL_INSET_PX } from "@/lib/storyboard-frame-scroll";
import { MotionAudioExportWizardSettings } from "@/components/instant/motion/motion-audio-export-wizard-settings";
import { MotionImportSummaryBanner } from "@/components/instant/motion/motion-import-summary-banner";
import { MotionExecutionReadinessPanel } from "@/components/instant/motion/motion-execution-readiness-panel";
import { MotionExecutionRefreshDiffModal } from "@/components/instant/motion/motion-execution-refresh-diff-modal";
import { mergeMotionAudioExportIntoHandoffStorage } from "@/lib/motion-voice-export";
import type { MotionStudioAudioExportJson } from "@/types/motion-voice-export";
import { MotionBuildDebugBadge } from "@/components/layout/motion-build-debug-badge";
import { MotionFirstRenderConfidencePanel } from "@/components/instant/motion/motion-first-render-confidence-panel";
import { MotionPreRenderQaModal } from "@/components/instant/motion/motion-pre-render-qa-modal";
import { MotionSceneStudioInspector } from "@/components/instant/motion/motion-scene-studio-inspector";
import { MotionSceneSourceBadges } from "@/components/instant/motion/motion-scene-source-badges";
import { resolveMotionSceneSourceBadges } from "@/lib/motion-scene-source-badges";
import { MotionStudioIntelligencePanel } from "@/components/instant/motion/motion-studio-intelligence-panel";
import { fetchMotionHandoffPayload } from "@/lib/studio-motion-handoff-client";
import {
  applyExecutionRefreshFromHandoff,
  mergeHandoffIntoWizardSlots,
  previewExecutionRefreshDiff,
} from "@/lib/refresh-motion-handoff-in-wizard";
import { readPersistedWizardState, writePersistedWizardState } from "@/lib/instant-premium-wizard-storage";
import {
  computeMotionRenderReadiness,
  motionReadinessShouldWarn,
} from "@/lib/compute-motion-render-readiness";
import { resolveMotionStudioIntelligence } from "@/lib/resolve-motion-studio-intelligence";
import { instantSceneTextsFromDrafts } from "@/lib/instant-scene-text-draft";
import {
  assignImagesToSceneSlots,
  clearSceneImageByImageId,
  deleteSceneAt,
  listAttachedImages,
  moveSceneAt,
  moveScenesByImageId,
  patchSceneTextAt,
  patchSceneTextAtWithEmotion,
  syncAutoEmotionsForSceneSlots,
  sceneHasUserText,
  sceneTextsFromSlots,
  trimScenesToCount,
  updateAttachedImagesInSlots,
  type WizardSceneSlot,
} from "@/lib/instant-wizard-scene-slots";
import type { MotionExecutionRefreshDiff } from "@/types/motion-handoff-execution-consumption";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
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

function serializeSceneTextDrafts(
  drafts: InstantSceneTextDraft[],
  sceneCount: number
): InstantSceneText[] {
  return instantSceneTextsFromDrafts(drafts, sceneCount);
}

function sceneSlotsHaveValidImageSources(slots: WizardSceneSlot[]): boolean {
  if (slots.length < MIN_IMAGES) {
    return false;
  }
  const validCount = slots.filter(
    (slot) => slot.image !== null && hasValidWizardImageSourceFromLocal(slot.image)
  ).length;
  if (validCount < MIN_IMAGES) {
    return false;
  }
  return slots.every(
    (slot) => slot.image === null || hasValidWizardImageSourceFromLocal(slot.image)
  );
}

type LocalImage = InstantWizardLocalImage;

const AUTO_SCAN_DEBOUNCE_MS = 450;

function SortableThumb({
  item,
  index,
  roleLabel,
  dragLabel,
  studioBadgeLabel,
}: {
  item: LocalImage;
  index: number;
  roleLabel: string;
  dragLabel: string;
  studioBadgeLabel: string;
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
          {item.imageSource === "studio" ? (
            <span className="absolute left-1 top-1 z-10 rounded bg-[#0067B1] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              {studioBadgeLabel}
            </span>
          ) : null}
          <SafePreviewImage
            image={toWizardPreviewInput(item)}
            alt=""
            fill
            className="object-cover"
            sizes="120px"
          />
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
  const wizardContentRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  const [wizardMode, setWizardMode] = useState<InstantWizardMode>(() =>
    typeof window !== "undefined" ? readInstantWizardMode() : "beginner"
  );
  const [sceneSlots, setSceneSlots] = useState<WizardSceneSlot[]>([]);
  const [error, setError] = useState("");
  const [preflightNotice, setPreflightNotice] = useState("");
  const [stylePreset, setStylePreset] = useState<InstantPremiumStylePreset>("food_promo");
  const [motionText, setMotionText] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
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
  /** `auto` expands the first scene until the user explicitly toggles. */
  const [expandedSceneSelection, setExpandedSceneSelection] = useState<string | null | "auto">(
    "auto"
  );
  const expandedSceneId = useMemo(
    () =>
      expandedSceneSelection === "auto"
        ? (sceneSlots[0]?.sceneId ?? null)
        : expandedSceneSelection,
    [expandedSceneSelection, sceneSlots]
  );
  const [fastRenderMode, setFastRenderMode] = useState(false);
  const [checkoutGateOpen, setCheckoutGateOpen] = useState(false);
  const [hcActionPreset, setHcActionPreset] = useState<
    import("@/types/motion-action-presets").MotionActionPresetMetadata | null
  >(null);
  const [motionReadyPromptDismissed, setMotionReadyPromptDismissed] = useState(false);
  const [motionReadyCharacterFlag, setMotionReadyCharacterFlag] = useState<boolean | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [wizardReady, setWizardReady] = useState(false);
  const [studioHandoffTitle, setStudioHandoffTitle] = useState<string | undefined>();
  const [studioHandoffStoryboardId, setStudioHandoffStoryboardId] = useState<string | null>(
    null
  );
  const [refreshingStudioHandoff, setRefreshingStudioHandoff] = useState(false);
  const [executionRefreshOpen, setExecutionRefreshOpen] = useState(false);
  const [executionRefreshDiff, setExecutionRefreshDiff] = useState<MotionExecutionRefreshDiff | null>(
    null
  );
  const [pendingRefreshPayload, setPendingRefreshPayload] = useState<MotionHandoffPayload | null>(
    null
  );
  const [applyingExecutionRefresh, setApplyingExecutionRefresh] = useState(false);
  const [preRenderQaOpen, setPreRenderQaOpen] = useState(false);
  const [studioIntelligenceRevision, setStudioIntelligenceRevision] = useState(0);
  const [wizardAudioExport, setWizardAudioExport] = useState<MotionStudioAudioExportJson | null>(
    null
  );
  const imagesRef = useRef<LocalImage[]>([]);
  const autoScanDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const images = useMemo(() => listAttachedImages(sceneSlots), [sceneSlots]);
  const sceneTexts = useMemo(() => sceneTextsFromSlots(sceneSlots), [sceneSlots]);
  const attachedImageCount = images.length;

  const setImages = useCallback((action: SetStateAction<LocalImage[]>) => {
    setSceneSlots((slots) =>
      updateAttachedImagesInSlots(slots, (attached) =>
        typeof action === "function" ? action(attached) : action
      )
    );
  }, []);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    wizardShellRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const showStoryboardInUploadStep = wizardMode === "expert";
  const mounted = useMounted();
  const premiumMode = useMemo<"test" | "paid">(() => {
    if (!mounted || typeof document === "undefined") {
      return "test";
    }
    return document.body.dataset.instantPremiumMode === "paid" ? "paid" : "test";
  }, [mounted]);
  const isAdmin = session.user?.role?.trim() === "admin";

  const maxImages = maxImagesForInstantMode(instantMode);
  const sceneCount = Math.max(sceneSlots.length, attachedImageCount);
  const hasStudioImportedScenes = useMemo(
    () => sceneSlots.some((slot) => slot.studioContext),
    [sceneSlots]
  );

  const wizardFlowOptions = useMemo((): InstantWizardFlowOptions => {
    return {
      studioHandoff: hasStudioImportedScenes && wizardMode === "expert",
    };
  }, [hasStudioImportedScenes, wizardMode]);

  const handleWizardModeChange = useCallback(
    (mode: InstantWizardMode) => {
      writeInstantWizardMode(mode);
      setWizardMode(mode);
      const flowOptions: InstantWizardFlowOptions = {
        studioHandoff: hasStudioImportedScenes && mode === "expert",
      };
      setStep((current) => clampWizardStep(mode, current, flowOptions));
    },
    [hasStudioImportedScenes]
  );

  const handleAssistantPrefill = useCallback((pkg: AssistantPrefillPackage) => {
    const patch = applyAssistantPrefillToInstantMotion(pkg);
    if (patch.stylePreset) {
      setStylePreset(patch.stylePreset);
    }
    if (patch.transitionSeconds) {
      setTransitionSeconds(patch.transitionSeconds);
    }
    if (patch.motionText) {
      setMotionText(patch.motionText);
    }
    if (patch.posterMotionSettings) {
      setPosterMotionSettings((prev) => ({
        ...prev,
        ...patch.posterMotionSettings,
      }));
    }
    if (patch.hcActionPreset) {
      setHcActionPreset(patch.hcActionPreset);
      setMotionReadyPromptDismissed(false);
    }
  }, []);

  const showMotionReadyPrompt = useMemo(
    () =>
      shouldPromptMotionReadyForActionPreset({
        actionPresetActive: Boolean(hcActionPreset),
        motionReadyPreferred: true,
        attachedCharacterMotionReady: motionReadyCharacterFlag,
        promptDismissed: motionReadyPromptDismissed,
        hasAttachedImage: images.length > 0,
      }),
    [hcActionPreset, images.length, motionReadyCharacterFlag, motionReadyPromptDismissed]
  );

  const wizardView = useMemo(
    () => resolveWizardView(wizardMode, step, wizardFlowOptions),
    [wizardMode, step, wizardFlowOptions]
  );
  const activeWizardStepCount = wizardStepCount(wizardMode, wizardFlowOptions);
  const activeStudioContext = useMemo(
    () => sceneSlots.find((slot) => slot.sceneId === expandedSceneId)?.studioContext ?? null,
    [sceneSlots, expandedSceneId]
  );
  const activeSceneSourceBadges = useMemo(() => {
    const slot = sceneSlots.find((s) => s.sceneId === expandedSceneId);
    return slot ? resolveMotionSceneSourceBadges(slot) : [];
  }, [sceneSlots, expandedSceneId]);
  const activeStudioSlotMissingImage = useMemo(() => {
    const slot = sceneSlots.find((s) => s.sceneId === expandedSceneId);
    return Boolean(slot?.studioContext && !slot.image);
  }, [sceneSlots, expandedSceneId]);

  const studioIntelligence = useMemo(() => {
    void studioIntelligenceRevision;
    return resolveMotionStudioIntelligence(readPersistedWizardState(), sceneSlots);
  }, [sceneSlots, studioIntelligenceRevision]);

  const motionRenderReadiness = useMemo(
    () =>
      computeMotionRenderReadiness({
        intelligence: studioIntelligence,
        sceneSlots,
      }),
    [studioIntelligence, sceneSlots]
  );
  const showStoryboardComposer =
    instantMode === "story" &&
    (attachedImageCount >= MIN_IMAGES || hasStudioImportedScenes);
  const showStoryboardStep =
    showStoryboardComposer &&
    (wizardView === "storyboard" || (wizardView === "upload" && showStoryboardInUploadStep));
  const showFrameReorder =
    attachedImageCount >= MIN_IMAGES || hasStudioImportedScenes;
  const outputPlan = useMemo(
    () =>
      resolveInstantPremiumOutputPlan({
        imageCount: attachedImageCount >= MIN_IMAGES ? attachedImageCount : sceneCount,
        instantMode,
        transitionSeconds,
        sceneTexts: serializeSceneTextDrafts(sceneTexts, sceneCount),
      }),
    [attachedImageCount, instantMode, sceneCount, transitionSeconds, sceneTexts]
  );
  const pricingSummary = useMemo(
    () =>
      resolveInstantPremiumPricingSummary(
        Math.max(MIN_IMAGES, attachedImageCount >= MIN_IMAGES ? attachedImageCount : sceneCount),
        {
          imageCount: attachedImageCount >= MIN_IMAGES ? attachedImageCount : sceneCount,
          instantMode,
          transitionSeconds,
          sceneTexts: serializeSceneTextDrafts(sceneTexts, sceneCount),
        },
        locale === "nl" ? "nl" : "en",
        session.user?.role?.trim()
      ),
    [attachedImageCount, instantMode, locale, sceneCount, session.user?.role, transitionSeconds, sceneTexts]
  );
  const estimatedPriceLabel = pricingSummary.priceLabel;

  const handleStoryboardSceneChange = useCallback(
    (index: number, patch: Partial<InstantSceneTextDraft>) => {
      setSceneSlots((prev) => patchSceneTextAtWithEmotion(prev, index, patch, instantMode));
    },
    [instantMode]
  );

  const handleStoryboardMoveScene = useCallback((index: number, direction: "up" | "down") => {
    let keepExpandedId: string | undefined;
    setSceneSlots((prev) => {
      keepExpandedId = prev[index]?.sceneId;
      return syncAutoEmotionsForSceneSlots(
        moveSceneAt(prev, index, direction),
        instantMode
      );
    });
    if (keepExpandedId) {
      setExpandedSceneSelection(keepExpandedId);
    }
  }, [instantMode]);

  const handleTransitionSecondsChange = useCallback(
    (seconds: InstantTransitionSeconds) => {
      if (instantMode === "story") {
        const previousPace = storyDurationDefault(transitionSeconds);
        const nextPace = storyDurationDefault(seconds);
        setSceneSlots((rows) => {
          const nonLast = rows.slice(0, -1);
          const allMatchPreviousDefault =
            nonLast.length === 0 ||
            nonLast.every((row) => row.text.transitionDurationSeconds === previousPace);
          if (!allMatchPreviousDefault || previousPace === nextPace) {
            return rows;
          }
          return rows.map((row, index) =>
            index >= rows.length - 1 ?
              row
            : {
                ...row,
                text: {
                  ...row.text,
                  transitionDurationSeconds: nextPace,
                  durationSeconds: nextPace,
                },
              }
          );
        });
      }
      setTransitionSeconds(seconds);
    },
    [instantMode, transitionSeconds]
  );

  const usesFreeGeneration = premiumMode === "test" || isAdmin;

  const imagesHaveValidSources = useMemo(
    () => sceneSlotsHaveValidImageSources(sceneSlots),
    [sceneSlots]
  );

  const buildValidationPayload = useCallback((): Record<string, unknown> | null => {
    if (attachedImageCount < MIN_IMAGES && sceneSlots.length < MIN_IMAGES) {
      return null;
    }
    const plan = resolveInstantPremiumOutputPlan({
      imageCount: attachedImageCount >= MIN_IMAGES ? attachedImageCount : sceneCount,
      instantMode,
      transitionSeconds,
      sceneTexts: serializeSceneTextDrafts(sceneTexts, sceneCount),
    });
    return {
      instantMode,
      instantTransitionSeconds: transitionSeconds,
      instantSceneTexts: serializeSceneTextDrafts(sceneTexts, sceneCount),
      images: images.map((img) => {
        const remoteWorking = resolveRemoteImageSrc(img.remoteWorkingUrl, img.bakedText.remoteWorkingUrl);
        const remoteThumb = resolveRemoteImageSrc(img.remoteThumbnailUrl);
        return {
          fileName: img.originalFileName,
          previewUrl: remoteThumb ?? remoteWorking ?? "",
          workingImageUrl: remoteWorking ?? "",
          mimeType: img.mimeType,
          sizeBytes: img.sizeBytes,
          ...(() => {
            const snapshot = buildInstantPremiumBakedTextSnapshot(img.bakedText);
            return snapshot ? { bakedTextProtection: snapshot } : {};
          })(),
        };
      }),
      stylePreset,
      duration: plan.providerDurationSeconds,
      aspectRatio,
      uiLanguage: locale,
      userIntent: motionText.trim() || null,
      selectedChips: isAdmin ? chips : [],
      continuityStrength,
      lockedTextMode,
      textRenderMode,
      hybridOverlayStyle,
      posterMotionSettings: {
        ...posterMotionSettings,
        ...(hcActionPreset ? { hcActionPreset } : {}),
      },
    };
  }, [
    attachedImageCount,
    images,
    sceneCount,
    sceneTexts,
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
    hcActionPreset,
    instantMode,
    transitionSeconds,
    sceneSlots,
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

  const handleRefreshFromStudio = useCallback(async () => {
    if (!studioHandoffStoryboardId) {
      return;
    }
    setRefreshingStudioHandoff(true);
    setError("");
    const res = await fetchMotionHandoffPayload(studioHandoffStoryboardId);
    setRefreshingStudioHandoff(false);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("motion.handoff.error.loadFailed"));
      return;
    }
    const current = readPersistedWizardState();
    if (!current) {
      setError(t("motion.handoff.error.importFailed"));
      return;
    }
    const diff = previewExecutionRefreshDiff(current, res.data.payload);
    if (!diff.hasChanges) {
      setToastMessage(t("motion.handoff.executionConsumption.refreshNoChanges"));
      return;
    }
    setPendingRefreshPayload(res.data.payload);
    setExecutionRefreshDiff(diff);
    setExecutionRefreshOpen(true);
  }, [studioHandoffStoryboardId, t]);

  const handleApplyExecutionRefresh = useCallback(async () => {
    const current = readPersistedWizardState();
    if (!current || !pendingRefreshPayload) {
      setExecutionRefreshOpen(false);
      return;
    }
    setApplyingExecutionRefresh(true);
    try {
      const merged = applyExecutionRefreshFromHandoff(current, pendingRefreshPayload);
      writePersistedWizardState(merged);
      setInstantMode(merged.instantMode ?? instantMode);
      setTransitionSeconds(merged.transitionSeconds ?? transitionSeconds);
      setSceneSlots((prev) =>
        syncAutoEmotionsForSceneSlots(
          mergeHandoffIntoWizardSlots(
            prev,
            pendingRefreshPayload,
            merged.transitionSeconds ?? transitionSeconds
          ),
          merged.instantMode ?? instantMode
        )
      );
      setMotionText(
        pendingRefreshPayload.description.trim() || pendingRefreshPayload.title.trim()
      );
      setStudioHandoffTitle(pendingRefreshPayload.title);
      setToastMessage(t("motion.handoff.refreshDone"));
      setStudioIntelligenceRevision((n) => n + 1);
      setExecutionRefreshOpen(false);
      setPendingRefreshPayload(null);
      setExecutionRefreshDiff(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("motion.handoff.error.importFailed"));
    } finally {
      setApplyingExecutionRefresh(false);
    }
  }, [instantMode, pendingRefreshPayload, t, transitionSeconds]);

  const onDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    setSceneSlots((slots) =>
      moveScenesByImageId(slots, String(active.id), String(over.id))
    );
  }, []);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      const room = maxImages - attachedImageCount;
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
            const registered = registerWizardImageBlobs(id, p.optimizedBlob, p.thumbnailBlob);
            return {
              id,
              originalFileName: file.name,
              optimizedBlob: p.optimizedBlob,
              thumbnailBlob: p.thumbnailBlob,
              mimeType: p.mimeType,
              sizeBytes: p.optimizedBlob.size,
              bakedText: { ...INSTANT_WIZARD_DEFAULT_BAKED_TEXT },
              previewUnavailable: registered === null,
              imageSource: "manual",
            } satisfies LocalImage;
          })
        );
        setSceneSlots((prev) =>
          syncAutoEmotionsForSceneSlots(
            assignImagesToSceneSlots(prev, processed, transitionSeconds),
            instantMode
          )
        );
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
    [attachedImageCount, maxImages, session.user?.role, t, transitionSeconds]
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
    sceneSlots,
    stylePreset,
    durationSec: outputPlan.providerDurationSeconds,
    motionText,
    continuityStrength,
    chips,
    lockedTextMode,
    lockedTextLayers,
    chipTextBySlot,
    aspectRatio,
    fastRenderMode,
    instantMode,
    transitionSeconds,
    onHydrated: () => setWizardReady(true),
    onRestore: (saved) => {
      setSceneSlots(syncAutoEmotionsForSceneSlots(saved.sceneSlots, saved.instantMode));
      const handoff = readPersistedWizardState()?.studioHandoff;
      setStudioHandoffTitle(handoff?.storyboardTitle);
      setStudioHandoffStoryboardId(handoff?.storyboardId ?? null);
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
      setInstantMode(saved.instantMode);
      setTransitionSeconds(saved.transitionSeconds);
      setWizardReady(true);
    },
  });

  const clearSceneImage = useCallback(
    async (im: LocalImage) => {
      cancelOcrScanForImage(im.id);
      await purgeInstantWizardImagePersistence(im);
      revokeWizardImagePreviewUrls(im);
      setSceneSlots((prev) => clearSceneImageByImageId(prev, im.id));
      await persistNow();
    },
    [cancelOcrScanForImage, persistNow]
  );

  const deleteScene = useCallback(
    async (index: number) => {
      const slot = sceneSlots[index];
      const removedId = slot?.sceneId;
      if (slot?.image) {
        cancelOcrScanForImage(slot.image.id);
        await purgeInstantWizardImagePersistence(slot.image);
        revokeWizardImagePreviewUrls(slot.image);
      }
      setSceneSlots((prev) =>
        syncAutoEmotionsForSceneSlots(deleteSceneAt(prev, index), instantMode)
      );
      if (removedId && expandedSceneId === removedId) {
        setExpandedSceneSelection("auto");
      }
      await persistNow();
    },
    [cancelOcrScanForImage, expandedSceneId, instantMode, persistNow, sceneSlots]
  );

  const handleStoryboardDeleteScene = useCallback(
    (index: number) => {
      if (
        sceneHasUserText(sceneTexts[index] ?? emptySceneTextDraft()) &&
        !window.confirm(t("instant.storyboard.deleteSceneConfirm"))
      ) {
        return;
      }
      void deleteScene(index);
    },
    [deleteScene, sceneTexts, t]
  );

  const handleStoryboardDuplicateFromPrevious = useCallback((index: number) => {
    if (index <= 0) {
      return;
    }
    setSceneSlots((prev) => {
      const source = prev[index - 1]?.text;
      if (!source) {
        return prev;
      }
      return patchSceneTextAt(prev, index, {
        template: source.template,
        heroText: source.heroText,
        title: source.title,
        subtitle: source.subtitle,
        lines: [...source.lines],
        heroFinale: source.heroFinale,
        heroFinaleText: source.heroFinaleText,
        accentWords: source.accentWords,
        overlayLayerStyles: { ...source.overlayLayerStyles },
      });
    });
  }, []);

  const handleStoryboardClearText = useCallback(
    (index: number) => {
      setSceneSlots((prev) =>
        patchSceneTextAt(prev, index, emptySceneTextDraft(transitionSeconds))
      );
    },
    [transitionSeconds]
  );

  const clearAllUploads = useCallback(async () => {
    for (const im of imagesRef.current) {
      cancelOcrScanForImage(im.id);
      revokeWizardImagePreviewUrls(im);
      await purgeInstantWizardImagePersistence(im);
    }
    setSceneSlots((prev) => prev.map((slot) => ({ ...slot, image: null })));
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
        sceneSlotsCount: sceneSlots.length,
        step,
        motionText,
        chipsCount: chips.length,
        lockedTextLayersCount: lockedTextLayers.length,
      }),
    [images.length, sceneSlots.length, step, motionText, chips.length, lockedTextLayers.length]
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
      setSceneSlots([]);
      setExpandedSceneSelection("auto");
      setInstantMode("transition");
      setTransitionSeconds(5);
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
    setPreRenderQaOpen(false);
    if (images.length < MIN_IMAGES) {
      setError(t("instant.errors.minImages", { min: MIN_IMAGES }));
      return;
    }
    if (!imagesHaveValidSources) {
      setError(t("instant.errors.previewExpiredReupload"));
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
        imageCount: attachedImageCount,
        instantMode,
        transitionSeconds,
        sceneTexts: serializeSceneTextDrafts(sceneTexts, sceneCount),
      });
      const wizardState = readPersistedWizardState();
      let studioImport = wizardState ? buildStudioProjectImportFromWizard(wizardState) : null;
      if (studioImport?.handoff && wizardAudioExport) {
        studioImport = {
          ...studioImport,
          handoff: mergeMotionAudioExportIntoHandoffStorage(
            studioImport.handoff as Record<string, unknown>,
            wizardAudioExport
          ),
        };
      }
      const body = {
        images: uploaded,
        instantMode,
        instantTransitionSeconds: transitionSeconds,
        instantSceneTexts: serializeSceneTextDrafts(sceneTexts, sceneCount),
        stylePreset,
        duration: plan.providerDurationSeconds,
        aspectRatio,
        uiLanguage: locale,
        userIntent: motionText.trim() || null,
        ...(projectTitle.trim() ? { title: projectTitle.trim() } : {}),
        selectedChips: isAdmin ? chips : [],
        continuityStrength,
        lockedTextMode,
        lockedTextLayers: explicitLayers,
        chipTextBySlot,
        textRenderMode,
        hybridOverlayStyle,
        posterMotionSettings: {
          ...posterMotionSettings,
          ...(hcActionPreset ? { hcActionPreset } : {}),
        },
        ...(studioImport ? { studioImport } : {}),
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
      imagesHaveValidSources,
      instantMode,
      transitionSeconds,
      sceneSlots,
    ]
  );

  const startCheckoutFlow = useCallback(() => {
    void runCheckout(false);
  }, [runCheckout]);

  const startCheckoutWithQa = useCallback(() => {
    if (hasStudioImportedScenes && motionReadinessShouldWarn(motionRenderReadiness)) {
      setPreRenderQaOpen(true);
      return;
    }
    startCheckoutFlow();
  }, [hasStudioImportedScenes, motionRenderReadiness, startCheckoutFlow]);

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
    const clamped = clampWizardStep(wizardMode, step, wizardFlowOptions);
    const maxStep = wizardStepCount(wizardMode, wizardFlowOptions);
    const canContinueFromUpload = sceneCount >= MIN_IMAGES && imagesHaveValidSources;

    if (wizardView === "generate") {
      return {
        showBack: true,
        onBack: () => setStep(clamped - 1),
        onPrimary: startCheckoutWithQa,
        primaryLabel: generateLabel,
        primaryDisabled: checkoutBusy || !imagesHaveValidSources,
        stackButtons: true,
      };
    }

    if (clamped === 1) {
      return {
        showBack: false,
        backPlaceholder: true,
        onPrimary: () => setStep(2),
        primaryLabel: continueLabel,
        primaryDisabled: !canContinueFromUpload,
        stackButtons: false,
      };
    }

    return {
      showBack: true,
      onBack: () => setStep(clamped - 1),
      onPrimary: () => setStep(Math.min(maxStep, clamped + 1)),
      primaryLabel: continueLabel,
      primaryDisabled: false,
      stackButtons: false,
    };
  }, [
    checkoutBusy,
    estimatedPriceLabel,
    imagesHaveValidSources,
    isAdmin,
    sceneCount,
    startCheckoutWithQa,
    step,
    t,
    usesFreeGeneration,
    wizardFlowOptions,
    wizardMode,
    wizardView,
  ]);

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
              <GradientButton href={loginHref("/animate/instant")}>{t("instant.auth.login")}</GradientButton>
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
    <main className={`${growthSidebarLayoutClasses.pageFloorFlex} ${brand.softGradientBg}`}>
      <EditorMotionBootstrapBridge />
      <HcMotionBootstrapBridge />
      <HcInstantProjectBar />
      <EditorMotionBootstrapApply
        sceneSlots={sceneSlots}
        setSceneSlots={setSceneSlots}
        transitionSeconds={transitionSeconds}
        instantMode={instantMode}
      />
      <div className="mx-auto w-full max-w-xl px-4 py-8 sm:max-w-2xl sm:px-6">
        <MotionBeginnerCollectShell beginnerMode={wizardMode === "beginner"}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {brand.productName}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{t("instant.title")}</h1>
            <p className="mt-1 text-xs text-zinc-500">{t(`instant.wizardStep.${wizardView}` as never)}</p>
            <MotionBuildDebugBadge className="mt-2" />
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <InstantWizardModeToggle
              mode={wizardMode}
              onChange={handleWizardModeChange}
              disabled={checkoutBusy || resetBusy}
            />
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
          {Array.from({ length: activeWizardStepCount }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                mounted && i + 1 <= step ? activeStyleVisual.progressBar : "bg-zinc-200"
              }`}
              title={t(wizardStepTitleKey(wizardMode, i + 1, instantMode, wizardFlowOptions) as never)}
            />
          ))}
        </div>

        <InstantWizardPricingStrip
          estimatedPriceLabel={estimatedPriceLabel}
          imageCount={images.length}
          transitionCount={outputPlan.transitionCount}
          durationSeconds={pricingSummary.providerDurationSeconds}
          isAdminFree={pricingSummary.isAdminFree}
          isAdmin={isAdmin}
          usesFreeGeneration={usesFreeGeneration}
        />

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
          durationDebug={
            instantMode === "story" && images.length >= MIN_IMAGES ?
              {
                storyboardDurationSeconds: outputPlan.storyboardDurationSeconds,
                providerDurationSeconds: outputPlan.providerDurationSeconds,
                durationScale: outputPlan.durationScale,
                segmentCount: outputPlan.providerSegmentCount,
                imageCount: outputPlan.imageCount,
              }
            : null
          }
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

        <Suspense fallback={null}>
          <InstantAssistantPrefillApplier onApply={handleAssistantPrefill} />
        </Suspense>

        {showMotionReadyPrompt ? (
          <MotionActionPresetMotionReadyPrompt
            onDismiss={() => setMotionReadyPromptDismissed(true)}
            onContinue={() => setMotionReadyPromptDismissed(true)}
          />
        ) : null}

        <InstantWizardShell shellRef={wizardShellRef} id="instant-wizard-main">
          <InstantWizardContent contentRef={wizardContentRef}>
            {wizardView === "upload" ? (
              <>
                <InstantModePanel
                  instantMode={instantMode}
                  onInstantModeChange={(mode) => {
                    setInstantMode(mode);
                    const cap = maxImagesForInstantMode(mode);
                    setSceneSlots((prev) => {
                      if (prev.length <= cap) {
                        return prev;
                      }
                      const trimmed = trimScenesToCount(prev, cap);
                      for (const removed of prev.slice(cap)) {
                        if (removed.image) {
                          cancelOcrScanForImage(removed.image.id);
                          void purgeInstantWizardImagePersistence(removed.image);
                          revokeWizardImagePreviewUrls(removed.image);
                        }
                      }
                      return trimmed;
                    });
                  }}
                  transitionSeconds={transitionSeconds}
                  onTransitionSecondsChange={handleTransitionSecondsChange}
                  imageCount={attachedImageCount}
                  frameCount={sceneCount}
                  transitionCount={outputPlan.transitionCount}
                  videoDurationSeconds={pricingSummary.providerDurationSeconds}
                  storyboardDurationSeconds={pricingSummary.storyboardDurationSeconds}
                  perTransitionProviderSeconds={pricingSummary.perTransitionProviderSeconds}
                  estimatedPriceLabel={estimatedPriceLabel}
                  pacingOptionsShareSamePrice={pricingSummary.pacingOptionsShareSamePrice}
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
                      <SafePreviewImage
                        image={toWizardPreviewInput(im)}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="120px"
                      />
                      <button
                        type="button"
                        className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white"
                        onClick={() => void clearSceneImage(im)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-center text-xs text-zinc-500">
                  {t("instant.step1.counter", { count: images.length, max: maxImages })}
                </p>
                {!imagesHaveValidSources && images.length > 0 ? (
                  <p className="mt-2 text-center text-xs text-amber-800">
                    {t("instant.errors.previewExpiredReupload")}
                  </p>
                ) : null}
                {images.length > 0 ? (
                  <button
                    type="button"
                    className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800"
                    onClick={() => void clearAllUploads()}
                  >
                    {t("instant.step1.clearAll")}
                  </button>
                ) : null}
                {attachedImageCount >= MIN_IMAGES && attachedImageCount < maxImages ? (
                  <p className="mt-2 text-xs text-zinc-500">{t("instant.step1.extraTransitionHint")}</p>
                ) : null}
                {showStoryboardInUploadStep && showStoryboardStep ? (
                  <div className="mt-8 border-t border-zinc-100 pt-6">
                    {hasStudioImportedScenes && studioIntelligence ?
                      <div className="mb-4 space-y-3">
                        <MotionImportSummaryBanner
                          intelligence={studioIntelligence}
                          storyboardId={studioHandoffStoryboardId}
                          characterVoiceAssignments={
                            (
                              readPersistedWizardState()?.studioHandoff?.storedHandoff as
                                | { characterVoiceAssignments?: import("@/types/studio-character-voice").CharacterVoiceAssignment[] }
                                | undefined
                            )?.characterVoiceAssignments ?? null
                          }
                          characterPerformanceProfiles={
                            (
                              readPersistedWizardState()?.studioHandoff?.storedHandoff as
                                | {
                                    characterPerformanceProfiles?: import("@/types/studio-character-performance").CharacterPerformanceAssignment[];
                                  }
                                | undefined
                            )?.characterPerformanceProfiles ?? null
                          }
                          storedHandoff={readPersistedWizardState()?.studioHandoff?.storedHandoff}
                          voiceSegments={
                            (
                              readPersistedWizardState()?.studioHandoff?.storedHandoff as
                                | { voiceSegments?: import("@/types/studio-voice-execution").MotionVoiceSegmentHandoff[] }
                                | undefined
                            )?.voiceSegments ?? null
                          }
                          musicPlan={
                            (
                              readPersistedWizardState()?.studioHandoff?.storedHandoff as
                                | { musicPlan?: import("@/types/studio-music-director").MotionMusicHandoffPlan }
                                | undefined
                            )?.musicPlan ?? null
                          }
                          soundPlan={
                            (
                              readPersistedWizardState()?.studioHandoff?.storedHandoff as
                                | { soundPlan?: import("@/types/studio-sound-director").MotionSoundHandoffPlan }
                                | undefined
                            )?.soundPlan ?? null
                          }
                          audioProductionPlan={
                            (
                              readPersistedWizardState()?.studioHandoff?.storedHandoff as
                                | {
                                    audioProductionPlan?: import("@/types/studio-audio-production-director").MotionAudioProductionHandoffPlan;
                                  }
                                | undefined
                            )?.audioProductionPlan ?? null
                          }
                          audioAssetPlan={
                            (
                              readPersistedWizardState()?.studioHandoff?.storedHandoff as
                                | {
                                    audioAssetPlan?: import("@/types/studio-audio-asset-director").MotionAudioAssetHandoffPlan;
                                  }
                                | undefined
                            )?.audioAssetPlan ?? null
                          }
                          voiceIdentityPlan={
                            (
                              readPersistedWizardState()?.studioHandoff?.storedHandoff as
                                | {
                                    voiceIdentityPlan?: import("@/types/studio-voice-identity").MotionVoiceIdentityHandoffPlan;
                                  }
                                | undefined
                            )?.voiceIdentityPlan ?? null
                          }
                          mediaAssetPlan={
                            (
                              readPersistedWizardState()?.studioHandoff?.storedHandoff as
                                | {
                                    mediaAssetPlan?: import("@/types/studio-media-asset").MotionMediaAssetHandoffPlan;
                                  }
                                | undefined
                            )?.mediaAssetPlan ?? null
                          }
                          assetPlacementPlan={
                            (
                              readPersistedWizardState()?.studioHandoff?.storedHandoff as
                                | {
                                    assetPlacementPlan?: import("@/types/studio-asset-placement").MotionAssetPlacementHandoffPlan;
                                  }
                                | undefined
                            )?.assetPlacementPlan ?? null
                          }
                          characterBlockingPlan={
                            (
                              readPersistedWizardState()?.studioHandoff?.storedHandoff as
                                | {
                                    characterBlockingPlan?: import("@/types/studio-character-blocking").MotionCharacterBlockingHandoffPlan;
                                  }
                                | undefined
                            )?.characterBlockingPlan ?? null
                          }
                          onRefresh={
                            studioHandoffStoryboardId
                              ? () => void handleRefreshFromStudio()
                              : undefined
                          }
                          refreshing={refreshingStudioHandoff}
                        />
                        <MotionStudioIntelligencePanel
                          intelligence={studioIntelligence}
                          readiness={motionRenderReadiness}
                        />
                        <MotionAudioExportWizardSettings
                          storedHandoff={readPersistedWizardState()?.studioHandoff?.storedHandoff}
                          value={wizardAudioExport}
                          onChange={setWizardAudioExport}
                        />
                        <p className="text-xs text-violet-800/90">
                          {t("motion.qa.server.persistOnCheckout")}
                        </p>
                      </div>
                    : hasStudioImportedScenes && studioHandoffTitle ?
                      <div className="mb-4 space-y-2">
                        <div className="rounded-xl border border-[#0067B1]/20 bg-[#0067B1]/5 px-4 py-2">
                          <p className="text-xs text-[#0067B1]">
                            {t("motion.handoff.importedBanner", { title: studioHandoffTitle })}
                          </p>
                        </div>
                        {readPersistedWizardState()?.studioHandoff?.executionPrefill ||
                        readPersistedWizardState()?.studioHandoff?.executionConsumption ?
                          <MotionExecutionReadinessPanel
                            prefill={readPersistedWizardState()?.studioHandoff?.executionPrefill}
                            consumption={
                              readPersistedWizardState()?.studioHandoff?.executionConsumption
                            }
                          />
                        : null}
                      </div>
                    : null}
                    <p className="text-sm font-medium text-zinc-800">{t("instant.step2.title")}</p>
                    <p className="mt-1 text-xs text-zinc-500">{t("instant.step2.description")}</p>
                    {attachedImageCount >= MIN_IMAGES ? (
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
                              studioBadgeLabel={t("motion.handoff.studioImageBadge")}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                    ) : hasStudioImportedScenes ? (
                      <p className="mt-3 text-xs text-zinc-500">{t("motion.handoff.uploadHint")}</p>
                    ) : null}
                    {instantMode === "story" ?
                      <>
                        <StoryboardEditor
                          sceneIds={sceneSlots.map((slot) => slot.sceneId)}
                          images={sceneSlots.map((slot) =>
                            slot.image ? toWizardPreviewInput(slot.image) : undefined
                          )}
                          imageCount={sceneCount}
                          sceneTexts={sceneTexts}
                          expandedSceneId={expandedSceneId}
                          onExpandedSceneIdChange={setExpandedSceneSelection}
                          scrollContainerRef={wizardContentRef}
                          scrollInsetTopPx={STORYBOARD_FRAME_SCROLL_INSET_PX}
                          onSceneChange={handleStoryboardSceneChange}
                          onMoveScene={handleStoryboardMoveScene}
                          onDuplicateTextFromPrevious={handleStoryboardDuplicateFromPrevious}
                          onClearText={handleStoryboardClearText}
                          onDeleteScene={handleStoryboardDeleteScene}
                          textStyleEditorMode="optional"
                        />
                        {activeStudioSlotMissingImage ? (
                          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                            {t("motion.handoff.noStudioImage")}
                          </p>
                        ) : null}
                        {activeStudioContext ?
                          <>
                            <MotionSceneSourceBadges badges={activeSceneSourceBadges} className="mt-2" />
                            <MotionSceneStudioInspector
                              context={activeStudioContext}
                              storyboardTitle={studioHandoffTitle}
                            />
                          </>
                        : null}
                      </>
                    : null}
                  </div>
                ) : null}
              </>
            ) : null}

            {wizardView === "storyboard" ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    {t(wizardStepTitleKey(wizardMode, step, instantMode, wizardFlowOptions) as never)}
                  </h2>
                  {wizardStepHintKey(wizardMode, step, instantMode, wizardFlowOptions) ?
                    <p className="mt-2 text-sm text-zinc-600">
                      {t(wizardStepHintKey(wizardMode, step, instantMode, wizardFlowOptions) as never)}
                    </p>
                  : null}
                </div>
                {instantMode === "transition" && !showFrameReorder ?
                  <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                    {t("instant.wizardStep.frameOrderEmpty")}
                  </p>
                : null}
                {hasStudioImportedScenes && studioIntelligence ? (
                  <MotionImportSummaryBanner
                    intelligence={studioIntelligence}
                    storyboardId={studioHandoffStoryboardId}
                    characterVoiceAssignments={
                      (
                        readPersistedWizardState()?.studioHandoff?.storedHandoff as
                          | { characterVoiceAssignments?: import("@/types/studio-character-voice").CharacterVoiceAssignment[] }
                          | undefined
                      )?.characterVoiceAssignments ?? null
                    }
                    characterPerformanceProfiles={
                      (
                        readPersistedWizardState()?.studioHandoff?.storedHandoff as
                          | {
                              characterPerformanceProfiles?: import("@/types/studio-character-performance").CharacterPerformanceAssignment[];
                            }
                          | undefined
                      )?.characterPerformanceProfiles ?? null
                    }
                    storedHandoff={readPersistedWizardState()?.studioHandoff?.storedHandoff}
                    voiceSegments={
                      (
                        readPersistedWizardState()?.studioHandoff?.storedHandoff as
                          | { voiceSegments?: import("@/types/studio-voice-execution").MotionVoiceSegmentHandoff[] }
                          | undefined
                      )?.voiceSegments ?? null
                    }
                    musicPlan={
                      (
                        readPersistedWizardState()?.studioHandoff?.storedHandoff as
                          | { musicPlan?: import("@/types/studio-music-director").MotionMusicHandoffPlan }
                          | undefined
                      )?.musicPlan ?? null
                    }
                    soundPlan={
                      (
                        readPersistedWizardState()?.studioHandoff?.storedHandoff as
                          | { soundPlan?: import("@/types/studio-sound-director").MotionSoundHandoffPlan }
                          | undefined
                      )?.soundPlan ?? null
                    }
                    audioProductionPlan={
                      (
                        readPersistedWizardState()?.studioHandoff?.storedHandoff as
                          | {
                              audioProductionPlan?: import("@/types/studio-audio-production-director").MotionAudioProductionHandoffPlan;
                            }
                          | undefined
                      )?.audioProductionPlan ?? null
                    }
                    audioAssetPlan={
                      (
                        readPersistedWizardState()?.studioHandoff?.storedHandoff as
                          | {
                              audioAssetPlan?: import("@/types/studio-audio-asset-director").MotionAudioAssetHandoffPlan;
                            }
                          | undefined
                      )?.audioAssetPlan ?? null
                    }
                    voiceIdentityPlan={
                      (
                        readPersistedWizardState()?.studioHandoff?.storedHandoff as
                          | {
                              voiceIdentityPlan?: import("@/types/studio-voice-identity").MotionVoiceIdentityHandoffPlan;
                            }
                          | undefined
                      )?.voiceIdentityPlan ?? null
                    }
                    mediaAssetPlan={
                      (
                        readPersistedWizardState()?.studioHandoff?.storedHandoff as
                          | {
                              mediaAssetPlan?: import("@/types/studio-media-asset").MotionMediaAssetHandoffPlan;
                            }
                          | undefined
                      )?.mediaAssetPlan ?? null
                    }
                    assetPlacementPlan={
                      (
                        readPersistedWizardState()?.studioHandoff?.storedHandoff as
                          | {
                              assetPlacementPlan?: import("@/types/studio-asset-placement").MotionAssetPlacementHandoffPlan;
                            }
                          | undefined
                      )?.assetPlacementPlan ?? null
                    }
                    characterBlockingPlan={
                      (
                        readPersistedWizardState()?.studioHandoff?.storedHandoff as
                          | {
                              characterBlockingPlan?: import("@/types/studio-character-blocking").MotionCharacterBlockingHandoffPlan;
                            }
                          | undefined
                      )?.characterBlockingPlan ?? null
                    }
                    onRefresh={
                      studioHandoffStoryboardId ? () => void handleRefreshFromStudio() : undefined
                    }
                    refreshing={refreshingStudioHandoff}
                  />
                ) : null}
                {showFrameReorder && attachedImageCount >= MIN_IMAGES ? (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext
                      items={images.map((i) => i.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                        {images.map((im, idx) => (
                          <SortableThumb
                            key={im.id}
                            item={im}
                            index={idx}
                            roleLabel={t(
                              `instant.orderRole.${ORDER_ROLE_KEY_SUFFIXES[Math.min(idx, ORDER_ROLE_KEY_SUFFIXES.length - 1)]}` as never
                            )}
                            dragLabel={t("instant.step2.drag")}
                            studioBadgeLabel={t("motion.handoff.studioImageBadge")}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : hasStudioImportedScenes ? (
                  <p className="text-xs text-zinc-500">{t("motion.handoff.uploadHint")}</p>
                ) : null}
                {showStoryboardStep && instantMode === "story" ? (
                  <>
                    <StoryboardEditor
                      sceneIds={sceneSlots.map((slot) => slot.sceneId)}
                      images={sceneSlots.map((slot) =>
                        slot.image ? toWizardPreviewInput(slot.image) : undefined
                      )}
                      imageCount={sceneCount}
                      sceneTexts={sceneTexts}
                      expandedSceneId={expandedSceneId}
                      onExpandedSceneIdChange={setExpandedSceneSelection}
                      scrollContainerRef={wizardContentRef}
                      scrollInsetTopPx={STORYBOARD_FRAME_SCROLL_INSET_PX}
                      onSceneChange={handleStoryboardSceneChange}
                      onMoveScene={handleStoryboardMoveScene}
                      onDuplicateTextFromPrevious={handleStoryboardDuplicateFromPrevious}
                      onClearText={handleStoryboardClearText}
                      onDeleteScene={handleStoryboardDeleteScene}
                      textStyleEditorMode="optional"
                    />
                    {activeStudioSlotMissingImage ? (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                        {t("motion.handoff.noStudioImage")}
                      </p>
                    ) : null}
                    {activeStudioContext ?
                      <>
                        <MotionSceneSourceBadges badges={activeSceneSourceBadges} className="mt-2" />
                        <MotionSceneStudioInspector
                          context={activeStudioContext}
                          storyboardTitle={studioHandoffTitle}
                        />
                      </>
                    : null}
                  </>
                ) : null}
              </div>
            ) : null}

            {wizardView === "text" ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">{t("instant.wizardStep.text")}</h2>
                  <p className="mt-2 text-sm text-zinc-600">{t("instant.wizardStep.textHint")}</p>
                </div>
                {instantMode === "story" && showStoryboardComposer ? (
                  <StoryboardEditor
                    sceneIds={sceneSlots.map((slot) => slot.sceneId)}
                    images={sceneSlots.map((slot) =>
                      slot.image ? toWizardPreviewInput(slot.image) : undefined
                    )}
                    imageCount={sceneCount}
                    sceneTexts={sceneTexts}
                    expandedSceneId={expandedSceneId}
                    onExpandedSceneIdChange={setExpandedSceneSelection}
                    scrollContainerRef={wizardContentRef}
                    scrollInsetTopPx={STORYBOARD_FRAME_SCROLL_INSET_PX}
                    onSceneChange={handleStoryboardSceneChange}
                    onMoveScene={handleStoryboardMoveScene}
                    onDuplicateTextFromPrevious={handleStoryboardDuplicateFromPrevious}
                    onClearText={handleStoryboardClearText}
                    onDeleteScene={handleStoryboardDeleteScene}
                    textStyleEditorMode="optional"
                  />
                ) : null}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-800">{t("instant.creatorStep.prompt")}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{t("instant.creatorPrompt.intro")}</p>
                  <textarea
                    value={motionText}
                    onChange={(e) => setMotionText(e.target.value)}
                    rows={4}
                    maxLength={500}
                    placeholder={t("instant.creatorPrompt.placeholder")}
                    className="mt-3 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm"
                  />
                </div>
              </div>
            ) : null}

            {wizardView === "style" ? (
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

            {wizardView === "mood" ? (
              <AnimationMoodPanel
                value={animationMood}
                onChange={(mood) =>
                  setPosterMotionSettings((prev) => applyMoodToPosterSettings(prev, mood))
                }
              />
            ) : null}

            {wizardView === "prompt" ? (
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

            {wizardView === "generate" ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
                    {t("instant.creatorStep.generate")}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-600">{t("instant.creatorGenerate.intro")}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-800" htmlFor="instant-project-title">
                    {t("instant.projectName.label")}
                  </label>
                  <input
                    id="instant-project-title"
                    type="text"
                    maxLength={120}
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder={t("instant.projectName.placeholder")}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm"
                  />
                  <p className="text-xs text-zinc-500">{t("instant.projectName.hint")}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <p className="text-sm font-semibold text-emerald-950">
                    {outputPlan.mode === "story_multiframe"
                      ? t("instant.outputPlan.storyMode")
                      : outputPlan.mode === "single_transition"
                        ? t("instant.outputPlan.singleTransition", {
                            seconds: pricingSummary.perTransitionProviderSeconds,
                          })
                        : t("instant.outputPlan.cinematicStory", {
                            seconds: pricingSummary.perTransitionProviderSeconds,
                          })}
                  </p>
                  <p className="mt-1 text-sm text-emerald-900/90">
                    {t("instant.pricing.estimated", { price: estimatedPriceLabel })}
                  </p>
                  <p className="mt-1 text-xs text-emerald-900/75">
                    {t("instant.pricing.creditsBasedNote")}
                  </p>
                  {pricingSummary.isAdminFree || isAdmin ?
                    <p className="mt-1 text-xs font-medium text-amber-900">
                      {t("instant.pricing.adminTestMode")}
                    </p>
                  : null}
                  {pricingSummary.pacingOptionsShareSamePrice ?
                    <p className="mt-2 text-xs text-emerald-900/80">
                      {t("instant.pricing.samePricePacingOnly")}
                    </p>
                  : null}
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
                    {instantMode === "story" ?
                      t("instant.storyboard.step7VideoDuration", {
                        seconds: outputPlan.providerDurationSeconds,
                      })
                    : `${outputPlan.providerDurationSeconds}s`}
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
                    {pricingSummary.perTransitionProviderSeconds}s
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
                {hasStudioImportedScenes && studioIntelligence ?
                  <MotionFirstRenderConfidencePanel
                    intelligence={studioIntelligence}
                    sceneCount={sceneCount}
                    voiceReady={Boolean(
                      readPersistedWizardState()?.studioHandoff?.voiceMetadata?.ready ??
                        studioIntelligence.voiceSummary?.ready
                    )}
                    textReady={sceneCount > 0}
                    charactersReady={studioIntelligence.charactersUsed.length > 0}
                  />
                : null}
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
        </MotionBeginnerCollectShell>
      </div>

      <CheckoutScanGateDialog
        open={checkoutGateOpen}
        onWait={handleCheckoutWaitForScans}
        onProceedWithout={handleCheckoutProceedWithoutScans}
        onBackToReview={() => {
          setCheckoutGateOpen(false);
          setStep(wizardMode === "beginner" ? 1 : 2);
        }}
      />

      <InstantWizardResetDialog
        open={resetDialogOpen}
        processingWarning={resetProcessingWarning}
        busy={resetBusy}
        onCancel={() => setResetDialogOpen(false)}
        onConfirm={() => void performWizardReset()}
      />

      <MotionPreRenderQaModal
        open={preRenderQaOpen}
        readiness={motionRenderReadiness}
        onClose={() => setPreRenderQaOpen(false)}
        onReviewScenes={() => {
          setPreRenderQaOpen(false);
          setStep(wizardMode === "beginner" ? 2 : 1);
          setExpandedSceneSelection("auto");
        }}
        onRenderAnyway={() => startCheckoutFlow()}
      />

      <MotionExecutionRefreshDiffModal
        open={executionRefreshOpen}
        diff={executionRefreshDiff}
        loading={refreshingStudioHandoff}
        applying={applyingExecutionRefresh}
        onClose={() => {
          setExecutionRefreshOpen(false);
          setPendingRefreshPayload(null);
          setExecutionRefreshDiff(null);
        }}
        onApply={() => void handleApplyExecutionRefresh()}
      />

      <InstantWizardToast message={toastMessage} />
    </main>
  );
}
