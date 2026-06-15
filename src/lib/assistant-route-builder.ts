import { buildCharacterClusterHref } from "@/lib/character-cluster-routes";
import {
  getAssistantAction,
  type AssistantActionId,
} from "@/lib/assistant-action-registry";
import { buildHcHandoffUrl } from "@/lib/homecheff-project-package-core";
import { LIBRARY_HUB_BASE_PATH } from "@/lib/homecheff-suite-route-aliases";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export type AssistantRouteContext = {
  projectId?: string | null;
  projectTitle?: string | null;
  storyboardId?: string | null;
  sourceImage?: string | null;
  assetId?: string | null;
};

export function buildAssistantActionRoute(
  actionId: AssistantActionId,
  context: AssistantRouteContext = {}
): string {
  const base = getAssistantAction(actionId).canonicalRoute;

  switch (actionId) {
    case "create_character":
      return buildCharacterClusterHref("new", {
        hcProject: context.projectId ?? undefined,
        projectTitle: context.projectTitle ?? undefined,
        storyboardId: context.storyboardId ?? undefined,
      });
    case "create_character_from_reference":
      return buildCharacterClusterHref("from-reference", {
        hcProject: context.projectId ?? undefined,
        projectTitle: context.projectTitle ?? undefined,
        storyboardId: context.storyboardId ?? undefined,
        sourceImage: context.sourceImage ?? undefined,
      });
    case "prepare_motion_character":
      return buildCharacterClusterHref("motion-ready", {
        hcProject: context.projectId ?? undefined,
        projectTitle: context.projectTitle ?? undefined,
        storyboardId: context.storyboardId ?? undefined,
      });
    case "create_motion_video":
      if (context.projectId) {
        return buildHcHandoffUrl(context.projectId, "motion");
      }
      return base;
    case "create_fusion":
      if (context.projectId) {
        return `${buildHcHandoffUrl(context.projectId, "editor")}&workflow=combine`;
      }
      return base;
    case "create_publish_export":
      if (context.projectId) {
        return buildHcHandoffUrl(context.projectId, "publish");
      }
      return base;
    case "open_project":
      if (context.projectId) {
        return `/projects?highlight=${encodeURIComponent(context.projectId)}`;
      }
      return base;
    case "rename_project":
      if (context.projectId) {
        return `/projects?rename=${encodeURIComponent(context.projectId)}`;
      }
      return base;
    case "open_asset":
      if (context.assetId) {
        return `${LIBRARY_HUB_BASE_PATH}/browse?asset=${encodeURIComponent(context.assetId)}`;
      }
      if (context.projectId) {
        return `${LIBRARY_HUB_BASE_PATH}/browse?projectId=${encodeURIComponent(context.projectId)}`;
      }
      return base;
    default:
      return base;
  }
}

export function pickLatestAssistantProject(
  projects: HomeCheffProjectPackage[]
): HomeCheffProjectPackage | null {
  if (projects.length === 0) {
    return null;
  }
  return [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}
