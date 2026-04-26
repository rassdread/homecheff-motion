import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t, type TranslationKey } from "@/i18n";
import { fetchAuthSessionJson } from "@/lib/auth-session-client";
import {
  getClientImagePreprocessOptionsForRole,
  preprocessImageFile,
} from "@/lib/image-preprocess";
import type { AuthSessionApiPayload } from "@/lib/auth-session-client";
import { getMaxWorkingImageBytesForUploadRole } from "@/lib/media-export-constants";
import {
  CREDIT_USD,
  estimateProjectCredits,
  estimateProjectUsd,
  getAnimationPreset,
  MAX_ANIMATION_USER_PROMPT_LENGTH,
  MIN_ANIMATION_IMAGES,
  PRESET_IDS_ALL,
  type AnimationPreset,
  type AnimationPresetId,
} from "@/lib/animation-presets";
import {
  estimateAdvancedCredits,
  type AnimationAdvancedResolution,
} from "@/lib/animation-advanced-settings";
import { detectAnimationIntent } from "@/lib/animation-intent-detection";
import { MAX_RAW_ANIMATION_IMAGE_BYTES } from "@/lib/animation-upload-limits";
import { defaultIntentForPreset, type AnimationIntentId } from "@/lib/animation-intents";
import type {
  AnimationImage,
  AnimationTransition,
  AnimationStatus,
  ProjectStatus,
} from "@/types/animation";
import type {
  AnimationUsageResponse,
  CreatedAnimationTransition,
  CreateAnimationProjectErrorBody,
  CreateAnimationProjectRequest,
  CreateAnimationProjectResponse,
  ExportRouteResponse,
  ProjectSnapshotResponse,
  UploadImageResponse,
} from "@/types/animation-api";

function isCreateProjectErrorBody(
  value: unknown
): value is CreateAnimationProjectErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as CreateAnimationProjectErrorBody).error === "string" &&
    !("projectId" in value)
  );
}
const POLL_FAST_MS = 2000;
const POLL_SLOW_MS = 5000;
const POLL_FAST_WINDOW_MS = 30_000;
const POLL_FAILURE_THRESHOLD = 3;
const EXPORT_POLL_FAILURE_THRESHOLD = 3;

function revokePreviewObjectUrl(url: string | undefined | null): void {
  if (!url || !url.startsWith("blob:")) {
    return;
  }
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* ignore double-revoke / invalid */
  }
}

function mapTransitionStatus(server: string): AnimationStatus {
  const normalized = server.toLowerCase();
  if (normalized === "processing") {
    return "generating";
  }
  if (
    normalized === "queued" ||
    normalized === "generating" ||
    normalized === "rendering" ||
    normalized === "completed" ||
    normalized === "failed" ||
    normalized === "idle"
  ) {
    return normalized as AnimationStatus;
  }
  if (normalized === "cancelled") {
    return "failed";
  }
  return "idle";
}

function mapProjectStatus(server: string): ProjectStatus {
  const normalized = server.toLowerCase();
  if (
    normalized === "generating" ||
    normalized === "rendering" ||
    normalized === "completed" ||
    normalized === "failed"
  ) {
    return normalized as ProjectStatus;
  }
  if (normalized === "draft" || normalized === "created") {
    return "idle";
  }
  if (normalized === "cancelled") {
    return "failed";
  }
  return "idle";
}

function buildTransitionsFromDb(
  orderedImages: AnimationImage[],
  dbTrans: CreatedAnimationTransition[]
): AnimationTransition[] {
  const sorted = [...dbTrans].sort((a, b) => a.order - b.order);
  return sorted.map((dt) => {
    const start = orderedImages[dt.order];
    const end = orderedImages[dt.order + 1];
    return {
      id: dt.id,
      order: dt.order,
      startImageName: start?.originalFileName ?? "",
      endImageName: end?.originalFileName ?? "",
      startPreviewUrl: start?.thumbnailPreviewUrl ?? start?.workingPreviewUrl ?? "",
      endPreviewUrl: end?.thumbnailPreviewUrl ?? end?.workingPreviewUrl ?? "",
      status: "queued",
      progress: 0,
      outputVideoUrl: null,
      errorMessage: null,
    };
  });
}

function mapSnapshotToTransitions(
  snapshot: ProjectSnapshotResponse,
  localImages: AnimationImage[]
): AnimationTransition[] {
  const imgs = [...snapshot.images].sort((a, b) => a.order - b.order);
  const imgById = new Map(imgs.map((i) => [i.id, i]));
  const sortedTransitions = [...snapshot.transitions].sort((a, b) => a.order - b.order);

  return sortedTransitions.map((t) => {
    const si = imgById.get(t.startImageId);
    const ei = imgById.get(t.endImageId);
    const localStart = localImages[t.order];
    const localEnd = localImages[t.order + 1];
    return {
      id: t.id,
      order: t.order,
      startImageName: si?.fileName ?? localStart?.originalFileName ?? "",
      endImageName: ei?.fileName ?? localEnd?.originalFileName ?? "",
      startPreviewUrl:
        si?.previewUrl ?? localStart?.thumbnailPreviewUrl ?? localStart?.workingPreviewUrl ?? "",
      endPreviewUrl:
        ei?.previewUrl ?? localEnd?.thumbnailPreviewUrl ?? localEnd?.workingPreviewUrl ?? "",
      status: mapTransitionStatus(t.status),
      progress: t.progress ?? 0,
      outputVideoUrl: t.outputVideoUrl,
      errorMessage: t.errorMessage,
    };
  });
}

function averageTransitionProgress(snapshot: ProjectSnapshotResponse): number {
  if (snapshot.transitions.length === 0) {
    return 0;
  }
  const sum = snapshot.transitions.reduce((acc, tr) => acc + (tr.progress ?? 0), 0);
  return Math.round(sum / snapshot.transitions.length);
}

export function useAnimationWorkflow() {
  const [images, setImages] = useState<AnimationImage[]>([]);
  const [error, setError] = useState<string>("");
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>("idle");
  const [transitions, setTransitions] = useState<AnimationTransition[]>([]);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [jobsStartError, setJobsStartError] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [jobsReady, setJobsReady] = useState(false);
  const [exportPollError, setExportPollError] = useState<string | null>(null);
  const [exportPhaseError, setExportPhaseError] = useState<string | null>(null);
  const [exportProvider, setExportProvider] = useState<string | null>(null);
  const [finalProjectVideoUrl, setFinalProjectVideoUrl] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<AnimationPresetId>("standard");
  const [selectedIntent, setSelectedIntent] = useState<AnimationIntentId>(() =>
    defaultIntentForPreset("standard")
  );
  const [suggestedIntent, setSuggestedIntent] = useState<AnimationIntentId | null>(null);
  const [intentManuallyChanged, setIntentManuallyChanged] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthResolved, setIsAuthResolved] = useState<boolean>(false);
  const [accountInactive, setAccountInactive] = useState(false);
  const [allowedPresetIds, setAllowedPresetIds] = useState<AnimationPresetId[]>([
    "basic",
    "standard",
  ]);
  const [usage, setUsage] = useState<AnimationUsageResponse | null>(null);
  const [usageError, setUsageError] = useState<string>("");
  const [isPersistingAnimation, setIsPersistingAnimation] = useState(false);
  const [pollLastUpdatedAt, setPollLastUpdatedAt] = useState<number | null>(null);
  const [retryJobsBusy, setRetryJobsBusy] = useState(false);
  const [retryPollBusy, setRetryPollBusy] = useState(false);
  const [retryExportPollBusy, setRetryExportPollBusy] = useState(false);
  const [cancelExportBusy, setCancelExportBusy] = useState(false);
  const [canUseAdvancedAnimationControls, setCanUseAdvancedAnimationControls] =
    useState(false);
  const [advancedLimits, setAdvancedLimits] = useState<NonNullable<
    AnimationUsageResponse["advancedLimits"]
  > | null>(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [advancedModel, setAdvancedModel] = useState("viduq3-turbo");
  const [advancedResolution, setAdvancedResolution] =
    useState<AnimationAdvancedResolution>("720p");
  const [advancedDuration, setAdvancedDuration] = useState(5);

  const visiblePresetIds = useMemo(() => {
    return PRESET_IDS_ALL.filter((id) => allowedPresetIds.includes(id));
  }, [allowedPresetIds]);

  const runIdRef = useRef(0);
  const createPresetIdRef = useRef<AnimationPresetId>("standard");
  const createIntentRef = useRef<AnimationIntentId>(defaultIntentForPreset("standard"));
  const createUserPromptRef = useRef("");
  const createAdvancedEnabledRef = useRef(false);
  const createAdvancedModelRef = useRef("viduq3-turbo");
  const createAdvancedResolutionRef = useRef<AnimationAdvancedResolution>("720p");
  const createAdvancedDurationRef = useRef(5);
  const imagesRef = useRef<AnimationImage[]>([]);
  /** Monotonic suffix so client image ids stay unique across add/remove cycles. */
  const imageIdentitySeqRef = useRef(0);
  const pollInFlightRef = useRef(false);
  const pollFailureCountRef = useRef(0);
  /** Successful jobs/start for this project id in the current session (avoids duplicate starts on re-render). */
  const jobsStartedOkForProjectIdRef = useRef<string | null>(null);
  const exportInitSentForProjectIdRef = useRef<string | null>(null);
  const exportPollInFlightRef = useRef(false);
  const exportPollFailureCountRef = useRef(0);
  const imageCompressionRoleRef = useRef<string>("user");

  const activePreset: AnimationPreset = useMemo(
    () => getAnimationPreset(selectedPresetId),
    [selectedPresetId]
  );
  const minImages = MIN_ANIMATION_IMAGES;

  const useAdvancedOverrides =
    canUseAdvancedAnimationControls && advancedMode && advancedLimits !== null;

  const effectiveMaxImages = useMemo(() => {
    if (useAdvancedOverrides) {
      return advancedLimits!.maxImages;
    }
    return activePreset.maxImages;
  }, [useAdvancedOverrides, advancedLimits, activePreset.maxImages]);

  const effectiveMaxTransitions = useMemo(() => {
    if (useAdvancedOverrides) {
      return advancedLimits!.maxTransitions;
    }
    return activePreset.maxTransitions;
  }, [useAdvancedOverrides, advancedLimits, activePreset.maxTransitions]);

  const maxImages = effectiveMaxImages;

  const transitionCount = Math.max(0, images.length - 1);

  const estimatedProjectCredits = useMemo(() => {
    if (useAdvancedOverrides) {
      return estimateAdvancedCredits(
        advancedModel,
        advancedResolution,
        advancedDuration,
        transitionCount
      );
    }
    return estimateProjectCredits(images.length, activePreset);
  }, [
    useAdvancedOverrides,
    advancedModel,
    advancedResolution,
    advancedDuration,
    transitionCount,
    images.length,
    activePreset,
  ]);

  const estimatedProjectUsd = useMemo(() => {
    if (useAdvancedOverrides) {
      return estimatedProjectCredits * CREDIT_USD;
    }
    return estimateProjectUsd(images.length, activePreset);
  }, [useAdvancedOverrides, estimatedProjectCredits, images.length, activePreset]);

  const isProcessing =
    projectStatus === "generating" || projectStatus === "rendering";
  const presetOverImageLimit = images.length > effectiveMaxImages;
  const presetOverTransitionLimit = transitionCount > effectiveMaxTransitions;
  const presetLimitMessage = presetOverImageLimit
    ? t("errors.presetReduceImages", { max: effectiveMaxImages })
    : presetOverTransitionLimit
      ? t("errors.presetMaxTransitions", { max: effectiveMaxTransitions })
      : "";

  const advancedDurationValid =
    !useAdvancedOverrides ||
    (advancedDuration >= 1 &&
      advancedDuration <= (advancedLimits?.maxDurationSeconds ?? 16) &&
      Number.isFinite(advancedDuration));

  const canCreateAnimation =
    images.length >= minImages &&
    images.length <= maxImages &&
    !isProcessing &&
    !presetOverImageLimit &&
    !presetOverTransitionLimit &&
    advancedDurationValid &&
    isAuthenticated &&
    !accountInactive &&
    allowedPresetIds.includes(selectedPresetId) &&
    (usage?.remaining.dailyVideosRemaining ?? 1) > 0 &&
    (usage?.remaining.dailyCreditsRemaining ?? 1) > 0;

  const transitionPairs = useMemo(() => {
    return images.slice(0, -1).map((image, index) => {
      return `${image.originalFileName} -> ${images[index + 1].originalFileName}`;
    });
  }, [images]);

  const overallProgress = useMemo(() => {
    if (transitions.length === 0) {
      return 0;
    }
    return Math.round(
      transitions.reduce((acc, tr) => acc + tr.progress, 0) / transitions.length
    );
  }, [transitions]);

  const anyTransitionFailed = useMemo(
    () => transitions.some((tr) => tr.status === "failed"),
    [transitions]
  );

  const displayOverallProgress = useMemo(() => {
    if (transitions.length === 0) {
      return 0;
    }
    const raw = overallProgress;
    if (projectStatus === "completed") {
      return Math.min(100, Math.max(raw, Math.round(exportProgress)));
    }
    if (projectStatus === "failed") {
      return raw;
    }
    if (projectStatus === "rendering") {
      const merged = Math.max(raw, Math.round(exportProgress));
      return Math.min(99, Math.max(merged, 10));
    }
    if (projectStatus === "generating") {
      const floor = jobsReady ? 15 : 5;
      return Math.min(95, Math.max(raw, floor));
    }
    return raw;
  }, [overallProgress, transitions.length, projectStatus, exportProgress, jobsReady]);

  const displayExportProgress = useMemo(() => {
    if (projectStatus === "rendering") {
      const p = Math.round(exportProgress);
      const isExternalMerge = exportProvider === "external-ffmpeg";
      const floor = isExternalMerge ? 12 : 8;
      return Math.min(99, Math.max(p, p > 0 ? p : floor));
    }
    return Math.round(exportProgress);
  }, [projectStatus, exportProgress, exportProvider]);

  const generationStageKey = useMemo((): TranslationKey | null => {
    if (isPersistingAnimation) {
      return "animate.progress.stagePreparing";
    }
    if (projectStatus === "generating" && jobsStartError) {
      return null;
    }
    if (projectStatus === "generating" && !jobsReady) {
      return "animate.progress.stageStartingAi";
    }
    if (projectStatus === "generating" && jobsReady) {
      const allZero =
        transitions.length > 0 && transitions.every((t) => (t.progress ?? 0) === 0);
      if (allZero) {
        return "animate.progress.stageViduWait";
      }
      return "animate.progress.stageTransitions";
    }
    if (projectStatus === "rendering") {
      if (exportProvider === "external-ffmpeg") {
        return "animate.progress.stageMergingExternal";
      }
      return "animate.progress.stageMerging";
    }
    if (projectStatus === "completed") {
      return "animate.progress.stageCompleted";
    }
    if (projectStatus === "failed") {
      return "animate.progress.stageFailed";
    }
    return null;
  }, [
    isPersistingAnimation,
    projectStatus,
    jobsReady,
    jobsStartError,
    transitions,
    exportProvider,
  ]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const fetchUsage = useCallback(async (opts?: { forceSession?: boolean }) => {
    let session: AuthSessionApiPayload;
    try {
      session = await fetchAuthSessionJson({ force: opts?.forceSession });
    } catch {
      imageCompressionRoleRef.current = "user";
      setIsAuthenticated(false);
      setIsAuthResolved(true);
      setAccountInactive(false);
      setAllowedPresetIds(["basic", "standard"]);
      setCanUseAdvancedAnimationControls(false);
      setAdvancedLimits(null);
      setAdvancedMode(false);
      return;
    }
    if (!session.user) {
      imageCompressionRoleRef.current = "user";
      setIsAuthenticated(false);
      setIsAuthResolved(true);
      setAccountInactive(false);
      setAllowedPresetIds(["basic", "standard"]);
      setCanUseAdvancedAnimationControls(false);
      setAdvancedLimits(null);
      setAdvancedMode(false);
      return;
    }
    setIsAuthenticated(true);
    setIsAuthResolved(true);
    imageCompressionRoleRef.current = session.user.role?.trim() || "user";

    if (session.user.isActive === false) {
      setAccountInactive(true);
      setUsage(null);
      setUsageError(t("animate.auth.inactiveAccount"));
      setAllowedPresetIds([]);
      setCanUseAdvancedAnimationControls(false);
      setAdvancedLimits(null);
      setAdvancedMode(false);
      return;
    }

    setAccountInactive(false);
    setAllowedPresetIds(
      session.allowedPresets?.length ? session.allowedPresets : ["basic", "standard"]
    );
    setCanUseAdvancedAnimationControls(session.canUseAdvancedAnimationControls ?? false);
    setAdvancedLimits(session.advancedLimits ?? null);

    const usageRes = await fetch("/api/animations/usage");
    if (!usageRes.ok) {
      setUsageError(t("animate.usage.unavailable"));
      setUsage(null);
      return;
    }
    const usageBody = (await usageRes.json()) as AnimationUsageResponse;
    if (usageBody.allowedPresets?.length) {
      setAllowedPresetIds(usageBody.allowedPresets);
    }
    if (usageBody.canUseAdvancedAnimationControls !== undefined) {
      setCanUseAdvancedAnimationControls(usageBody.canUseAdvancedAnimationControls);
    }
    if (usageBody.advancedLimits) {
      setAdvancedLimits(usageBody.advancedLimits);
    }
    setUsage(usageBody);
    setUsageError("");
  }, []);

  useEffect(() => {
    if (allowedPresetIds.length === 0) {
      return;
    }
    if (!allowedPresetIds.includes(selectedPresetId)) {
      setSelectedPresetId(allowedPresetIds[0] ?? "standard");
    }
  }, [allowedPresetIds, selectedPresetId]);

  useEffect(() => {
    if (images.length >= minImages) {
      return;
    }
    setIntentManuallyChanged(false);
    setSuggestedIntent(null);
    setSelectedIntent(defaultIntentForPreset(selectedPresetId));
  }, [selectedPresetId, images.length, minImages]);

  useEffect(() => {
    if (intentManuallyChanged || images.length < minImages) {
      return;
    }
    const meta = images.map((img, order) => ({
      originalFileName: img.originalFileName,
      width: img.naturalWidth,
      height: img.naturalHeight,
      mimeType: img.mimeType,
      order,
    }));
    const detected = detectAnimationIntent({ images: meta, userPrompt });
    setSuggestedIntent(detected);
    setSelectedIntent(detected);
  }, [images, userPrompt, intentManuallyChanged, minImages]);

  useEffect(() => {
    void fetchUsage();
  }, [fetchUsage]);

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
    };
  }, []);

  const applySnapshot = useCallback((snapshot: ProjectSnapshotResponse) => {
    if (snapshot.status === "failed") {
      runIdRef.current += 1;
      exportPollFailureCountRef.current = 0;
      setExportPollError(null);
    }
    const locals = imagesRef.current;
    setProjectStatus(mapProjectStatus(snapshot.status));
    setTransitions(mapSnapshotToTransitions(snapshot, locals));

    const latestExport = snapshot.exports[0];
    setExportProvider(latestExport?.provider ?? null);
    const avg = averageTransitionProgress(snapshot);
    if (snapshot.status === "generating") {
      setExportProgress(avg);
      setExportPhaseError(null);
      setFinalProjectVideoUrl(null);
    } else if (snapshot.status === "rendering") {
      setExportProgress(latestExport?.progress ?? 0);
      if (!latestExport || latestExport.status !== "failed") {
        setExportPhaseError(null);
      }
    } else if (latestExport) {
      setExportProgress(latestExport.progress ?? 0);
    } else {
      setExportProgress(avg);
    }

    const ex = latestExport;
    setFinalProjectVideoUrl(
      snapshot.status === "completed" && ex?.outputVideoUrl ? ex.outputVideoUrl : null
    );

    if (snapshot.status === "failed" && ex?.status === "failed" && ex.errorMessage) {
      setExportPhaseError(ex.errorMessage);
      exportInitSentForProjectIdRef.current = null;
    } else if (snapshot.status === "completed") {
      setExportPhaseError(null);
    } else if (snapshot.status === "failed") {
      setExportPhaseError(null);
    }
  }, []);

  const syncFromServer = useCallback(
    async (pid: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/animations/projects/${pid}`);
        if (!response.ok) {
          return false;
        }
        const raw = (await response.json()) as ProjectSnapshotResponse;
        applySnapshot(raw);
        return true;
      } catch {
        return false;
      }
    },
    [applySnapshot]
  );

  const postJobsStart = useCallback(async (pid: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/animations/projects/${pid}/jobs/start`, {
        method: "POST",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setJobsStartError(body.error ?? t("errors.jobsStartFailed"));
        return false;
      }
      setJobsStartError(null);
      return true;
    } catch {
      setJobsStartError(t("errors.jobsStartFailed"));
      return false;
    }
  }, []);

  const postJobsPoll = useCallback(async (pid: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/animations/projects/${pid}/jobs/poll`, {
        method: "POST",
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const postExportStart = useCallback(
    async (pid: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/animations/projects/${pid}/export/start`, {
          method: "POST",
        });
        const data = (await response.json()) as ExportRouteResponse;
        if (!response.ok && !data.project) {
          setExportPhaseError(data.error ?? t("errors.exportStartFailed"));
          return false;
        }
        if (data.project) {
          applySnapshot(data.project);
        }
        if (data.error) {
          setExportPhaseError(data.error);
        } else if (data.project?.status === "completed") {
          setExportPhaseError(null);
        }
        return Boolean(data.project);
      } catch {
        setExportPhaseError(t("errors.exportStartFailed"));
        return false;
      }
    },
    [applySnapshot]
  );

  const postExportPoll = useCallback(async (pid: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/animations/projects/${pid}/export/poll`, {
        method: "POST",
      });
      if (!response.ok) {
        return false;
      }
      const data = (await response.json()) as ExportRouteResponse;
      if (data.project) {
        applySnapshot(data.project);
      }
      return true;
    } catch {
      return false;
    }
  }, [applySnapshot]);

  const postExportCancel = useCallback(
    async (pid: string): Promise<{ ok: boolean; error?: string }> => {
      setCancelExportBusy(true);
      try {
        const response = await fetch(`/api/animations/projects/${pid}/export/cancel`, {
          method: "POST",
        });
        const data = (await response.json()) as ExportRouteResponse & { error?: string };
        if (!response.ok) {
          return { ok: false, error: data.error ?? "Cancel failed." };
        }
        if (data.project) {
          applySnapshot(data.project);
        }
        return { ok: true };
      } catch {
        return { ok: false, error: "Cancel failed." };
      } finally {
        setCancelExportBusy(false);
      }
    },
    [applySnapshot]
  );

  useEffect(() => {
    if (
      !projectId ||
      projectStatus !== "generating" ||
      !jobsReady ||
      jobsStartError ||
      pollError
    ) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const runPollCycle = async () => {
      if (pollInFlightRef.current) {
        return;
      }
      const runSnapshot = runIdRef.current;
      pollInFlightRef.current = true;
      try {
        const pollOk = await postJobsPoll(projectId);
        if (cancelled || runSnapshot !== runIdRef.current) {
          return;
        }
        if (!pollOk) {
          pollFailureCountRef.current += 1;
          if (pollFailureCountRef.current >= POLL_FAILURE_THRESHOLD) {
            setPollError(t("errors.pollFailed"));
          }
          return;
        }

        const syncOk = await syncFromServer(projectId);
        if (cancelled || runSnapshot !== runIdRef.current) {
          return;
        }
        if (!syncOk) {
          pollFailureCountRef.current += 1;
          if (pollFailureCountRef.current >= POLL_FAILURE_THRESHOLD) {
            setPollError(t("errors.pollFailed"));
          }
          return;
        }

        pollFailureCountRef.current = 0;
        setPollError(null);
        setPollLastUpdatedAt(Date.now());
      } finally {
        pollInFlightRef.current = false;
      }
    };

    const scheduleNext = () => {
      if (cancelled) {
        return;
      }
      const elapsed = Date.now() - startedAt;
      const delay = elapsed < POLL_FAST_WINDOW_MS ? POLL_FAST_MS : POLL_SLOW_MS;
      timeoutId = setTimeout(() => {
        void (async () => {
          await runPollCycle();
          if (!cancelled) {
            scheduleNext();
          }
        })();
      }, delay);
    };

    void (async () => {
      await runPollCycle();
      if (!cancelled) {
        scheduleNext();
      }
    })();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [projectId, projectStatus, jobsReady, jobsStartError, pollError, postJobsPoll, syncFromServer]);

  useEffect(() => {
    if (!projectId || projectStatus !== "rendering") {
      return;
    }
    if (anyTransitionFailed) {
      return;
    }
    void (async () => {
      if (exportInitSentForProjectIdRef.current === projectId) {
        return;
      }
      exportInitSentForProjectIdRef.current = projectId;
      try {
        const ok = await postExportStart(projectId);
        if (!ok) {
          exportInitSentForProjectIdRef.current = null;
        }
      } catch {
        exportInitSentForProjectIdRef.current = null;
      }
    })();
  }, [projectId, projectStatus, anyTransitionFailed, postExportStart]);

  useEffect(() => {
    if (!projectId || projectStatus !== "rendering") {
      return;
    }
    if (exportPollError) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const runExportPollCycle = async () => {
      if (exportPollInFlightRef.current) {
        return;
      }
      const runSnapshot = runIdRef.current;
      exportPollInFlightRef.current = true;
      try {
        const ok = await postExportPoll(projectId);
        if (cancelled || runSnapshot !== runIdRef.current) {
          return;
        }
        if (!ok) {
          exportPollFailureCountRef.current += 1;
          if (exportPollFailureCountRef.current >= EXPORT_POLL_FAILURE_THRESHOLD) {
            setExportPollError(t("errors.exportPollFailed"));
          }
          return;
        }
        exportPollFailureCountRef.current = 0;
        setExportPollError(null);
        setPollLastUpdatedAt(Date.now());
      } finally {
        exportPollInFlightRef.current = false;
      }
    };

    const scheduleNext = () => {
      if (cancelled) {
        return;
      }
      const elapsed = Date.now() - startedAt;
      const delay = elapsed < POLL_FAST_WINDOW_MS ? POLL_FAST_MS : POLL_SLOW_MS;
      timeoutId = setTimeout(() => {
        void (async () => {
          await runExportPollCycle();
          if (!cancelled) {
            scheduleNext();
          }
        })();
      }, delay);
    };

    void (async () => {
      await runExportPollCycle();
      if (!cancelled) {
        scheduleNext();
      }
    })();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [projectId, projectStatus, exportPollError, postExportPoll]);

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;

    if (!fileList) {
      return;
    }

    const selectedFiles = Array.from(fileList);
    const remainingSlots = maxImages - images.length;

    if (selectedFiles.length > remainingSlots) {
      setError(t("errors.maxImages", { max: maxImages }));
    } else {
      setError("");
    }

    const acceptedFiles = selectedFiles.slice(0, Math.max(remainingSlots, 0));

    if (acceptedFiles.length === 0) {
      event.target.value = "";
      return;
    }

    const oversizedCount = acceptedFiles.filter(
      (file) => file.size > MAX_RAW_ANIMATION_IMAGE_BYTES
    ).length;
    const invalidTypeCount = acceptedFiles.filter(
      (file) => !file.type.startsWith("image/")
    ).length;

    const safeFiles = acceptedFiles.filter(
      (file) =>
        file.size <= MAX_RAW_ANIMATION_IMAGE_BYTES && file.type.startsWith("image/")
    );

    if (safeFiles.length === 0) {
      if (oversizedCount > 0) {
        setError(t("errors.fileTooLarge", { maxMb: 20 }));
      } else if (invalidTypeCount > 0) {
        setError(t("errors.invalidImageType"));
      }
      event.target.value = "";
      return;
    }

    void (async () => {
      try {
        const processedImages = await Promise.all(
          safeFiles.map(async (file) => {
            const processed = await preprocessImageFile(
              file,
              getClientImagePreprocessOptionsForRole(imageCompressionRoleRef.current)
            );
            return {
              file,
              ...processed,
            };
          })
        );

        setImages((currentImages) => {
          const nextImages = [...currentImages];

          processedImages.forEach((processed) => {
            imageIdentitySeqRef.current += 1;
            const clientUploadId = `${processed.file.name}-${processed.file.lastModified}-u${imageIdentitySeqRef.current}`;
            nextImages.push({
              id: clientUploadId,
              clientUploadId,
              originalFileName: processed.file.name,
              optimizedBlob: processed.optimizedBlob,
              thumbnailBlob: processed.thumbnailBlob,
              workingPreviewUrl: URL.createObjectURL(processed.optimizedBlob),
              thumbnailPreviewUrl: URL.createObjectURL(processed.thumbnailBlob),
              mimeType: processed.mimeType,
              sizeBytes: processed.optimizedBlob.size,
              naturalWidth: processed.naturalWidth,
              naturalHeight: processed.naturalHeight,
            });
          });

          return nextImages;
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        const maxMb =
          Math.round(
            (getMaxWorkingImageBytesForUploadRole(imageCompressionRoleRef.current) / (1024 * 1024)) *
              10
          ) / 10;
        setError(
          msg.includes("remains too large")
            ? t("errors.optimizedTooLarge", { max: maxMb })
            : t("errors.imageProcessFailed")
        );
        event.target.value = "";
        return;
      }

      if (oversizedCount > 0) {
        setError(t("errors.fileTooLarge", { maxMb: 20 }));
      } else if (invalidTypeCount > 0) {
        setError(t("errors.invalidImageType"));
      } else {
        setError("");
      }

      event.target.value = "";
    })();
  }

  function resetOrchestrationState() {
    setJobsStartError(null);
    setPollError(null);
    setJobsReady(false);
    pollFailureCountRef.current = 0;
    jobsStartedOkForProjectIdRef.current = null;
    setExportPollError(null);
    setExportPhaseError(null);
    setExportProvider(null);
    setFinalProjectVideoUrl(null);
    exportPollFailureCountRef.current = 0;
    exportInitSentForProjectIdRef.current = null;
    setPollLastUpdatedAt(null);
  }

  function removeImage(imageId: string) {
    if (isProcessing || isPersistingAnimation) {
      return;
    }

    const nextLength = images.filter((image) => image.id !== imageId).length;

    setImages((currentImages) => {
      const imageToRemove = currentImages.find((image) => image.id === imageId);

      if (imageToRemove) {
        revokePreviewObjectUrl(imageToRemove.workingPreviewUrl);
        revokePreviewObjectUrl(imageToRemove.thumbnailPreviewUrl);
      }

      return currentImages.filter((image) => image.id !== imageId);
    });

    if (nextLength <= maxImages) {
      setError("");
    }

    setTransitions([]);
    setProjectStatus("idle");
    setExportProgress(0);
    setProjectId(null);
    resetOrchestrationState();
  }

  function handleStartOver() {
    runIdRef.current += 1;
    setImages((currentImages) => {
      currentImages.forEach((image) => {
        revokePreviewObjectUrl(image.workingPreviewUrl);
        revokePreviewObjectUrl(image.thumbnailPreviewUrl);
      });
      return [];
    });
    setTransitions([]);
    setProjectStatus("idle");
    setExportProgress(0);
    setProjectId(null);
    resetOrchestrationState();
    setError("");
    setSelectedPresetId("standard");
    createPresetIdRef.current = "standard";
    setIntentManuallyChanged(false);
    setSuggestedIntent(null);
    setSelectedIntent(defaultIntentForPreset("standard"));
    createIntentRef.current = defaultIntentForPreset("standard");
    setUserPrompt("");
    createUserPromptRef.current = "";
    setAdvancedMode(false);
    setAdvancedModel("viduq3-turbo");
    setAdvancedResolution("720p");
    setAdvancedDuration(5);
  }

  const handleAdvancedModeChange = useCallback(
    (next: boolean) => {
      if (next) {
        if (!canUseAdvancedAnimationControls || !advancedLimits) {
          return;
        }
        setAdvancedMode(true);
        setAdvancedModel(advancedLimits.allowedModels[0] ?? "viduq3-turbo");
        const res = advancedLimits.allowedResolutions.includes("720p")
          ? "720p"
          : (advancedLimits.allowedResolutions[0] as AnimationAdvancedResolution);
        setAdvancedResolution(res);
        const p = getAnimationPreset(selectedPresetId);
        setAdvancedDuration(
          Math.min(Math.max(1, p.durationSeconds), advancedLimits.maxDurationSeconds)
        );
        return;
      }
      setAdvancedMode(false);
    },
    [advancedLimits, canUseAdvancedAnimationControls, selectedPresetId]
  );

  async function uploadImageToBlob(image: AnimationImage): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append(
      "workingImage",
      new File([image.optimizedBlob], `working-${image.clientUploadId}`, {
        type: image.mimeType,
      })
    );
    formData.append(
      "thumbnailImage",
      new File([image.thumbnailBlob], `thumb-${image.clientUploadId}`, {
        type: image.mimeType,
      })
    );
    formData.append("originalFileName", image.originalFileName);
    formData.append("mimeType", image.mimeType);
    formData.append("sizeBytes", String(image.sizeBytes));
    formData.append("clientUploadId", image.clientUploadId);

    const response = await fetch("/api/uploads/images", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload image");
    }

    return (await response.json()) as UploadImageResponse;
  }

  async function uploadImagesForProject(): Promise<AnimationImage[]> {
    const uploadedImages = await Promise.all(
      images.map(async (image) => {
        const uploadResult = await uploadImageToBlob(image);
        return {
          ...image,
          workingImageUrl: uploadResult.workingImageUrl,
          thumbnailUrl: uploadResult.thumbnailUrl,
          workingStorageKey: uploadResult.workingStorageKey,
          thumbnailStorageKey: uploadResult.thumbnailStorageKey,
        };
      })
    );

    setImages(uploadedImages);
    return uploadedImages;
  }

  async function persistProject(): Promise<{
    projectId: string;
    dbTransitions: CreatedAnimationTransition[];
    uploadedImages: AnimationImage[];
  }> {
    const uploadedImages = await uploadImagesForProject();

    const trimmedUser = createUserPromptRef.current;
    const payload: CreateAnimationProjectRequest = {
      presetId: createPresetIdRef.current,
      intent: createIntentRef.current,
      ...(trimmedUser.length > 0 ? { userPrompt: trimmedUser } : {}),
      ...(createAdvancedEnabledRef.current
        ? {
            advancedSettings: {
              enabled: true,
              model: createAdvancedModelRef.current,
              resolution: createAdvancedResolutionRef.current,
              durationSeconds: createAdvancedDurationRef.current,
            },
          }
        : {}),
      images: uploadedImages.map((image) => ({
        fileName: image.originalFileName,
        previewUrl: image.thumbnailUrl ?? image.thumbnailPreviewUrl,
        storageKey: image.workingStorageKey,
        workingImageUrl: image.workingImageUrl,
        mimeType: image.mimeType,
        sizeBytes: image.sizeBytes,
      })),
    };

    const response = await fetch("/api/animations/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const rawBody: unknown = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (isCreateProjectErrorBody(rawBody)) {
        if (rawBody.code === "PRESET_MAX_IMAGES" && rawBody.maxImages !== undefined) {
          throw new Error(
            JSON.stringify({ code: "PRESET_MAX_IMAGES", max: rawBody.maxImages, msg: rawBody.error })
          );
        }
        if (rawBody.code === "PRESET_MAX_TRANSITIONS" && rawBody.maxTransitions !== undefined) {
          throw new Error(
            JSON.stringify({
              code: "PRESET_MAX_TRANSITIONS",
              max: rawBody.maxTransitions,
              msg: rawBody.error,
            })
          );
        }
        if (rawBody.code === "PRESET_INVALID") {
          throw new Error(JSON.stringify({ code: "PRESET_INVALID", msg: rawBody.error }));
        }
        if (rawBody.code === "PRESET_NOT_ALLOWED") {
          throw new Error(JSON.stringify({ code: "PRESET_NOT_ALLOWED", msg: rawBody.error }));
        }
        if (rawBody.code === "USER_INACTIVE") {
          throw new Error(JSON.stringify({ code: "USER_INACTIVE", msg: rawBody.error }));
        }
        if (rawBody.code === "USER_PROMPT_TOO_LONG" && typeof rawBody.maxLength === "number") {
          throw new Error(
            JSON.stringify({
              code: "USER_PROMPT_TOO_LONG",
              max: rawBody.maxLength,
              msg: rawBody.error,
            })
          );
        }
        if (rawBody.code === "USER_PROMPT_INVALID") {
          throw new Error(JSON.stringify({ code: "USER_PROMPT_INVALID", msg: rawBody.error }));
        }
        if (
          rawBody.code === "ANIMATION_DAILY_LIMIT" ||
          rawBody.code === "ANIMATION_MONTHLY_LIMIT" ||
          rawBody.code === "ANIMATION_CREDIT_LIMIT" ||
          rawBody.code === "ANIMATION_PRESET_DAILY_LIMIT" ||
          rawBody.code === "ADVANCED_CREDIT_LIMIT"
        ) {
          throw new Error(
            JSON.stringify({
              code: rawBody.code,
              msg: rawBody.error,
              usage: rawBody.usage,
            })
          );
        }
        if (rawBody.code === "ADVANCED_SETTINGS_NOT_ALLOWED") {
          throw new Error(JSON.stringify({ code: "ADVANCED_SETTINGS_NOT_ALLOWED", msg: rawBody.error }));
        }
        if (rawBody.code === "ADVANCED_MODEL_NOT_ALLOWED") {
          throw new Error(JSON.stringify({ code: "ADVANCED_MODEL_NOT_ALLOWED", msg: rawBody.error }));
        }
        if (rawBody.code === "ADVANCED_RESOLUTION_NOT_ALLOWED") {
          throw new Error(
            JSON.stringify({ code: "ADVANCED_RESOLUTION_NOT_ALLOWED", msg: rawBody.error })
          );
        }
        if (rawBody.code === "ADVANCED_DURATION_NOT_ALLOWED") {
          throw new Error(
            JSON.stringify({ code: "ADVANCED_DURATION_NOT_ALLOWED", msg: rawBody.error })
          );
        }
        if (rawBody.code === "ADVANCED_IMAGE_LIMIT" && typeof rawBody.maxImages === "number") {
          throw new Error(
            JSON.stringify({
              code: "ADVANCED_IMAGE_LIMIT",
              max: rawBody.maxImages,
              msg: rawBody.error,
            })
          );
        }
        if (
          rawBody.code === "ADVANCED_TRANSITION_LIMIT" &&
          typeof rawBody.maxTransitions === "number"
        ) {
          throw new Error(
            JSON.stringify({
              code: "ADVANCED_TRANSITION_LIMIT",
              max: rawBody.maxTransitions,
              msg: rawBody.error,
            })
          );
        }
      }
      if (response.status === 401) {
        throw new Error(JSON.stringify({ code: "AUTH_REQUIRED" }));
      }
      throw new Error("Failed to create project");
    }

    const data = rawBody as CreateAnimationProjectResponse;
    setProjectId(data.projectId);
    return {
      projectId: data.projectId,
      dbTransitions: data.transitions,
      uploadedImages,
    };
  }

  async function startJobsForProject(pid: string): Promise<void> {
    if (jobsStartedOkForProjectIdRef.current === pid) {
      setJobsReady(true);
      await syncFromServer(pid);
      return;
    }

    const ok = await postJobsStart(pid);
    if (!ok) {
      setJobsReady(false);
      return;
    }

    jobsStartedOkForProjectIdRef.current = pid;
    setJobsReady(true);
    await syncFromServer(pid);
  }

  async function retryStartJobs() {
    if (!projectId) {
      return;
    }
    setRetryJobsBusy(true);
    try {
      jobsStartedOkForProjectIdRef.current = null;
      setJobsStartError(null);
      await startJobsForProject(projectId);
    } finally {
      setRetryJobsBusy(false);
    }
  }

  async function retryPoll() {
    if (!projectId) {
      return;
    }
    setRetryPollBusy(true);
    try {
      pollFailureCountRef.current = 0;
      setPollError(null);
      const pollOk = await postJobsPoll(projectId);
      if (!pollOk) {
        pollFailureCountRef.current = POLL_FAILURE_THRESHOLD;
        setPollError(t("errors.pollFailed"));
        return;
      }
      const syncOk = await syncFromServer(projectId);
      if (!syncOk) {
        setPollError(t("errors.pollFailed"));
      } else {
        setPollLastUpdatedAt(Date.now());
      }
    } finally {
      setRetryPollBusy(false);
    }
  }

  async function retryExportPoll() {
    if (!projectId) {
      return;
    }
    setRetryExportPollBusy(true);
    try {
      exportPollFailureCountRef.current = 0;
      setExportPollError(null);
      const ok = await postExportPoll(projectId);
      if (!ok) {
        exportPollFailureCountRef.current = EXPORT_POLL_FAILURE_THRESHOLD;
        setExportPollError(t("errors.exportPollFailed"));
      } else {
        setPollLastUpdatedAt(Date.now());
      }
    } finally {
      setRetryExportPollBusy(false);
    }
  }

  async function retryExportMerge() {
    if (!projectId) {
      return;
    }
    exportInitSentForProjectIdRef.current = null;
    setExportPhaseError(null);
    setExportPollError(null);
    exportPollFailureCountRef.current = 0;
    await postExportStart(projectId);
  }

  async function handleCreateAnimation() {
    if (images.length < minImages || images.length > maxImages) {
      setError(t("errors.imageRange", { min: minImages, max: maxImages }));
      return;
    }

    setIsPersistingAnimation(true);
    try {
      setError("");
      setExportProgress(0);
      resetOrchestrationState();
      runIdRef.current += 1;
    createPresetIdRef.current = selectedPresetId;
    createIntentRef.current = selectedIntent;
    const trimmedPrompt = userPrompt
        .trim()
        .slice(0, MAX_ANIMATION_USER_PROMPT_LENGTH);
      createUserPromptRef.current = trimmedPrompt;

      createAdvancedEnabledRef.current = useAdvancedOverrides;
      if (useAdvancedOverrides) {
        createAdvancedModelRef.current = advancedModel;
        createAdvancedResolutionRef.current = advancedResolution;
        createAdvancedDurationRef.current = advancedDuration;
      }

      let persistedProjectId: string;

      try {
        const { projectId: pid, dbTransitions, uploadedImages } = await persistProject();
        persistedProjectId = pid;
        setTransitions(buildTransitionsFromDb(uploadedImages, dbTransitions));
        setProjectStatus("generating");
      } catch (caught) {
      if (caught instanceof Error) {
        try {
          const parsed = JSON.parse(caught.message) as {
            code?: string;
            max?: number;
            msg?: string;
            usage?: AnimationUsageResponse;
          };
          if (parsed.code === "USER_PROMPT_TOO_LONG" && typeof parsed.max === "number") {
            setError(t("errors.userPromptTooLong", { max: parsed.max }));
            return;
          }
          if (parsed.code === "USER_PROMPT_INVALID") {
            setError(t("errors.userPromptInvalid"));
            return;
          }
          if (parsed.code === "PRESET_MAX_IMAGES" && typeof parsed.max === "number") {
            setError(t("errors.presetMaxImages", { max: parsed.max }));
            return;
          }
          if (parsed.code === "PRESET_MAX_TRANSITIONS" && typeof parsed.max === "number") {
            setError(t("errors.presetMaxTransitions", { max: parsed.max }));
            return;
          }
          if (parsed.code === "PRESET_INVALID") {
            setError(t("errors.presetInvalid"));
            return;
          }
          if (parsed.code === "PRESET_NOT_ALLOWED") {
            setError(t("errors.presetNotAllowed"));
            return;
          }
          if (parsed.code === "USER_INACTIVE") {
            setAccountInactive(true);
            setError(t("animate.auth.inactiveAccount"));
            return;
          }
          if (parsed.code === "AUTH_REQUIRED") {
            setIsAuthenticated(false);
            setError(t("errors.authRequired"));
            return;
          }
          if (parsed.code === "ANIMATION_DAILY_LIMIT") {
            setError(t("errors.usage.dailyLimit"));
            if (parsed.usage) {
              setUsage(parsed.usage as AnimationUsageResponse);
            }
            return;
          }
          if (parsed.code === "ANIMATION_MONTHLY_LIMIT") {
            setError(t("errors.usage.monthlyLimit"));
            if (parsed.usage) {
              setUsage(parsed.usage as AnimationUsageResponse);
            }
            return;
          }
          if (parsed.code === "ANIMATION_CREDIT_LIMIT" || parsed.code === "ADVANCED_CREDIT_LIMIT") {
            setError(
              parsed.code === "ADVANCED_CREDIT_LIMIT"
                ? t("errors.advancedCreditLimit")
                : t("errors.usage.creditLimit")
            );
            if (parsed.usage) {
              setUsage(parsed.usage as AnimationUsageResponse);
            }
            return;
          }
          if (parsed.code === "ANIMATION_PRESET_DAILY_LIMIT") {
            setError(t("errors.usage.presetLimit"));
            if (parsed.usage) {
              setUsage(parsed.usage as AnimationUsageResponse);
            }
            return;
          }
          if (parsed.code === "ADVANCED_SETTINGS_NOT_ALLOWED") {
            setError(t("errors.advancedSettingsNotAllowed"));
            return;
          }
          if (parsed.code === "ADVANCED_MODEL_NOT_ALLOWED") {
            setError(t("errors.advancedModelNotAllowed"));
            return;
          }
          if (parsed.code === "ADVANCED_RESOLUTION_NOT_ALLOWED") {
            setError(t("errors.advancedResolutionNotAllowed"));
            return;
          }
          if (parsed.code === "ADVANCED_DURATION_NOT_ALLOWED") {
            setError(t("errors.advancedDurationNotAllowed"));
            return;
          }
          if (parsed.code === "ADVANCED_IMAGE_LIMIT" && typeof parsed.max === "number") {
            setError(t("errors.advancedImageLimit", { max: parsed.max }));
            return;
          }
          if (parsed.code === "ADVANCED_TRANSITION_LIMIT" && typeof parsed.max === "number") {
            setError(t("errors.advancedTransitionLimit", { max: parsed.max }));
            return;
          }
        } catch {
          /* plain Error */
        }
      }
      setError(t("errors.uploadFailed"));
      return;
      }

      await startJobsForProject(persistedProjectId);
    } finally {
      setIsPersistingAnimation(false);
    }
  }

  return {
    images,
    error,
    projectStatus,
    projectId,
    transitions,
    exportProgress,
    exportProvider,
    displayExportProgress,
    overallProgress,
    displayOverallProgress,
    generationStageKey,
    isPersistingAnimation,
    pollLastUpdatedAt,
    retryJobsBusy,
    retryPollBusy,
    retryExportPollBusy,
    anyTransitionFailed,
    finalProjectVideoUrl,
    exportPhaseError,
    exportPollError,
    transitionPairs,
    isProcessing,
    canCreateAnimation,
    minImages,
    maxImages,
    isAuthenticated,
    isAuthResolved,
    accountInactive,
    visiblePresetIds,
    usage,
    usageError,
    fetchUsage,
    selectedPresetId,
    setSelectedPresetId,
    selectedIntent,
    setSelectedIntent,
    suggestedIntent,
    intentManuallyChanged,
    setIntentManuallyChanged,
    userPrompt,
    setUserPrompt,
    activePreset,
    estimatedProjectCredits,
    estimatedProjectUsd,
    presetLimitMessage,
    jobsStartError,
    pollError,
    handleImageSelection,
    removeImage,
    handleCreateAnimation,
    handleStartOver,
    retryStartJobs,
    retryPoll,
    retryExportPoll,
    retryExportMerge,
    cancelExportBusy,
    postExportCancel,
    canUseAdvancedAnimationControls,
    advancedLimits,
    advancedMode,
    handleAdvancedModeChange,
    advancedModel,
    setAdvancedModel,
    advancedResolution,
    setAdvancedResolution,
    advancedDuration,
    setAdvancedDuration,
    useAdvancedOverrides,
  };
}
