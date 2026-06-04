import type { CharacterIdentityStatus } from "@/types/studio-character-consistency";

export function scoreToCharacterIdentityStatus(score: number): CharacterIdentityStatus {
  if (score >= 90) {
    return "excellent";
  }
  if (score >= 75) {
    return "good";
  }
  if (score >= 55) {
    return "needs_review";
  }
  return "poor";
}

export function characterIdentityStatusColor(
  status: CharacterIdentityStatus | null
): "green" | "yellow" | "orange" | "red" | "zinc" {
  switch (status) {
    case "excellent":
      return "green";
    case "good":
      return "yellow";
    case "needs_review":
      return "orange";
    case "poor":
      return "red";
    default:
      return "zinc";
  }
}

export function characterIdentityStatusFromLegacy(
  status: import("@/types/studio-consistency").StudioConsistencyStatus | null
): CharacterIdentityStatus | null {
  if (!status) {
    return null;
  }
  if (status === "excellent" || status === "good" || status === "needs_review" || status === "poor") {
    return status;
  }
  return null;
}
