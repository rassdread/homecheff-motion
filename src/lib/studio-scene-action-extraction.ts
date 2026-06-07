/**
 * Shared scene action text extraction — used by render strategy and capability intelligence.
 */

export const ACTION_VERB_PATTERNS: Array<{ pattern: RegExp; capabilityId: string }> = [
  { pattern: /\b(kick|schop|schoppen|trap|trappen)\b/i, capabilityId: "kick" },
  { pattern: /\b(shoot|schiet|schieten|score|goals?|doelpunt)\b/i, capabilityId: "shoot" },
  { pattern: /\b(run|rennen|ren|sprint|weglopen|wegrennen)\b/i, capabilityId: "run" },
  { pattern: /\b(jump|spring|sprong|springen)\b/i, capabilityId: "jump" },
  { pattern: /\b(cheer|juich|juichen|celebrate|vieren|feest)\b/i, capabilityId: "celebrate" },
  { pattern: /\b(hold|houd|hooghouden|balans|balance)\b/i, capabilityId: "hold" },
  { pattern: /\b(catch|vang|vangen|receive|ontvang)\b/i, capabilityId: "hold" },
  { pattern: /\b(throw|gooi|gooien|pass|passen)\b/i, capabilityId: "kick" },
  { pattern: /\b(cook|kook|koken|bake|bakken)\b/i, capabilityId: "cook" },
  { pattern: /\b(stir|roer|roeren|mix|mengen)\b/i, capabilityId: "stir" },
  { pattern: /\b(taste|proef|proeven|sample|smaak)\b/i, capabilityId: "taste" },
  { pattern: /\b(serve|serveer|serveren|plate|opdienen)\b/i, capabilityId: "serve" },
  { pattern: /\b(deliver|bezorg|bezorgen|handover|overhandig)\b/i, capabilityId: "deliver" },
  { pattern: /\b(pick\s*up|ophalen|grab|pakken|take|dragen|carry|draag)\b/i, capabilityId: "carry" },
  { pattern: /\b(plant|zaad|zaaien|sow|pot)\b/i, capabilityId: "plant" },
  { pattern: /\b(water|giet|gieten|pour|besproei)\b/i, capabilityId: "water" },
  { pattern: /\b(harvest|oogst|oogsten|pick|pluk)\b/i, capabilityId: "harvest" },
  { pattern: /\b(draw|teken|tekenen|sketch|schets)\b/i, capabilityId: "draw" },
  { pattern: /\b(sew|naai|naaien|stitch)\b/i, capabilityId: "sew" },
  { pattern: /\b(create|maak|maken|build|bouwen|craft)\b/i, capabilityId: "create" },
  { pattern: /\b(design|ontwerp|ontwerpen)\b/i, capabilityId: "design" },
  { pattern: /\b(present|presenteren|show|tonen|introduce|introduceren)\b/i, capabilityId: "present" },
  { pattern: /\b(explain|uitleg|uitleggen|teach|leren geven)\b/i, capabilityId: "explain" },
  { pattern: /\b(greet|groet|groeten|welkom|welcome|wave|zwaai|zwaaien)\b/i, capabilityId: "greet" },
  { pattern: /\b(point|wijs|wijzen|gesture|gebaar)\b/i, capabilityId: "point" },
  { pattern: /\b(shop|winkelen|market|markt|kopen|buy)\b/i, capabilityId: "shop" },
  { pattern: /\b(sell|verkoop|verkopen|pitch)\b/i, capabilityId: "sell" },
  { pattern: /\b(work|werk|werken|focus|concentrate)\b/i, capabilityId: "work" },
  { pattern: /\b(talk|praat|praten|speak|spreken|narrat)\b/i, capabilityId: "talk" },
  { pattern: /\b(walk|loop|lopen|move|bewegen|travel|reizen|fiets|bicycle)\b/i, capabilityId: "walk" },
  { pattern: /\b(learn|leer|leren|study|studeren|read|lezen)\b/i, capabilityId: "learn" },
  { pattern: /\b(play|speel|spelen|fun|spel)\b/i, capabilityId: "play" },
  { pattern: /\b(watch|kijk|kijken|look|observe|observeren)\b/i, capabilityId: "observe" },
  { pattern: /\b(dance|dans|dansen|spin|draai|draaien|turn)\b/i, capabilityId: "celebrate" },
  { pattern: /\b(open|openen|close|sluiten|lift|tillen|push|duw)\b/i, capabilityId: "work" },
  { pattern: /\b(collaborat|samenwerk|teamwork|help|helpen)\b/i, capabilityId: "collaborate" },
];

const UNUSUAL_ACTION_PATTERNS: RegExp[] = [
  /\b(skateboard|skate|trick|truc|trucs|voetbaltruc)\b/i,
  /\b(kungfu|kung\s*fu|karate|martial|vecht|fight|gevecht|ruimtegevecht|space\s*fight)\b/i,
  /\b(fly|vlieg|vliegen|teleport|magic|tover|spell)\b/i,
  /\b(alien|robot\s*war|laser|explos)\b/i,
];

export const SEQUENTIAL_ACTION_SPLIT = /\s*(?:,|;|\ben\b|\band then\b|\bthen\b|\bdaarna\b|\b→\s*|\->\s*|\btot\b)\s*/i;

export function extractActionSteps(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }
  const parts = trimmed
    .split(SEQUENTIAL_ACTION_SPLIT)
    .map((p) => p.trim())
    .filter((p) => p.length >= 3);
  if (parts.length >= 2) {
    return parts;
  }
  const verbs: string[] = [];
  for (const { pattern } of ACTION_VERB_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[0]) {
      verbs.push(match[0].toLowerCase());
    }
  }
  return [...new Set(verbs)];
}

export function countDistinctActionCapabilities(text: string): number {
  const ids = new Set<string>();
  for (const { pattern, capabilityId } of ACTION_VERB_PATTERNS) {
    if (pattern.test(text)) {
      ids.add(capabilityId);
    }
  }
  return ids.size;
}

export function matchActionFragmentToCapability(
  fragment: string
): string | null {
  for (const { pattern, capabilityId } of ACTION_VERB_PATTERNS) {
    if (pattern.test(fragment)) {
      return capabilityId;
    }
  }
  return null;
}

export function isUnusualActionFragment(fragment: string): boolean {
  return UNUSUAL_ACTION_PATTERNS.some((p) => p.test(fragment));
}

/** Legacy regex list for render strategy backward compatibility. */
export function actionVerbPatternsAsRegex(): RegExp[] {
  return ACTION_VERB_PATTERNS.map(({ pattern }) => pattern);
}
