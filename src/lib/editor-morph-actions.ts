/**
 * Editor morph actions — human, animal, and mascot transformation routes.
 */

export const EDITOR_MORPH_ACTION_IDS = [
  "human_to_cartoon",
  "human_to_mascot",
  "human_to_cinematic_character",
  "portrait_to_avatar",
  "outfit_change",
  "expression_change",
  "pose_change",
  "preserve_identity",
  "pet_to_cartoon",
  "pet_to_mascot",
  "animal_to_fantasy_creature",
  "animal_expression_change",
  "animal_pose_change",
  "preserve_breed_shape",
  "preserve_fur_pattern",
  "mascot_style_morph",
  "mascot_pose_morph",
  "mascot_expression_morph",
  "mascot_variant_morph",
] as const;

export type EditorMorphActionId = (typeof EDITOR_MORPH_ACTION_IDS)[number];

export type EditorMorphActionTarget = "human" | "animal" | "mascot";

export type EditorMorphActionDefinition = {
  id: EditorMorphActionId;
  target: EditorMorphActionTarget;
  description: string;
  canonicalRoute: string;
};

function morphRoute(id: EditorMorphActionId): string {
  return `/editor?workflow=edit&morph=${id}`;
}

export const EDITOR_MORPH_ACTION_REGISTRY: Record<EditorMorphActionId, EditorMorphActionDefinition> = {
  human_to_cartoon: {
    id: "human_to_cartoon",
    target: "human",
    description: "Transform a realistic person into a cartoon style.",
    canonicalRoute: morphRoute("human_to_cartoon"),
  },
  human_to_mascot: {
    id: "human_to_mascot",
    target: "human",
    description: "Transform a person into a brand mascot style.",
    canonicalRoute: morphRoute("human_to_mascot"),
  },
  human_to_cinematic_character: {
    id: "human_to_cinematic_character",
    target: "human",
    description: "Transform a person into a cinematic character look.",
    canonicalRoute: morphRoute("human_to_cinematic_character"),
  },
  portrait_to_avatar: {
    id: "portrait_to_avatar",
    target: "human",
    description: "Create an avatar from a portrait photo.",
    canonicalRoute: morphRoute("portrait_to_avatar"),
  },
  outfit_change: {
    id: "outfit_change",
    target: "human",
    description: "Change outfit while preserving identity.",
    canonicalRoute: morphRoute("outfit_change"),
  },
  expression_change: {
    id: "expression_change",
    target: "human",
    description: "Change facial expression.",
    canonicalRoute: morphRoute("expression_change"),
  },
  pose_change: {
    id: "pose_change",
    target: "human",
    description: "Change body pose.",
    canonicalRoute: morphRoute("pose_change"),
  },
  preserve_identity: {
    id: "preserve_identity",
    target: "human",
    description: "Edit while keeping identity consistent.",
    canonicalRoute: morphRoute("preserve_identity"),
  },
  pet_to_cartoon: {
    id: "pet_to_cartoon",
    target: "animal",
    description: "Transform a pet into cartoon style.",
    canonicalRoute: morphRoute("pet_to_cartoon"),
  },
  pet_to_mascot: {
    id: "pet_to_mascot",
    target: "animal",
    description: "Transform a pet into a mascot.",
    canonicalRoute: morphRoute("pet_to_mascot"),
  },
  animal_to_fantasy_creature: {
    id: "animal_to_fantasy_creature",
    target: "animal",
    description: "Morph an animal into a fantasy creature.",
    canonicalRoute: morphRoute("animal_to_fantasy_creature"),
  },
  animal_expression_change: {
    id: "animal_expression_change",
    target: "animal",
    description: "Change animal expression.",
    canonicalRoute: morphRoute("animal_expression_change"),
  },
  animal_pose_change: {
    id: "animal_pose_change",
    target: "animal",
    description: "Change animal pose.",
    canonicalRoute: morphRoute("animal_pose_change"),
  },
  preserve_breed_shape: {
    id: "preserve_breed_shape",
    target: "animal",
    description: "Edit while preserving breed shape.",
    canonicalRoute: morphRoute("preserve_breed_shape"),
  },
  preserve_fur_pattern: {
    id: "preserve_fur_pattern",
    target: "animal",
    description: "Edit while preserving fur pattern.",
    canonicalRoute: morphRoute("preserve_fur_pattern"),
  },
  mascot_style_morph: {
    id: "mascot_style_morph",
    target: "mascot",
    description: "Morph mascot visual style.",
    canonicalRoute: morphRoute("mascot_style_morph"),
  },
  mascot_pose_morph: {
    id: "mascot_pose_morph",
    target: "mascot",
    description: "Morph mascot pose.",
    canonicalRoute: morphRoute("mascot_pose_morph"),
  },
  mascot_expression_morph: {
    id: "mascot_expression_morph",
    target: "mascot",
    description: "Morph mascot expression.",
    canonicalRoute: morphRoute("mascot_expression_morph"),
  },
  mascot_variant_morph: {
    id: "mascot_variant_morph",
    target: "mascot",
    description: "Create a mascot brand variant.",
    canonicalRoute: morphRoute("mascot_variant_morph"),
  },
};

export function getEditorMorphAction(id: EditorMorphActionId): EditorMorphActionDefinition {
  return EDITOR_MORPH_ACTION_REGISTRY[id];
}

export function isEditorMorphActionId(id: string): id is EditorMorphActionId {
  return (EDITOR_MORPH_ACTION_IDS as readonly string[]).includes(id);
}

export function buildEditorMorphActionRoute(id: EditorMorphActionId): string {
  return getEditorMorphAction(id).canonicalRoute;
}

export function detectEditorMorphActionFromMessage(message: string): EditorMorphActionId | null {
  const text = message.trim().toLowerCase().replace(/\s+/g, " ");

  if (/maak.*(hond|kat|pet|dier).*(mascot|mascotte)/.test(text) || /pet.*to.*mascot|dog.*mascot/.test(text)) {
    return "pet_to_mascot";
  }
  if (/maak.*(hond|kat|pet|dier).*(cartoon|tekenfilm)/.test(text) || /pet.*cartoon|cartoon.*dog/.test(text)) {
    return "pet_to_cartoon";
  }
  if (/fantasy.*(creature|dier)|dier.*fantasy|fantasy.*pet/.test(text)) {
    return "animal_to_fantasy_creature";
  }

  if (/maak.*(mij|me|mezelf).*(cartoon|tekenfilm)/.test(text) || /make.*me.*cartoon|cartoon.*version.*of.*me/.test(text)) {
    return "human_to_cartoon";
  }
  if (/avatar.*(maken|make)|portrait.*avatar|maak.*avatar/.test(text)) {
    return "portrait_to_avatar";
  }
  if (/cinematic.*(character|person)|maak.*cinematic/.test(text)) {
    return "human_to_cinematic_character";
  }
  if (/outfit.*(change|wissel|aanpassen)|kleding.*(wissel|aanpassen)/.test(text)) {
    return "outfit_change";
  }
  if (/expressie.*(change|aanpassen)|expression.*change/.test(text)) {
    return "expression_change";
  }
  if (/pose.*(change|aanpassen)/.test(text)) {
    return "pose_change";
  }

  if (/mascot.*(style|stijl)|stijl.*mascot/.test(text)) {
    return "mascot_style_morph";
  }
  if (/mascot.*pose/.test(text)) {
    return "mascot_pose_morph";
  }
  if (/mascot.*express/.test(text)) {
    return "mascot_expression_morph";
  }

  return null;
}
