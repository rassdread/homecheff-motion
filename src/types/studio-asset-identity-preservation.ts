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
  overall: number;
  lowFidelity: boolean;
};

export const VARIANT_FIDELITY_LOW_THRESHOLD = 55;
