import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getActiveTranslator } from "@/i18n";
import { preprocessImageFile } from "@/lib/image-preprocess";
import {
  estimateProjectCredits,
  estimateProjectUsd,
  getAnimationPreset,
  MIN_ANIMATION_IMAGES,
  type AnimationPreset,
  type AnimationPresetId,
} from "@/lib/animation-presets";
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
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_OPTIMIZED_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024;
const POLL_INTERVAL_MS = 4000;
const POLL_FAILURE_THRESHOLD = 3;
const EXPORT_POLL_FAILURE_THRESHOLD = 3;

function buildImageId(file: File, index: number): string {
  return `${file.name}-${file.lastModified}-${index}`;
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
  const t = getActiveTranslator();
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
  const [finalProjectVideoUrl, setFinalProjectVideoUrl] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<AnimationPresetId>("standard");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthResolved, setIsAuthResolved] = useState<boolean>(false);
  const [usage, setUsage] = useState<AnimationUsageResponse | null>(null);
  const [usageError, setUsageError] = useState<string>("");

  const runIdRef = useRef(0);
  const createPresetIdRef = useRef<AnimationPresetId>("standard");
  const imagesRef = useRef<AnimationImage[]>([]);
  const pollInFlightRef = useRef(false);
  const pollFailureCountRef = useRef(0);
  /** Successful jobs/start for this project id in the current session (avoids duplicate starts on re-render). */
  const jobsStartedOkForProjectIdRef = useRef<string | null>(null);
  const exportInitSentForProjectIdRef = useRef<string | null>(null);
  const exportPollInFlightRef = useRef(false);
  const exportPollFailureCountRef = useRef(0);

  const activePreset: AnimationPreset = useMemo(
    () => getAnimationPreset(selectedPresetId),
    [selectedPresetId]
  );
  const minImages = MIN_ANIMATION_IMAGES;
  const maxImages = activePreset.maxImages;

  const estimatedProjectCredits = useMemo(
    () => estimateProjectCredits(images.length, activePreset),
    [images.length, activePreset]
  );
  const estimatedProjectUsd = useMemo(
    () => estimateProjectUsd(images.length, activePreset),
    [images.length, activePreset]
  );

  const isProcessing =
    projectStatus === "generating" || projectStatus === "rendering";
  const presetOverImageLimit = images.length > activePreset.maxImages;
  const presetLimitMessage = presetOverImageLimit
    ? t("errors.presetReduceImages", { max: activePreset.maxImages })
    : "";

  const canCreateAnimation =
    images.length >= minImages &&
    images.length <= maxImages &&
    !isProcessing &&
    !presetOverImageLimit &&
    isAuthenticated &&
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

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const fetchUsage = useCallback(async () => {
    const sessionRes = await fetch("/api/auth/session");
    if (!sessionRes.ok) {
      setIsAuthenticated(false);
      setIsAuthResolved(true);
      return;
    }
    const session = (await sessionRes.json()) as { user: { id: string } | null };
    if (!session.user) {
      setIsAuthenticated(false);
      setIsAuthResolved(true);
      return;
    }
    setIsAuthenticated(true);
    setIsAuthResolved(true);

    const usageRes = await fetch("/api/animations/usage");
    if (!usageRes.ok) {
      setUsageError(t("animate.usage.unavailable"));
      setUsage(null);
      return;
    }
    const usageBody = (await usageRes.json()) as AnimationUsageResponse;
    setUsage(usageBody);
    setUsageError("");
  }, [t]);

  useEffect(() => {
    void fetchUsage();
  }, [fetchUsage]);

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      imagesRef.current.forEach((image) => {
        URL.revokeObjectURL(image.workingPreviewUrl);
        URL.revokeObjectURL(image.thumbnailPreviewUrl);
      });
    };
  }, []);

  const applySnapshot = useCallback((snapshot: ProjectSnapshotResponse) => {
    const locals = imagesRef.current;
    setProjectStatus(mapProjectStatus(snapshot.status));
    setTransitions(mapSnapshotToTransitions(snapshot, locals));

    const latestExport = snapshot.exports[0];
    const avg = averageTransitionProgress(snapshot);
    if (snapshot.status === "generating") {
      setExportProgress(avg);
      setExportPhaseError(null);
      setFinalProjectVideoUrl(null);
    } else if (snapshot.status === "rendering") {
      setExportProgress(latestExport?.progress ?? 20);
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
  }, [t]);

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
    [applySnapshot, t]
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
      } finally {
        pollInFlightRef.current = false;
      }
    };

    void runPollCycle();
    const intervalId = setInterval(() => {
      void runPollCycle();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [projectId, projectStatus, jobsReady, jobsStartError, pollError, postJobsPoll, syncFromServer, t]);

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
      } finally {
        exportPollInFlightRef.current = false;
      }
    };

    void runExportPollCycle();
    const intervalId = setInterval(() => {
      void runExportPollCycle();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [projectId, projectStatus, exportPollError, postExportPoll, t]);

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;

    if (!fileList) {
      return;
    }

    const selectedFiles = Array.from(fileList);
    const maxImg = getAnimationPreset(selectedPresetId).maxImages;
    const remainingSlots = maxImg - images.length;

    if (selectedFiles.length > remainingSlots) {
      setError(t("errors.maxImages", { max: maxImg }));
    } else {
      setError("");
    }

    const acceptedFiles = selectedFiles.slice(0, Math.max(remainingSlots, 0));

    if (acceptedFiles.length === 0) {
      event.target.value = "";
      return;
    }

    const oversizedCount = acceptedFiles.filter(
      (file) => file.size > MAX_FILE_SIZE_BYTES
    ).length;
    const invalidTypeCount = acceptedFiles.filter(
      (file) => !file.type.startsWith("image/")
    ).length;

    const safeFiles = acceptedFiles.filter(
      (file) => file.size <= MAX_FILE_SIZE_BYTES && file.type.startsWith("image/")
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
            const processed = await preprocessImageFile(file);
            return {
              file,
              ...processed,
            };
          })
        );

        const oversizedOptimized = processedImages.some(
          (processed) =>
            processed.optimizedBlob.size > MAX_OPTIMIZED_UPLOAD_SIZE_BYTES ||
            processed.thumbnailBlob.size > MAX_OPTIMIZED_UPLOAD_SIZE_BYTES
        );

        if (oversizedOptimized) {
          setError(t("errors.optimizedTooLarge"));
          event.target.value = "";
          return;
        }

        setImages((currentImages) => {
          const nextImages = [...currentImages];

          processedImages.forEach((processed, index) => {
            const clientUploadId = buildImageId(processed.file, currentImages.length + index);
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
            });
          });

          return nextImages;
        });
      } catch {
        setError(t("errors.imageProcessFailed"));
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
    setFinalProjectVideoUrl(null);
    exportPollFailureCountRef.current = 0;
    exportInitSentForProjectIdRef.current = null;
  }

  function removeImage(imageId: string) {
    if (isProcessing) {
      return;
    }

    const maxImg = getAnimationPreset(selectedPresetId).maxImages;
    const nextLength = images.filter((image) => image.id !== imageId).length;

    setImages((currentImages) => {
      const imageToRemove = currentImages.find((image) => image.id === imageId);

      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.workingPreviewUrl);
        URL.revokeObjectURL(imageToRemove.thumbnailPreviewUrl);
      }

      return currentImages.filter((image) => image.id !== imageId);
    });

    if (nextLength <= maxImg) {
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
        URL.revokeObjectURL(image.workingPreviewUrl);
        URL.revokeObjectURL(image.thumbnailPreviewUrl);
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
  }

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

    const payload: CreateAnimationProjectRequest = {
      presetId: createPresetIdRef.current,
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
        if (
          rawBody.code === "ANIMATION_DAILY_LIMIT" ||
          rawBody.code === "ANIMATION_MONTHLY_LIMIT" ||
          rawBody.code === "ANIMATION_CREDIT_LIMIT" ||
          rawBody.code === "ANIMATION_PRESET_DAILY_LIMIT"
        ) {
          throw new Error(
            JSON.stringify({
              code: rawBody.code,
              msg: rawBody.error,
              usage: rawBody.usage,
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
    jobsStartedOkForProjectIdRef.current = null;
    setJobsStartError(null);
    await startJobsForProject(projectId);
  }

  async function retryPoll() {
    if (!projectId) {
      return;
    }
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
    }
  }

  async function retryExportPoll() {
    if (!projectId) {
      return;
    }
    exportPollFailureCountRef.current = 0;
    setExportPollError(null);
    const ok = await postExportPoll(projectId);
    if (!ok) {
      exportPollFailureCountRef.current = EXPORT_POLL_FAILURE_THRESHOLD;
      setExportPollError(t("errors.exportPollFailed"));
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

    setError("");
    setExportProgress(0);
    resetOrchestrationState();
    runIdRef.current += 1;
    createPresetIdRef.current = selectedPresetId;

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
          if (parsed.code === "ANIMATION_CREDIT_LIMIT") {
            setError(t("errors.usage.creditLimit"));
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
        } catch {
          /* plain Error */
        }
      }
      setError(t("errors.uploadFailed"));
      return;
    }

    await startJobsForProject(persistedProjectId);
  }

  return {
    images,
    error,
    projectStatus,
    projectId,
    transitions,
    exportProgress,
    overallProgress,
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
    usage,
    usageError,
    fetchUsage,
    selectedPresetId,
    setSelectedPresetId,
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
  };
}
