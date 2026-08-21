/**
 * S2G — Thin finish adapter registry over existing engines.
 * Adapters do not own generation; they name the existing execution path.
 */

import type { StudioFinishMode } from "@/types/studio-finish";

export type StudioFinishAdapterId =
  | "local_quick_video"
  | "studio_cloud"
  | "motion_cloud"
  | "motion_existing"
  | "motion_rerender"
  | "homecheff_attach"
  | "language_export"
  | "image_export";

export type StudioFinishAdapterDescriptor = {
  id: StudioFinishAdapterId;
  mode: StudioFinishMode;
  /** Existing product surface the user is routed to (not a new engine). */
  executionSurface:
    | "photo_video_local"
    | "studio_render_panel"
    | "studio_versions_panel"
    | "studio_export_panel"
    | "language_export_panel"
    | "homecheff_handoff";
  supportsCancel: boolean;
  createsRenderVersion: boolean;
};

export const STUDIO_FINISH_ADAPTERS: Record<StudioFinishAdapterId, StudioFinishAdapterDescriptor> =
  {
    local_quick_video: {
      id: "local_quick_video",
      mode: "FREE_LOCAL_VIDEO",
      executionSurface: "photo_video_local",
      supportsCancel: true,
      createsRenderVersion: false,
    },
    studio_cloud: {
      id: "studio_cloud",
      mode: "CLOUD_STUDIO_VIDEO",
      executionSurface: "studio_render_panel",
      supportsCancel: false,
      createsRenderVersion: true,
    },
    motion_cloud: {
      id: "motion_cloud",
      mode: "MOTION_VIDEO",
      executionSurface: "studio_render_panel",
      supportsCancel: false,
      createsRenderVersion: true,
    },
    motion_existing: {
      id: "motion_existing",
      mode: "EXISTING_OUTPUT",
      executionSurface: "studio_export_panel",
      supportsCancel: false,
      createsRenderVersion: false,
    },
    motion_rerender: {
      id: "motion_rerender",
      mode: "RERENDER_VERSION",
      executionSurface: "studio_versions_panel",
      supportsCancel: false,
      createsRenderVersion: true,
    },
    homecheff_attach: {
      id: "homecheff_attach",
      mode: "HOMECHEFF_ATTACH",
      executionSurface: "homecheff_handoff",
      supportsCancel: false,
      createsRenderVersion: false,
    },
    language_export: {
      id: "language_export",
      mode: "LANGUAGE_EXPORT",
      executionSurface: "language_export_panel",
      supportsCancel: false,
      createsRenderVersion: false,
    },
    image_export: {
      id: "image_export",
      mode: "IMAGE_EXPORT",
      executionSurface: "studio_export_panel",
      supportsCancel: false,
      createsRenderVersion: false,
    },
  };

export function getStudioFinishAdapter(
  adapterId: string
): StudioFinishAdapterDescriptor | null {
  return STUDIO_FINISH_ADAPTERS[adapterId as StudioFinishAdapterId] ?? null;
}

export function finishToolForAdapter(adapterId: string): "render" | "versions" | "export" {
  const adapter = getStudioFinishAdapter(adapterId);
  if (!adapter) return "render";
  if (adapter.executionSurface === "studio_versions_panel") return "versions";
  if (
    adapter.executionSurface === "studio_export_panel" ||
    adapter.executionSurface === "homecheff_handoff" ||
    adapter.executionSurface === "language_export_panel"
  ) {
    return "export";
  }
  return "render";
}
