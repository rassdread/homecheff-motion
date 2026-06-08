/** Brand identity & variant fidelity — extends semantic record without schema migration. */

export type AssetIdentityFingerprint = {
  faceStructure?: string;
  outlineStyle?: string;
  proportions?: string;
  colorDna?: string;
  shapeDna?: string;
  brandIdentity?: string;
  silhouette?: string;
  accessoryPattern?: string;
  fingerprintHash?: string;
};

export type AssetCharacterLineage =
  | "primary_mascot"
  | "brand_variant"
  | "role_variant"
  | "edition_variant"
  | "unknown";

export type VariantFidelityScore = {
  identityPreservation: number;
  colorPreservation: number;
  shapePreservation: number;
  brandPreservation: number;
  familyPreservation: number;
  overall: number;
  lowFidelity: boolean;
  recoveryTier: VariantFidelityRecoveryTier;
};

export type VariantFidelityRecoveryTier =
  | "ok"
  | "warning"
  | "strict_regenerate"
  | "identity_failure";

/** Below this overall score, show a low-identity warning in the UI. */
export const VARIANT_FIDELITY_WARNING_THRESHOLD = 80;
/** Below this overall score, auto-regenerate with identity lock level 2. */
export const VARIANT_FIDELITY_STRICT_REGENERATE_THRESHOLD = 60;
/** Below this overall score, mark as identity failure. */
export const VARIANT_FIDELITY_IDENTITY_FAILURE_THRESHOLD = 40;

/** @deprecated Use VARIANT_FIDELITY_WARNING_THRESHOLD — kept for backward compatibility. */
export const VARIANT_FIDELITY_LOW_THRESHOLD = VARIANT_FIDELITY_WARNING_THRESHOLD;
