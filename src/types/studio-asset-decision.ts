/**
 * Studio V2 — Asset decision execution (use existing / build new / skip).
 */

export type AssetDecisionMode = "use_existing" | "build_new" | "skip";

export type AssetDecisionKind = "character" | "location" | "prop" | "world";

export type AssetDecisionSource =
  | "production_brief"
  | "asset_evolution"
  | "director_proposal"
  | "workspace";

export type StudioAssetDecision = {
  id: string;
  kind: AssetDecisionKind;
  mode: AssetDecisionMode;
  name: string;
  existingId?: string;
  decidedAt: string;
  source: AssetDecisionSource;
  /** Set when a build_new decision is fulfilled after asset creation. */
  fulfilledAt?: string;
};

export type StudioAssetDecisionRegistry = {
  version: 1;
  storyboardId?: string;
  briefIdea?: string;
  updatedAt: string;
  decisions: StudioAssetDecision[];
};

export type ApplyAssetDecisionInput = {
  id: string;
  kind: AssetDecisionKind;
  mode: AssetDecisionMode;
  name: string;
  existingId?: string;
  source?: AssetDecisionSource;
  fulfilledAt?: string;
};

export type ResolvedAssetDecisions = {
  useExisting: StudioAssetDecision[];
  buildNew: StudioAssetDecision[];
  skipped: StudioAssetDecision[];
  byId: Map<string, StudioAssetDecision>;
};

export type IdentityBuilderPrefill = {
  version: 1;
  kind: AssetDecisionKind;
  name: string;
  role?: string;
  description?: string;
  personality?: string;
  usageContext?: string;
  characterType?: string;
  visualStyle?: string;
  shapeLanguage?: string;
  energy?: string;
  colorTheme?: string;
  worldProfileId?: string | null;
  storyboardId?: string;
  decisionId: string;
  ideaContext?: string;
};
