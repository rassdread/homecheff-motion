import type { StudioProductionBriefSelections } from "@/types/studio-production-brief-v3";
import { DEFAULT_BRIEF_SELECTIONS } from "@/types/studio-production-brief-v3";

export function mergeBriefSelections(
  patch: Partial<StudioProductionBriefSelections>
): StudioProductionBriefSelections {
  return { ...DEFAULT_BRIEF_SELECTIONS, ...patch };
}

export function toggleBriefSelection<T extends string>(
  current: T[],
  value: T,
  multi = true
): T[] {
  if (!multi) return [value];
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

export function briefSelectionsToDurationSeconds(length: StudioProductionBriefSelections["length"]): number {
  const pick = length[0] ?? "medium";
  if (pick === "short") return 15;
  if (pick === "long") return 60;
  return 30;
}

export function briefSelectionsToIdeaEnrichment(
  idea: string,
  selections: StudioProductionBriefSelections
): string {
  const parts = [
    idea.trim(),
    selections.goals.length ? `Goals: ${selections.goals.join(", ")}` : "",
    selections.tones.length ? `Tone: ${selections.tones.join(", ")}` : "",
    selections.narrative.length ? `Narrative: ${selections.narrative.join(", ")}` : "",
    selections.pace.length ? `Pace: ${selections.pace.join(", ")}` : "",
    selections.audience.length ? `Audience: ${selections.audience.join(", ")}` : "",
  ].filter(Boolean);
  return parts.join("\n");
}
