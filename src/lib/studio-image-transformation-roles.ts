/**
 * S2B.1 — Map existing Fusion/wizard slot roles onto canonical transformation roles.
 * Does not invent slots the wizards do not already ask for.
 */

import type {
  ImageChangeTarget,
  ImageMaskRegionKind,
  ImageProtectionRule,
  ImageTransformationFamily,
  ImageTransformationOperation,
  ImageTransformationRole,
  ImageTransferRule,
} from "@/types/studio-image-transformation";
import type { EditorFusionPreservationRule } from "@/types/editor-instruction-studio";

export function canonicalRoleFromWizardSlot(slotRole: string, slotId?: string): ImageTransformationRole | null {
  const role = slotRole.trim().toLowerCase();
  const id = (slotId ?? "").toLowerCase();

  if (
    role === "source_image" ||
    id === "source_image" ||
    role === "person_character" ||
    id === "person_character"
  ) {
    return "IDENTITY_REFERENCE";
  }
  if (role === "outfit_reference" || id === "outfit_reference" || id === "clothing_item") {
    return "CLOTHING_REFERENCE";
  }

  switch (role) {
    case "person":
    case "human":
    case "character":
    case "family":
    case "parent":
    case "source":
      return "IDENTITY_REFERENCE";
    case "outfit":
    case "clothing":
    case "clothing_item":
      return "CLOTHING_REFERENCE";
    case "background":
    case "environment":
    case "location":
      return "LOCATION_REFERENCE";
    case "product":
    case "packaging":
      return "PRODUCT_REFERENCE";
    case "logo":
    case "brand":
      return "LOGO_REFERENCE";
    case "style":
    case "mascot_style":
      return "STYLE_REFERENCE";
    case "pose":
      return "POSE_REFERENCE";
    case "object":
    case "creature":
    case "animal":
    case "pet":
    case "property":
    case "crowd":
      return "OBJECT_REFERENCE";
    case "base":
      return "BASE";
    default:
      if (id.includes("outfit") || id.includes("clothing")) {
        return "CLOTHING_REFERENCE";
      }
      if (id.includes("logo")) {
        return "LOGO_REFERENCE";
      }
      if (id.includes("product")) {
        return "PRODUCT_REFERENCE";
      }
      if (id.includes("background") || id.includes("location") || id.includes("environment")) {
        return "LOCATION_REFERENCE";
      }
      if (id === "person" || id === "current" || id === "source" || id === "character") {
        return "IDENTITY_REFERENCE";
      }
      if (id === "base") {
        return "BASE";
      }
      return null;
  }
}

export function isIdentityLikeRole(role: ImageTransformationRole): boolean {
  return role === "IDENTITY_REFERENCE" || role === "FACE_REFERENCE" || role === "BODY_REFERENCE" || role === "BASE";
}

export function negativeTransferForRole(role: ImageTransformationRole): ImageTransferRule {
  switch (role) {
    case "CLOTHING_REFERENCE":
      return {
        referenceRole: role,
        transfer: ["clothing", "clothing.outerwear"],
        doNotTransfer: ["face", "body", "pose", "background", "identity"],
      };
    case "LOCATION_REFERENCE":
      return {
        referenceRole: role,
        transfer: ["location", "background"],
        doNotTransfer: ["people", "transient_objects", "identity"],
      };
    case "PRODUCT_REFERENCE":
      return {
        referenceRole: role,
        transfer: ["product", "packaging"],
        doNotTransfer: ["hands", "table", "background"],
      };
    case "LOGO_REFERENCE":
      return {
        referenceRole: role,
        transfer: ["logo.artwork"],
        doNotTransfer: ["identity", "background"],
      };
    case "STYLE_REFERENCE":
      return {
        referenceRole: role,
        transfer: ["style"],
        doNotTransfer: ["subject_identity", "face", "body"],
      };
    case "POSE_REFERENCE":
      return {
        referenceRole: role,
        transfer: ["pose"],
        doNotTransfer: ["face", "identity", "background"],
      };
    default:
      return {
        referenceRole: role,
        transfer: [],
        doNotTransfer: ["identity"],
      };
  }
}

export function protectionFromFusionRules(
  rules: readonly EditorFusionPreservationRule[],
  operation: ImageTransformationOperation
): ImageProtectionRule[] {
  const out: ImageProtectionRule[] = [];
  const seen = new Set<string>();
  const push = (property: string, level: ImageProtectionRule["level"]) => {
    if (seen.has(property)) {
      return;
    }
    seen.add(property);
    out.push({ property, level });
  };

  for (const rule of rules) {
    if (rule === "face" || rule === "identity") {
      push("face identity", "MUST_PRESERVE");
    }
    if (rule === "hair") {
      push("hairstyle", operation === "HAIR_CHANGE" ? "CAN_CHANGE" : "SHOULD_PRESERVE");
    }
    if (rule === "body_proportions") {
      push("body build", "SHOULD_PRESERVE");
    }
    if (rule === "pose") {
      push("pose", operation === "POSE_CHANGE" ? "CAN_CHANGE" : "SHOULD_PRESERVE");
    }
    if (rule === "expression") {
      push("expression", operation === "EXPRESSION_CHANGE" ? "CAN_CHANGE" : "SHOULD_PRESERVE");
    }
    if (rule === "clothing") {
      push("clothing", operation === "CLOTHING_TRANSFER" ? "CAN_CHANGE" : "SHOULD_PRESERVE");
    }
    if (rule === "logo" || rule === "brand_identity") {
      push("logo artwork", "MUST_PRESERVE");
    }
    if (rule === "product_shape") {
      push("product geometry", "MUST_PRESERVE");
    }
    if (rule === "brand_colors") {
      push("brand colors", "SHOULD_PRESERVE");
    }
  }

  if (operation === "CLOTHING_TRANSFER") {
    push("reference person face", "MUST_NOT_IMPORT_FROM_REFERENCE");
    push("reference body", "MUST_NOT_IMPORT_FROM_REFERENCE");
    push("reference pose", "MUST_NOT_IMPORT_FROM_REFERENCE");
    push("reference background", "MUST_NOT_IMPORT_FROM_REFERENCE");
    push("clothing", "CAN_CHANGE");
  }
  if (operation === "LOCATION_TRANSFER" || operation === "BACKGROUND_REPLACE") {
    push("face identity", "MUST_PRESERVE");
    push("location", "CAN_CHANGE");
    push("people in location reference", "MUST_NOT_IMPORT_FROM_REFERENCE");
  }
  if (operation === "EXPRESSION_CHANGE") {
    push("face identity", "MUST_PRESERVE");
    push("expression", "CAN_CHANGE");
    push("hairstyle", "SHOULD_PRESERVE");
    push("body build", "SHOULD_PRESERVE");
    push("background", "SHOULD_PRESERVE");
  }
  if (operation === "LOGO_PRESERVE") {
    push("logo artwork", "MUST_PRESERVE");
  }
  if (operation === "PRODUCT_PRESERVE") {
    push("product geometry", "MUST_PRESERVE");
  }
  if (operation === "POSE_CHANGE") {
    push("face identity", "MUST_PRESERVE");
    push("pose", "CAN_CHANGE");
  }

  if (out.length === 0) {
    push("face identity", "SHOULD_PRESERVE");
  }
  return out;
}

export function defaultChangeTargets(operation: ImageTransformationOperation): ImageChangeTarget[] {
  switch (operation) {
    case "CLOTHING_TRANSFER":
      return ["clothing.outerwear", "clothing"];
    case "EXPRESSION_CHANGE":
      return ["expression"];
    case "HAIR_CHANGE":
      return ["hair"];
    case "POSE_CHANGE":
      return ["pose"];
    case "BACKGROUND_REPLACE":
      return ["background"];
    case "LOCATION_TRANSFER":
      return ["location", "background"];
    case "STYLE_CHANGE":
      return ["style"];
    case "PRODUCT_PRESERVE":
      return ["product.placement"];
    case "LOGO_PRESERVE":
      return ["logo.placement"];
    case "CAMERA_REFRAME":
      return ["camera.crop"];
    case "OBJECT_TRANSFER":
      return ["object"];
    case "MULTI_CHARACTER_COMPOSITION":
      return ["identity.merge"];
    case "SCENE_RERENDER":
      return ["scene.delta"];
    default:
      return [];
  }
}

export function fusionIntentToOperation(intentId: string): ImageTransformationOperation {
  switch (intentId) {
    case "outfit_from_reference":
    case "person_outfit":
      return "CLOTHING_TRANSFER";
    case "person_background":
      return "LOCATION_TRANSFER";
    case "product_branding":
      return "LOGO_PRESERVE";
    case "product_packaging":
    case "product_environment":
    case "product_family":
      return "PRODUCT_PRESERVE";
    case "character_fusion":
    case "future_child":
    case "genetic_blend":
      return "MULTI_CHARACTER_COMPOSITION";
    case "character_upgrade":
    case "human_into_mascot":
    case "mascot_into_human":
    case "how_will_i_look":
    case "life_timeline":
    case "future_professions":
      return "CHARACTER_REFERENCE_GENERATION";
    case "animal_fusion":
    case "animal_human_fusion":
    case "pet_customization":
    case "fantasy_creature":
      return "OBJECT_TRANSFER";
    case "future_home":
      return "FULL_SCENE_GENERATION";
    case "ad_composition":
      return "PRODUCT_PRESERVE";
    case "social_media_visual":
      return "STYLE_CHANGE";
    case "poster_composition":
    case "campaign_variant":
    case "custom_composition":
    case "multiple_references":
      return "IDENTITY_PRESERVING_EDIT";
    default:
      return "IDENTITY_PRESERVING_EDIT";
  }
}

export function fusionIntentToFamily(intentId: string): ImageTransformationFamily {
  switch (intentId) {
    case "outfit_from_reference":
    case "person_outfit":
      return "OUTFIT";
    case "person_background":
      return "LOCATION_BACKGROUND";
    case "product_branding":
      return "LOGO_BRANDING";
    case "product_packaging":
    case "product_environment":
    case "product_family":
    case "ad_composition":
      return "COMMERCIAL_PRODUCT";
    case "character_fusion":
    case "future_child":
    case "genetic_blend":
      return "MULTI_PERSON";
    case "character_upgrade":
    case "human_into_mascot":
    case "mascot_into_human":
      return "CHARACTER";
    case "how_will_i_look":
    case "life_timeline":
    case "future_professions":
      return "PERSON_TRANSFORM";
    case "animal_fusion":
    case "animal_human_fusion":
    case "pet_customization":
    case "fantasy_creature":
      return "OBJECT_PROP";
    case "future_home":
      return "LOCATION_BACKGROUND";
    case "social_media_visual":
    case "poster_composition":
    case "campaign_variant":
      return "SOCIAL_FUN";
    default:
      return "PERSON_TRANSFORM";
  }
}

export function requiredRolesForOperation(
  operation: ImageTransformationOperation,
  sourcePreset?: string | null
): ImageTransformationRole[] {
  switch (operation) {
    case "CLOTHING_TRANSFER":
      return ["CLOTHING_REFERENCE"];
    case "LOGO_PRESERVE":
      if (sourcePreset === "BUSINESS_LOGO_PLACEMENT" || sourcePreset === "product_branding") {
        return sourcePreset === "BUSINESS_LOGO_PLACEMENT" ? ["LOGO_REFERENCE"] : [];
      }
      return [];
    case "LOCATION_TRANSFER":
      return [];
    case "SCENE_RERENDER":
      return [];
    default:
      return [];
  }
}

export function morphActionToOperation(id: string): ImageTransformationOperation {
  if (id.includes("outfit")) {
    return "CLOTHING_TRANSFER";
  }
  if (id.includes("expression")) {
    return "EXPRESSION_CHANGE";
  }
  if (id.includes("pose")) {
    return "POSE_CHANGE";
  }
  if (id === "preserve_identity") {
    return "IDENTITY_PRESERVING_EDIT";
  }
  return "STYLE_CHANGE";
}

export function morphActionToFamily(id: string): ImageTransformationFamily {
  if (id.includes("outfit")) {
    return "OUTFIT";
  }
  if (id.startsWith("mascot") || id.includes("character") || id.includes("cartoon") || id.includes("avatar")) {
    return "CHARACTER";
  }
  if (id.includes("expression") || id.includes("pose") || id === "preserve_identity") {
    return "PERSON_TRANSFORM";
  }
  return "STYLE";
}

export function preferredMaskForOperation(operation: ImageTransformationOperation): ImageMaskRegionKind[] {
  switch (operation) {
    case "CLOTHING_TRANSFER":
      return ["CLOTHING_REGION"];
    case "EXPRESSION_CHANGE":
      return ["FACE_REGION"];
    case "HAIR_CHANGE":
      return ["HAIR_REGION"];
    case "BACKGROUND_REPLACE":
    case "LOCATION_TRANSFER":
      return ["PERSON_FOREGROUND"];
    case "LOGO_PRESERVE":
      return ["LOGO_PLACEMENT"];
    case "PRODUCT_PRESERVE":
      return ["PRODUCT_REGION"];
    case "OBJECT_TRANSFER":
      return ["OBJECT_REGION"];
    default:
      return [];
  }
}
