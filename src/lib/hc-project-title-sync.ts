import { syncHcProjectTitleInEditorSessions } from "@/lib/editor-canvas-session";
import { renameHcProject } from "@/lib/hc-project-lifecycle";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export const HC_PROJECT_TITLE_CHANGED_EVENT = "hc-project-title-changed";

export type HcProjectTitleChangedDetail = {
  projectId: string;
  title: string;
  project: HomeCheffProjectPackage;
};

export function dispatchHcProjectTitleChanged(project: HomeCheffProjectPackage): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<HcProjectTitleChangedDetail>(HC_PROJECT_TITLE_CHANGED_EVENT, {
      detail: {
        projectId: project.id,
        title: project.title,
        project,
      },
    })
  );
}

export function renameHcProjectEverywhere(input: {
  project: HomeCheffProjectPackage;
  title: string;
  ownerId?: string;
  syncToServer?: boolean;
}): HomeCheffProjectPackage | null {
  const next = renameHcProject(input);
  if (!next) {
    return null;
  }
  syncHcProjectTitleInEditorSessions(next.id, next.title);
  dispatchHcProjectTitleChanged(next);
  return next;
}

export function resolveHcProjectTitleLive(projectId: string): HomeCheffProjectPackage | null {
  return loadHomeCheffProject(projectId);
}
