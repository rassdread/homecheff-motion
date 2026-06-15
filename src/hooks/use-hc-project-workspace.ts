"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useHcProjectTitleSync } from "@/hooks/use-hc-project-title-sync";
import {
  defaultHcProjectTitleFallback,
  ensureHcProjectOnModuleStart,
  readHcProjectWorkflowStatus,
  resolveHcProjectSaveMessageKey,
  saveHcProjectAsNewCopy,
  saveHcProjectPackage,
  syncHcProjectIdToUrl,
  type HcProjectSourceModule,
} from "@/lib/hc-project-lifecycle";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import { renameHcProjectEverywhere } from "@/lib/hc-project-title-sync";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

type Options = {
  sourceModule: HcProjectSourceModule;
  ownerId?: string;
  syncToServer?: boolean;
  storyboardId?: string;
  motionProjectId?: string;
  publishProjectId?: string;
  closeHref?: string;
};

export function useHcProjectWorkspace(options: Options) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hcProjectId = searchParams.get("hcProject")?.trim() ?? "";
  const [project, setProject] = useState<HomeCheffProjectPackage | null>(null);
  const [statusMessageKey, setStatusMessageKey] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hcProjectId) {
      const loaded = loadHomeCheffProject(hcProjectId);
      if (loaded) {
        setProject(loaded);
        return;
      }
    }
    const { project: ensured, created } = ensureHcProjectOnModuleStart({
      sourceModule: options.sourceModule,
      hcProjectId: hcProjectId || undefined,
      ownerId: options.ownerId,
      syncToServer: options.syncToServer,
      storyboardId: options.storyboardId,
      motionProjectId: options.motionProjectId,
      publishProjectId: options.publishProjectId,
    });
    setProject(ensured);
    if (created) {
      syncHcProjectIdToUrl(ensured.id);
    }
  }, [
    hcProjectId,
    options.motionProjectId,
    options.ownerId,
    options.publishProjectId,
    options.sourceModule,
    options.storyboardId,
    options.syncToServer,
  ]);

  useHcProjectTitleSync(project?.id, (next) => {
    setProject(next);
    setStatusMessageKey("hcProject.save.nameUpdated");
  });

  const projectTitle = useMemo(
    () =>
      project?.title?.trim() ||
      defaultHcProjectTitleFallback(options.sourceModule),
    [options.sourceModule, project?.title]
  );

  const persistProject = useCallback(
    (next: HomeCheffProjectPackage, created = false, renamed = false) => {
      setProject(next);
      const key = resolveHcProjectSaveMessageKey({
        workflowStatus: readHcProjectWorkflowStatus(next),
        created,
        renamed,
      });
      setStatusMessageKey(key);
      syncHcProjectIdToUrl(next.id);
      return next;
    },
    []
  );

  const saveProject = useCallback(() => {
    if (!project) {
      return;
    }
    setSaving(true);
    const next = saveHcProjectPackage({
      project,
      syncToServer: options.syncToServer,
    });
    persistProject(next, false);
    setSaving(false);
  }, [options.syncToServer, persistProject, project]);

  const saveAsNewProject = useCallback(() => {
    if (!project) {
      return;
    }
    setSaving(true);
    const copy = saveHcProjectAsNewCopy({
      project,
      ownerId: options.ownerId,
      syncToServer: options.syncToServer,
    });
    persistProject(copy, true);
    setSaving(false);
  }, [options.ownerId, options.syncToServer, persistProject, project]);

  const confirmRename = useCallback(
    (title: string) => {
      if (!project) {
        return;
      }
      const next = renameHcProjectEverywhere({
        project,
        title,
        ownerId: options.ownerId,
        syncToServer: options.syncToServer,
      });
      if (next) {
        persistProject(next, false, true);
      }
      setRenameOpen(false);
    },
    [options.ownerId, options.syncToServer, persistProject, project]
  );

  const openInProjects = useCallback(() => {
    if (!project) {
      router.push("/projects");
      return;
    }
    router.push(`/projects?highlight=${encodeURIComponent(project.id)}`);
  }, [project, router]);

  const closeProject = useCallback(() => {
    router.push(options.closeHref ?? "/projects");
  }, [options.closeHref, router]);

  return {
    project,
    setProject,
    projectTitle,
    hcProjectId: project?.id ?? hcProjectId,
    statusMessageKey,
    saving,
    renameOpen,
    setRenameOpen,
    saveProject,
    saveAsNewProject,
    confirmRename,
    openInProjects,
    closeProject,
  };
}
