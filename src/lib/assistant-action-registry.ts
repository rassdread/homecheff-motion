import { buildCharacterClusterHref } from "@/lib/character-cluster-routes";
import { LIBRARY_HUB_BASE_PATH } from "@/lib/homecheff-suite-route-aliases";

export const ASSISTANT_ACTION_IDS = [
  "create_character",
  "create_character_from_reference",
  "prepare_motion_character",
  "create_motion_video",
  "create_fusion",
  "create_publish_export",
  "open_project",
  "rename_project",
  "open_asset",
] as const;

export type AssistantActionId = (typeof ASSISTANT_ACTION_IDS)[number];

export type AssistantActionCategory =
  | "character"
  | "motion"
  | "fusion"
  | "publish"
  | "project"
  | "asset";

export type AssistantActionDefinition = {
  id: AssistantActionId;
  category: AssistantActionCategory;
  description: string;
  canonicalRoute: string;
  /** Registered for Assistant V1 — execution is deferred to future tool handlers. */
  execution: "registry_only";
};

export const ASSISTANT_ACTION_REGISTRY: Record<AssistantActionId, AssistantActionDefinition> = {
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
    description: "Open the editor fusion / combine workflow.",
    canonicalRoute: "/editor?workflow=combine",
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
