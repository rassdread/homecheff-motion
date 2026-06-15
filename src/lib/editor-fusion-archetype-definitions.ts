import { normalizeFusionIntent } from "@/lib/editor-image-fusion-catalog";
import type { EditorFusionGenerationSettings, EditorFusionIntent } from "@/types/editor-instruction-studio";
import type {
  FusionArchetype,
  FusionArchetypeId,
  FusionArchetypeQuestion,
  FusionArchetypeValidationRule,
  FusionOutputField,
} from "@/lib/editor-fusion-archetype-types";

function defineArchetype(
  input: Omit<FusionArchetype, "wizardAvailable" | "validationRules"> & {
    validationRules?: FusionArchetypeValidationRule[];
    wizardAvailable?: boolean;
  }
): FusionArchetype {
  return {
    wizardAvailable: true,
    validationRules: [],
    ...input,
  };
}

function boolField(key: string, labelKey: string, defaultValue = true): FusionOutputField {
  return { key, type: "boolean", labelKey, defaultValue };
}

function choiceField(
  key: string,
  labelKey: string,
  defaultValue: string,
  choices: string[]
): FusionOutputField {
  return { key, type: "choice", labelKey, defaultValue, choices };
}

function q(
  id: string,
  labelKey: string,
  outputKey: string,
  type: FusionArchetypeQuestion["type"] = "boolean",
  choices?: string[]
): FusionArchetypeQuestion {
  return { id, labelKey, outputKey, type, choices };
}

const PROTECT_FACE_POSE_BG: FusionArchetypeValidationRule[] = [
  { id: "face_unchanged", labelKey: "editor.fusion.validation.faceUnchanged", settingKey: "protectFace", check: "boolean_true" },
  { id: "pose_unchanged", labelKey: "editor.fusion.validation.poseUnchanged", settingKey: "protectPose", check: "boolean_true" },
  { id: "background_unchanged", labelKey: "editor.fusion.validation.backgroundUnchanged", settingKey: "protectBackground", check: "boolean_true" },
];

export const FUSION_ARCHETYPE_DEFINITIONS: FusionArchetype[] = [
  defineArchetype({
    id: "person_background",
    intent: "person_background",
    labelKey: "editor.fusion.archetype.personBackground",
    requiredInputRoles: ["person", "background"],
    defaultOutput: {
      preserveIdentity: true,
      matchLighting: true,
      matchPerspective: true,
      addShadow: true,
      style: "realistic",
    },
    outputFields: [
      boolField("preserveIdentity", "editor.fusion.output.preserveIdentity"),
      boolField("matchLighting", "editor.fusion.output.matchLighting"),
      boolField("matchPerspective", "editor.fusion.output.matchPerspective"),
      boolField("addShadow", "editor.fusion.output.addShadow"),
      choiceField("style", "editor.fusion.output.visualStyle", "realistic", ["realistic", "cartoon", "cinematic"]),
    ],
    questions: [
      q("person", "editor.fusion.question.whichPerson", "personRole", "choice"),
      q("background", "editor.fusion.question.whichBackground", "backgroundRole", "choice"),
      q("style", "editor.fusion.question.realisticOrCinematic", "style", "choice", ["realistic", "cartoon", "cinematic"]),
      q("identity", "editor.fusion.question.preserveIdentityExact", "preserveIdentity"),
    ],
    reviewChecklist: ["identity_preserved", "lighting_matches", "perspective_matches"],
    negativePromptLines: ["Do not change face identity, hairstyle, or clothing unless explicitly requested."],
    validationRules: [
      { id: "identity_preserved", labelKey: "editor.fusion.validation.identityPreserved", settingKey: "preserveIdentity", check: "boolean_true" },
    ],
  }),

  defineArchetype({
    id: "character_prop",
    intent: "ad_composition",
    labelKey: "editor.fusion.archetype.characterProp",
    requiredInputRoles: ["person", "product"],
    defaultOutput: {
      propPlacement: "in_hand",
      scaleAdjust: true,
      preserveCharacterIdentity: true,
    },
    outputFields: [
      choiceField("propPlacement", "editor.fusion.output.propPlacement", "in_hand", ["in_hand", "beside_character", "on_table"]),
      boolField("scaleAdjust", "editor.fusion.output.scaleAdjust"),
      boolField("preserveCharacterIdentity", "editor.fusion.output.preserveCharacterIdentity"),
    ],
    questions: [
      q("character", "editor.fusion.question.whichCharacter", "characterRole", "choice"),
      q("prop", "editor.fusion.question.whichProp", "propRole", "choice"),
      q("placement", "editor.fusion.question.propPlacement", "propPlacement", "choice", ["in_hand", "beside_character", "on_table"]),
    ],
    reviewChecklist: ["character_identity_preserved", "prop_scale_natural"],
    negativePromptLines: ["Do not alter character face or identity."],
    validationRules: [
      { id: "character_identity", labelKey: "editor.fusion.validation.characterIdentity", settingKey: "preserveCharacterIdentity", check: "boolean_true" },
    ],
  }),

  defineArchetype({
    id: "character_outfit",
    intent: "outfit_from_reference",
    labelKey: "editor.fusion.archetype.characterOutfit",
    requiredInputRoles: ["person", "outfit"],
    supportsOutfitItems: true,
    defaultOutput: {
      targetOnly: "clothing",
      clothingOnly: true,
      protectFace: true,
      protectSkin: true,
      protectHair: true,
      protectPose: true,
      protectBackground: true,
      outfitItems: [],
    },
    outputFields: [
      choiceField("targetOnly", "editor.fusion.output.targetOnly", "clothing", ["clothing"]),
      boolField("clothingOnly", "editor.fusion.output.clothingOnly"),
      boolField("protectFace", "editor.fusion.output.protectFace"),
      boolField("protectSkin", "editor.fusion.output.protectSkin", true),
      boolField("protectHair", "editor.fusion.output.protectHair", true),
      boolField("protectPose", "editor.fusion.output.protectPose"),
      boolField("protectBackground", "editor.fusion.output.protectBackground"),
    ],
    questions: [
      q("outfit_ref", "editor.fusion.question.whichOutfit", "outfitRole", "choice"),
      q("clothing_only", "editor.fusion.question.clothingOnly", "clothingOnly"),
      q("face", "editor.fusion.question.protectFace", "protectFace"),
      q("pose", "editor.fusion.question.protectPose", "protectPose"),
      q("background", "editor.fusion.question.protectBackground", "protectBackground"),
    ],
    reviewChecklist: ["face_unchanged", "pose_unchanged", "clothing_updated", "background_unchanged"],
    negativePromptLines: ["Change clothing only. Do not modify face, skin, hair, pose, or background."],
    validationRules: PROTECT_FACE_POSE_BG,
  }),

  defineArchetype({
    id: "mascot_brand_scene",
    intent: "human_into_mascot",
    labelKey: "editor.fusion.archetype.mascotBrandScene",
    requiredInputRoles: ["person", "background"],
    defaultOutput: {
      preserveMascotStyle: true,
      noSkinToneAddition: true,
      preserveBrandColors: true,
      protectLogoGlobe: true,
    },
    outputFields: [
      boolField("preserveMascotStyle", "editor.fusion.output.preserveMascotStyle"),
      boolField("noSkinToneAddition", "editor.fusion.output.noSkinToneAddition"),
      boolField("preserveBrandColors", "editor.fusion.output.preserveBrandColors"),
      boolField("protectLogoGlobe", "editor.fusion.output.protectLogoGlobe"),
    ],
    questions: [
      q("mascot", "editor.fusion.question.whichMascot", "mascotRole", "choice"),
      q("scene", "editor.fusion.question.whichScene", "sceneRole", "choice"),
      q("brand", "editor.fusion.question.preserveBrandColors", "preserveBrandColors"),
    ],
    reviewChecklist: ["mascot_style_preserved", "brand_colors_intact"],
    negativePromptLines: ["Preserve mascot illustration style and brand colors."],
    validationRules: [
      { id: "mascot_style", labelKey: "editor.fusion.validation.mascotStyle", settingKey: "preserveMascotStyle", check: "boolean_true" },
    ],
  }),

  defineArchetype({
    id: "mascot_into_human",
    intent: "mascot_into_human",
    labelKey: "editor.fusion.archetype.mascotIntoHuman",
    requiredInputRoles: ["character"],
    defaultOutput: {
      preserveBrandIdentity: true,
      preserveBrandColors: true,
      preserveLogo: true,
      realismLevel: "stylized_realistic",
    },
    outputFields: [
      boolField("preserveBrandIdentity", "editor.fusion.output.preserveBrandIdentity", true),
      boolField("preserveBrandColors", "editor.fusion.output.preserveBrandColors"),
      boolField("preserveLogo", "editor.fusion.output.preserveLogo", true),
      choiceField("realismLevel", "editor.fusion.output.realismLevel", "stylized_realistic", ["stylized_realistic", "cartoon_human", "photo_realistic"]),
    ],
    questions: [
      q("mascot", "editor.fusion.question.whichMascot", "mascotRole", "choice"),
      q("realism", "editor.fusion.question.realismLevel", "realismLevel", "choice", ["stylized_realistic", "cartoon_human", "photo_realistic"]),
      q("brand", "editor.fusion.question.preserveBrandColors", "preserveBrandColors"),
    ],
    reviewChecklist: ["brand_identity_preserved", "mascot_traits_visible"],
    negativePromptLines: ["Preserve brand identity, logo, and mascot color palette."],
    validationRules: [
      { id: "brand_identity", labelKey: "editor.fusion.validation.brandIdentity", settingKey: "preserveBrandIdentity", check: "boolean_true" },
    ],
  }),

  defineArchetype({
    id: "product_logo_placement",
    intent: "product_branding",
    labelKey: "editor.fusion.archetype.productLogoPlacement",
    requiredInputRoles: ["product", "logo"],
    defaultOutput: {
      preserveLogoExact: true,
      position: "top-right",
      size: "medium",
      perspective: "flat",
      backgroundProtection: true,
    },
    outputFields: [
      boolField("preserveLogoExact", "editor.fusion.output.preserveLogoExact"),
      choiceField("position", "editor.fusion.output.logoPosition", "top-right", ["top-left", "top-right", "bottom-left", "bottom-right", "center"]),
      choiceField("size", "editor.fusion.output.logoSize", "medium", ["small", "medium", "large"]),
      choiceField("perspective", "editor.fusion.output.logoPerspective", "flat", ["flat", "perspective"]),
      boolField("backgroundProtection", "editor.fusion.output.backgroundProtection"),
    ],
    questions: [
      q("position", "editor.fusion.question.logoPosition", "position", "choice", ["top-left", "top-right", "bottom-left", "bottom-right", "center"]),
      q("size", "editor.fusion.question.logoSize", "size", "choice", ["small", "medium", "large"]),
      q("exact", "editor.fusion.question.preserveLogoExact", "preserveLogoExact"),
      q("perspective", "editor.fusion.question.flatOrPerspective", "perspective", "choice", ["flat", "perspective"]),
    ],
    reviewChecklist: ["logo_exact", "position_correct"],
    negativePromptLines: ["Preserve the supplied logo exactly. Do not redraw or stylize the logo."],
    validationRules: [
      { id: "logo_preserved", labelKey: "editor.fusion.validation.logoPreserved", settingKey: "preserveLogoExact", check: "boolean_true" },
    ],
  }),

  defineArchetype({
    id: "product_packaging",
    intent: "product_packaging",
    labelKey: "editor.fusion.archetype.productPackaging",
    requiredInputRoles: ["product"],
    defaultOutput: {
      preserveProductShape: true,
      preserveLogoExact: true,
      packagingStyle: "retail",
      labelPlacement: "front",
    },
    outputFields: [
      boolField("preserveProductShape", "editor.fusion.output.preserveProductShape", true),
      boolField("preserveLogoExact", "editor.fusion.output.preserveLogoExact"),
      choiceField("packagingStyle", "editor.fusion.output.packagingStyle", "retail", ["retail", "ecommerce", "luxury"]),
      choiceField("labelPlacement", "editor.fusion.output.labelPlacement", "front", ["front", "wrap", "top"]),
    ],
    questions: [
      q("packaging", "editor.fusion.question.whichPackaging", "packagingRole", "choice"),
      q("style", "editor.fusion.question.packagingStyle", "packagingStyle", "choice", ["retail", "ecommerce", "luxury"]),
      q("logo", "editor.fusion.question.preserveLogoExact", "preserveLogoExact"),
    ],
    reviewChecklist: ["product_shape_preserved", "logo_preserved"],
    negativePromptLines: ["Preserve product shape and logo exactly."],
    validationRules: [
      { id: "logo_preserved", labelKey: "editor.fusion.validation.logoPreserved", settingKey: "preserveLogoExact", check: "boolean_true" },
    ],
  }),

  defineArchetype({
    id: "product_environment",
    intent: "product_environment",
    labelKey: "editor.fusion.archetype.productEnvironment",
    requiredInputRoles: ["product"],
    defaultOutput: {
      preserveProductShape: true,
      preserveLogoExact: true,
      environmentMood: "lifestyle",
      matchLighting: true,
    },
    outputFields: [
      boolField("preserveProductShape", "editor.fusion.output.preserveProductShape", true),
      boolField("preserveLogoExact", "editor.fusion.output.preserveLogoExact"),
      choiceField("environmentMood", "editor.fusion.output.environmentMood", "lifestyle", ["lifestyle", "studio", "outdoor", "kitchen"]),
      boolField("matchLighting", "editor.fusion.output.matchLighting"),
    ],
    questions: [
      q("environment", "editor.fusion.question.whichEnvironment", "environmentRole", "choice"),
      q("mood", "editor.fusion.question.environmentMood", "environmentMood", "choice", ["lifestyle", "studio", "outdoor", "kitchen"]),
      q("logo", "editor.fusion.question.preserveLogoExact", "preserveLogoExact"),
    ],
    reviewChecklist: ["product_shape_preserved", "environment_cohesive"],
    negativePromptLines: ["Preserve product shape and any visible logos."],
    validationRules: [
      { id: "logo_preserved", labelKey: "editor.fusion.validation.logoPreserved", settingKey: "preserveLogoExact", check: "boolean_true" },
    ],
  }),

  defineArchetype({
    id: "product_family",
    intent: "product_family",
    labelKey: "editor.fusion.archetype.productFamily",
    requiredInputRoles: ["product"],
    defaultOutput: {
      preserveProductShape: true,
      preserveLogoExact: true,
      variantCount: 3,
      layout: "grid",
    },
    outputFields: [
      boolField("preserveProductShape", "editor.fusion.output.preserveProductShape", true),
      boolField("preserveLogoExact", "editor.fusion.output.preserveLogoExact"),
      choiceField("variantCount", "editor.fusion.output.variantCount", "3", ["2", "3", "4", "6"]),
      choiceField("layout", "editor.fusion.output.familyLayout", "grid", ["grid", "row", "hero_plus_variants"]),
    ],
    questions: [
      q("variants", "editor.fusion.question.variantCount", "variantCount", "choice", ["2", "3", "4", "6"]),
      q("layout", "editor.fusion.question.familyLayout", "layout", "choice", ["grid", "row", "hero_plus_variants"]),
      q("logo", "editor.fusion.question.preserveLogoExact", "preserveLogoExact"),
    ],
    reviewChecklist: ["product_family_consistent", "logo_preserved"],
    negativePromptLines: ["Keep product family visually consistent. Preserve logos on all variants."],
    validationRules: [
      { id: "logo_preserved", labelKey: "editor.fusion.validation.logoPreserved", settingKey: "preserveLogoExact", check: "boolean_true" },
    ],
  }),

  defineArchetype({
    id: "multi_character_scene",
    intent: "character_fusion",
    labelKey: "editor.fusion.archetype.multiCharacterScene",
    requiredInputRoles: ["character"],
    minCharacterCount: 2,
    defaultOutput: {
      characterSpacing: "natural",
      interaction: "looking_at_each_other",
      consistentLighting: true,
      preserveIndividualIdentity: true,
    },
    outputFields: [
      choiceField("characterSpacing", "editor.fusion.output.characterSpacing", "natural", ["close", "natural", "wide"]),
      choiceField("interaction", "editor.fusion.output.characterInteraction", "looking_at_each_other", ["high_five", "handshake", "looking_at_each_other", "side_by_side"]),
      boolField("consistentLighting", "editor.fusion.output.consistentLighting"),
      boolField("preserveIndividualIdentity", "editor.fusion.output.preserveIndividualIdentity"),
    ],
    questions: [
      q("characters", "editor.fusion.question.whichCharacters", "characterRoles", "choice"),
      q("interaction", "editor.fusion.question.characterInteraction", "interaction", "choice", ["high_five", "handshake", "looking_at_each_other", "side_by_side"]),
      q("lighting", "editor.fusion.question.consistentLighting", "consistentLighting"),
    ],
    reviewChecklist: ["identities_preserved", "interaction_natural"],
    negativePromptLines: ["Preserve each character's individual identity."],
    validationRules: [
      { id: "identities", labelKey: "editor.fusion.validation.identitiesPreserved", settingKey: "preserveIndividualIdentity", check: "boolean_true" },
    ],
  }),

  defineArchetype({
    id: "style_fusion",
    intent: "character_upgrade",
    labelKey: "editor.fusion.archetype.styleFusion",
    requiredInputRoles: ["character", "style"],
    defaultOutput: {
      styleStrength: 70,
      preserveComposition: true,
      preserveFaces: true,
      adoptColorPalette: true,
    },
    outputFields: [
      choiceField("styleStrength", "editor.fusion.output.styleStrength", "70", ["40", "55", "70", "85"]),
      boolField("preserveComposition", "editor.fusion.output.preserveComposition"),
      boolField("preserveFaces", "editor.fusion.output.preserveFaces"),
      boolField("adoptColorPalette", "editor.fusion.output.adoptColorPalette"),
    ],
    questions: [
      q("content", "editor.fusion.question.contentImage", "contentRole", "choice"),
      q("style", "editor.fusion.question.styleReference", "styleRole", "choice"),
      q("strength", "editor.fusion.question.styleStrength", "styleStrength", "choice", ["40", "55", "70", "85"]),
    ],
    reviewChecklist: ["style_applied", "faces_recognizable"],
    negativePromptLines: ["Apply style without destroying subject composition."],
    validationRules: [
      { id: "faces", labelKey: "editor.fusion.validation.facesPreserved", settingKey: "preserveFaces", check: "boolean_true" },
    ],
  }),

  defineArchetype({
    id: "poster_social_composite",
    intent: "poster_composition",
    labelKey: "editor.fusion.archetype.posterSocialComposite",
    requiredInputRoles: ["object"],
    defaultOutput: {
      aspectRatio: "9:16",
      textPosition: "bottom",
      logoPlacement: "top-right",
      safeAreas: true,
    },
    outputFields: [
      choiceField("aspectRatio", "editor.fusion.output.aspectRatio", "9:16", ["9:16", "1:1", "16:9"]),
      choiceField("textPosition", "editor.fusion.output.textPosition", "bottom", ["top", "center", "bottom"]),
      choiceField("logoPlacement", "editor.fusion.output.logoPlacement", "top-right", ["top-left", "top-right", "none"]),
      boolField("safeAreas", "editor.fusion.output.safeAreas"),
    ],
    questions: [
      q("format", "editor.fusion.question.outputFormat", "aspectRatio", "choice", ["9:16", "1:1", "16:9"]),
      q("text", "editor.fusion.question.textPosition", "textPosition", "choice", ["top", "center", "bottom"]),
      q("logo", "editor.fusion.question.logoPlacement", "logoPlacement", "choice", ["top-left", "top-right", "none"]),
    ],
    reviewChecklist: ["format_correct", "text_readable"],
    negativePromptLines: ["Respect social safe areas. Keep text and logo legible."],
    validationRules: [],
  }),

  defineArchetype({
    id: "social_media_visual",
    intent: "social_media_visual",
    labelKey: "editor.fusion.archetype.socialMediaVisual",
    requiredInputRoles: ["object"],
    defaultOutput: {
      platform: "instagram",
      aspectRatio: "1:1",
      hookStyle: "bold",
      preserveBrandColors: true,
      safeAreas: true,
    },
    outputFields: [
      choiceField("platform", "editor.fusion.output.platform", "instagram", ["instagram", "tiktok", "linkedin", "facebook"]),
      choiceField("aspectRatio", "editor.fusion.output.aspectRatio", "1:1", ["9:16", "1:1", "4:5"]),
      choiceField("hookStyle", "editor.fusion.output.hookStyle", "bold", ["bold", "minimal", "editorial"]),
      boolField("preserveBrandColors", "editor.fusion.output.preserveBrandColors", true),
      boolField("safeAreas", "editor.fusion.output.safeAreas"),
    ],
    questions: [
      q("platform", "editor.fusion.question.platform", "platform", "choice", ["instagram", "tiktok", "linkedin", "facebook"]),
      q("format", "editor.fusion.question.outputFormat", "aspectRatio", "choice", ["9:16", "1:1", "4:5"]),
      q("hook", "editor.fusion.question.hookStyle", "hookStyle", "choice", ["bold", "minimal", "editorial"]),
    ],
    reviewChecklist: ["platform_format", "brand_colors"],
    negativePromptLines: ["Optimize for social safe areas and thumb-stopping clarity."],
    validationRules: [],
  }),

  defineArchetype({
    id: "campaign_variant",
    intent: "campaign_variant",
    labelKey: "editor.fusion.archetype.campaignVariant",
    requiredInputRoles: ["object"],
    defaultOutput: {
      variantGoal: "seasonal",
      preserveBrandIdentity: true,
      preserveLogoExact: true,
      colorShift: "subtle",
    },
    outputFields: [
      choiceField("variantGoal", "editor.fusion.output.variantGoal", "seasonal", ["seasonal", "audience", "channel", "language"]),
      boolField("preserveBrandIdentity", "editor.fusion.output.preserveBrandIdentity", true),
      boolField("preserveLogoExact", "editor.fusion.output.preserveLogoExact"),
      choiceField("colorShift", "editor.fusion.output.colorShift", "subtle", ["none", "subtle", "bold"]),
    ],
    questions: [
      q("goal", "editor.fusion.question.variantGoal", "variantGoal", "choice", ["seasonal", "audience", "channel", "language"]),
      q("brand", "editor.fusion.question.preserveBrandIdentity", "preserveBrandIdentity"),
      q("logo", "editor.fusion.question.preserveLogoExact", "preserveLogoExact"),
    ],
    reviewChecklist: ["brand_consistent", "logo_preserved"],
    negativePromptLines: ["Preserve brand identity and logo across campaign variants."],
    validationRules: [
      { id: "logo_preserved", labelKey: "editor.fusion.validation.logoPreserved", settingKey: "preserveLogoExact", check: "boolean_true" },
    ],
  }),

  defineArchetype({
    id: "animal_fusion",
    intent: "animal_fusion",
    labelKey: "editor.fusion.archetype.animalFusion",
    requiredInputRoles: ["animal"],
    minCharacterCount: 2,
    defaultOutput: {
      blendStyle: "hybrid",
      preservePose: true,
      preserveExpression: true,
      dominantSpecies: "balanced",
    },
    outputFields: [
      choiceField("blendStyle", "editor.fusion.output.blendStyle", "hybrid", ["hybrid", "dominant_a", "dominant_b"]),
      boolField("preservePose", "editor.fusion.output.preservePose"),
      boolField("preserveExpression", "editor.fusion.output.preserveExpression"),
      choiceField("dominantSpecies", "editor.fusion.output.dominantSpecies", "balanced", ["animal_a", "animal_b", "balanced"]),
    ],
    questions: [
      q("animals", "editor.fusion.question.whichAnimals", "animalRoles", "choice"),
      q("blend", "editor.fusion.question.blendStyle", "blendStyle", "choice", ["hybrid", "dominant_a", "dominant_b"]),
      q("pose", "editor.fusion.question.preservePose", "preservePose"),
    ],
    reviewChecklist: ["hybrid_believable", "pose_preserved"],
    negativePromptLines: ["Blend animals naturally without disturbing pose."],
    validationRules: [
      { id: "pose", labelKey: "editor.fusion.validation.poseUnchanged", settingKey: "preservePose", check: "boolean_true" },
    ],
  }),

  defineArchetype({
    id: "animal_human_fusion",
    intent: "animal_human_fusion",
    labelKey: "editor.fusion.archetype.animalHumanFusion",
    requiredInputRoles: ["animal", "person"],
    defaultOutput: {
      fusionStyle: "anthropomorphic",
      preserveHumanIdentity: true,
      preserveAnimalTraits: true,
      expressionBlend: "balanced",
    },
    outputFields: [
      choiceField("fusionStyle", "editor.fusion.output.fusionStyle", "anthropomorphic", ["anthropomorphic", "creature_companion", "mythic"]),
      boolField("preserveHumanIdentity", "editor.fusion.output.preserveHumanIdentity", true),
      boolField("preserveAnimalTraits", "editor.fusion.output.preserveAnimalTraits"),
      choiceField("expressionBlend", "editor.fusion.output.expressionBlend", "balanced", ["human", "animal", "balanced"]),
    ],
    questions: [
      q("human", "editor.fusion.question.whichPerson", "personRole", "choice"),
      q("animal", "editor.fusion.question.whichAnimal", "animalRole", "choice"),
      q("style", "editor.fusion.question.fusionStyle", "fusionStyle", "choice", ["anthropomorphic", "creature_companion", "mythic"]),
    ],
    reviewChecklist: ["identities_balanced", "fusion_cohesive"],
    negativePromptLines: ["Preserve recognizable human identity and animal traits."],
    validationRules: [
      { id: "human_identity", labelKey: "editor.fusion.validation.identityPreserved", settingKey: "preserveHumanIdentity", check: "boolean_true" },
    ],
  }),

  defineArchetype({
    id: "pet_customization",
    intent: "pet_customization",
    labelKey: "editor.fusion.archetype.petCustomization",
    requiredInputRoles: ["animal"],
    defaultOutput: {
      customizeTarget: "accessories",
      preserveFace: true,
      preserveFurPattern: true,
      preserveBodyProportions: true,
    },
    outputFields: [
      choiceField("customizeTarget", "editor.fusion.output.customizeTarget", "accessories", ["accessories", "fur_color", "outfit", "scene"]),
      boolField("preserveFace", "editor.fusion.output.preserveFace"),
      boolField("preserveFurPattern", "editor.fusion.output.preserveFurPattern", true),
      boolField("preserveBodyProportions", "editor.fusion.output.preserveBodyProportions", true),
    ],
    questions: [
      q("pet", "editor.fusion.question.whichPet", "petRole", "choice"),
      q("target", "editor.fusion.question.customizeTarget", "customizeTarget", "choice", ["accessories", "fur_color", "outfit", "scene"]),
      q("face", "editor.fusion.question.protectFace", "preserveFace"),
    ],
    reviewChecklist: ["pet_recognizable", "customization_applied"],
    negativePromptLines: ["Keep pet face and proportions recognizable."],
    validationRules: [
      { id: "face", labelKey: "editor.fusion.validation.faceUnchanged", settingKey: "preserveFace", check: "boolean_true" },
    ],
  }),

  defineArchetype({
    id: "fantasy_creature",
    intent: "fantasy_creature",
    labelKey: "editor.fusion.archetype.fantasyCreature",
    requiredInputRoles: ["creature"],
    defaultOutput: {
      creatureStyle: "fantasy",
      anatomyBlend: "balanced",
      preserveSilhouette: false,
      magicIntensity: "medium",
    },
    outputFields: [
      choiceField("creatureStyle", "editor.fusion.output.creatureStyle", "fantasy", ["fantasy", "sci_fi", "mythical", "cute"]),
      choiceField("anatomyBlend", "editor.fusion.output.anatomyBlend", "balanced", ["reference_a", "reference_b", "balanced"]),
      boolField("preserveSilhouette", "editor.fusion.output.preserveSilhouette", false),
      choiceField("magicIntensity", "editor.fusion.output.magicIntensity", "medium", ["low", "medium", "high"]),
    ],
    questions: [
      q("creatures", "editor.fusion.question.whichCreatures", "creatureRoles", "choice"),
      q("style", "editor.fusion.question.creatureStyle", "creatureStyle", "choice", ["fantasy", "sci_fi", "mythical", "cute"]),
      q("blend", "editor.fusion.question.anatomyBlend", "anatomyBlend", "choice", ["reference_a", "reference_b", "balanced"]),
    ],
    reviewChecklist: ["creature_cohesive", "style_consistent"],
    negativePromptLines: ["Create a cohesive fantasy creature design."],
    validationRules: [],
  }),

  defineArchetype({
    id: "future_look",
    intent: "how_will_i_look",
    labelKey: "editor.fusion.archetype.futureLook",
    requiredInputRoles: ["person"],
    supportsParentSlots: true,
    defaultOutput: {
      targetAge: 40,
      realism: "realistic",
      preserveDistinctiveFeatures: true,
      includeParents: false,
    },
    outputFields: [
      choiceField("targetAge", "editor.fusion.output.targetAge", "40", ["20", "30", "40", "50", "60", "70", "80"]),
      choiceField("realism", "editor.fusion.output.realism", "realistic", ["realistic", "cinematic"]),
      boolField("preserveDistinctiveFeatures", "editor.fusion.output.preserveDistinctiveFeatures", true),
      boolField("includeParents", "editor.fusion.output.includeParents", false),
    ],
    questions: [
      q("age", "editor.fusion.question.targetAge", "targetAge", "choice", ["20", "30", "40", "50", "60", "70", "80"]),
      q("realism", "editor.fusion.question.realisticOrCinematic", "realism", "choice", ["realistic", "cinematic"]),
      q("parents", "editor.fusion.question.includeParents", "includeParents"),
    ],
    reviewChecklist: ["identity_recognizable", "age_plausible"],
    negativePromptLines: ["Likely visual simulation — preserve distinctive features."],
    validationRules: [],
  }),

  defineArchetype({
    id: "life_timeline",
    intent: "life_timeline",
    labelKey: "editor.fusion.archetype.lifeTimeline",
    requiredInputRoles: ["person"],
    defaultOutput: {
      selectedAges: [20, 30, 40, 50, 60, 70, 80],
      realism: "realistic",
      preserveClothing: false,
      preserveIdentity: true,
    },
    outputFields: [
      { key: "selectedAges", type: "multi_choice", labelKey: "editor.fusion.output.selectedAges", defaultValue: [20, 30, 40, 50, 60, 70, 80], choices: ["20", "30", "40", "50", "60", "70", "80"] },
      choiceField("realism", "editor.fusion.output.realism", "realistic", ["realistic", "cinematic"]),
      boolField("preserveClothing", "editor.fusion.output.preserveClothing", false),
      boolField("preserveIdentity", "editor.fusion.output.preserveIdentity", true),
    ],
    questions: [
      q("ages", "editor.fusion.question.whichAges", "selectedAges", "multi_choice", ["20", "30", "40", "50", "60", "70", "80"]),
      q("realism", "editor.fusion.question.realisticOrCinematic", "realism", "choice", ["realistic", "cinematic"]),
      q("clothing", "editor.fusion.question.preserveClothing", "preserveClothing"),
    ],
    reviewChecklist: ["timeline_coherent", "identity_consistent"],
    negativePromptLines: ["Maintain identity across ages. Simulation only."],
    validationRules: [
      { id: "ages_selected", labelKey: "editor.fusion.validation.agesSelected", settingKey: "selectedAges", check: "array_min_length" },
    ],
  }),

  defineArchetype({
    id: "genetic_blend",
    intent: "genetic_blend",
    labelKey: "editor.fusion.archetype.geneticBlend",
    requiredInputRoles: ["person"],
    supportsParentSlots: true,
    defaultOutput: {
      blendWeight: 50,
      preserveDistinctiveFeatures: true,
      includeMother: true,
      includeFather: true,
    },
    outputFields: [
      choiceField("blendWeight", "editor.fusion.output.blendWeight", "50", ["25", "50", "75"]),
      boolField("preserveDistinctiveFeatures", "editor.fusion.output.preserveDistinctiveFeatures", true),
      boolField("includeMother", "editor.fusion.output.includeMother", true),
      boolField("includeFather", "editor.fusion.output.includeFather", true),
    ],
    questions: [
      q("mother", "editor.fusion.question.whichMother", "motherRole", "choice"),
      q("father", "editor.fusion.question.whichFather", "fatherRole", "choice"),
      q("blend", "editor.fusion.question.blendWeight", "blendWeight", "choice", ["25", "50", "75"]),
    ],
    reviewChecklist: ["blend_plausible", "features_merged"],
    negativePromptLines: ["Visual genetic blend simulation only."],
    validationRules: [],
  }),

  defineArchetype({
    id: "future_child",
    intent: "future_child",
    labelKey: "editor.fusion.archetype.futureChild",
    requiredInputRoles: ["person"],
    supportsParentSlots: true,
    defaultOutput: {
      childAge: "child",
      preserveBothParents: true,
      realism: "realistic",
    },
    outputFields: [
      choiceField("childAge", "editor.fusion.output.childAge", "child", ["baby", "child", "teen", "adult"]),
      boolField("preserveBothParents", "editor.fusion.output.preserveBothParents", true),
      choiceField("realism", "editor.fusion.output.realism", "realistic", ["realistic", "cinematic"]),
    ],
    questions: [
      q("parent_a", "editor.fusion.question.whichParentA", "parentARole", "choice"),
      q("parent_b", "editor.fusion.question.whichParentB", "parentBRole", "choice"),
      q("age", "editor.fusion.question.childAge", "childAge", "choice", ["baby", "child", "teen", "adult"]),
    ],
    reviewChecklist: ["both_parents_used", "child_plausible"],
    negativePromptLines: ["Likely visual simulation of a future child."],
    validationRules: [
      { id: "both_parents", labelKey: "editor.fusion.validation.bothParents", check: "both_parents_present" },
    ],
  }),

  defineArchetype({
    id: "future_professions",
    intent: "future_professions",
    labelKey: "editor.fusion.archetype.futureProfessions",
    requiredInputRoles: ["person"],
    defaultOutput: {
      profession: "chef",
      preserveFace: true,
      preserveIdentity: true,
      outfitStyle: "contextual",
    },
    outputFields: [
      choiceField("profession", "editor.fusion.output.profession", "chef", ["chef", "doctor", "athlete", "artist", "executive", "custom"]),
      boolField("preserveFace", "editor.fusion.output.preserveFace", true),
      boolField("preserveIdentity", "editor.fusion.output.preserveIdentity", true),
      choiceField("outfitStyle", "editor.fusion.output.outfitStyle", "contextual", ["contextual", "dramatic", "minimal"]),
    ],
    questions: [
      q("profession", "editor.fusion.question.profession", "profession", "choice", ["chef", "doctor", "athlete", "artist", "executive", "custom"]),
      q("outfit", "editor.fusion.question.outfitStyle", "outfitStyle", "choice", ["contextual", "dramatic", "minimal"]),
      q("face", "editor.fusion.question.protectFace", "preserveFace"),
    ],
    reviewChecklist: ["profession_clear", "identity_preserved"],
    negativePromptLines: ["Preserve face and identity in profession visualization."],
    validationRules: [
      { id: "face", labelKey: "editor.fusion.validation.faceUnchanged", settingKey: "preserveFace", check: "boolean_true" },
    ],
  }),

  defineArchetype({
    id: "future_home",
    intent: "future_home",
    labelKey: "editor.fusion.archetype.futureHome",
    requiredInputRoles: ["environment"],
    defaultOutput: {
      renovationStyle: "modern",
      preserveStructure: true,
      season: "spring",
      lighting: "natural",
    },
    outputFields: [
      choiceField("renovationStyle", "editor.fusion.output.renovationStyle", "modern", ["modern", "cozy", "luxury", "eco"]),
      boolField("preserveStructure", "editor.fusion.output.preserveStructure", true),
      choiceField("season", "editor.fusion.output.season", "spring", ["spring", "summer", "autumn", "winter"]),
      choiceField("lighting", "editor.fusion.output.lighting", "natural", ["natural", "golden_hour", "evening"]),
    ],
    questions: [
      q("style", "editor.fusion.question.renovationStyle", "renovationStyle", "choice", ["modern", "cozy", "luxury", "eco"]),
      q("structure", "editor.fusion.question.preserveStructure", "preserveStructure"),
      q("season", "editor.fusion.question.season", "season", "choice", ["spring", "summer", "autumn", "winter"]),
    ],
    reviewChecklist: ["structure_preserved", "renovation_plausible"],
    negativePromptLines: ["Preserve building structure unless explicitly changed."],
    validationRules: [
      { id: "structure", labelKey: "editor.fusion.validation.structurePreserved", settingKey: "preserveStructure", check: "boolean_true" },
    ],
  }),

  defineArchetype({
    id: "multi_reference",
    intent: "multiple_references",
    labelKey: "editor.fusion.archetype.multiReference",
    requiredInputRoles: ["object"],
    defaultOutput: {
      compositionStyle: "balanced",
      preservePrimaryIdentity: true,
      matchLighting: true,
    },
    outputFields: [
      choiceField("compositionStyle", "editor.fusion.output.compositionStyle", "balanced", ["balanced", "hero_focus", "collage"]),
      boolField("preservePrimaryIdentity", "editor.fusion.output.preservePrimaryIdentity", true),
      boolField("matchLighting", "editor.fusion.output.matchLighting"),
    ],
    questions: [
      q("primary", "editor.fusion.question.primaryReference", "primaryRole", "choice"),
      q("style", "editor.fusion.question.compositionStyle", "compositionStyle", "choice", ["balanced", "hero_focus", "collage"]),
    ],
    reviewChecklist: ["composition_balanced"],
    negativePromptLines: ["Blend references without destroying primary subject identity."],
    validationRules: [],
    wizardAvailable: false,
  }),

  defineArchetype({
    id: "custom_composition",
    intent: "custom_composition",
    labelKey: "editor.fusion.archetype.customComposition",
    requiredInputRoles: ["object"],
    defaultOutput: {
      compositionGoal: "custom",
      preserveIdentity: true,
      matchLighting: true,
    },
    outputFields: [
      choiceField("compositionGoal", "editor.fusion.output.compositionGoal", "custom", ["custom", "replace", "blend", "enhance"]),
      boolField("preserveIdentity", "editor.fusion.output.preserveIdentity", true),
      boolField("matchLighting", "editor.fusion.output.matchLighting"),
    ],
    questions: [
      q("goal", "editor.fusion.question.compositionGoal", "compositionGoal", "choice", ["custom", "replace", "blend", "enhance"]),
    ],
    reviewChecklist: ["user_intent_met"],
    negativePromptLines: ["Follow user composition instructions precisely."],
    validationRules: [],
    wizardAvailable: false,
  }),
];

const INTENT_TO_ARCHETYPE = new Map<EditorFusionIntent, FusionArchetype>(
  FUSION_ARCHETYPE_DEFINITIONS.map((archetype) => [archetype.intent, archetype])
);

INTENT_TO_ARCHETYPE.set("person_outfit", INTENT_TO_ARCHETYPE.get("outfit_from_reference")!);

export function allFusionArchetypeDefinitions(): FusionArchetype[] {
  return [...FUSION_ARCHETYPE_DEFINITIONS];
}

export function fusionArchetypeDefinitionById(id: FusionArchetypeId): FusionArchetype {
  const found = FUSION_ARCHETYPE_DEFINITIONS.find((a) => a.id === id);
  if (!found) {
    throw new Error(`Unknown fusion archetype: ${id}`);
  }
  return found;
}

export function fusionArchetypeDefinitionForIntent(intent: EditorFusionIntent): FusionArchetype {
  const normalized = normalizeFusionIntent(intent);
  const archetype = INTENT_TO_ARCHETYPE.get(normalized) ?? INTENT_TO_ARCHETYPE.get(intent);
  if (!archetype) {
    throw new Error(`Missing fusion archetype for intent: ${intent}`);
  }
  return archetype;
}

export function seedArchetypeOutputSettings(intent: EditorFusionIntent): EditorFusionGenerationSettings {
  const archetype = fusionArchetypeDefinitionForIntent(intent);
  return { ...archetype.defaultOutput, fusionArchetypeId: archetype.id };
}
