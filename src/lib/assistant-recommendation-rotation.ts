import type { AssistantRecommendation } from "@/types/assistant-recommendation";

const DEFAULT_MIN = 8;
const DEFAULT_MAX = 20;

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function rotateAssistantRecommendations(input: {
  recommendations: AssistantRecommendation[];
  sessionSeed?: string;
  recentIds?: string[];
  minCount?: number;
  maxCount?: number;
}): AssistantRecommendation[] {
  const minCount = input.minCount ?? DEFAULT_MIN;
  const maxCount = input.maxCount ?? DEFAULT_MAX;
  const recent = new Set(input.recentIds ?? []);
  const seed = input.sessionSeed ?? "default";
  const offset = hashSeed(seed) % Math.max(1, input.recommendations.length);

  const sorted = [...input.recommendations].sort((a, b) => b.score - a.score);
  const fresh = sorted.filter((item) => !recent.has(item.id));
  const pool = fresh.length >= minCount ? fresh : sorted;

  const rotated: AssistantRecommendation[] = [];
  for (let i = 0; i < pool.length; i++) {
    const index = (i + offset) % pool.length;
    const item = pool[index];
    if (!item || rotated.some((row) => row.id === item.id)) {
      continue;
    }
    rotated.push(item);
    if (rotated.length >= maxCount) {
      break;
    }
  }

  if (rotated.length < minCount) {
    for (const item of sorted) {
      if (rotated.some((row) => row.id === item.id)) {
        continue;
      }
      rotated.push(item);
      if (rotated.length >= minCount) {
        break;
      }
    }
  }

  return rotated.slice(0, maxCount);
}

export function groupRecommendationsByCategory(
  recommendations: AssistantRecommendation[]
): Partial<Record<AssistantRecommendation["category"], AssistantRecommendation[]>> {
  const groups: Partial<Record<AssistantRecommendation["category"], AssistantRecommendation[]>> = {};
  for (const item of recommendations) {
    const list = groups[item.category] ?? [];
    list.push(item);
    groups[item.category] = list;
  }
  return groups;
}
