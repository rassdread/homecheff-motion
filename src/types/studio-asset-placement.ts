/**
 * Studio V43 — Asset Placement Engine (planning only, no rendering).
 */

export type PlacementZone =
  | "TOP_LEFT"
  | "TOP_CENTER"
  | "TOP_RIGHT"
  | "CENTER_LEFT"
  | "CENTER"
  | "CENTER_RIGHT"
  | "BOTTOM_LEFT"
  | "BOTTOM_CENTER"
  | "BOTTOM_RIGHT";

export type DepthLayer = "FOREGROUND" | "MIDGROUND" | "BACKGROUND";

export type ScaleClass = "SMALL" | "MEDIUM" | "LARGE" | "HERO";

export type Orientation =
  | "LEFT"
  | "RIGHT"
  | "FORWARD"
  | "THREE_QUARTER_LEFT"
  | "THREE_QUARTER_RIGHT";

export type GroupingMode = "SOLO" | "PAIR" | "TEAM" | "CROWD";

export type PlacementWarning = {
  code: string;
  severity: "info" | "warning";
  messageKey: string;
  sceneId?: string;
  params?: Record<string, string | number>;
};

export type CharacterPlacement = {
  sceneId: string;
  characterId: string;
  characterName: string;
  zone: PlacementZone;
  depth: DepthLayer;
  scale: ScaleClass;
  orientation: Orientation;
  grouping: GroupingMode;
  hierarchyScore: number;
  placementPriority: number;
  summaryKey: string;
};

export type PropPlacement = {
  sceneId: string;
  propId: string;
  propName: string;
  zone: PlacementZone;
  depth: DepthLayer;
  scale: ScaleClass;
  orientation: Orientation;
  linkedCharacterId: string | null;
  linkedCharacterName: string | null;
  summaryKey: string;
};

export type BrandPlacement = {
  sceneId: string;
  brandId: string;
  brandName: string;
  placementKind: "logo" | "packaging" | "sign" | "poster" | "label";
  zone: PlacementZone;
  depth: DepthLayer;
  scale: ScaleClass;
  summaryKey: string;
};

export type LocationPlacement = {
  sceneId: string;
  locationId: string | null;
  locationName: string | null;
  zone: PlacementZone;
  depth: DepthLayer;
  scale: ScaleClass;
  environmentFocusKey: string;
  summaryKey: string;
};

export type SceneAssetPlacement = {
  sceneId: string;
  order: number;
  compositionType: string;
  primarySubject: string | null;
  placementSummary: string;
  characterPlacements: CharacterPlacement[];
  propPlacements: PropPlacement[];
  brandPlacements: BrandPlacement[];
  locationPlacement: LocationPlacement | null;
  placementWarnings: PlacementWarning[];
};

export type VisualHierarchySummary = {
  primarySubject: string | null;
  secondarySubject: string | null;
  supportingCount: number;
  heroCount: number;
  clutterScore: number;
  emptyScore: number;
  summaryKey: string;
};

export type AssetPlacementPlan = {
  enabled: boolean;
  version: 43;
  scenePlacements: SceneAssetPlacement[];
  characterPlacements: CharacterPlacement[];
  propPlacements: PropPlacement[];
  brandPlacements: BrandPlacement[];
  locationPlacements: LocationPlacement[];
  visualHierarchySummary: VisualHierarchySummary;
  placementWarnings: PlacementWarning[];
};

export type MotionAssetPlacementHandoffPlan = Pick<
  AssetPlacementPlan,
  | "enabled"
  | "scenePlacements"
  | "characterPlacements"
  | "propPlacements"
  | "brandPlacements"
  | "locationPlacements"
  | "visualHierarchySummary"
  | "placementWarnings"
>;
