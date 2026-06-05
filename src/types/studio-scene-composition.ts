/**
 * Studio V42 — Scene Composition Director (planning only, no rendering).
 */

export type SceneCompositionType =
  | "close_up"
  | "medium_shot"
  | "wide_shot"
  | "group_shot"
  | "hero_shot"
  | "conversation"
  | "establishing"
  | "product_focus"
  | "community_scene";

export type SceneVisualRole =
  | "primary_subject"
  | "secondary_subject"
  | "supporting_character"
  | "background_character"
  | "prop_focus"
  | "location_focus"
  | "brand_focus";

export type ScreenPosition = "left" | "center" | "right";

export type SceneDepth = "foreground" | "midground" | "background";

export type EntitySize = "small" | "medium" | "large";

export type VisualFocusKind =
  | "character"
  | "product"
  | "group"
  | "location"
  | "brand"
  | "conversation"
  | "none";

export type SceneVisualFocus = {
  kind: VisualFocusKind;
  entityId: string | null;
  entityName: string | null;
  labelKey: string;
};

export type CompositionWarning = {
  code: string;
  severity: "info" | "warning";
  messageKey: string;
  sceneId?: string;
  params?: Record<string, string | number>;
};

export type SceneComposition = {
  sceneId: string;
  order: number;
  compositionType: SceneCompositionType;
  visualFocus: SceneVisualFocus;
  secondaryVisualFocus: SceneVisualFocus | null;
  foregroundEntities: string[];
  midgroundEntities: string[];
  backgroundEntities: string[];
  compositionWarnings: CompositionWarning[];
};

export type CharacterPlacementPlan = {
  sceneId: string;
  characterId: string;
  characterName: string;
  visualRole: SceneVisualRole;
  screenPosition: ScreenPosition;
  depth: SceneDepth;
  size: EntitySize;
};

export type PropPlacementPlan = {
  sceneId: string;
  propId: string;
  propName: string;
  linkedCharacterId: string | null;
  linkedCharacterName: string | null;
  visualRole: SceneVisualRole;
  screenPosition: ScreenPosition;
  depth: SceneDepth;
  relevanceKey: string;
};

export type BrandPlacementPlan = {
  sceneId: string;
  brandId: string;
  brandName: string;
  placementKind: "logo" | "packaging" | "sign" | "poster" | "label";
  visualRole: SceneVisualRole;
  screenPosition: ScreenPosition;
  depth: SceneDepth;
};

export type LocationCompositionPlan = {
  sceneId: string;
  locationId: string | null;
  locationName: string | null;
  environmentFocus: string;
  locationProminence: "low" | "medium" | "high";
  crowdingLevel: "sparse" | "balanced" | "crowded";
  visualDensity: "light" | "medium" | "dense";
};

export type SceneCompositionDirectorPlan = {
  enabled: boolean;
  version: 42;
  sceneCompositions: SceneComposition[];
  characterPlacementPlans: CharacterPlacementPlan[];
  propPlacementPlans: PropPlacementPlan[];
  brandPlacementPlans: BrandPlacementPlan[];
  locationCompositionPlans: LocationCompositionPlan[];
  visualFocusSummary: string;
  compositionWarnings: CompositionWarning[];
};

export type MotionSceneCompositionHandoffPlan = Pick<
  SceneCompositionDirectorPlan,
  | "enabled"
  | "sceneCompositions"
  | "characterPlacementPlans"
  | "propPlacementPlans"
  | "brandPlacementPlans"
  | "locationCompositionPlans"
  | "visualFocusSummary"
  | "compositionWarnings"
>;
