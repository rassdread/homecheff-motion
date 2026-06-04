import type { CharacterIdentityTimelineEntry } from "@/types/studio-character-consistency";
import type { CharacterMemorySnapshot } from "@/types/studio-memory-snapshots";

const DRIFT_DROP_THRESHOLD = 15;

function average(nums: number[]): number | null {
  if (nums.length === 0) {
    return null;
  }
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function classifyDriftWarning(
  characterName: string,
  warning: string,
  otherNames: string[]
): string | null {
  const lower = warning.toLowerCase();
  const nameLower = characterName.toLowerCase();

  if (/not clearly present|not detected|missing|not visible/i.test(lower)) {
    return `${characterName} appears missing or unclear in this scene.`;
  }
  if (/hat/i.test(lower) && (nameLower.includes("chef") || /chef/i.test(lower))) {
    return `${characterName} appears without chef hat.`;
  }
  if (/apron/i.test(lower)) {
    return `${characterName} apron missing or inconsistent.`;
  }
  if (/clothing|outfit|wardrobe/i.test(lower)) {
    return `${characterName} outfit may have changed.`;
  }
  if (/accessories/i.test(lower)) {
    return `${characterName} expected accessories missing.`;
  }
  if (/mascot|proportions|identity/i.test(lower)) {
    return `${characterName} visual identity changed strongly.`;
  }
  if (/branding|logo/i.test(lower)) {
    return `${characterName} branding inconsistent.`;
  }
  for (const other of otherNames) {
    if (other === characterName) {
      continue;
    }
    if (lower.includes(other.toLowerCase()) && lower.includes("confus")) {
      return `${characterName} may be confused with ${other}.`;
    }
    if (
      lower.includes(other.toLowerCase()) &&
      /transform|into|replaced|wrong/i.test(lower)
    ) {
      return `Do not transform ${characterName} into ${other}. Keep them separate.`;
    }
  }
  for (const other of otherNames) {
    if (other !== characterName && lower.includes(other.toLowerCase()) && lower.includes(nameLower)) {
      return `${characterName} may be confused with ${other}.`;
    }
  }
  if (/style mismatch|wrong style/i.test(lower)) {
    return `${characterName} style mismatch across scenes.`;
  }
  return warning;
}

/**
 * Detect character identity drift across a storyboard timeline (V17).
 */
export function detectCharacterDrift(params: {
  character: CharacterMemorySnapshot;
  timeline: CharacterIdentityTimelineEntry[];
  allCharacterNames: string[];
}): string[] {
  const { character, timeline, allCharacterNames } = params;
  const others = allCharacterNames.filter((n) => n !== character.name);
  const driftWarnings: string[] = [];
  const scored = timeline
    .filter((e): e is CharacterIdentityTimelineEntry & { score: number } => typeof e.score === "number")
    .map((e) => ({ order: e.order, score: e.score, sceneTitle: e.sceneTitle }));

  const avg = average(scored.map((s) => s.score));

  for (const entry of timeline) {
    for (const raw of entry.warnings) {
      const normalized = classifyDriftWarning(character.name, raw, others);
      if (normalized && !driftWarnings.includes(normalized)) {
        driftWarnings.push(normalized);
      }
    }
    if (typeof entry.score === "number" && avg !== null && entry.score < avg - DRIFT_DROP_THRESHOLD) {
      driftWarnings.push(
        `${character.name} visual identity changed strongly in Scene ${entry.order + 1}.`
      );
    }
    if (entry.driftFlag && entry.score !== null && entry.score < 70) {
      driftWarnings.push(
        `${character.name} identity drift flagged in Scene ${entry.order + 1} (score ${entry.score}).`
      );
    }
  }

  const missingScenes = timeline.filter(
    (e) => e.score === null && entryExpectedMissing(e, character.name)
  );
  if (missingScenes.length > 0 && timeline.some((e) => e.score !== null)) {
    driftWarnings.push(`${character.name} missing from one or more expected scenes.`);
  }

  return [...new Set(driftWarnings)];
}

function entryExpectedMissing(entry: CharacterIdentityTimelineEntry, _name: string): boolean {
  return entry.warnings.some((w) => /expected in scene/i.test(w));
}
