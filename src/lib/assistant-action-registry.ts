import { buildCharacterClusterHref } from "@/lib/character-cluster-routes";
import {
  buildAssistantEditorWorkflowRoute,
  buildCharacterStudioOutfitRoute,
  buildMascotTransformWizardRoute,
} from "@/lib/assistant-editor-routes";
import { buildCharacterStudioFlowHref, buildCharacterStudioHubHref } from "@/lib/character-studio-hub";
import { LIBRARY_HUB_BASE_PATH } from "@/lib/homecheff-suite-route-aliases";

export const ASSISTANT_ACTION_IDS = [
  "create_video_production",
  "create_character",
  "create_character_from_reference",
  "prepare_motion_character",
  "edit_mascot",
  "create_motion_video",
  "create_fusion",
  "create_publish_export",
  "open_project",
  "rename_project",
  "open_asset",
  "prepare_outfit",
  "prepare_logo_placement",
  "prepare_background",
  "prepare_location",
  "prepare_prop",
  "prepare_vehicle",
  "prepare_music",
  "prepare_sfx",
] as const;

export type AssistantActionId = (typeof ASSISTANT_ACTION_IDS)[number];

export type AssistantActionCategory =
  | "character"
  | "motion"
  | "fusion"
  | "publish"
  | "project"
  | "asset"
  | "preparation";

export type AssistantActionDefinition = {
  id: AssistantActionId;
  category: AssistantActionCategory;
  description: string;
  canonicalRoute: string;
  /** Registered for Assistant V1 — execution is deferred to future tool handlers. */
  execution: "registry_only";
};

export const ASSISTANT_ACTION_REGISTRY: Record<AssistantActionId, AssistantActionDefinition> = {
  create_video_production: {
    id: "create_video_production",
    category: "motion",
    description:
      "Start guided Studio creation from natural intent (Experience Packs / Director when useful).",
    canonicalRoute: "/studio/experience",
    execution: "registry_only",
  },
  create_character: {
    id: "create_character",
    category: "character",
    description: "Start the canonical new-character wizard.",
    canonicalRoute: buildCharacterClusterHref("new"),
    execution: "registry_only",
  },
  create_character_from_reference: {
    id: "create_character_from_reference",
    category: "character",
    description: "Derive a character from a reference image via the from-reference flow.",
    canonicalRoute: buildCharacterClusterHref("from-reference"),
    execution: "registry_only",
  },
  prepare_motion_character: {
    id: "prepare_motion_character",
    category: "character",
    description: "Open the motion-ready character preparation wizard.",
    canonicalRoute: buildCharacterClusterHref("motion-ready"),
    execution: "registry_only",
  },
  edit_mascot: {
    id: "edit_mascot",
    category: "character",
    description: "Open the mascot transformation wizard.",
    canonicalRoute: buildMascotTransformWizardRoute(),
    execution: "registry_only",
  },
  create_motion_video: {
    id: "create_motion_video",
    category: "motion",
    description: "Start motion video generation for the active project.",
    canonicalRoute: "/animate/instant",
    execution: "registry_only",
  },
  create_fusion: {
    id: "create_fusion",
    category: "fusion",
    description: "Open Character Studio for character fusion workflows.",
    canonicalRoute: buildCharacterStudioHubHref(),
    execution: "registry_only",
  },
  create_publish_export: {
    id: "create_publish_export",
    category: "publish",
    description: "Open publish export for the active project.",
    canonicalRoute: "/publish",
    execution: "registry_only",
  },
  open_project: {
    id: "open_project",
    category: "project",
    description: "Navigate to a HomeCheff project hub entry.",
    canonicalRoute: "/projects",
    execution: "registry_only",
  },
  rename_project: {
    id: "rename_project",
    category: "project",
    description: "Rename the active HomeCheff project package.",
    canonicalRoute: "/projects",
    execution: "registry_only",
  },
  open_asset: {
    id: "open_asset",
    category: "asset",
    description: "Open a library asset in the consistency browse hub.",
    canonicalRoute: `${LIBRARY_HUB_BASE_PATH}/browse`,
    execution: "registry_only",
  },
  prepare_outfit: {
    id: "prepare_outfit",
    category: "preparation",
    description: "Plan outfit preparation via Character Studio outfit wizard.",
    canonicalRoute: buildCharacterStudioOutfitRoute(),
    execution: "registry_only",
  },
  prepare_logo_placement: {
    id: "prepare_logo_placement",
    category: "preparation",
    description: "Open logo placement & brand protection wizard in Character Studio.",
    canonicalRoute: buildCharacterStudioFlowHref("logo_placement"),
    execution: "registry_only",
  },
  prepare_background: {
    id: "prepare_background",
    category: "preparation",
    description: "Plan background preparation (registry only).",
    canonicalRoute: buildAssistantEditorWorkflowRoute("combine"),
    execution: "registry_only",
  },
  prepare_location: {
    id: "prepare_location",
    category: "preparation",
    description: "Plan location/scene preparation (registry only).",
    canonicalRoute: buildAssistantEditorWorkflowRoute("combine"),
    execution: "registry_only",
  },
  prepare_prop: {
    id: "prepare_prop",
    category: "preparation",
    description: "Plan prop preparation (registry only).",
    canonicalRoute: buildAssistantEditorWorkflowRoute("combine"),
    execution: "registry_only",
  },
  prepare_vehicle: {
    id: "prepare_vehicle",
    category: "preparation",
    description: "Plan vehicle preparation (registry only).",
    canonicalRoute: buildAssistantEditorWorkflowRoute("combine"),
    execution: "registry_only",
  },
  prepare_music: {
    id: "prepare_music",
    category: "preparation",
    description: "Plan music selection for motion (registry only).",
    canonicalRoute: "/animate/instant",
    execution: "registry_only",
  },
  prepare_sfx: {
    id: "prepare_sfx",
    category: "preparation",
    description: "Plan SFX selection for motion (registry only).",
    canonicalRoute: "/animate/instant",
    execution: "registry_only",
  },
};

export function listAssistantActions(): AssistantActionDefinition[] {
  return ASSISTANT_ACTION_IDS.map((id) => ASSISTANT_ACTION_REGISTRY[id]);
}

export function getAssistantAction(id: AssistantActionId): AssistantActionDefinition {
  return ASSISTANT_ACTION_REGISTRY[id];
}

export function isRegisteredAssistantAction(id: string): id is AssistantActionId {
  return (ASSISTANT_ACTION_IDS as readonly string[]).includes(id);
}

export function listAssistantActionsByCategory(
  category: AssistantActionCategory
): AssistantActionDefinition[] {
  return listAssistantActions().filter((action) => action.category === category);
}
