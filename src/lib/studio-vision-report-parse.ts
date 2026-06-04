import type { Prisma } from "@prisma/client";
import type { VisionConsistencyReport } from "@/types/studio-vision-consistency";

export function parseVisionConsistencyReport(
  value: Prisma.JsonValue | null
): VisionConsistencyReport | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as unknown as VisionConsistencyReport;
}
