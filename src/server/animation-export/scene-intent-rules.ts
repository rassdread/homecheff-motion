/**
 * Safe Zone V6 — deterministic scene intent from overlay text (no LLM).
 */

export type SceneIntent =
  | "earnings"
  | "community"
  | "global"
  | "freedom"
  | "product"
  | "final_movement"
  | "generic";

const INTENT_KEYWORDS: Record<Exclude<SceneIntent, "generic">, string[]> = {
  earnings: ["earn", "earning", "money", "payout", "order", "customer", "income", "opportunity"],
  community: ["community", "connect", "people", "share", "together"],
  global: ["world", "global", "country", "continent", "everywhere"],
  freedom: ["freedom", "anywhere", "no limits", "your way"],
  product: ["food", "meal", "chef", "garden", "create", "cook", "kitchen", "market"],
  final_movement: ["movement", "not just an app", "homecheff", "belong"],
};

/** Infer scene intent from overlay text using keyword matching. */
export function inferSceneIntent(text: string): SceneIntent {
  const lower = text.toLowerCase();
  let best: SceneIntent = "generic";
  let bestHits = 0;

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [
    Exclude<SceneIntent, "generic">,
    string[],
  ][]) {
    let hits = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        hits += 1;
      }
    }
    if (hits > bestHits) {
      bestHits = hits;
      best = intent;
    }
  }

  return best;
}

/** Row preference bonus for a zone row given intent (-5..+12). */
export function intentRowBonus(
  intent: SceneIntent,
  row: "top" | "center" | "bottom"
): number {
  switch (intent) {
    case "final_movement":
      return row === "top" ? 12 : row === "center" ? 10 : 0;
    case "earnings":
      return row === "bottom" ? 6 : row === "center" ? 4 : 2;
    case "global":
      return row === "top" ? 10 : row === "center" ? 8 : -4;
    case "freedom":
      return row === "top" ? 12 : row === "center" ? 4 : -2;
    case "community":
      return row === "center" ? 8 : row === "bottom" ? 4 : 2;
    case "product":
      return row === "bottom" ? 8 : row === "center" ? 6 : 2;
    default:
      return 0;
  }
}

export function zoneRowFromId(zoneId: string): "top" | "center" | "bottom" {
  if (zoneId.startsWith("TOP_")) {
    return "top";
  }
  if (zoneId.startsWith("BOTTOM_")) {
    return "bottom";
  }
  return "center";
}

/** Apply intent-based score adjustment to a zone. */
export function applyIntentBonus(zoneId: string, intent: SceneIntent, baseScore: number): number {
  const row = zoneRowFromId(zoneId);
  return Math.max(0, Math.min(100, baseScore + intentRowBonus(intent, row)));
}
