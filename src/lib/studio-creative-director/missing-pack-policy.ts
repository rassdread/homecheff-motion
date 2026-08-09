/**
 * S.6G — Honest policy for MISSING / sensitive Experience Packs.
 * Never expose these as normal LIVE generate experiences.
 */

import type { StudioProductExperienceId } from "@/lib/studio-creative-director/product-experience-ids";
import { getProductExperience } from "@/lib/studio-creative-director/product-experience-registry";

export type MissingPackDisposition =
  | "HIDDEN"
  | "COMING_SOON"
  | "EXPERIMENTAL"
  | "PRODUCT_DESIGN_REQUIRED";

/**
 * Dating: coach + questions exist, no Matrix engine → HIDDEN this release.
 * Baby: distinct from Future Child EXPERIMENTAL → COMING_SOON.
 * Pregnancy / Christmas: COMING_SOON.
 * Memorial: PRODUCT_DESIGN_REQUIRED (no accidental consumer fun pack).
 * Real Estate: COMING_SOON (do not fake via VIDEO_INTENT).
 */
export const MISSING_PACK_POLICY: Partial<
  Record<StudioProductExperienceId, MissingPackDisposition>
> = {
  PEOPLE_DATING_PROFILE: "HIDDEN",
  PEOPLE_BABY: "COMING_SOON",
  PEOPLE_PREGNANCY: "COMING_SOON",
  PEOPLE_CHRISTMAS: "COMING_SOON",
  PEOPLE_MEMORIAL: "PRODUCT_DESIGN_REQUIRED",
  BUSINESS_REAL_ESTATE: "COMING_SOON",
};

export function getMissingPackDisposition(
  experienceId: StudioProductExperienceId
): MissingPackDisposition | null {
  const entry = getProductExperience(experienceId);
  if (entry.status !== "MISSING") return null;
  return MISSING_PACK_POLICY[experienceId] ?? "HIDDEN";
}

/** True when the pack must not appear in normal consumer generate choosers. */
export function isPackBlockedFromConsumerGenerate(
  experienceId: StudioProductExperienceId
): boolean {
  const disposition = getMissingPackDisposition(experienceId);
  if (disposition) return true;
  const entry = getProductExperience(experienceId);
  return entry.status === "MISSING";
}

export function missingPackUserMessage(
  experienceId: StudioProductExperienceId
): string {
  const disposition = getMissingPackDisposition(experienceId) ?? "HIDDEN";
  switch (disposition) {
    case "COMING_SOON":
      return "This experience is coming soon. It is not available to generate yet.";
    case "EXPERIMENTAL":
      return "This experience is experimental and not available in Quick Mode.";
    case "PRODUCT_DESIGN_REQUIRED":
      return "This experience needs deliberate product design before release.";
    case "HIDDEN":
    default:
      return "This experience is not available.";
  }
}
