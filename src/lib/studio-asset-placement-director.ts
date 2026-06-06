/**
 * Studio V43 — Asset Placement Director (planning only).
 */

import {
  buildSceneCompositionDirector,
  buildSceneCompositionForScene,
} from "@/lib/studio-scene-composition-director";
import {
  buildVisualHierarchySummary,
  detectHierarchyWarnings,
  scorePlacementPriority,
} from "@/lib/studio-visual-hierarchy";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";
import type {
  BrandPlacement,
  CharacterPlacement,
  DepthLayer,
  GroupingMode,
  LocationPlacement,
  MotionAssetPlacementHandoffPlan,
  Orientation,
  PlacementZone,
  PropPlacement,
  ScaleClass,
  SceneAssetPlacement,
  AssetPlacementPlan,
} from "@/types/studio-asset-placement";
import type {
  BrandPlacementPlan,
  CharacterPlacementPlan,
  LocationCompositionPlan,
  PropPlacementPlan,
  SceneComposition,
  SceneCompositionType,
  SceneDepth,
  SceneVisualRole,
  ScreenPosition,
} from "@/types/studio-scene-composition";

function mapDepth(depth: SceneDepth): DepthLayer {
  if (depth === "foreground") {
    return "FOREGROUND";
  }
  if (depth === "midground") {
    return "MIDGROUND";
  }
  return "BACKGROUND";
}

function mapScale(size: "small" | "medium" | "large", role: SceneVisualRole): ScaleClass {
  if (role === "primary_subject") {
    return "HERO";
  }
  if (size === "large") {
    return "LARGE";
  }
  if (size === "medium") {
    return "MEDIUM";
  }
  return "SMALL";
}

function mapZone(params: {
  screen: ScreenPosition;
  depth: SceneDepth;
  role: SceneVisualRole;
  compositionType: SceneCompositionType;
  isLogo?: boolean;
  isProduct?: boolean;
}): PlacementZone {
  if (params.isLogo) {
    return "TOP_RIGHT";
  }
  if (params.isProduct || params.role === "prop_focus") {
    return params.screen === "left" ? "BOTTOM_LEFT" : "BOTTOM_CENTER";
  }
  if (params.role === "primary_subject" || params.compositionType === "hero_shot") {
    return "CENTER";
  }
  if (params.screen === "left") {
    return params.depth === "background" ? "CENTER_LEFT" : "CENTER_LEFT";
  }
  if (params.screen === "right") {
    return "CENTER_RIGHT";
  }
  if (params.depth === "background") {
    return "BOTTOM_CENTER";
  }
  return "CENTER";
}

function mapOrientation(zone: PlacementZone, role: SceneVisualRole): Orientation {
  if (role === "primary_subject") {
    return "FORWARD";
  }
  if (zone === "CENTER_RIGHT" || zone === "TOP_RIGHT") {
    return "THREE_QUARTER_RIGHT";
  }
  if (zone === "CENTER_LEFT" || zone === "TOP_LEFT") {
    return "THREE_QUARTER_LEFT";
  }
  if (role === "background_character") {
    return "FORWARD";
  }
  return "FORWARD";
}

function groupingForCount(count: number): GroupingMode {
  if (count <= 1) {
    return "SOLO";
  }
  if (count === 2) {
    return "PAIR";
  }
  if (count <= 4) {
    return "TEAM";
  }
  return "CROWD";
}

function characterSummaryKey(): string {
  return `studio.placement.summary.character`;
}

export function buildCharacterPlacement(params: {
  plan: CharacterPlacementPlan;
  composition: SceneComposition;
  characterCount: number;
}): CharacterPlacement {
  const isPrimary = params.plan.visualRole === "primary_subject";
  const zone = mapZone({
    screen: params.plan.screenPosition,
    depth: params.plan.depth,
    role: params.plan.visualRole,
    compositionType: params.composition.compositionType,
  });
  const depth = mapDepth(params.plan.depth);
  const scale = mapScale(params.plan.size, params.plan.visualRole);
  const grouping = groupingForCount(params.characterCount);
  const placementPriority = scorePlacementPriority({
    scale,
    depth,
    isPrimary,
  });

  return {
    sceneId: params.plan.sceneId,
    characterId: params.plan.characterId,
    characterName: params.plan.characterName,
    zone,
    depth,
    scale,
    orientation: mapOrientation(zone, params.plan.visualRole),
    grouping,
    hierarchyScore: placementPriority,
    placementPriority,
    summaryKey: characterSummaryKey(),
  };
}

export function buildPropPlacement(params: {
  plan: PropPlacementPlan;
  composition: SceneComposition;
}): PropPlacement {
  const isProduct = params.composition.compositionType === "product_focus";
  const zone = mapZone({
    screen: params.plan.screenPosition,
    depth: params.plan.depth,
    role: params.plan.visualRole,
    compositionType: params.composition.compositionType,
    isProduct,
  });
  const depth = mapDepth(params.plan.depth);
  const scale: ScaleClass =
    params.plan.visualRole === "prop_focus" ? "LARGE" : "MEDIUM";

  return {
    sceneId: params.plan.sceneId,
    propId: params.plan.propId,
    propName: params.plan.propName,
    zone,
    depth,
    scale,
    orientation: mapOrientation(zone, params.plan.visualRole),
    linkedCharacterId: params.plan.linkedCharacterId,
    linkedCharacterName: params.plan.linkedCharacterName,
    summaryKey: "studio.placement.summary.prop",
  };
}

export function buildBrandPlacement(plan: BrandPlacementPlan): BrandPlacement {
  const zone: PlacementZone =
    plan.placementKind === "logo" ? "TOP_RIGHT" : mapZone({
      screen: plan.screenPosition,
      depth: plan.depth,
      role: plan.visualRole,
      compositionType: "product_focus",
    });
  return {
    sceneId: plan.sceneId,
    brandId: plan.brandId,
    brandName: plan.brandName,
    placementKind: plan.placementKind,
    zone,
    depth: plan.placementKind === "logo" ? "BACKGROUND" : mapDepth(plan.depth),
    scale: plan.placementKind === "logo" ? "SMALL" : "MEDIUM",
    summaryKey: "studio.placement.summary.brand",
  };
}

export function buildLocationPlacement(params: {
  plan: LocationCompositionPlan;
  composition: SceneComposition;
}): LocationPlacement {
  const prominence = params.plan.locationProminence;
  const depth: DepthLayer =
    prominence === "high"
      ? "MIDGROUND"
      : prominence === "medium"
        ? "BACKGROUND"
        : "BACKGROUND";
  const zone: PlacementZone =
    prominence === "high" ? "CENTER" : "BOTTOM_CENTER";
  const scale: ScaleClass =
    prominence === "high" ? "LARGE" : prominence === "medium" ? "MEDIUM" : "SMALL";

  return {
    sceneId: params.plan.sceneId,
    locationId: params.plan.locationId,
    locationName: params.plan.locationName,
    zone,
    depth,
    scale,
    environmentFocusKey: params.plan.environmentFocus,
    summaryKey: "studio.placement.summary.location",
  };
}

function formatScenePlacementSummary(params: {
  characters: CharacterPlacement[];
  props: PropPlacement[];
  brands: BrandPlacement[];
  location: LocationPlacement | null;
}): string {
  const parts: string[] = [];
  const hero = params.characters.find((c) => c.scale === "HERO" || c.placementPriority >= 85);
  if (hero) {
    parts.push(`${hero.characterName}: ${hero.zone} ${hero.depth} ${hero.scale}`);
  }
  const support = params.characters.find(
    (c) => c.characterId !== hero?.characterId && c.depth === "MIDGROUND"
  );
  if (support) {
    parts.push(`${support.characterName}: ${support.zone} ${support.depth}`);
  }
  if (params.location?.locationName) {
    parts.push(`${params.location.locationName}: ${params.location.zone} ${params.location.depth}`);
  }
  const logo = params.brands.find((b) => b.placementKind === "logo");
  if (logo) {
    parts.push(`${logo.brandName}: ${logo.zone}`);
  }
  const product = params.props[0];
  if (product && !hero) {
    parts.push(`${product.propName}: ${product.zone} ${product.depth}`);
  }
  return parts.slice(0, 3).join(" · ") || "studio.placement.summary.empty";
}

function singleSceneStoryboardStub(scene: StudioSceneDetail): StudioStoryboardDetail {
  return {
    id: scene.storyboardId,
    ownerId: "stub",
    title: scene.title,
    description: "",
    status: "draft",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    aiDirectorPrompt: "",
    aiDirectorStyleStrength: "balanced",
    voiceEnabled: false,
    voiceLanguage: "en",
    voiceProfile: "",
    voiceStyle: "",
    narrationMode: "narrator",
    voiceNarrationScript: "",
    musicEnabled: false,
    musicStyle: "",
    musicIntensity: "",
    musicNarrativeRole: "",
    musicNotes: "",
    soundEnabled: false,
    soundStyle: "",
    soundDensity: "",
    soundNotes: "",
    audioProductionEnabled: false,
    audioStyle: "",
    audioPriorityStrategy: "",
    audioNotes: "",
    audioAssetsEnabled: false,
    audioAssetNotes: "",
    audioAssetLinks: { version: 1 },
    autoSelectImprovedImage: true,
    sceneCount: 1,
    subtitleEnabled: false,
    scenes: [scene],
    characters: [],
    locations: [],
    props: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as StudioStoryboardDetail;
}

export function buildAssetPlacementForSceneDetail(scene: StudioSceneDetail): SceneAssetPlacement {
  const compositionPlan = buildSceneCompositionDirector(singleSceneStoryboardStub(scene));
  return buildAssetPlacementForScene(scene, compositionPlan);
}

export function buildAssetPlacementForScene(
  scene: StudioSceneDetail,
  compositionPlan: ReturnType<typeof buildSceneCompositionDirector>
): SceneAssetPlacement {
  const composition = buildSceneCompositionForScene(scene);
  const characterPlans = compositionPlan.characterPlacementPlans.filter(
    (p) => p.sceneId === scene.id
  );
  const propPlans = compositionPlan.propPlacementPlans.filter((p) => p.sceneId === scene.id);
  const brandPlans = compositionPlan.brandPlacementPlans.filter((p) => p.sceneId === scene.id);
  const locationPlan = compositionPlan.locationCompositionPlans.find(
    (p) => p.sceneId === scene.id
  );

  const characterPlacements = characterPlans.map((plan) =>
    buildCharacterPlacement({
      plan,
      composition,
      characterCount: scene.characters.length,
    })
  );
  const propPlacements = propPlans.map((plan) =>
    buildPropPlacement({ plan, composition })
  );
  const brandPlacements = brandPlans.map((plan) => buildBrandPlacement(plan));
  const locationPlacement =
    locationPlan ? buildLocationPlacement({ plan: locationPlan, composition }) : null;

  const placementWarnings = detectHierarchyWarnings({
    sceneId: scene.id,
    characterPlacements,
    propPlacements,
    brandPlacements,
  });

  const primary =
    composition.visualFocus.entityName ??
    characterPlacements.find((c) => c.scale === "HERO")?.characterName ??
    null;

  return {
    sceneId: scene.id,
    order: scene.order,
    compositionType: composition.compositionType,
    primarySubject: primary,
    placementSummary: formatScenePlacementSummary({
      characters: characterPlacements,
      props: propPlacements,
      brands: brandPlacements,
      location: locationPlacement,
    }),
    characterPlacements,
    propPlacements,
    brandPlacements,
    locationPlacement,
    placementWarnings,
  };
}

export function buildAssetPlacementPlan(storyboard: StudioStoryboardDetail): AssetPlacementPlan {
  const compositionPlan = buildSceneCompositionDirector(storyboard);
  const scenes = [...(storyboard.scenes ?? [])].sort((a, b) => a.order - b.order);

  if (scenes.length === 0) {
    return {
      enabled: false,
      version: 43,
      scenePlacements: [],
      characterPlacements: [],
      propPlacements: [],
      brandPlacements: [],
      locationPlacements: [],
      visualHierarchySummary: buildVisualHierarchySummary({
        characterPlacements: [],
        propPlacements: [],
        brandPlacements: [],
      }),
      placementWarnings: [
        {
          code: "no_scenes",
          severity: "warning",
          messageKey: "studio.placement.warning.noScenes",
        },
      ],
    };
  }

  const scenePlacements = scenes.map((scene) =>
    buildAssetPlacementForScene(scene, compositionPlan)
  );
  const characterPlacements = scenePlacements.flatMap((s) => s.characterPlacements);
  const propPlacements = scenePlacements.flatMap((s) => s.propPlacements);
  const brandPlacements = scenePlacements.flatMap((s) => s.brandPlacements);
  const locationPlacements = scenePlacements
    .map((s) => s.locationPlacement)
    .filter((row): row is LocationPlacement => row !== null);

  const visualHierarchySummary = buildVisualHierarchySummary({
    characterPlacements,
    propPlacements,
    brandPlacements,
  });

  const placementWarnings = [
    ...scenePlacements.flatMap((s) => s.placementWarnings),
    ...(compositionPlan.compositionWarnings.length > 0
      ? [
          {
            code: "composition_inherited_warnings",
            severity: "info" as const,
            messageKey: "studio.placement.warning.inheritedComposition",
          },
        ]
      : []),
  ];

  if (!compositionPlan.enabled) {
    placementWarnings.push({
      code: "composition_unavailable",
      severity: "warning",
      messageKey: "studio.placement.warning.compositionUnavailable",
    });
  }

  return {
    enabled: scenes.length > 0 && compositionPlan.enabled,
    version: 43,
    scenePlacements,
    characterPlacements,
    propPlacements,
    brandPlacements,
    locationPlacements,
    visualHierarchySummary,
    placementWarnings,
  };
}

export function buildMotionAssetPlacementHandoffPlan(
  storyboard: StudioStoryboardDetail
): MotionAssetPlacementHandoffPlan {
  const plan = buildAssetPlacementPlan(storyboard);
  return {
    enabled: plan.enabled,
    scenePlacements: plan.scenePlacements,
    characterPlacements: plan.characterPlacements,
    propPlacements: plan.propPlacements,
    brandPlacements: plan.brandPlacements,
    locationPlacements: plan.locationPlacements,
    visualHierarchySummary: plan.visualHierarchySummary,
    placementWarnings: plan.placementWarnings,
  };
}

export function isAssetPlacementPlanReady(plan: AssetPlacementPlan): boolean {
  if (!plan.enabled || plan.scenePlacements.length === 0) {
    return false;
  }
  const hasBlocking = plan.placementWarnings.some(
    (w) =>
      w.severity === "warning" &&
      (w.code === "empty_composition" || w.code === "no_scenes")
  );
  if (hasBlocking) {
    return false;
  }
  return plan.scenePlacements.every(
    (scene) =>
      scene.characterPlacements.length > 0 ||
      scene.propPlacements.length > 0 ||
      scene.brandPlacements.length > 0
  );
}

export function formatPlacementCompactLine(placement: CharacterPlacement): string {
  return `${placement.characterName}: ${placement.zone} ${placement.depth} ${placement.scale}`;
}
