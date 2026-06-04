import type { CharacterIdentityTimeline } from "@/types/studio-character-consistency";

/**
 * V17: stronger identity constraints when drift was detected for a character.
 */
export function buildCharacterIdentityDriftPromptLines(
  timelines: CharacterIdentityTimeline[]
): string[] {
  const lines: string[] = [];
  for (const timeline of timelines) {
    const needsStrict =
      (timeline.averageScore !== null && timeline.averageScore < 80) ||
      timeline.warningCount > 0 ||
      (timeline.worstScore !== null && timeline.worstScore < 70);

    if (!needsStrict) {
      continue;
    }

    lines.push(
      `Strictly preserve ${timeline.name} mascot identity from previous scenes.`
    );

    if (timeline.name.toLowerCase().includes("chef") || timeline.role === "mascot") {
      lines.push(
        `Ensure ${timeline.name} clearly wears signature accessories (white chef hat, branded apron).`
      );
    }

    if (timeline.worstSceneOrder !== null && timeline.worstScore !== null && timeline.worstScore < 65) {
      lines.push(
        `Recover ${timeline.name} identity — previous drift detected around scene ${timeline.worstSceneOrder + 1}.`
      );
    }
  }
  return [...new Set(lines)];
}
