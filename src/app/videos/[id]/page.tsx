"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDurationSeconds, getTotalVideoDurationSeconds } from "@/lib/animation-duration";
import {
  getAnimationPreset,
  validateAnimationPresetId,
  type AnimationPresetId,
} from "@/lib/animation-presets";
import { InstantFinalProgressPanel } from "@/components/instant/instant-final-progress-panel";
import { useInstantVideoRepair } from "@/hooks/use-instant-video-repair";
import { VideoVersionsPanel } from "@/components/instant/video-versions-panel";
import { LanguagePlaybackSelector } from "@/components/instant/language-playback-selector";
import { ProjectDetailVersionToolbar } from "@/components/videos/project-detail-version-toolbar";
import {
  buildMotionVersionCatalogForProject,
  findMotionVersionSlot,
  type MotionVersionCatalog,
} from "@/lib/motion-version-catalog";
import { isBundleSlotPlayable } from "@/lib/bundle-slot-actions";
import {
  applyDetailVersionSelection,
  isFailedParentWithCompletedRender,
  resolveDetailCatalogSelection,
  resolveDetailSlotCleanVideoUrl,
  resolveDetailSlotDownloadUrl,
} from "@/lib/project-detail-bundle-selection";
import { MotionDeepLinkWarning } from "@/components/videos/motion-deep-link-warning";
import { resolveProjectDisplayTitle } from "@/lib/project-display-title";
import { DraftLineageBanner } from "@/components/videos/draft-lineage-banner";
import { ProjectBundleOverviewPanel } from "@/components/videos/project-bundle-overview-panel";
import { ProjectBundleSettingsDialog } from "@/components/videos/project-bundle-settings-dialog";
import {
  filterCompletedLanguageExportsForPlayback,
  resolveActivePlaybackState,
} from "@/lib/language-export-playback";
import { isPublicDebugUiEnabled } from "@/lib/debug-ui";
import type { VideoLanguageExportSummary } from "@/types/animation-api";
import { PlaybackDebugPanel } from "@/components/instant/playback-debug-panel";
import { invalidateCachedInstantProgressSnapshot } from "@/lib/instant-premium-progress-cache";
import { buildPlaybackCacheKey, pickPlaybackUrl } from "@/lib/playback-url-resolution";
import { resolveProjectVideoDisplayState } from "@/lib/render-output-lineage";
import { isFullRerenderInProgress } from "@/lib/full-rerender-audit";
import { resolveProjectDisplayStatus } from "@/lib/project-display-status";
import type { TranslationKey } from "@/i18n";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useInstantPremiumStatusPolling } from "@/hooks/use-instant-premium-status-polling";
import type {
  AnimationProjectDetailResponse,
  InstantPremiumStatusResponse,
} from "@/types/animation-api";
import { EXPORT_CANCELLED_BY_USER_MESSAGE } from "@/lib/animation-export-messages";
import { exportRecordIsCancellable } from "@/lib/animation-export-cancellable";
import { animationProjectDownloadUrl } from "@/lib/animation-project-download";
import { projectUsesStoryOverlay } from "@/lib/story-language-export";
import { traceConceptFlow } from "@/lib/concept-flow-trace";
import { hcExportRetryLog } from "@/lib/hc-export-retry-debug";
import { postProjectExportRetry } from "@/lib/post-project-export-retry";
import {
  instantExportUserErrorMessage,
  postRebuildFinalVideo,
  type RebuildFinalVideoResponse,
} from "@/lib/instant-export-client";
import { TextRerenderEditorModal } from "@/components/instant/text-rerender-editor-modal";
import { FullRerenderEditorModal } from "@/components/instant/full-rerender-editor-modal";
import { RenderHistoryPanel } from "@/components/instant/render-history-panel";
import { VideoPreview } from "@/components/ui/video-preview";
import {
  ProjectDetailHeader,
  type ProjectDetailModeKind,
} from "@/components/videos/project-detail-header";
import { ProjectDetailQuickActions } from "@/components/videos/project-detail-quick-actions";
import { ProjectRerenderChoices } from "@/components/videos/project-rerender-choices";
import { postCopyProjectAsDraft } from "@/lib/copy-project-as-draft-client";
import { runQuickFullRerender } from "@/lib/quick-full-rerender";
import {
  ProjectStorageUsageCard,
  useProjectStorageAudit,
  VideoVersionDownloadTrigger,
} from "@/components/videos/project-storage-usage-card";
import { MotionProjectStudioQaPanel } from "@/components/instant/motion/motion-project-studio-qa-panel";
import { MotionVoiceSubtitlePanel } from "@/components/instant/motion/motion-voice-subtitle-panel";
import { ProjectVideoCostCard } from "@/components/videos/project-video-cost-card";
import { ProjectTimelinePanel } from "@/components/videos/project-timeline-panel";
import { ProjectDetailSection } from "@/components/videos/project-detail-section";
import { isStudioAiAssistantEnabled } from "@/lib/studio-ai-assistant-flag";
import { RenderActivityStatusCard } from "@/components/videos/render-activity-status-card";
import { PageHeaderSkeleton } from "@/components/ui/motion-studio-primitives";
import { fetchStudioIntelligenceStale } from "@/lib/refresh-studio-intelligence-client";

function presetTitleKey(presetId: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    basic: "animate.preset.basic.title",
    standard: "animate.preset.standard.title",
    pro: "animate.preset.pro.title",
    smooth: "animate.preset.smooth.title",
  };
  return map[presetId] ?? "animate.preset.standard.title";
}

function intentLabelKey(intent: string | null | undefined): TranslationKey | null {
  if (!intent) {
    return null;
  }
  const allowed = ["morph", "cinematic", "product", "dynamic"] as const;
  if (!(allowed as readonly string[]).includes(intent)) {
    return null;
  }
  return `animate.intent.${intent}` as TranslationKey;
}

function statusLabelKey(status: string): TranslationKey {
  switch (status) {
    case "completed":
      return "videos.status.completed";
    case "generating":
      return "videos.status.generating";
    case "rendering":
      return "videos.status.rendering";
    case "failed":
      return "videos.status.failed";
    default:
      return "videos.status.queued";
  }
}

export default function VideoDetailPage() {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const dateLocale = locale === "nl" ? "nl" : "en";
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const session = useAuthSession();
  const [detail, setDetail] = useState<AnimationProjectDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVideoExportCancel, setShowVideoExportCancel] = useState(false);
  const [exportCancelBusy, setExportCancelBusy] = useState(false);
  const [exportCancelFeedback, setExportCancelFeedback] = useState<string | null>(null);
  const [deleteProjectBusy, setDeleteProjectBusy] = useState(false);
  const [deleteProjectError, setDeleteProjectError] = useState<string | null>(null);
  const [finalVideoPlaybackError, setFinalVideoPlaybackError] = useState(false);
  const [retryExportBusy, setRetryExportBusy] = useState(false);
  const [retryExportError, setRetryExportError] = useState<string | null>(null);
  const [rebuildBusy, setRebuildBusy] = useState(false);
  const [textRerenderEditorOpen, setTextRerenderEditorOpen] = useState(false);
  const [fullRerenderEditorOpen, setFullRerenderEditorOpen] = useState(false);
  const [fullRerenderBusy, setFullRerenderBusy] = useState(false);
  const [fullRerenderError, setFullRerenderError] = useState<string | null>(null);
  const [fullRerenderInfo, setFullRerenderInfo] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [rebuildError, setRebuildError] = useState<string | null>(null);
  const [rebuildInfo, setRebuildInfo] = useState<string | null>(null);
  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!id) {
      setLoading(false);
      return;
    }
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch(`/api/animations/projects/${encodeURIComponent(id)}`, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const json: unknown = await res.json().catch(() => null);
      if (res.status === 401) {
        setError(t("errors.authRequired"));
        setDetail(null);
        return;
      }
      if (!res.ok) {
        const msg =
          json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string"
            ? (json as { error: string }).error
            : `HTTP ${res.status}`;
        setError(msg);
        setDetail(null);
        return;
      }
      setDetail(json as AnimationProjectDetailResponse);
    } catch {
      setError(t("videos.error"));
      setDetail(null);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [id]);

  const updateLanguageExports = useCallback((exports: VideoLanguageExportSummary[]) => {
    setDetail((prev) => (prev ? { ...prev, languageExports: exports } : prev));
  }, []);

  const setPlaybackLanguage = useCallback(
    (languageCode: string) => {
      if (!id) {
        return;
      }
      const params = new URLSearchParams(searchParams.toString());
      if (languageCode === "original") {
        params.delete("lang");
      } else {
        params.set("lang", languageCode);
      }
      params.delete("ver");
      const qs = params.toString();
      router.replace(`/videos/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`, {
        scroll: false,
      });
    },
    [id, router, searchParams]
  );

  useEffect(() => {
    if (!session.resolved || !session.user) {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        void load();
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [session.resolved, session.user, load]);

  const studioStaleCheckDone = useRef(false);
  useEffect(() => {
    if (!id || !detail?.studioQa?.source.storyboardId || studioStaleCheckDone.current) {
      return;
    }
    studioStaleCheckDone.current = true;
    let cancelled = false;
    void (async () => {
      const res = await fetchStudioIntelligenceStale(id, true);
      if (cancelled || !res.ok || !res.data.ok) {
        return;
      }
      const qa = res.data.studioQa;
      if (qa) {
        setDetail((prev) => (prev ? { ...prev, studioQa: qa } : prev));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, detail?.studioQa?.source.storyboardId]);

  useEffect(() => {
    const ex = detail?.exports?.[0];
    if (!detail || detail.status !== "rendering" || !exportRecordIsCancellable(ex)) {
      const resetId = window.setTimeout(() => setShowVideoExportCancel(false), 0);
      return () => window.clearTimeout(resetId);
    }
    const timer = window.setTimeout(() => setShowVideoExportCancel(true), 30_000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [detail]);

  const finalVideoUrl = useMemo(() => {
    if (!detail?.exports?.length) {
      return null;
    }
    const withUrl = detail.exports.find((e) => e.outputVideoUrl?.trim());
    const url = withUrl?.outputVideoUrl?.trim() ?? null;
    if (!url) {
      return null;
    }
    if (detail.status === "completed" || withUrl?.status === "completed") {
      return url;
    }
    return null;
  }, [detail]);

  useEffect(() => {
    const timer = window.setTimeout(() => setFinalVideoPlaybackError(false), 0);
    return () => window.clearTimeout(timer);
  }, [finalVideoUrl]);

  const latestExport = detail?.exports?.[0] ?? null;
  const instantLikeProject = Boolean(
    detail &&
      (detail.projectType === "instant_premium" ||
        detail.stylePreset === "food_promo" ||
        detail.stylePreset === "clean_business" ||
        detail.stylePreset === "social_boost" ||
        detail.instantOutputDurationSeconds != null ||
        detail.instantSelectedChips != null ||
        (detail.instantUserIntent?.trim().length ?? 0) > 0)
  );

  const allFragmentsDone = useMemo(() => {
    if (!detail?.transitions.length) {
      return false;
    }
    return detail.transitions.every(
      (tr) => tr.status === "completed" && Boolean(tr.outputVideoUrl?.trim())
    );
  }, [detail]);

  const mergeExportStuckWithoutFinal = Boolean(
    latestExport &&
      !latestExport.outputVideoUrl?.trim() &&
      latestExport.status.toLowerCase() !== "completed"
  );

  const canRetryMergeExport = Boolean(
    detail &&
      !instantLikeProject &&
      allFragmentsDone &&
      ((detail.status === "failed" && latestExport?.status === "failed") ||
        (detail.status === "completed" && !finalVideoUrl) ||
        (detail.status === "rendering" &&
          (!latestExport || mergeExportStuckWithoutFinal)))
  );
  const canRecoverInstant = Boolean(
    detail && instantLikeProject && allFragmentsDone && !finalVideoUrl
  );
  const canRebuildInstant = Boolean(detail && instantLikeProject && allFragmentsDone);
  const canFullRerenderInstant = Boolean(
    detail &&
      detail.projectType === "instant_premium" &&
      detail.images &&
      detail.images.length > 0
  );

  const showInstantProgress = Boolean(
    id &&
      detail &&
      instantLikeProject &&
      (detail.status === "rendering" ||
        detail.status === "generating" ||
        rebuildBusy ||
        fullRerenderBusy ||
        (allFragmentsDone &&
          (!finalVideoUrl || latestExport?.status === "rendering")))
  );

  const {
    snapshot: instantSnapshot,
    setSnapshot: setInstantSnapshot,
    lastPolledAtMs: instantLastPolledAtMs,
    lastProgressChangeAtMs: instantLastProgressChangeAtMs,
    touchProgressClock,
    pollNow,
    pollingError: instantPollingError,
  } = useInstantPremiumStatusPolling(id, showInstantProgress);

  const renderActivityProviderJobIds = useMemo(
    () =>
      instantSnapshot?.segments
        ?.map((seg) => seg.providerTaskId?.trim())
        .filter((x): x is string => Boolean(x)) ?? [],
    [instantSnapshot?.segments]
  );

  const showRenderActivityCard = Boolean(
    detail &&
      (showInstantProgress ||
        detail.status === "cancelled" ||
        detail.status === "generating" ||
        detail.status === "rendering" ||
        detail.status === "queued" ||
        detail.status === "processing" ||
        detail.status === "failed")
  );

  const isAdmin = session.resolved && session.user?.role === "admin";

  useEffect(() => {
    if (!rebuildBusy || !instantSnapshot || instantSnapshot.isRebuildingFinalVideo) {
      return;
    }
    const timer = window.setTimeout(() => {
      setRebuildBusy(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [instantSnapshot, rebuildBusy]);

  const videoRepair = useInstantVideoRepair({
    projectId: id,
    snapshot: instantSnapshot,
    setSnapshot: setInstantSnapshot,
    isAdmin,
    onPollNow: pollNow,
    onReload: load,
  });

  const fullRerenderDisabled = Boolean(
    fullRerenderBusy ||
      rebuildBusy ||
      videoRepair.repairInFlight ||
      detail?.status === "generating" ||
      detail?.status === "rendering" ||
      instantSnapshot?.isRebuildingFinalVideo
  );

  const handleQuickFullRerender = useCallback(async () => {
    if (!id || fullRerenderDisabled) {
      return;
    }
    setFullRerenderBusy(true);
    setFullRerenderError(null);
    setFullRerenderInfo(null);
    try {
      const result = await runQuickFullRerender({
        projectId: id,
        confirmMessage: t("instant.fullRerender.confirmPromptQuick"),
        confirmMessageTestMode: t("instant.fullRerender.confirmPromptQuickTestMode"),
        abortedMessage: t("instant.fullRerender.aborted"),
        networkMessage: t("instant.fullRerender.failed"),
        failedMessage: t("instant.fullRerender.failed"),
      });
      if (!result.ok) {
        if (!result.cancelled) {
          setFullRerenderError(result.message);
        }
        return;
      }
      setFullRerenderInfo(t("instant.fullRerender.busy"));
      router.push(result.progressRoute);
    } finally {
      setFullRerenderBusy(false);
    }
  }, [fullRerenderDisabled, id, router, t]);

  const panelPollingError =
    instantPollingError ??
    (videoRepair.feedback.kind === "poll_failed" && videoRepair.feedback.userMessageKey
      ? {
          userMessageKey: videoRepair.feedback.userMessageKey as "instant.videoRepair.pollFailed",
          adminDetail: videoRepair.feedback.adminDetail,
        }
      : null);

  const videoDisplay = useMemo(() => {
    if (!detail) {
      return {
        primaryFinalUrl: null,
        finalIsArchivedFallback: false,
        cleanUrl: null,
        cleanIsStale: false,
        cleanIsLatestBareOnly: false,
      };
    }
    return resolveProjectVideoDisplayState({
      projectCleanUrl: detail.instantCleanFinalVideoUrl ?? null,
      exportOutputUrl: finalVideoUrl,
      previousFinalVideoUrl: detail.instantPreviousFinalVideoUrl ?? null,
      projectStatus: detail.status,
      exportStatus: latestExport?.status ?? null,
      renderVersions: detail.renderVersions?.map((row) => ({
        renderVersionNumber: row.renderVersionNumber,
        status: row.status,
        isDefault: row.isDefault,
        finalVideoUrl: row.finalVideoUrl,
        cleanVideoUrl: row.cleanVideoUrl,
      })),
      auditJson: detail.instantFinalRebuildAuditJson,
      rerenderInProgress: isFullRerenderInProgress(detail.instantFinalRebuildAuditJson),
    });
  }, [detail, finalVideoUrl, latestExport?.status]);

  const originalPlaybackUrl = useMemo(() => {
    const exportForPick =
      videoDisplay.finalIsArchivedFallback && videoDisplay.primaryFinalUrl
        ? videoDisplay.primaryFinalUrl
        : finalVideoUrl;
    const picked = pickPlaybackUrl({
      detailExportUrl: exportForPick,
      statusSnapshotUrl: instantSnapshot?.finalVideoUrl,
      previousFinalVideoUrl: detail?.instantPreviousFinalVideoUrl,
    });
    return (
      picked.url ??
      (videoDisplay.finalIsArchivedFallback ? videoDisplay.primaryFinalUrl : null)
    );
  }, [
    finalVideoUrl,
    instantSnapshot?.finalVideoUrl,
    detail?.instantPreviousFinalVideoUrl,
    videoDisplay.finalIsArchivedFallback,
    videoDisplay.primaryFinalUrl,
  ]);

  const languageExports = useMemo(
    () => detail?.languageExports ?? [],
    [detail?.languageExports]
  );

  const langFromUrl = searchParams.get("lang");
  const versionFromUrl = searchParams.get("ver");
  const selFromUrl = searchParams.get("sel");

  const motionCatalog = useMemo((): MotionVersionCatalog | null => {
    if (!detail) {
      return null;
    }
    if (detail.bundleCatalog && detail.bundleCatalog.languages.length > 0) {
      return detail.bundleCatalog as MotionVersionCatalog;
    }
    return buildMotionVersionCatalogForProject({
      projectId: detail.id,
      title: detail.title,
      exportOutputUrl: finalVideoUrl,
      exportStatus: latestExport?.status ?? null,
      projectStatus: detail.status,
      projectCleanUrl: detail.instantCleanFinalVideoUrl ?? null,
      durationSeconds: detail.instantOutputDurationSeconds ?? null,
      renderVersions: (detail.renderVersions ?? []).map((row) => ({
        id: row.id,
        renderVersionNumber: row.renderVersionNumber,
        status: row.status,
        isDefault: row.isDefault,
        versionNote: row.versionNote,
        finalVideoUrl: row.finalVideoUrl,
        cleanVideoUrl: row.cleanVideoUrl,
        createdAt: row.createdAt,
      })),
      languageExports: (detail.languageExports ?? []).map((row) => ({
        id: row.id,
        languageCode: row.languageCode,
        languageLabel: row.languageLabel,
        status: row.status,
        outputVideoUrl: row.outputVideoUrl,
        sourceCleanVideoUrl: row.sourceCleanVideoUrl,
        version: row.version,
        isDefault: row.isDefault,
        versionNote: row.versionNote,
        createdAt: row.createdAt,
      })),
    });
  }, [detail, finalVideoUrl, latestExport?.status]);

  const catalogSelection = useMemo(
    () =>
      motionCatalog
        ? resolveDetailCatalogSelection({
            catalog: motionCatalog,
            langFromUrl,
            versionFromUrl,
            selFromUrl,
          })
        : {
            invalidDeepLink: false,
            selectedCatalogSlot: null,
            selectedLanguageCode: "nl",
            selectionKey: null,
          },
    [motionCatalog, langFromUrl, versionFromUrl, selFromUrl]
  );

  const invalidMotionDeepLink = catalogSelection.invalidDeepLink;
  const selectedCatalogSlot = catalogSelection.selectedCatalogSlot;

  const setMotionVersionSelection = useCallback(
    (_languageCode: string, selectionKey: string, _versionNumber: number) => {
      if (!motionCatalog) {
        return;
      }
      const slot = findMotionVersionSlot(motionCatalog, selectionKey);
      if (!slot) {
        return;
      }
      applyDetailVersionSelection(slot, (href) => {
        router.replace(href, { scroll: false });
      });
    },
    [motionCatalog, router]
  );

  const showFailedParentCompletedBadge = useMemo(
    () =>
      Boolean(
        detail &&
          isFailedParentWithCompletedRender({
            parentProjectStatus: detail.status,
            selectedSlot: selectedCatalogSlot,
          })
      ),
    [detail, selectedCatalogSlot]
  );

  const handleCopyAsConcept = useCallback(async () => {
    const sourceProjectId = selectedCatalogSlot?.sourceProjectId ?? id;
    if (!sourceProjectId || fullRerenderDisabled) {
      return;
    }
    setFullRerenderBusy(true);
    setFullRerenderError(null);
    setFullRerenderInfo(null);
    try {
      const result = await postCopyProjectAsDraft(sourceProjectId, {
        sourceLanguage: selectedCatalogSlot?.languageCode,
        sourceVersion:
          selectedCatalogSlot?.sourceRenderVersionNumber ??
          selectedCatalogSlot?.sourceLanguageExportVersion ??
          undefined,
        renderVersionId: selectedCatalogSlot?.renderVersionId,
        languageExportId: selectedCatalogSlot?.languageExportId,
        selectionKey: selectedCatalogSlot?.selectionKey,
      });
      if (result.networkError || !result.ok) {
        setFullRerenderError(
          result.data.message ??
            result.data.copyAsDraft?.message ??
            result.data.error ??
            t("projects.concept.copyFailed")
        );
        return;
      }
      const path =
        result.data.editVersionPath ??
        (result.data.draftProjectId
          ? `/videos/${encodeURIComponent(result.data.draftProjectId)}/edit-version`
          : null);
      if (!path) {
        setFullRerenderError(t("projects.concept.copyFailed"));
        return;
      }
      setFullRerenderInfo(t("projects.concept.copyStarted"));
      router.push(path);
    } finally {
      setFullRerenderBusy(false);
    }
  }, [
    fullRerenderDisabled,
    id,
    router,
    selectedCatalogSlot?.languageCode,
    selectedCatalogSlot?.languageExportId,
    selectedCatalogSlot?.renderVersionId,
    selectedCatalogSlot?.selectionKey,
    selectedCatalogSlot?.sourceLanguageExportVersion,
    selectedCatalogSlot?.sourceProjectId,
    selectedCatalogSlot?.sourceRenderVersionNumber,
    t,
  ]);

  const playbackState = useMemo(
    () =>
      resolveActivePlaybackState({
        langFromUrl,
        originalFinalUrl: originalPlaybackUrl,
        languageExports,
      }),
    [langFromUrl, originalPlaybackUrl, languageExports]
  );

  const activeFinalVideoUrl = invalidMotionDeepLink
    ? null
    : selectedCatalogSlot?.finalVideoUrl?.trim() ??
      playbackState.activePlaybackUrl ??
      originalPlaybackUrl;

  const activeCleanVideoUrl = invalidMotionDeepLink
    ? null
    : resolveDetailSlotCleanVideoUrl(selectedCatalogSlot);

  const slotDownloadHref = resolveDetailSlotDownloadUrl(selectedCatalogSlot);

  const hasMotionVersionCatalog = Boolean(
    motionCatalog &&
      Object.values(motionCatalog.slotsByLanguage).some((s) => (s?.length ?? 0) > 0)
  );

  const showBundlePlayback = Boolean(
    originalPlaybackUrl ||
      (hasMotionVersionCatalog &&
        !invalidMotionDeepLink &&
        selectedCatalogSlot &&
        isBundleSlotPlayable(selectedCatalogSlot))
  );

  const playbackCacheKey = buildPlaybackCacheKey(
    activeFinalVideoUrl ?? originalPlaybackUrl
  );

  const hasCompletedLanguageVersions = useMemo(
    () => filterCompletedLanguageExportsForPlayback(languageExports).length > 0,
    [languageExports]
  );

  const showProjectStorage = Boolean(originalPlaybackUrl && id);
  const {
    audit: projectStorageAudit,
    loading: projectStorageLoading,
    error: projectStorageError,
    refresh: refreshProjectStorage,
  } = useProjectStorageAudit(id, showProjectStorage);

  const showPlaybackDebugPanel = isPublicDebugUiEnabled() || isAdmin;

  const hasCompletedInstantFinal = Boolean(
    originalPlaybackUrl &&
      (detail?.status === "completed" ||
        detail?.exports?.some((e) => e.status === "completed" && e.outputVideoUrl?.trim()))
  );

  const mergeStuckRetryOnly = Boolean(
    canRetryMergeExport && detail?.status === "rendering" && latestExport?.status !== "failed"
  );

  const retryExportMerge = useCallback(async () => {
    if (!id) {
      return;
    }
    hcExportRetryLog("client", "export_retry.button_clicked", { projectId: id });
    setRetryExportBusy(true);
    setRetryExportError(null);
    try {
      const { response, body } = await postProjectExportRetry(id);
      if (!response.ok && !body.project) {
        setRetryExportError(body.error ?? t("errors.exportStartFailed"));
        return;
      }
      if (body.error && !body.project) {
        setRetryExportError(body.error);
        return;
      }
      if (body.error) {
        setRetryExportError(body.error);
      }
      await load();
    } catch (e) {
      hcExportRetryLog("client", "export_retry.throw", {
        projectId: id,
        message: e instanceof Error ? e.message : String(e),
      });
      setRetryExportError(t("errors.exportStartFailed"));
    } finally {
      setRetryExportBusy(false);
    }
  }, [id, load]);

  const applyRebuildResponse = useCallback(
    async (body: RebuildFinalVideoResponse) => {
      if (body.rebuild?.clipsReady === false || body.code === "REBUILD_SEGMENTS_MISSING") {
        setRebuildError(
          body.rebuild?.message ??
            (body.rebuild?.suggestRepair
              ? t("instant.progress.rebuildSegmentsMissing")
              : t("instant.progress.rebuildFinalFailed"))
        );
        return;
      }
      if (body.code === "STALE_PLAYBACK_URL") {
        setRebuildError(body.rebuild?.message ?? body.error ?? t("instant.progress.rebuildFinalFailed"));
        return;
      }
      if (body.code === "REBUILD_FAILED_TIMEOUT") {
        setRebuildError(
          body.rebuild?.message ?? body.error ?? t("instant.progress.rebuildFailedTimeout")
        );
        return;
      }
      if (body.code === "STALE_REBUILD_OUTPUT") {
        setRebuildError(body.rebuild?.message ?? body.error ?? t("instant.progress.rebuildStaleOutput"));
        return;
      }
      if (body.rebuild?.ok) {
        setRebuildInfo(t("instant.progress.rebuildFinalSuccess"));
        setRebuildError(null);
      } else if (body.rebuild?.finalVideoUrlPresent) {
        setRebuildError(
          body.rebuild?.message ?? t("instant.progress.rebuildFinalFailedKeepsPrevious")
        );
      } else {
        setRebuildError(body.rebuild?.message ?? t("instant.progress.rebuildFinalFailed"));
      }
      if (id) {
        invalidateCachedInstantProgressSnapshot(id);
      }
      await load();
      if (body.status) {
        setInstantSnapshot(body.status);
      }
    },
    [id, load, setInstantSnapshot, t]
  );

  const rebuildFinalVideo = useCallback(async () => {
    if (!id) {
      return;
    }
    touchProgressClock();
    setRebuildBusy(true);
    setRebuildError(null);
    setRebuildInfo(t("instant.textRerender.busy"));
    try {
      const result = await postRebuildFinalVideo(id);
      if (result.networkError) {
        setRebuildInfo(null);
        setRebuildError(
          instantExportUserErrorMessage({
            kind: result.errorKind ?? "network",
            abortedMessage: t("instant.textRerender.aborted"),
            networkMessage: t("instant.textRerender.failed"),
            httpMessage: result.data.error,
            adminDetail: result.data.error,
            isAdmin,
          })
        );
        setRebuildBusy(false);
        return;
      }
      const body = result.data;
      if (!result.ok) {
        setRebuildInfo(null);
        setRebuildError(body.error ?? body.rebuild?.message ?? t("instant.progress.rebuildFinalFailed"));
        setRebuildBusy(false);
        return;
      }
      await applyRebuildResponse(body);
    } catch (e) {
      setRebuildInfo(null);
      setRebuildError(
        instantExportUserErrorMessage({
          kind: "network",
          abortedMessage: t("instant.textRerender.aborted"),
          networkMessage: t("instant.textRerender.failed"),
          adminDetail: e instanceof Error ? e.message : String(e),
          isAdmin,
        })
      );
      setRebuildBusy(false);
    }
  }, [applyRebuildResponse, id, isAdmin, touchProgressClock, t]);

  useEffect(() => {
    if (!instantSnapshot?.finalVideoUrl) {
      return;
    }
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [instantSnapshot?.finalVideoUrl, load]);

  const [fragmentsSectionOpen, setFragmentsSectionOpen] = useState(false);
  const fragmentsAutoOpenedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!detail) {
      return;
    }
    const hasClip = detail.transitions.some((tr) => Boolean(tr.outputVideoUrl?.trim()));
    const key = `${detail.id}:${hasClip}`;
    if (!hasClip || fragmentsAutoOpenedKeyRef.current === key) {
      return;
    }
    fragmentsAutoOpenedKeyRef.current = key;
    setFragmentsSectionOpen(true);
  }, [detail]);

  const durationLabel = useMemo(() => {
    if (!detail) {
      return "—";
    }
    const rawPreset = detail.presetId ?? "";
    const presetId: AnimationPresetId = validateAnimationPresetId(rawPreset) ? rawPreset : "standard";
    const preset = getAnimationPreset(presetId);
    const per =
      detail.advancedSettingsEnabled &&
      detail.viduDurationSeconds != null &&
      detail.viduDurationSeconds > 0
        ? detail.viduDurationSeconds
        : preset.durationSeconds;
    const sec = getTotalVideoDurationSeconds(detail.images.length, per);
    return formatDurationSeconds(sec, dateLocale);
  }, [detail, dateLocale]);

  if (!session.resolved) {
    return (
      <main className="mx-auto min-h-[40vh] w-full max-w-3xl px-6 py-10 sm:px-10">
        <div className="h-8 max-w-md animate-pulse rounded-lg bg-zinc-100" aria-hidden />
      </main>
    );
  }

  if (!session.user) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10">
        <p className="text-sm text-zinc-600">{t("errors.authRequired")}</p>
        <Link href="/login" prefetch={false} className="mt-4 inline-block text-sm font-medium text-emerald-800 underline">
          {t("nav.login")}
        </Link>
      </main>
    );
  }

  if (loading) {
    return <PageHeaderSkeleton />;
  }

  if (error || !detail) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10">
        <p className="text-sm text-red-700">{t("videos.error")}</p>
        <Link href="/videos" prefetch={false} className="mt-6 inline-block text-sm font-medium text-zinc-800 underline">
          {t("videos.title")}
        </Link>
      </main>
    );
  }

  const intentKey = intentLabelKey(detail.intent);
  const thumb = detail.images[0]?.previewUrl?.trim() || null;
  const userCancelledExport =
    latestExport?.status === "failed" &&
    latestExport?.errorMessage?.trim() === EXPORT_CANCELLED_BY_USER_MESSAGE;

  const projectTitle =
    detail.bundleDisplayTitle?.trim() ||
    resolveProjectDisplayTitle(detail.title, dateLocale);
  const projectMode: ProjectDetailModeKind =
    detail.instantMode === "story" ? "story"
    : instantLikeProject ? "transition"
    : "classic";
  const displayStatusKey = statusLabelKey(
    resolveProjectDisplayStatus({
      projectStatus: detail.status,
      exportStatus: latestExport?.status,
      outputVideoUrl: originalPlaybackUrl ?? finalVideoUrl,
    })
  );
  const usesStoryOverlay = projectUsesStoryOverlay({
    instantMode: detail.instantMode ?? "transition",
    instantSceneTexts: detail.instantSceneTexts,
  });
  const cleanVideoUrl = activeCleanVideoUrl;
  const effectiveShowRenderActivityCard = Boolean(
    showRenderActivityCard ||
      (videoRepair.showRepairCard && !originalPlaybackUrl && !showInstantProgress)
  );
  const showRepairQuickAction = videoRepair.showRepairCard && !hasCompletedInstantFinal;

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="mx-auto w-full max-w-3xl overflow-x-hidden px-4 py-8 sm:px-10 sm:py-10">
      <ProjectDetailHeader
        title={projectTitle}
        statusLabelKey={displayStatusKey}
        createdAtIso={detail.createdAt}
        mode={projectMode}
        onRename={() => setRenameOpen(true)}
      />

      {isStudioAiAssistantEnabled() ?
        <div className="mt-6">
          <ProjectTimelinePanel detail={detail} />
        </div>
      : null}

      {detail.draftLineage ? (
        <div className="mt-6">
          <DraftLineageBanner
            lineage={detail.draftLineage}
            variant={detail.status === "draft" ? "full" : "banner"}
          />
        </div>
      ) : null}

      {renameOpen && session.user ? (
        <ProjectBundleSettingsDialog
          open
          projectId={detail.id}
          ownerId={session.user.id}
          projectType={detail.projectType ?? "instant_premium"}
          initialTitle={detail.title ?? null}
          initialBundleName={detail.bundleName ?? null}
          initialBundleKey={detail.bundleKey ?? null}
          peers={(detail.bundlePeers ?? []).map((peer) => ({
            id: peer.id,
            title: peer.title,
            bundleName: peer.bundleName,
            bundleKey: peer.bundleKey,
            projectType: peer.projectType,
          }))}
          onClose={() => setRenameOpen(false)}
          onSaved={(result) => {
            setDetail((prev) =>
              prev
                ? {
                    ...prev,
                    title: result.title,
                    bundleName: result.bundleName,
                    bundleKey: result.bundleKey,
                  }
                : prev
            );
            setRenameOpen(false);
          }}
        />
      ) : null}

      {detail.studioQa && detail.id ?
        <div className="mt-6">
          <MotionProjectStudioQaPanel
            projectId={detail.id}
            studioQa={detail.studioQa}
            syncDisabled={
              detail.status === "generating" || detail.status === "rendering"
            }
            onStudioQaUpdated={(qa) => {
              setDetail((prev) => (prev ? { ...prev, studioQa: qa } : prev));
              if (qa) {
                void load({ silent: true });
              }
            }}
          />
        </div>
      : null}

      {detail.studioAudioExport && detail.id ?
        <div className="mt-6">
          <MotionVoiceSubtitlePanel
            projectId={detail.id}
            audioExport={detail.studioAudioExport}
            storyboardId={detail.studioSource?.storyboardId ?? null}
            voiceMuxWarning={detail.studioAudioExport.lastMux?.error ?? null}
            showRenderControls={detail.status !== "generating" && detail.status !== "rendering"}
            onSettingsChange={(next) => {
              setDetail((prev) =>
                prev ? { ...prev, studioAudioExport: { ...next, hasStudioVoice: next.hasStudioVoice, hasSubtitleTrack: next.hasSubtitleTrack, studioStoryboardId: prev.studioAudioExport?.studioStoryboardId ?? null } } : prev
              );
            }}
          />
        </div>
      : null}

      {detail?.costSummary ?
        <ProjectDetailSection
          id="command-cost"
          titleKey="projectDetail.command.cost"
          descriptionKey="projectDetail.command.costHint"
          className="mt-6"
        >
          <ProjectVideoCostCard
            projectId={id}
            summary={detail.costSummary}
            isAdmin={isAdmin}
          />
        </ProjectDetailSection>
      : null}

      {effectiveShowRenderActivityCard && detail ?
        <ProjectDetailSection
          id="command-status"
          titleKey="projectDetail.command.status"
          descriptionKey="projectDetail.command.statusHint"
          className="mt-6"
        >
        <RenderActivityStatusCard
          projectId={id}
          projectStatus={detail.status}
          exportStatus={latestExport?.status}
          outputVideoUrl={finalVideoUrl}
          startedAtMs={detail.createdAt ? Date.parse(detail.createdAt) : null}
          lastUpdatedAtMs={instantLastPolledAtMs}
          lastProgressAtMs={instantLastProgressChangeAtMs}
          providerJobIds={renderActivityProviderJobIds}
          isAdmin={isAdmin}
          onActionComplete={({ status, projectStatus }) => {
            if (status) {
              setInstantSnapshot(status);
            }
            if (projectStatus === "cancelled" || projectStatus === "failed") {
              invalidateCachedInstantProgressSnapshot(id);
            }
            void load();
            void pollNow();
          }}
        />
        {showInstantProgress ?
          <InstantFinalProgressPanel
            className="mt-4"
            snapshot={instantSnapshot}
            lastPolledAtMs={instantLastPolledAtMs}
            lastProgressChangeAtMs={instantLastProgressChangeAtMs}
            connectionState="polling"
            repairBusy={videoRepair.repairInFlight}
            rebuildBusy={rebuildBusy || Boolean(instantSnapshot?.isRebuildingFinalVideo)}
            isAdmin={isAdmin}
            hideRecoveryActions
            hideAdminDiagnostics
            compactProgressOnly
            showUnifiedRepair={false}
            repairUiView={videoRepair.uiView}
            repairFeedback={videoRepair.feedback}
            pollingError={panelPollingError}
            onRepair={
              videoRepair.showRepairCard ? () => void videoRepair.runRepair() : undefined
            }
            onTextRerender={
              canRebuildInstant && Boolean(finalVideoUrl) ?
                () => setTextRerenderEditorOpen(true)
              : undefined
            }
            onForceRebuild={isAdmin && canRebuildInstant ? () => void rebuildFinalVideo() : undefined}
          />
        : null}
        </ProjectDetailSection>
      : null}

      {showInstantProgress && !effectiveShowRenderActivityCard ? (
        <InstantFinalProgressPanel
          className="mt-6"
          snapshot={instantSnapshot}
          lastPolledAtMs={instantLastPolledAtMs}
          lastProgressChangeAtMs={instantLastProgressChangeAtMs}
          connectionState="polling"
          repairBusy={videoRepair.repairInFlight}
          rebuildBusy={rebuildBusy || Boolean(instantSnapshot?.isRebuildingFinalVideo)}
          isAdmin={isAdmin}
          hideRecoveryActions
          hideAdminDiagnostics
          compactProgressOnly={effectiveShowRenderActivityCard}
          showUnifiedRepair={false}
          repairUiView={videoRepair.uiView}
          repairFeedback={videoRepair.feedback}
          pollingError={panelPollingError}
          onRepair={
            videoRepair.showRepairCard ? () => void videoRepair.runRepair() : undefined
          }
          onTextRerender={
            canRebuildInstant && Boolean(finalVideoUrl) ?
              () => setTextRerenderEditorOpen(true)
            : undefined
          }
          onForceRebuild={isAdmin && canRebuildInstant ? () => void rebuildFinalVideo() : undefined}
        />
      ) : null}

      {showBundlePlayback ? (
        <div className="mt-6 space-y-3">
          {hasMotionVersionCatalog && motionCatalog ?
            <ProjectDetailVersionToolbar
              detail={detail}
              catalog={motionCatalog}
              selectedSlot={selectedCatalogSlot}
              bundleDisplayTitle={detail.bundleDisplayTitle}
              showFailedParentCompletedBadge={showFailedParentCompletedBadge}
              selectedLanguageCode={
                selectedCatalogSlot?.languageCode ??
                catalogSelection.selectedLanguageCode ??
                motionCatalog.defaultLanguageCode
              }
              onLanguageChange={(code) => {
                const slots = motionCatalog.slotsByLanguage[code] ?? [];
                const latest = slots[slots.length - 1];
                if (latest) {
                  setMotionVersionSelection(code, latest.selectionKey, latest.versionNumber);
                }
              }}
              onVersionChange={(key) => {
                const slot = findMotionVersionSlot(motionCatalog, key);
                if (slot) {
                  setMotionVersionSelection(slot.languageCode, key, slot.versionNumber);
                }
              }}
            />
          : null}
          {invalidMotionDeepLink && motionCatalog ? (
            <MotionDeepLinkWarning
              catalog={motionCatalog}
              langFromUrl={langFromUrl}
              verFromUrl={versionFromUrl}
              defaultLanguageCode={motionCatalog.defaultLanguageCode}
              onSelectLatest={setMotionVersionSelection}
            />
          ) : null}
          {videoDisplay.finalIsArchivedFallback && !invalidMotionDeepLink ? (
            <p className="text-xs font-medium text-amber-900">
              {t("projectDetail.versions.finalArchivedFallback")}
            </p>
          ) : null}
          {!invalidMotionDeepLink && (activeFinalVideoUrl ?? originalPlaybackUrl) ? (
          <VideoPreview
            key={playbackCacheKey}
            variant="main"
            controls
            playsInline
            preload="none"
            poster={thumb ?? undefined}
            onError={() => setFinalVideoPlaybackError(true)}
            onLoadedData={() => setFinalVideoPlaybackError(false)}
          >
            <source
              src={activeFinalVideoUrl ?? originalPlaybackUrl ?? undefined}
              type="video/mp4"
            />
          </VideoPreview>
          ) : null}
          {finalVideoPlaybackError ? (
            <p className="text-sm text-red-700">{t("videos.playbackError")}</p>
          ) : null}
          {!hasMotionVersionCatalog && hasCompletedLanguageVersions ?
            <LanguagePlaybackSelector
              originalPlaybackUrl={originalPlaybackUrl}
              languageExports={languageExports}
              playbackState={playbackState}
              onSelectedLanguageChange={setPlaybackLanguage}
              showAdminDebug={false}
            />
          : null}

          {hasCompletedInstantFinal && canFullRerenderInstant ?
            <ProjectRerenderChoices
              disabled={fullRerenderDisabled}
              quickBusy={fullRerenderBusy}
              copyBusy={fullRerenderBusy}
              onQuickRerender={() => void handleQuickFullRerender()}
              onCopyAsConcept={() => void handleCopyAsConcept()}
              onTextOnlyAdjust={() => {
                setTextRerenderEditorOpen(true);
                scrollToSection("version-original");
              }}
            />
          : null}

          <ProjectDetailQuickActions
            leadingSlot={
              id ?
                <VideoVersionDownloadTrigger
                  projectId={selectedCatalogSlot?.sourceProjectId ?? id}
                  originalVideoUrl={activeFinalVideoUrl ?? originalPlaybackUrl}
                  cleanVideoUrl={cleanVideoUrl}
                  languageExports={
                    selectedCatalogSlot?.kind === "language_export" &&
                    selectedCatalogSlot.languageExportId
                      ? languageExports.filter(
                          (row) => row.id === selectedCatalogSlot.languageExportId
                        )
                      : hasMotionVersionCatalog
                        ? []
                        : languageExports
                  }
                  slotDownloadHref={slotDownloadHref}
                  storageAudit={projectStorageAudit}
                />
              : null
            }
            actions={[
              {
                id: "version-center",
                labelKey: "projectDetail.quickActions.versionCenter.label",
                hintKey: "projectDetail.quickActions.versionCenter.hint",
                href: `/videos/${id}/versions`,
                visible: Boolean(instantLikeProject),
              },
              {
                id: "text-rerender",
                labelKey: "projectDetail.quickActions.textOnlyRerender.label",
                hintKey: "projectDetail.quickActions.textOnlyRerender.hint",
                onClick: () => setTextRerenderEditorOpen(true),
                disabled: !canRebuildInstant || !finalVideoUrl,
                busy: rebuildBusy,
                busyLabelKey: "instant.textRerender.busy",
                visible: Boolean(canRebuildInstant && finalVideoUrl && usesStoryOverlay),
              },
              {
                id: "duplicate-project",
                labelKey: "projectDetail.quickActions.copyAsConcept.label",
                hintKey: "projectDetail.quickActions.copyAsConcept.hint",
                onClick: () => void handleCopyAsConcept(),
                busy: fullRerenderBusy,
                visible: Boolean(instantLikeProject && usesStoryOverlay),
              },
              {
                id: "view-clean",
                labelKey: "projectDetail.quickActions.viewClean.label",
                hintKey:
                  hasMotionVersionCatalog && !cleanVideoUrl
                    ? "projectDetail.versions.noCleanForVersion"
                    : "projectDetail.quickActions.viewClean.hint",
                onClick: () => scrollToSection("version-clean"),
                visible: Boolean(cleanVideoUrl || hasMotionVersionCatalog),
                disabled: hasMotionVersionCatalog && !cleanVideoUrl,
              },
              {
                id: "new-language",
                labelKey: "projectDetail.quickActions.newLanguage.label",
                hintKey: "projectDetail.quickActions.newLanguage.hint",
                onClick: () => scrollToSection("version-languages"),
                visible: Boolean(
                  instantLikeProject && hasCompletedInstantFinal && usesStoryOverlay
                ),
              },
              {
                id: "repair",
                labelKey: "projectDetail.quickActions.repair.label",
                hintKey: "projectDetail.quickActions.repair.hint",
                onClick: () => void videoRepair.runRepair(),
                disabled: videoRepair.repairInFlight,
                visible: showRepairQuickAction,
              },
            ]}
          />

          {rebuildInfo ? <p className="text-sm text-emerald-800">{rebuildInfo}</p> : null}
          {rebuildError ? <p className="text-sm text-red-700">{rebuildError}</p> : null}
          {fullRerenderInfo ? <p className="text-sm text-emerald-800">{fullRerenderInfo}</p> : null}
          {fullRerenderError ? <p className="text-sm text-red-700">{fullRerenderError}</p> : null}

          {instantLikeProject && hasMotionVersionCatalog && motionCatalog ?
            <div className="mt-6">
              <ProjectBundleOverviewPanel
                detail={detail}
                catalog={motionCatalog}
                selectedSlot={selectedCatalogSlot}
                onSlotSelect={(slot) => {
                  setMotionVersionSelection(slot.languageCode, slot.selectionKey, slot.versionNumber);
                }}
              />
            </div>
          : null}

          {showProjectStorage && id ?
            <ProjectStorageUsageCard
              projectId={selectedCatalogSlot?.sourceProjectId ?? id}
              isAdmin={isAdmin}
              audit={projectStorageAudit}
              loading={projectStorageLoading}
              error={projectStorageError}
              onRefresh={refreshProjectStorage}
            />
          : null}

          {instantLikeProject && (detail.renderVersions?.length ?? 0) > 0 ?
            <RenderHistoryPanel
              versions={detail.renderVersions ?? []}
              projectId={id}
              onRestored={() => void load()}
            />
          : null}

          {instantLikeProject && hasCompletedInstantFinal ? (
            <VideoVersionsPanel
              layout="detail"
              projectId={id}
              bundleCatalog={motionCatalog}
              cleanVideoUrl={cleanVideoUrl}
              finalVideoUrl={activeFinalVideoUrl ?? originalPlaybackUrl}
              finalIsArchivedFallback={videoDisplay.finalIsArchivedFallback}
              cleanIsLatestBareOnly={videoDisplay.cleanIsLatestBareOnly}
              hideOriginalVideoPlayer
              usesStoryOverlay={usesStoryOverlay}
              instantSceneTexts={detail.instantSceneTexts}
              images={(detail.images ?? []).map((img) => ({
                id: img.id,
                previewUrl: img.previewUrl ?? "",
              }))}
              languageExports={languageExports}
              onLanguageExportsChange={updateLanguageExports}
              onTextsRerendered={() => void load()}
              textRerenderBusy={rebuildBusy}
              rebuildCount={detail.instantFinalRebuildCount ?? 0}
              previousFinalVideoUrl={detail.instantPreviousFinalVideoUrl}
              textVersionNotesJson={detail.instantTextVersionNotesJson}
              onRequestCreateLanguage={() => scrollToSection("version-languages")}
            />
          ) : null}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {!showInstantProgress && !effectiveShowRenderActivityCard ?
            <p className="text-sm text-zinc-600">{t("videos.processing")}</p>
          : null}
          {detail.status === "rendering" && showVideoExportCancel ?
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <button
                type="button"
                disabled={exportCancelBusy}
                onClick={() => {
                  if (!window.confirm(t("animate.export.cancelConfirm"))) {
                    return;
                  }
                  setExportCancelFeedback(null);
                  void (async () => {
                    setExportCancelBusy(true);
                    try {
                      const res = await fetch(
                        `/api/animations/projects/${encodeURIComponent(id)}/export/cancel`,
                        { method: "POST", credentials: "include" }
                      );
                      const data = (await res.json().catch(() => ({}))) as {
                        error?: string;
                      };
                      if (!res.ok) {
                        setExportCancelFeedback(data.error ?? t("animate.export.cancelFailed"));
                        return;
                      }
                      await load();
                    } finally {
                      setExportCancelBusy(false);
                    }
                  })();
                }}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {exportCancelBusy ? t("animate.retry.busy") : t("animate.export.cancel")}
              </button>
              {exportCancelFeedback ?
                <p className="mt-2 text-xs text-red-700">{exportCancelFeedback}</p>
              : null}
            </div>
          : null}
        </div>
      )}

      <details className="mt-10 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
          {t("projectDetail.info.title")}
        </summary>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500">{t("videos.preset")}</dt>
          <dd className="text-right font-medium text-zinc-900">{t(presetTitleKey(detail.presetId ?? "standard"))}</dd>
          {intentKey ? (
            <>
              <dt className="text-zinc-500">{t("videos.intent")}</dt>
              <dd className="text-right font-medium text-zinc-900">{t(intentKey)}</dd>
            </>
          ) : null}
          <dt className="text-zinc-500">{t("videos.duration")}</dt>
          <dd className="text-right font-medium text-zinc-900">{durationLabel}</dd>
          <dt className="text-zinc-500">{t("videos.credits")}</dt>
          <dd className="text-right font-medium text-zinc-900">
            {detail.estimatedCredits != null ? String(detail.estimatedCredits) : "—"}
          </dd>
        </dl>
        {detail.userPrompt?.trim() ? (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("animate.prompt.label")}
            </h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">{detail.userPrompt.trim()}</p>
          </div>
        ) : null}
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("projectDetail.images.title")}
          </h3>
          {detail.images.length === 0 ?
            <p className="mt-2 text-sm text-zinc-600">{t("projectDetail.images.empty")}</p>
          : <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {detail.images.map((img) => (
                <li key={img.id} className="overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
                  {img.previewUrl?.trim() ?
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.previewUrl.trim()}
                      alt={img.fileName}
                      className="aspect-square w-full object-cover"
                      loading="lazy"
                    />
                  : <div className="flex aspect-square items-center justify-center p-2 text-center text-xs text-zinc-400">
                      {img.fileName}
                    </div>
                  }
                </li>
              ))}
            </ul>
          }
        </div>
      </details>

      {!instantLikeProject &&
      (canRetryMergeExport ||
        Boolean(latestExport && (latestExport.status === "failed" || latestExport.errorMessage?.trim()))) ?
        <section
          className={`mt-8 rounded-lg border px-4 py-3 text-sm ${
            mergeStuckRetryOnly || userCancelledExport
              ? "border-amber-200 bg-amber-50/90 text-amber-950"
              : "border-red-100 bg-red-50/80 text-red-900"
          }`}
        >
          <p className="font-medium">{t("projectDetail.export.title")}</p>
          {mergeStuckRetryOnly ?
            <p className="mt-1">{t("videos.exportMergeStuckTitle")}</p>
          : <p className="mt-1">
              {userCancelledExport ? t("animate.export.cancelled") : t("videos.status.failed")}
            </p>
          }
          {isAdmin &&
          !mergeStuckRetryOnly &&
          !userCancelledExport &&
          latestExport?.errorMessage?.trim() ?
            <p className="mt-2 break-words font-mono text-xs text-red-800/90">
              {latestExport.errorMessage.trim()}
            </p>
          : null}
          {canRetryMergeExport ?
            <>
              <p className="mt-2 text-xs leading-relaxed opacity-90">{t("videos.mergeRetryHint")}</p>
              <button
                type="button"
                disabled={retryExportBusy}
                onClick={() => void retryExportMerge()}
                className="mt-3 w-full rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {retryExportBusy ? t("animate.retry.busy") : t("animate.export.retryMerge")}
              </button>
              {retryExportError ? <p className="mt-2 text-xs text-red-800">{retryExportError}</p> : null}
            </>
          : null}
        </section>
      : null}

      {showPlaybackDebugPanel ?
        <details className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
            {t("projectDetail.advanced.title")}
          </summary>
          <div className="mt-4">
            <PlaybackDebugPanel projectId={id} detailPlayback={detail.playback} />
          </div>
        </details>
      : null}

      <details
        className="mt-10 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4"
        open={fragmentsSectionOpen}
        onToggle={(e) => setFragmentsSectionOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer text-sm font-semibold text-zinc-900">{t("videos.fragments")}</summary>
        <p className="mt-2 text-xs text-zinc-600">{t("videos.fragmentsSafariHint")}</p>
        <ul className="mt-4 space-y-4">
          {detail.transitions.length === 0 ? (
            <li className="text-sm text-zinc-600">{t("projectDetail.transitions.empty")}</li>
          ) : (
            detail.transitions.map((tr) => {
              const clipUrl = tr.outputVideoUrl?.trim() ?? "";
              return (
                <li key={tr.id} className="rounded-lg border border-zinc-100 bg-white p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-zinc-800">
                      #{tr.order + 1} · {t(statusLabelKey(tr.status))}
                    </span>
                    <span className="tabular-nums text-zinc-500">{tr.progress}%</span>
                  </div>
                  {clipUrl ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={clipUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
                        >
                          {t("videos.open")}
                        </a>
                        <a
                          href={animationProjectDownloadUrl(id, { segmentOrder: tr.order })}
                          download={`homecheff-motion-${id}-segment-${tr.order + 1}.mp4`}
                          className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
                        >
                          {t("videos.download")}
                        </a>
                      </div>
                      <VideoPreview
                        variant="version"
                        controls
                        playsInline
                        preload="metadata"
                        src={clipUrl}
                      />
                    </div>
                  ) : null}
                  {tr.errorMessage?.trim() ? (
                    <p className="mt-2 text-xs text-red-700">{tr.errorMessage.trim()}</p>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </details>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <Link
          href="/animate/instant"
          prefetch={false}
          className="inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-emerald-50"
        >
          {t("videos.createNew")}
        </Link>
        <button
          type="button"
          disabled={deleteProjectBusy}
          onClick={() => {
            if (!window.confirm(t("videos.deleteProjectConfirm"))) {
              return;
            }
            setDeleteProjectError(null);
            void (async () => {
              setDeleteProjectBusy(true);
              try {
                const res = await fetch(`/api/animations/projects/${encodeURIComponent(id)}`, {
                  method: "DELETE",
                  credentials: "include",
                });
                const data = (await res.json().catch(() => ({}))) as { error?: string };
                if (!res.ok) {
                  setDeleteProjectError(data.error ?? t("videos.deleteProjectFailed"));
                  return;
                }
                router.push("/videos");
                router.refresh();
              } finally {
                setDeleteProjectBusy(false);
              }
            })();
          }}
          className="inline-flex rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleteProjectBusy ? t("animate.retry.busy") : t("videos.deleteProject")}
        </button>
      </div>
      {deleteProjectError ? (
        <p className="mt-3 text-sm text-red-700">{deleteProjectError}</p>
      ) : null}

      {detail && id && instantLikeProject ?
        <FullRerenderEditorModal
          open={fullRerenderEditorOpen}
          onClose={() => setFullRerenderEditorOpen(false)}
          projectId={id}
          instantSceneTexts={detail.instantSceneTexts}
          instantMode={detail.instantMode}
          instantUserIntent={detail.instantUserIntent}
          instantTransitionSeconds={detail.instantTransitionSeconds ?? 5}
          uploadRole={session.user?.role ?? "user"}
          images={(detail.images ?? []).map((img) => ({
            id: img.id,
            previewUrl: img.previewUrl ?? "",
          }))}
          imageCount={detail.images?.length}
          onSuccess={() => {
            setFullRerenderInfo(t("instant.fullRerender.busy"));
            setFullRerenderError(null);
            void load({ silent: true });
          }}
          onRenderStart={() => {
            setFullRerenderBusy(true);
            setFullRerenderError(null);
          }}
          onError={(message) => {
            setFullRerenderError(message);
            setFullRerenderBusy(false);
          }}
        />
      : null}

      {detail && id && usesStoryOverlay ?
        <TextRerenderEditorModal
          open={textRerenderEditorOpen}
          onClose={() => setTextRerenderEditorOpen(false)}
          projectId={id}
          instantSceneTexts={detail.instantSceneTexts}
          images={(detail.images ?? []).map((img) => ({
            id: img.id,
            previewUrl: img.previewUrl ?? "",
          }))}
          imageCount={detail.images?.length}
          onSuccess={(response) => {
            void (async () => {
              setRebuildBusy(true);
              setRebuildInfo(null);
              setRebuildError(null);
              try {
                await applyRebuildResponse(response);
              } catch (e) {
                setRebuildError(e instanceof Error ? e.message : t("instant.textRerender.failed"));
                setRebuildBusy(false);
              }
            })();
          }}
          onRenderStart={() => setRebuildBusy(true)}
          onError={(message) => {
            setRebuildError(message);
            setRebuildBusy(false);
          }}
        />
      : null}
    </main>
  );
}
