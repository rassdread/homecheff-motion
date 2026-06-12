export type StudioStoryAssetRequirement = {
  kind: "character" | "location" | "prop" | "world" | "logo" | "product";
  label: string;
  required: boolean;
  existingAssetId?: string;
  action?: "use_existing" | "generate" | "upload" | "skip";
};

export type StudioStoryGeneratorPhase =
  | "idea"
  | "storyline"
  | "assets"
  | "scenes";
