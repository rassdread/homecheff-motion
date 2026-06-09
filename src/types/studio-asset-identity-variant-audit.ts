import type { IdentityProfileLevel } from "@/types/studio-asset-identity-profile";
import type { VariantFidelityRecoveryTier } from "@/types/studio-asset-identity-preservation";

export type IdentityAuditItemKind = "preserved" | "lost" | "warning";

export type IdentityAuditItem = {
  kind: IdentityAuditItemKind;
  messageKey: string;
  detail?: string;
};

export type GeneratedIdentityVariantAudit = {
  identityScore: number;
  familyScore: number;
  brandScore: number;
  shapeMarkerScore: number;
  warnings: string[];
  recommendations: string[];
  recoveryRequired: boolean;
  profileWarningThreshold: number;
  recoveryTier: VariantFidelityRecoveryTier;
  sourceName: string;
  preserved: IdentityAuditItem[];
  lost: IdentityAuditItem[];
  /** Flat message keys for compact UI lists */
  warningItems: IdentityAuditItem[];
  identityProfile?: IdentityProfileLevel | "";
  identityImportance?: string;
};

export type IdentityScoreBadgeTone = "green" | "orange" | "red";
