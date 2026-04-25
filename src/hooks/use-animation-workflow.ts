import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { getActiveTranslator } from "@/i18n";
import { preprocessImageFile } from "@/lib/image-preprocess";
import type {
  AnimationImage,
  AnimationTransition,
  ProjectStatus,
} from "@/types/animation";
import type {
  CreatedAnimationTransition,
  CreateAnimationProjectRequest,
  CreateAnimationProjectResponse,
  PatchAnimationProjectStatusRequest,
} from "@/types/animation-api";

const MAX_IMAGES = 7;
const MIN_IMAGES = 2;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function buildImageId(file: File, index: number): string {
  return `${file.name}-${file.lastModified}-${index}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function useAnimationWorkflow() {
  const t = getActiveTranslator();
  const [images, setImages] = useState<AnimationImage[]>([]);
  const [error, setError] = useState<string>("");
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>("idle");
  const [transitions, setTransitions] = useState<AnimationTransition[]>([]);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [dbTransitions, setDbTransitions] = useState<CreatedAnimationTransition[]>([]);

  const runIdRef = useRef(0);
  const imagesRef = useRef<AnimationImage[]>([]);

  const isProcessing =
    projectStatus === "generating" || projectStatus === "rendering";
  const canCreateAnimation =
    images.length >= MIN_IMAGES &&
    images.length <= MAX_IMAGES &&
    !isProcessing;

  const transitionPairs = useMemo(() => {
    return images.slice(0, -1).map((image, index) => {
      return `${image.originalFileName} -> ${images[index + 1].originalFileName}`;
    });
  }, [images]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      imagesRef.current.forEach((image) => {
        URL.revokeObjectURL(image.workingPreviewUrl);
        URL.revokeObjectURL(image.thumbnailPreviewUrl);
      });
    };
  }, []);

  function buildTransitions(orderedImages: AnimationImage[]): AnimationTransition[] {
    return orderedImages.slice(0, -1).map((startImage, index) => {
      const endImage = orderedImages[index + 1];
      return {
        id: `${startImage.id}-${endImage.id}-${index}`,
        startImageName: startImage.originalFileName,
        endImageName: endImage.originalFileName,
        startPreviewUrl: startImage.workingPreviewUrl,
        endPreviewUrl: endImage.workingPreviewUrl,
        status: "idle",
        progress: 0,
      };
    });
  }

  function updateTransition(
    transitionId: string,
    updater: (transition: AnimationTransition) => AnimationTransition
  ) {
    setTransitions((currentTransitions) =>
      currentTransitions.map((transition) =>
        transition.id === transitionId ? updater(transition) : transition
      )
    );
  }

  async function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;

    if (!fileList) {
      return;
    }

    const selectedFiles = Array.from(fileList);
    const remainingSlots = MAX_IMAGES - images.length;

    if (selectedFiles.length > remainingSlots) {
      setError(t("errors.maxImages", { max: MAX_IMAGES }));
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

      setImages((currentImages) => {
        const nextImages = [...currentImages];

        processedImages.forEach((processed, index) => {
          nextImages.push({
            id: buildImageId(processed.file, currentImages.length + index),
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
  }

  function removeImage(imageId: string) {
    if (isProcessing) {
      return;
    }

    setImages((currentImages) => {
      const imageToRemove = currentImages.find((image) => image.id === imageId);

      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.workingPreviewUrl);
        URL.revokeObjectURL(imageToRemove.thumbnailPreviewUrl);
      }

      return currentImages.filter((image) => image.id !== imageId);
    });

    setTransitions([]);
    setProjectStatus("idle");
    setExportProgress(0);
    setProjectId(null);
    setDbTransitions([]);
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
    setDbTransitions([]);
    setError("");
  }

  async function patchProjectStatus(
    projectIdToUpdate: string,
    payload: PatchAnimationProjectStatusRequest
  ): Promise<void> {
    const response = await fetch(`/api/animations/projects/${projectIdToUpdate}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to patch project status");
    }
  }

  function findDbTransitionByOrder(order: number): CreatedAnimationTransition | undefined {
    return dbTransitions.find((transition) => transition.order === order);
  }

  async function persistProject(): Promise<string> {
    const payload: CreateAnimationProjectRequest = {
      images: images.map((image) => ({
        fileName: image.originalFileName,
        previewUrl: image.workingPreviewUrl,
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

    if (!response.ok) {
      throw new Error("Failed to create project");
    }

    const data = (await response.json()) as CreateAnimationProjectResponse;
    setProjectId(data.projectId);
    setDbTransitions(data.transitions);
    return data.projectId;
  }

  async function handleCreateAnimation() {
    if (images.length < MIN_IMAGES || images.length > MAX_IMAGES) {
      setError(t("errors.imageRange", { min: MIN_IMAGES, max: MAX_IMAGES }));
      return;
    }

    setError("");
    setExportProgress(0);

    let persistedProjectId: string | null = null;

    try {
      persistedProjectId = await persistProject();
    } catch {
      // Keep mock flow running even if persistence fails.
      console.error(t("errors.createProjectFailed"));
    }

    const workflowTransitions = buildTransitions(images).map((transition) => ({
      ...transition,
      status: "queued" as const,
      progress: 0,
    }));

    setTransitions(workflowTransitions);
    setProjectStatus("generating");
    if (persistedProjectId) {
      void patchProjectStatus(persistedProjectId, { projectStatus: "generating" });
    }

    runIdRef.current += 1;
    const activeRunId = runIdRef.current;

    for (
      let transitionIndex = 0;
      transitionIndex < workflowTransitions.length;
      transitionIndex += 1
    ) {
      if (runIdRef.current !== activeRunId) {
        return;
      }

      const activeTransition = workflowTransitions[transitionIndex];

      updateTransition(activeTransition.id, (transition) => ({
        ...transition,
        status: "generating",
        progress: 0,
      }));
      if (persistedProjectId) {
        const dbTransition = findDbTransitionByOrder(transitionIndex);
        void patchProjectStatus(persistedProjectId, {
          transition: {
            id: dbTransition?.id,
            order: dbTransition ? undefined : transitionIndex,
            status: "generating",
            progress: 0,
          },
        });
      }

      let progress = 0;
      while (progress < 100) {
        if (runIdRef.current !== activeRunId) {
          return;
        }

        const increment = Math.floor(Math.random() * 20) + 10;
        progress = clampProgress(progress + increment);

        updateTransition(activeTransition.id, (transition) => ({
          ...transition,
          progress,
        }));
        if (persistedProjectId) {
          const dbTransition = findDbTransitionByOrder(transitionIndex);
          void patchProjectStatus(persistedProjectId, {
            transition: {
              id: dbTransition?.id,
              order: dbTransition ? undefined : transitionIndex,
              progress,
            },
          });
        }

        await wait(220);
      }

      updateTransition(activeTransition.id, (transition) => ({
        ...transition,
        status: "completed",
        progress: 100,
      }));
      if (persistedProjectId) {
        const dbTransition = findDbTransitionByOrder(transitionIndex);
        void patchProjectStatus(persistedProjectId, {
          transition: {
            id: dbTransition?.id,
            order: dbTransition ? undefined : transitionIndex,
            status: "completed",
            progress: 100,
          },
        });
      }
    }

    if (runIdRef.current !== activeRunId) {
      return;
    }

    setProjectStatus("rendering");
    setExportProgress(0);
    if (persistedProjectId) {
      void patchProjectStatus(persistedProjectId, {
        projectStatus: "rendering",
        exportStatus: {
          status: "rendering",
          progress: 0,
        },
      });
    }

    let renderProgress = 0;
    while (renderProgress < 100) {
      if (runIdRef.current !== activeRunId) {
        return;
      }

      renderProgress = clampProgress(renderProgress + 8);
      setExportProgress(renderProgress);
      if (persistedProjectId) {
        void patchProjectStatus(persistedProjectId, {
          exportStatus: {
            status: "rendering",
            progress: renderProgress,
          },
        });
      }
      await wait(180);
    }

    if (runIdRef.current !== activeRunId) {
      return;
    }

    setProjectStatus("completed");
    if (persistedProjectId) {
      void patchProjectStatus(persistedProjectId, {
        projectStatus: "completed",
        exportStatus: {
          status: "completed",
          progress: 100,
        },
      });
    }
  }

  return {
    images,
    error,
    projectStatus,
    projectId,
    transitions,
    exportProgress,
    transitionPairs,
    isProcessing,
    canCreateAnimation,
    minImages: MIN_IMAGES,
    maxImages: MAX_IMAGES,
    handleImageSelection,
    removeImage,
    handleCreateAnimation,
    handleStartOver,
  };
}
