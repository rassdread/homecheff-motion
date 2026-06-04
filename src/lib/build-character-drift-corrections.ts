import { scoreToCorrectionSeverity } from "@/lib/studio-correction-severity";
import type { CorrectionRecommendation } from "@/types/studio-correction";
import type { CharacterIdentityTimeline } from "@/types/studio-character-consistency";
import type { CharacterMemorySnapshot } from "@/types/studio-memory-snapshots";

function patchForDriftWarning(warning: string, characterName: string): string {
  const lower = warning.toLowerCase();
  if (/chef hat|without chef hat|hat missing|hat not/i.test(lower)) {
    return "Ensure the Chef mascot clearly wears the white chef hat.";
  }
  if (/apron/i.test(lower)) {
    return `Ensure ${characterName} wears the correct branded apron consistently.`;
  }
  if (/confused with|do not transform/i.test(lower)) {
    const match = warning.match(/with ([^.]+)/i) || warning.match(/into ([^.]+)/i);
    const other = match?.[1]?.trim() ?? "another character";
    return `Do not transform ${characterName} into ${other}. Keep ${characterName} and ${other} as separate characters.`;
  }
  if (/missing from|appears missing/i.test(lower)) {
    return `Ensure ${characterName} is clearly visible and recognizable in frame.`;
  }
  if (/outfit|clothing|wardrobe/i.test(lower)) {
    return `Preserve ${characterName} default clothing and outfit across scenes.`;
  }
  if (/accessories/i.test(lower)) {
    return `Keep ${characterName} signature accessories visible (hat, tools, branding).`;
  }
  if (/mascot|identity changed|identity drift|strongly in scene/i.test(lower)) {
    return `Strictly preserve ${characterName} mascot identity from previous scenes.`;
  }
  if (/branding|logo/i.test(lower)) {
    return `Maintain ${characterName} HomeCheff branding elements consistently.`;
  }
  if (/style mismatch/i.test(lower)) {
    return `Match ${characterName} visual style to earlier scenes in this storyboard.`;
  }
  return `Reinforce ${characterName} visual identity with strong continuity from reference.`;
}

export function buildCharacterDriftCorrectionRecommendations(params: {
  driftWarnings: string[];
  timelines: CharacterIdentityTimeline[];
  characters: CharacterMemorySnapshot[];
}): CorrectionRecommendation[] {
  const out: CorrectionRecommendation[] = [];
  const nameById = new Map(params.characters.map((c) => [c.id, c.name]));

  for (const timeline of params.timelines) {
    const name = timeline.name;
    if (timeline.worstScore !== null && timeline.worstScore < 75) {
      out.push({
        id: `char-drift-${timeline.characterId}-score`,
        type: "MissingCharacterTrait",
        severity: scoreToCorrectionSeverity(timeline.worstScore),
        message: `${name} average identity ${timeline.averageScore ?? "—"} — review scene ${(timeline.worstSceneOrder ?? 0) + 1}`,
        promptPatch: `Strictly preserve ${name} identity from previous scenes.`,
        source: `character_identity:${timeline.characterId}`,
      });
    }
  }

  for (let i = 0; i < params.driftWarnings.length; i += 1) {
    const warning = params.driftWarnings[i]!;
    const characterName =
      params.characters.find((c) => warning.startsWith(c.name))?.name ??
      nameById.values().next().value ??
      "Character";
    const characterId =
      params.characters.find((c) => c.name === characterName)?.id ?? "unknown";

    out.push({
      id: `char-drift-warn-${i}`,
      type: "MissingCharacterTrait",
      severity: /strongly|missing|confused|without/i.test(warning) ? "critical" : "high",
      message: warning,
      promptPatch: patchForDriftWarning(warning, characterName),
      source: `character_drift:${characterId}`,
    });
  }

  const seen = new Set<string>();
  return out.filter((r) => {
    const key = `${r.message}:${r.promptPatch}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
