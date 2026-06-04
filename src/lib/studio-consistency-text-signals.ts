import type { StudioIdentityStrength } from "@/lib/studio-memory-validation";
import type { StudioContinuityStrength } from "@/lib/studio-continuity-strength";

export function buildConsistencyHaystack(...parts: (string | undefined | null)[]): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

/** Split memory text into checkable phrases (lines, commas, semicolons). */
export function memoryPhrases(text: string): string[] {
  return text
    .split(/[\n,;.]+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 3);
}

export function phrasePresentInHaystack(haystack: string, phrase: string): boolean {
  const normalized = phrase.trim().toLowerCase();
  if (!normalized || normalized.length < 3) {
    return true;
  }
  if (haystack.includes(normalized)) {
    return true;
  }
  const tokens = normalized.split(/\s+/).filter((t) => t.length > 2);
  if (tokens.length === 0) {
    return true;
  }
  const matched = tokens.filter((t) => haystack.includes(t)).length;
  return matched / tokens.length >= 0.7;
}

export function requiredPhraseMatchRatio(
  strength: StudioIdentityStrength | StudioContinuityStrength
): number {
  switch (strength) {
    case "strict":
      return 0.85;
    case "strong":
      return 0.65;
    case "normal":
      return 0.45;
    case "loose":
    case "low":
    default:
      return 0.3;
  }
}

export function scorePhrasesAgainstHaystack(
  haystack: string,
  phrases: string[],
  requiredRatio: number
): { score: number; missing: string[] } {
  const unique = [...new Set(phrases.map((p) => p.trim()).filter((p) => p.length >= 3))];
  if (unique.length === 0) {
    return { score: 100, missing: [] };
  }
  const missing: string[] = [];
  let hits = 0;
  for (const phrase of unique) {
    if (phrasePresentInHaystack(haystack, phrase)) {
      hits += 1;
    } else {
      missing.push(phrase);
    }
  }
  const ratio = hits / unique.length;
  const score = Math.round(Math.min(100, (ratio / requiredRatio) * 100));
  const capped = Math.min(100, Math.max(0, ratio >= requiredRatio ? score : Math.round(ratio * 100)));
  return { score: capped, missing };
}

export function reinforcementRecommendation(label: string, missing: string): string {
  const snippet = missing.length > 60 ? `${missing.slice(0, 57)}…` : missing;
  return `Reinforce ${label}: ${snippet}`;
}
