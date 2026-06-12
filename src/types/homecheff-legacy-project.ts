import type { HomeCheffProjectType } from "@/types/homecheff-project-package";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { PublishProject } from "@/types/publish-overlay";

/** Motion / AnimationProject-compatible legacy input for on-demand conversion. */
export type LegacyMotionProjectInput = {
  id: string;
  title: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  sourceImageUrls?: string[];
  sequenceFrameUrls?: string[];
  durationSec?: number;
  status?: string;
  metadata?: Record<string, unknown>;
};

/** Studio storyboard-compatible legacy input. */
export type LegacyStudioProjectInput = {
  id: string;
  title: string;
  storyboardId?: string;
  sceneIds?: string[];
  sceneTitle?: string;
  sceneDescription?: string;
  sceneImageUrl?: string;
  metadata?: Record<string, unknown>;
};

/** Editor canvas project (session or persisted row). */
export type LegacyEditorProjectInput = {
  id: string;
  name: string;
  document: EditorCanvasDocument;
  status?: "active" | "archived";
  metadata?: Record<string, unknown>;
};

export type LegacyPublishProjectInput = PublishProject;

export type LegacyProjectRegistryEntry = {
  legacyId: string;
  service: HomeCheffProjectType;
  title: string;
  projectFormat: "legacy";
  projectVersion: "legacy";
  isArchived: boolean;
  archivedAt?: string;
  linkedHcProjectId?: string;
  openPath?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type LegacyConversionResult =
  | { ok: true; hcProjectId: string; legacyPreserved: true }
  | { ok: false; reason: string; fallback: "open_legacy" };
