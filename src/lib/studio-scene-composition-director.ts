/**
 * Studio V42 — Scene Composition Director (planning only).
 */

import { resolveSceneVisualFocus } from "@/lib/studio-scene-visual-focus";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";
import type {
  BrandPlacementPlan,
  CharacterPlacementPlan,
  CompositionWarning,
  EntitySize,
  LocationCompositionPlan,
  MotionSceneCompositionHandoffPlan,
  PropPlacementPlan,
  SceneComposition,
  SceneCompositionDirectorPlan,
  SceneCompositionType,
  SceneDepth,
  SceneVisualRole,
  ScreenPosition,
} from "@/types/studio-scene-composition";
import {
  locationIdentityFormFromLocation,
} from "@/lib/studio-location-identity-fields";

const BRAND_NAMES = [
  { match: "homecheff", brandId: "brand-homecheff", brandName: "HomeCheff" },
  { match: "homegarden", brandId: "brand-homegarden", brandName: "HomeGarden" },
  { match: "homedesigner", brandId: "brand-homedesigner", brandName: "HomeDesigner" },
] as const;

const SCREEN_POSITIONS: ScreenPosition[] = ["left", "center", "right"];

function inferCompositionType(scene: StudioSceneDetail): SceneCompositionType {
  const shot = (scene.shotType ?? scene.camera ?? "").toLowerCase();
  const action = `${scene.action} ${scene.description}`.toLowerCase();
  const count = scene.characters.length;

  if (shot.includes("close") || shot.includes("portrait")) {
    return "close_up";
  }
  if (action.includes("establish") || shot.includes("establish")) {
    return "establishing";
  }
  if (action.includes("hero") || scene.sceneEnergy === "intense") {
    return "hero_shot";
  }
  if (action.includes("product") || action.includes("reveal")) {
    return "product_focus";
  }
  if (count >= 4 || action.includes("community")) {
    return "community_scene";
  }
  if (count >= 3) {
    return "group_shot";
  }
  if (count === 2 && (action.includes("talk") || action.includes("conversation"))) {
    return "conversation";
  }
  if (shot.includes("wide") || shot.includes("full")) {
    return "wide_shot";
  }
  if (shot.includes("medium")) {
    return "medium_shot";
  }
  if (count === 0 && scene.location) {
    return "establishing";
  }
  return count <= 1 ? "medium_shot" : "group_shot";
}

function roleForCharacterIndex(index: number, total: number): SceneVisualRole {
  if (index === 0) {
    return "primary_subject";
  }
  if (index === 1) {
    return "secondary_subject";
  }
  if (index < total - 1) {
    return "supporting_character";
  }
  return "background_character";
}

function depthForRole(role: SceneVisualRole): SceneDepth {
  if (role === "primary_subject" || role === "prop_focus" || role === "brand_focus") {
    return "foreground";
  }
  if (role === "secondary_subject" || role === "supporting_character") {
    return "midground";
  }
  return "background";
}

function sizeForRole(role: SceneVisualRole): EntitySize {
  if (role === "primary_subject" || role === "brand_focus") {
    return "large";
  }
  if (role === "secondary_subject" || role === "prop_focus") {
    return "medium";
  }
  return "small";
}

function screenPositionForIndex(index: number): ScreenPosition {
  return SCREEN_POSITIONS[index % SCREEN_POSITIONS.length]!;
}

function buildCharacterPlacements(scene: StudioSceneDetail): CharacterPlacementPlan[] {
  return scene.characters.map((character, index) => {
    const visualRole = roleForCharacterIndex(index, scene.characters.length);
    return {
      sceneId: scene.id,
      characterId: character.id,
      characterName: character.name,
      visualRole,
      screenPosition: screenPositionForIndex(index),
      depth: depthForRole(visualRole),
      size: sizeForRole(visualRole),
    };
  });
}

function buildPropPlacements(scene: StudioSceneDetail): PropPlacementPlan[] {
  const primaryCharacter = scene.characters[0] ?? null;
  return scene.props.map((prop, index) => {
    const linked =
      primaryCharacter && index === 0 ?
        primaryCharacter
      : scene.characters[index] ?? primaryCharacter;
    const visualRole: SceneVisualRole = index === 0 ? "prop_focus" : "supporting_character";
    return {
      sceneId: scene.id,
      propId: prop.id,
      propName: prop.name,
      linkedCharacterId: linked?.id ?? null,
      linkedCharacterName: linked?.name ?? null,
      visualRole,
      screenPosition: screenPositionForIndex(index + 1),
      depth: depthForRole(visualRole),
      relevanceKey:
        linked ?
          "studio.composition.prop.linkedCharacter"
        : "studio.composition.prop.sceneLevel",
    };
  });
}

function detectBrandPlacements(scene: StudioSceneDetail): BrandPlacementPlan[] {
  const out: BrandPlacementPlan[] = [];
  const blob = [
    scene.title,
    scene.description,
    scene.action,
    ...scene.characters.map((c) => `${c.name} ${c.role ?? ""}`),
    ...scene.props.map((p) => `${p.name} ${p.description ?? ""}`),
    scene.location?.name ?? "",
  ]
    .join(" ")
    .toLowerCase();

  for (const brand of BRAND_NAMES) {
    if (!blob.includes(brand.match)) {
      continue;
    }
    out.push({
      sceneId: scene.id,
      brandId: brand.brandId,
      brandName: brand.brandName,
      placementKind: blob.includes("logo") ? "logo" : "packaging",
      visualRole: "brand_focus",
      screenPosition: "center",
      depth: "foreground",
    });
  }
  return out;
}

function buildLocationPlan(scene: StudioSceneDetail): LocationCompositionPlan {
  const characterCount = scene.characters.length;
  const propCount = scene.props.length;
  const entityLoad = characterCount + propCount;
  const crowdingLevel: LocationCompositionPlan["crowdingLevel"] =
    entityLoad >= 6 ? "crowded" : entityLoad >= 3 ? "balanced" : "sparse";
  const visualDensity: LocationCompositionPlan["visualDensity"] =
    entityLoad >= 5 ? "dense" : entityLoad >= 2 ? "medium" : "light";

  const locationType =
    scene.location ? locationIdentityFormFromLocation(scene.location).locationType : "";
  const locationName = scene.location?.name?.toLowerCase() ?? "";
  let environmentFocus = "studio.composition.location.generic";
  if (locationType === "garden" || locationName.includes("garden")) {
    environmentFocus = "studio.composition.location.garden";
  } else if (
    locationType === "restaurant" ||
    locationType === "kitchen" ||
    locationName.includes("restaurant") ||
    locationName.includes("kitchen")
  ) {
    environmentFocus = "studio.composition.location.restaurant";
  } else if (locationType === "market" || locationName.includes("market")) {
    environmentFocus = "studio.composition.location.market";
  } else if (
    locationType === "studio_room" ||
    locationName.includes("studio") ||
    locationName.includes("design")
  ) {
    environmentFocus = "studio.composition.location.designStudio";
  }

  const locationProminence: LocationCompositionPlan["locationProminence"] =
    characterCount === 0 && scene.location ?
      "high"
    : characterCount <= 1 ?
      "medium"
    : "low";

  return {
    sceneId: scene.id,
    locationId: scene.location?.id ?? null,
    locationName: scene.location?.name ?? null,
    environmentFocus,
    locationProminence,
    crowdingLevel,
    visualDensity,
  };
}

function detectSceneWarnings(params: {
  scene: StudioSceneDetail;
  composition: SceneComposition;
  brandPlacements: BrandPlacementPlan[];
}): CompositionWarning[] {
  const warnings: CompositionWarning[] = [];
  const { scene, composition, brandPlacements } = params;

  if (composition.visualFocus.kind === "none") {
    warnings.push({
      code: "no_primary_subject",
      severity: "warning",
      messageKey: "studio.composition.warning.noPrimarySubject",
      sceneId: scene.id,
    });
  }

  const foregroundCount = composition.foregroundEntities.length;
  if (foregroundCount >= 4) {
    warnings.push({
      code: "too_many_focal_points",
      severity: "warning",
      messageKey: "studio.composition.warning.tooManyFocalPoints",
      sceneId: scene.id,
      params: { count: foregroundCount },
    });
  }

  if (
    composition.visualFocus.kind === "character" &&
    composition.secondaryVisualFocus?.kind === "character" &&
    composition.visualFocus.entityId !== composition.secondaryVisualFocus.entityId
  ) {
    const bothForeground =
      composition.foregroundEntities.includes(composition.visualFocus.entityName ?? "") &&
      composition.foregroundEntities.includes(
        composition.secondaryVisualFocus.entityName ?? ""
      );
    if (bothForeground && scene.characters.length === 2) {
      warnings.push({
        code: "conflicting_subjects",
        severity: "info",
        messageKey: "studio.composition.warning.conflictingSubjects",
        sceneId: scene.id,
      });
    }
  }

  if (brandPlacements.length >= 2) {
    warnings.push({
      code: "brand_overload",
      severity: "warning",
      messageKey: "studio.composition.warning.brandOverload",
      sceneId: scene.id,
      params: { count: brandPlacements.length },
    });
  }

  const locationPlan = buildLocationPlan(scene);
  if (locationPlan.crowdingLevel === "crowded") {
    warnings.push({
      code: "crowded_scene",
      severity: "info",
      messageKey: "studio.composition.warning.crowdedScene",
      sceneId: scene.id,
    });
  }

  return warnings;
}

function entityLayers(scene: StudioSceneDetail): {
  foreground: string[];
  midground: string[];
  background: string[];
} {
  const characterPlans = buildCharacterPlacements(scene);
  const propPlans = buildPropPlacements(scene);
  const foreground: string[] = [];
  const midground: string[] = [];
  const background: string[] = [];

  const push = (name: string, depth: SceneDepth) => {
    if (depth === "foreground") {
      foreground.push(name);
    } else if (depth === "midground") {
      midground.push(name);
    } else {
      background.push(name);
    }
  };

  characterPlans.forEach((p) => push(p.characterName, p.depth));
  propPlans.forEach((p) => push(p.propName, p.depth));
  if (scene.location?.name) {
    const prominence = buildLocationPlan(scene).locationProminence;
    push(
      scene.location.name,
      prominence === "high" ? "foreground" : prominence === "medium" ? "midground" : "background"
    );
  }

  return { foreground, midground, background };
}

export function buildSceneCompositionForScene(scene: StudioSceneDetail): SceneComposition {
  const { primary, secondary } = resolveSceneVisualFocus(scene);
  const layers = entityLayers(scene);
  const brandPlacements = detectBrandPlacements(scene);
  const composition: SceneComposition = {
    sceneId: scene.id,
    order: scene.order,
    compositionType: inferCompositionType(scene),
    visualFocus: primary,
    secondaryVisualFocus: secondary,
    foregroundEntities: layers.foreground,
    midgroundEntities: layers.midground,
    backgroundEntities: layers.background,
    compositionWarnings: [],
  };
  composition.compositionWarnings = detectSceneWarnings({
    scene,
    composition,
    brandPlacements,
  });
  return composition;
}

export function buildSceneCompositionDirector(
  storyboard: StudioStoryboardDetail
): SceneCompositionDirectorPlan {
  const scenes = [...(storyboard.scenes ?? [])].sort((a, b) => a.order - b.order);
  const sceneCompositions = scenes.map((scene) => buildSceneCompositionForScene(scene));
  const characterPlacementPlans = scenes.flatMap((scene) => buildCharacterPlacements(scene));
  const propPlacementPlans = scenes.flatMap((scene) => buildPropPlacements(scene));
  const brandPlacementPlans = scenes.flatMap((scene) => detectBrandPlacements(scene));
  const locationCompositionPlans = scenes.map((scene) => buildLocationPlan(scene));

  const compositionWarnings: CompositionWarning[] = [
    ...sceneCompositions.flatMap((c) => c.compositionWarnings),
    {
      code: "planning_only",
      severity: "info",
      messageKey: "studio.composition.warning.planningOnly",
    },
  ];

  const focusLabels = sceneCompositions
    .map((c) => c.visualFocus.entityName ?? c.visualFocus.kind)
    .filter(Boolean);

  const visualFocusSummary =
    focusLabels.length > 0 ?
      focusLabels.slice(0, 5).join(" → ")
    : "studio.composition.summary.empty";

  return {
    enabled: scenes.length > 0,
    version: 42,
    sceneCompositions,
    characterPlacementPlans,
    propPlacementPlans,
    brandPlacementPlans,
    locationCompositionPlans,
    visualFocusSummary,
    compositionWarnings,
  };
}

export function isSceneCompositionPlanReady(plan: SceneCompositionDirectorPlan): boolean {
  if (!plan.enabled || plan.sceneCompositions.length === 0) {
    return false;
  }
  const blocking = plan.compositionWarnings.filter(
    (w) => w.severity === "warning" && w.code === "no_primary_subject"
  );
  return blocking.length === 0;
}

export function buildMotionSceneCompositionHandoffPlan(
  storyboard: StudioStoryboardDetail
): MotionSceneCompositionHandoffPlan {
  const plan = buildSceneCompositionDirector(storyboard);
  return {
    enabled: plan.enabled,
    sceneCompositions: plan.sceneCompositions,
    characterPlacementPlans: plan.characterPlacementPlans,
    propPlacementPlans: plan.propPlacementPlans,
    brandPlacementPlans: plan.brandPlacementPlans,
    locationCompositionPlans: plan.locationCompositionPlans,
    visualFocusSummary: plan.visualFocusSummary,
    compositionWarnings: plan.compositionWarnings,
  };
}
