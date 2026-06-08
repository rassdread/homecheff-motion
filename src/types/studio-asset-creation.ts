/** Universal asset creation wizard — shared types (no schema). */

export type StudioAssetKind = "character" | "prop" | "location" | "world";

export type AssetCreateEntryPath =
  | "design"
  | "prompt_only"
  | "image_only"
  | "image_and_prompt"
  | "existing_asset"
  | "derive_from_reference";

export type AssetReferenceMode = "upload" | "generate" | "skip" | null;

export type AssetCreationWizardStep =
  | "kind"
  | "entry"
  | "derive_source"
  | "derive_target_kind"
  | "derive_transform"
  | "derive_preview"
  | "choice"
  | "reference"
  | "input"
  | "proposal"
  | "essentials"
  | "readiness"
  | "save";

export type AssetPromptPrefillProposal = {
  kind: StudioAssetKind;
  confidence: number;
  missingFields: string[];
  reasons: string[];
  /** Kind-specific partial form values — applied only on explicit user confirm. */
  prefill: Record<string, unknown>;
  conflicts?: Array<{ field: string; imageValue: string; promptValue: string }>;
};

export type AssetCreationWizardState = {
  kind: StudioAssetKind;
  entryPath: AssetCreateEntryPath | null;
  promptText: string;
  promptUsage: string;
  promptBrandRules: string;
  proposal: AssetPromptPrefillProposal | null;
  proposalApplied: boolean;
  step: AssetCreationWizardStep;
};
