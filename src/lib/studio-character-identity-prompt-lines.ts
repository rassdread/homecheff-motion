/**
 * Explicit character identity prompt lines from structured tokens and canonical identity.
 */

import { parseStructuredKeywordsFromVisualKeywords } from "@/lib/studio-character-visual-keywords";
import type { CanonicalCharacterIdentity } from "@/types/studio-character-canonical-references";
import type { CharacterMemorySnapshot } from "@/types/studio-memory-snapshots";

const STRUCTURED_LABELS: Record<keyof ReturnType<typeof parseStructuredKeywordsFromVisualKeywords>, string> = {
  characterType: "Character type",
  visualStyle: "Visual style",
  shapeLanguage: "Shape language",
  energy: "Energy",
  colorTheme: "Color theme",
};

export function buildCharacterStructuredIdentityPromptLines(
  visualKeywords: string
): string[] {
  const structured = parseStructuredKeywordsFromVisualKeywords(visualKeywords);
  const lines: string[] = [];
  for (const [key, label] of Object.entries(STRUCTURED_LABELS) as Array<
    [keyof typeof structured, string]
  >) {
    const value = structured[key]?.trim();
    if (value) {
      lines.push(`${label}: ${value}.`);
    }
  }
  return lines;
}

export function buildCanonicalIdentityPromptLines(
  canonical: CanonicalCharacterIdentity | null | undefined
): string[] {
  if (!canonical) {
    return [];
  }
  const lines: string[] = [];
  if (canonical.visualStyle.trim()) {
    lines.push(`Visual style: ${canonical.visualStyle.trim()}.`);
  }
  if (canonical.outfit.trim()) {
    lines.push(`Outfit: ${canonical.outfit.trim()}.`);
  }
  if (canonical.colorTheme.trim()) {
    lines.push(`Color theme: ${canonical.colorTheme.trim()}.`);
  }
  if (canonical.worldProfileName?.trim()) {
    lines.push(`World: ${canonical.worldProfileName.trim()}.`);
  }
  const supporting = canonical.supportingReferences.filter((r) => r.status === "active");
  if (supporting.length > 0) {
    const roles = supporting
      .slice(0, 4)
      .map((r) => r.role)
      .join(", ");
    lines.push(`Supporting references (${roles}): maintain consistency with canonical refs.`);
  }
  return lines;
}

export function buildCharacterIdentityPromptLinesFromMemory(
  character: CharacterMemorySnapshot
): string[] {
  return [
    ...buildCharacterStructuredIdentityPromptLines(character.visualKeywords),
    ...buildCanonicalIdentityPromptLines(character.canonicalIdentity),
  ];
}
