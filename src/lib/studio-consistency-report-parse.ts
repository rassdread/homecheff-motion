import type { Prisma } from "@prisma/client";
import type { SceneConsistencyReport } from "@/types/studio-consistency";

export function parseSceneConsistencyReport(
  value: Prisma.JsonValue | null
): SceneConsistencyReport | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as unknown as SceneConsistencyReport;
}

export function parseConsistencyRecommendations(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((v): v is string => typeof v === "string");
}
