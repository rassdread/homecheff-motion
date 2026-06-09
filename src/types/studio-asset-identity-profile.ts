/** Universal identity preservation profile — asset-type agnostic. */

export const IDENTITY_PROFILE_LEVELS = [
  "relaxed",
  "balanced",
  "strict",
  "brand_lock",
  "master_character",
] as const;

export type IdentityProfileLevel = (typeof IDENTITY_PROFILE_LEVELS)[number];

export const IDENTITY_ASSET_TYPES = [
  "character",
  "mascot",
  "logo",
  "packaging",
  "product",
  "location",
  "world",
  "vehicle",
  "person",
  "animal",
  "building",
  "other",
] as const;

export type IdentityAssetType = (typeof IDENTITY_ASSET_TYPES)[number];

export type IdentityProfileConfig = {
  level: IdentityProfileLevel;
  identityWeight: number;
  creativityWeight: number;
  preserveBoost: string[];
  changeAllowance: string[];
  forbiddenBoost: string[];
};

export type IdentityProfileRules = {
  preserve: string[];
  change: string[];
  forbidden: string[];
};
