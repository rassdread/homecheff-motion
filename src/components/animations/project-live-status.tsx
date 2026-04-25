"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getActiveTranslator } from "@/i18n";
import type { AnimationStatus } from "@/types/animation";

type ProjectImage = {
  id: string;
  order: number;
  fileName: string;
};

type ProjectTransition = {
  id: string;
  order: number;
  startImageId: string;
  endImageId: string;
  status: string;
  progress: number;
};

type ProjectExport = {
  id: string;
  status: string;
  progress: number;
};

type ProjectPayload = {
  id: string;
  status: string;
  createdAt: string | Date;
  images: ProjectImage[];
  transitions: ProjectTransition[];
  exports: ProjectExport[];
};

type ProjectLiveStatusProps = {
  projectId: string;
  initialProject: ProjectPayload;
};

function toAnimationStatus(status: string): AnimationStatus {
  const knownStatuses: AnimationStatus[] = [
    "idle",
    "queued",
    "generating",
    "rendering",
    "completed",
    "failed",
  ];

  return knownStatuses.includes(status as AnimationStatus)
    ? (status as AnimationStatus)
    : "idle";
}

function shouldPoll(project: ProjectPayload): boolean {
  const projectStatus = toAnimationStatus(project.status);
  if (projectStatus === "completed" || projectStatus === "failed") {
    return false;
  }

  if (projectStatus === "generating" || projectStatus === "rendering") {
    return true;
  }

  const hasActiveTransition = project.transitions.some((transition) => {
    const status = toAnimationStatus(transition.status);
    return status === "queued" || status === "generating";
  });

  if (hasActiveTransition) {
    return true;
  }

  const latestExport = project.exports[0];
  return latestExport ? toAnimationStatus(latestExport.status) === "rendering" : false;
}

export function ProjectLiveStatus({
  projectId,
  initialProject,
}: ProjectLiveStatusProps) {
  const t = getActiveTranslator();
  const [project, setProject] = useState<ProjectPayload>(initialProject);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const requestSequenceRef = useRef(0);
  const latestAppliedSequenceRef = useRef(0);

  const pollingActive = shouldPoll(project);

  useEffect(() => {
    if (!pollingActive) {
      return;
    }

    const refreshProject = async () => {
      const requestSequence = requestSequenceRef.current + 1;
      requestSequenceRef.current = requestSequence;

      try {
        const response = await fetch(`/api/animations/projects/${projectId}`);
        if (!response.ok) {
          throw new Error("Polling request failed");
        }

        const latestProject = (await response.json()) as ProjectPayload;

        // Ignore stale responses if a newer request already succeeded.
        if (requestSequence < latestAppliedSequenceRef.current) {
          return;
        }

        latestAppliedSequenceRef.current = requestSequence;
        setProject(latestProject);
        setRefreshError(null);
      } catch {
        setRefreshError(t("projectDetail.refreshError"));
      }
    };

    void refreshProject();

    const intervalId = setInterval(async () => {
      await refreshProject();
    }, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [pollingActive, projectId, t]);

  const imageNameById = useMemo(
    () => new Map(project.images.map((image) => [image.id, image.fileName])),
    [project.images]
  );
  const latestExport = project.exports[0] ?? null;
  const createdAtLabel = new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(project.createdAt));

  return (
    <>
      <AppCard className="mx-auto mt-8 max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">{t("projectDetail.meta.createdAt")}</p>
            <p className="text-sm font-medium text-zinc-800">{createdAtLabel}</p>
            {pollingActive ? (
              <p className="mt-1 text-xs font-medium text-emerald-700">
                {t("projectDetail.liveUpdating")}
              </p>
            ) : null}
            {refreshError ? (
              <p className="mt-1 text-xs text-amber-700">{refreshError}</p>
            ) : null}
          </div>
          <StatusBadge status={toAnimationStatus(project.status)} />
        </div>
      </AppCard>

      <AppCard className="mx-auto mt-8 max-w-3xl">
        <h2 className="text-lg font-semibold">{t("projectDetail.images.title")}</h2>
        {project.images.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">{t("projectDetail.images.empty")}</p>
        ) : (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
            {project.images.map((image) => (
              <li key={image.id}>
                {image.order + 1}. {image.fileName}
              </li>
            ))}
          </ol>
        )}
      </AppCard>

      <AppCard className="mx-auto mt-8 max-w-3xl">
        <h2 className="text-lg font-semibold">{t("projectDetail.transitions.title")}</h2>
        {project.transitions.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">{t("projectDetail.transitions.empty")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {project.transitions.map((transition) => {
              const startName =
                imageNameById.get(transition.startImageId) ?? transition.startImageId;
              const endName =
                imageNameById.get(transition.endImageId) ?? transition.endImageId;

              return (
                <li
                  key={transition.id}
                  className="rounded-2xl border border-emerald-100 bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm text-zinc-700">
                      {startName} {"->"} {endName}
                    </p>
                    <StatusBadge status={toAnimationStatus(transition.status)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AppCard>

      <AppCard className="mx-auto mt-8 max-w-3xl">
        <h2 className="text-lg font-semibold">{t("projectDetail.export.title")}</h2>
        {latestExport ? (
          <div className="mt-3 flex items-center justify-between gap-3">
            <StatusBadge status={toAnimationStatus(latestExport.status)} />
            <p className="text-sm text-zinc-600">{latestExport.progress}%</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">{t("projectDetail.export.empty")}</p>
        )}
      </AppCard>
    </>
  );
}
