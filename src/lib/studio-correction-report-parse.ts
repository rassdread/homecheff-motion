import type { Prisma } from "@prisma/client";
import type { CorrectionRecommendation, PromptPatch } from "@/types/studio-correction";

export function parseCorrectionRecommendations(value: Prisma.JsonValue | null): CorrectionRecommendation[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value as unknown as CorrectionRecommendation[];
}

export function parsePromptPatches(value: Prisma.JsonValue | null): PromptPatch[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value as unknown as PromptPatch[];
}
