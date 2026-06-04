import type { StudioWorldProfileSummary } from "@/types/studio-api";

export function mapStudioWorldProfileSummary(
  world: { id: string; name: string } | null | undefined
): StudioWorldProfileSummary | null {
  if (!world) {
    return null;
  }
  return { id: world.id, name: world.name };
}
