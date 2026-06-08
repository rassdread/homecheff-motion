/**
 * Shared heuristic preset matching for character identity prefill (prompt + image).
 */

import {
  mapCharacterTypeToRole,
  type CharacterIdentityFormValues,
} from "@/lib/studio-character-identity-fields";
import {
  CHARACTER_IDENTITY_ACCESSORY_PRESETS,
  CHARACTER_IDENTITY_COLOR_THEMES,
  CHARACTER_IDENTITY_ENERGIES,
  CHARACTER_IDENTITY_OUTFIT_PRESETS,
  CHARACTER_IDENTITY_PERSONALITY_PRESETS,
  CHARACTER_IDENTITY_SHAPE_LANGUAGES,
  CHARACTER_IDENTITY_TYPES,
  CHARACTER_IDENTITY_CORE_STYLES,
  CHARACTER_IDENTITY_ADVANCED_STYLES,
  type CharacterIdentityTypeId,
} from "@/lib/studio-character-identity-presets";
import { getTranslator, type TranslationKey } from "@/i18n";

export const IDENTITY_PREFILL_FIELD_KEYS: Array<keyof CharacterIdentityFormValues> = [
  "name",
  "description",
  "characterType",
  "role",
  "visualStyle",
  "shapeLanguage",
  "energy",
  "personality",
  "colorTheme",
  "clothing",
  "accessories",
  "appearanceMemory",
  "forbiddenElements",
  "usageContext",
];

export const STYLE_KEYWORDS: Array<{ id: string; patterns: RegExp[] }> = [
  { id: "3d_cartoon", patterns: [/\b3d\b/, /\brender\b/, /\bpixar\b/] },
  { id: "2d_cartoon", patterns: [/\b2d\b/, /\bcartoon\b/, /\banimated\b/, /\bcartoon-/] },
  { id: "flat_cartoon", patterns: [/\bflat\b/, /\bvector\b/] },
  { id: "comic", patterns: [/\bcomic\b/, /\bsuperhero\b/] },
  { id: "storybook", patterns: [/\bstorybook\b/, /\billustration\b/] },
  { id: "anime", patterns: [/\banime\b/, /\bmanga\b/] },
  { id: "cinematic", patterns: [/\bcinematic\b/, /\bfilmic\b/] },
  { id: "semi_realistic", patterns: [/\bsemi[- ]?realistic\b/] },
  { id: "stylized", patterns: [/\bstylized\b/, /\bstylised\b/] },
  { id: "clay", patterns: [/\bclay\b/, /\bstop[- ]?motion\b/] },
];

export const SHAPE_KEYWORDS: Array<{ id: string; patterns: RegExp[] }> = [
  { id: "rounded", patterns: [/\bround\b/, /\brounded\b/, /\brond\b/, /\bsoft\b/, /\bcurv/, /\bvriendelijk\b/] },
  { id: "compact", patterns: [/\bcompact\b/, /\bstocky\b/, /\bchibi\b/] },
  { id: "expressive", patterns: [/\bexpressive\b/, /\bexaggerated\b/] },
  { id: "playful", patterns: [/\bplayful\b/, /\bfun\b/, /\bgrappig\b/] },
  { id: "professional", patterns: [/\bprofessional\b/, /\bclean\b/, /\bcorporate\b/] },
  { id: "minimal", patterns: [/\bminimal\b/, /\bsimple\b/] },
];

export const ENERGY_KEYWORDS: Array<{ id: string; patterns: RegExp[] }> = [
  { id: "calm", patterns: [/\bcalm\b/, /\bserene\b/, /\bquiet\b/, /\bkalm\b/] },
  { id: "friendly", patterns: [/\bfriendly\b/, /\bwelcoming\b/, /\bwarm\b/, /\bvriendelijk\b/] },
  { id: "energetic", patterns: [/\benergetic\b/, /\bactive\b/, /\bdynamic\b/] },
  { id: "funny", patterns: [/\bfunny\b/, /\bhumou?r\b/, /\bgrappig\b/] },
  { id: "heroic", patterns: [/\bheroic\b/, /\bbrave\b/, /\bbold\b/, /\bzelfverzekerd\b/] },
  { id: "mysterious", patterns: [/\bmysterious\b/, /\bdark\b/] },
  { id: "premium", patterns: [/\bpremium\b/, /\belegant\b/, /\bluxury\b/, /\bmodern\b/] },
];

export const TYPE_KEYWORDS: Array<{ id: CharacterIdentityTypeId; patterns: RegExp[] }> = [
  { id: "mascot", patterns: [/\bmascot\b/, /\bmascotte\b/, /\bbrand character\b/] },
  { id: "human", patterns: [/\bhuman\b/, /\bperson\b/, /\bman\b/, /\bwoman\b/] },
  { id: "animal", patterns: [/\banimal\b/, /\bcreature\b/, /\bpet\b/] },
  { id: "robot", patterns: [/\brobot\b/, /\bandroid\b/] },
  { id: "avatar", patterns: [/\bavatar\b/, /\bvtuber\b/] },
  { id: "object_character", patterns: [/\bobject\b/, /\bfood character\b/] },
];

export const COLOR_KEYWORDS: Array<{ id: string; patterns: RegExp[] }> = [
  {
    id: "homecheff",
    patterns: [
      /\bhomecheff\b/i,
      /\bgroen\b/,
      /\bgreen\b/,
      /\bblauw[- ]?groen\b/,
      /\bblue[- ]?green\b/,
      /\b#006d52\b/i,
    ],
  },
  { id: "warm", patterns: [/\bwarm\b/, /\borange\b/, /\bred\b/, /\byellow\b/] },
  { id: "pastel", patterns: [/\bpastel\b/] },
  { id: "earth", patterns: [/\bearth\b/, /\bbrown\b/, /\bbeige\b/] },
  { id: "premium", patterns: [/\bpremium\b/, /\bgold\b/, /\bnavy\b/] },
  { id: "neon", patterns: [/\bneon\b/, /\bvibrant\b/] },
  { id: "dark", patterns: [/\bdark\b/, /\bnoir\b/] },
  { id: "light", patterns: [/\blight\b/, /\bwhite\b/, /\bwit\b/, /\bwitte\b/] },
];

export const OUTFIT_KEYWORDS: Record<string, RegExp[]> = {
  chef: [
    /\bchef\b/,
    /\bkok\b/,
    /\bkitchen\b/,
    /\bkeuken\b/,
    /\bapron\b/,
    /\bschort\b/,
    /\bkoksmuts\b/,
    /\bchef hat\b/,
  ],
  garden: [/\bgarden\b/, /\btuin\b/, /\bplant\b/, /\bharvest\b/, /\boogst\b/],
  designer: [
    /\bdesign\b/,
    /\bontwerp\b/,
    /\bfashion\b/,
    /\bsew\b/,
    /\bnaai/,
    /\bdesigner\b/,
    /\bstreetwear\b/,
    /\burban designer\b/,
  ],
  delivery: [/\bdelivery\b/, /\bbezorg\b/, /\bcourier\b/],
  sporty: [/\bsport\b/, /\bathletic\b/, /\bfootball\b/, /\bvoetbal\b/],
  presenter: [/\bpresent\b/, /\bhost\b/, /\banchor\b/, /\bverteller\b/, /\bnarrator\b/],
  entrepreneur: [/\bbusiness\b/, /\bsuit\b/, /\bentrepreneur\b/],
  casual: [/\bcasual\b/, /\beveryday\b/],
};

export const ACCESSORY_KEYWORDS: Record<string, RegExp[]> = {
  spoon: [/\bspoon\b/, /\blepel\b/, /\bhouten lepel\b/, /\bwooden spoon\b/],
  basket: [/\bbasket\b/, /\bmand\b/],
  needle: [/\bneedle\b/, /\bnaald\b/, /\bklos\b/, /\bthimble\b/, /\bnaald en klos\b/],
  phone: [/\bphone\b/, /\bsmartphone\b/],
  package: [/\bpackage\b/, /\bbox\b/, /\bpakket\b/],
  bicycle: [/\bbike\b/, /\bbicycle\b/, /\bfiets\b/],
  ball: [/\bball\b/, /\bfootball\b/],
  camera: [/\bcamera\b/],
  notebook: [/\bnotebook\b/, /\bnotepad\b/],
};

const FORBIDDEN_PATTERNS = [
  /\bavoid\b[^.]{0,40}/i,
  /\bvermijden\b[^.]{0,40}/i,
  /\bgeen huidskleur\b/i,
  /\bno skin tone\b/i,
  /\bzonder huidskleur\b/i,
  /\bwithout skin color\b/i,
  /\bno human skin\b/i,
];

const ACCENT_HINTS: Array<{ hint: string; patterns: RegExp[] }> = [
  { hint: "British English accent", patterns: [/\bbritish\b/, /\bengels accent\b/, /\buk accent\b/] },
  { hint: "Jamaican accent", patterns: [/\bjamaican\b/, /\bjamaica\b/, /\bpatois\b/] },
  { hint: "Dutch accent", patterns: [/\bdutch\b/, /\bnederlands accent\b/, /\bnl accent\b/] },
];

export function normalizeHaystack(parts: Array<string | undefined | null>): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function matchFromList<T extends string>(candidates: readonly T[], haystack: string): T | "" {
  for (const id of candidates) {
    const spaced = id.replace(/_/g, " ");
    if (haystack.includes(id) || haystack.includes(spaced)) {
      return id;
    }
  }
  return "";
}

export function matchFromKeywords<T extends string>(
  rules: Array<{ id: T; patterns: RegExp[] }>,
  haystack: string
): T | "" {
  for (const rule of rules) {
    if (rule.patterns.some((p) => p.test(haystack))) {
      return rule.id;
    }
  }
  return "";
}

export function matchOutfitPreset(haystack: string): string {
  for (const [id, patterns] of Object.entries(OUTFIT_KEYWORDS)) {
    if (patterns.some((p) => p.test(haystack))) {
      return id;
    }
  }
  return matchFromList(CHARACTER_IDENTITY_OUTFIT_PRESETS, haystack);
}

export function matchAccessoryPreset(haystack: string): string {
  const matched: string[] = [];
  for (const [id, patterns] of Object.entries(ACCESSORY_KEYWORDS)) {
    if (patterns.some((p) => p.test(haystack))) {
      matched.push(id);
    }
  }
  if (matched.length > 0) {
    return matched.join(", ");
  }
  return matchFromList(CHARACTER_IDENTITY_ACCESSORY_PRESETS, haystack);
}

export function matchPersonalityPresets(haystack: string): string[] {
  const matched: string[] = [];
  for (const id of CHARACTER_IDENTITY_PERSONALITY_PRESETS) {
    const spaced = id.replace(/_/g, " ");
    if (haystack.includes(id) || haystack.includes(spaced)) {
      matched.push(id);
    }
  }
  for (const id of ["warm", "grappig", "funny", "betrouwbaar", "reliable", "creatief", "creative", "modern"]) {
    if (haystack.includes(id) && !matched.includes(id === "grappig" ? "funny" : id === "betrouwbaar" ? "reliable" : id === "creatief" ? "creative" : id)) {
      const mapped = id === "grappig" ? "funny" : id === "betrouwbaar" ? "reliable" : id === "creatief" ? "creative" : id;
      if (CHARACTER_IDENTITY_PERSONALITY_PRESETS.includes(mapped as (typeof CHARACTER_IDENTITY_PERSONALITY_PRESETS)[number])) {
        matched.push(mapped);
      }
    }
  }
  return [...new Set(matched)];
}

export function resolveCharacterType(raw: string, haystack: string): CharacterIdentityTypeId {
  const direct = matchFromList(CHARACTER_IDENTITY_TYPES, raw.toLowerCase());
  if (direct) {
    return direct as CharacterIdentityTypeId;
  }
  return matchFromKeywords(TYPE_KEYWORDS, haystack) || "mascot";
}

export function resolveStyle(raw: string, haystack: string): string {
  const allStyles = [...CHARACTER_IDENTITY_CORE_STYLES, ...CHARACTER_IDENTITY_ADVANCED_STYLES];
  const direct = matchFromList(allStyles, raw.toLowerCase());
  if (direct) {
    return direct;
  }
  return matchFromKeywords(STYLE_KEYWORDS, haystack) || "";
}

export function resolveShape(raw: string, haystack: string): string {
  const direct = matchFromList(CHARACTER_IDENTITY_SHAPE_LANGUAGES, raw.toLowerCase());
  if (direct) {
    return direct;
  }
  return matchFromKeywords(SHAPE_KEYWORDS, haystack) || "";
}

export function resolveEnergy(raw: string, haystack: string): string {
  const direct = matchFromList(CHARACTER_IDENTITY_ENERGIES, raw.toLowerCase());
  if (direct) {
    return direct;
  }
  return matchFromKeywords(ENERGY_KEYWORDS, haystack) || "";
}

export function resolveColorTheme(raw: string, haystack: string): string {
  const direct = matchFromList(CHARACTER_IDENTITY_COLOR_THEMES, raw.toLowerCase());
  if (direct) {
    return direct;
  }
  return matchFromKeywords(COLOR_KEYWORDS, haystack) || "";
}

export function labelForPreset(
  group: "personality" | "outfit" | "accessory",
  id: string,
  locale: "en" | "nl"
): string {
  if (!id) {
    return "";
  }
  const t = getTranslator(locale);
  if (group === "accessory" && id.includes(",")) {
    return id
      .split(",")
      .map((part) => labelForPreset("accessory", part.trim(), locale))
      .filter(Boolean)
      .join(", ");
  }
  const key = `studio.characterIdentity.presets.${group}.${id}` as TranslationKey;
  const label = t(key);
  return label === key ? id : label;
}

export function extractForbiddenElements(text: string): string {
  const parts: string[] = [];
  for (const pattern of FORBIDDEN_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      parts.push(match[0].trim());
    }
  }
  if (/\bhuidskleur\b/i.test(text) && /\b(vermijden|zonder|geen|avoid|without)\b/i.test(text)) {
    parts.push("Avoid human skin tone / huidskleur vermijden");
  }
  return [...new Set(parts)].join("; ").slice(0, 300);
}

export function extractAccentHint(haystack: string): string | undefined {
  for (const entry of ACCENT_HINTS) {
    if (entry.patterns.some((p) => p.test(haystack))) {
      return entry.hint;
    }
  }
  return undefined;
}

export function computeMissingFields(prefill: Partial<CharacterIdentityFormValues>): string[] {
  const missing: string[] = [];
  for (const key of IDENTITY_PREFILL_FIELD_KEYS) {
    if (key === "role" || key === "worldProfileId") {
      continue;
    }
    const value = prefill[key];
    if (value === undefined || value === null || String(value).trim() === "") {
      missing.push(key);
    }
  }
  return missing;
}

export function computeConfidence(
  prefill: Partial<CharacterIdentityFormValues>,
  explicitConfidence?: number
): number {
  const missing = computeMissingFields(prefill);
  const filledCount = IDENTITY_PREFILL_FIELD_KEYS.length - missing.length;
  const base =
    typeof explicitConfidence === "number"
      ? Math.min(1, Math.max(0, explicitConfidence))
      : filledCount / IDENTITY_PREFILL_FIELD_KEYS.length;
  return Math.round(base * 100) / 100;
}

export type MatchedIdentityFields = {
  prefill: Partial<CharacterIdentityFormValues>;
  reasons: string[];
};

/** Map free text (prompt or vision field bundle) → preset-backed identity fields. */
export function matchCharacterIdentityFromText(params: {
  haystack: string;
  locale?: "en" | "nl";
  description?: string;
  usageContext?: string;
  forbiddenOverride?: string;
  name?: string;
  explicitConfidence?: number;
}): MatchedIdentityFields {
  const locale = params.locale ?? "en";
  const haystack = params.haystack;
  const reasons: string[] = [];

  const characterType = resolveCharacterType("", haystack);
  if (characterType) {
    reasons.push(`type:${characterType}`);
  }
  const visualStyle = resolveStyle("", haystack);
  if (visualStyle) {
    reasons.push(`style:${visualStyle}`);
  }
  const shapeLanguage = resolveShape("", haystack);
  if (shapeLanguage) {
    reasons.push(`shape:${shapeLanguage}`);
  }
  const energy = resolveEnergy("", haystack);
  if (energy) {
    reasons.push(`energy:${energy}`);
  }
  const colorTheme = resolveColorTheme("", haystack);
  if (colorTheme) {
    reasons.push(`color:${colorTheme}`);
  }

  const outfitPreset = matchOutfitPreset(haystack);
  const accessoryPreset = matchAccessoryPreset(haystack);
  const personalityPresets = matchPersonalityPresets(haystack);

  if (outfitPreset) {
    reasons.push(`outfit:${outfitPreset}`);
  }
  if (accessoryPreset) {
    reasons.push(`accessory:${accessoryPreset}`);
  }
  if (personalityPresets.length) {
    reasons.push(`personality:${personalityPresets.join("+")}`);
  }

  const personalityLabels = personalityPresets
    .map((id) => labelForPreset("personality", id, locale))
    .filter(Boolean)
    .join(", ");

  const prefill: Partial<CharacterIdentityFormValues> = {
    name: params.name?.trim() ?? "",
    description: params.description?.trim() ?? "",
    characterType,
    role: mapCharacterTypeToRole(characterType),
    visualStyle,
    shapeLanguage,
    energy,
    personality: personalityLabels,
    colorTheme,
    clothing: outfitPreset ? labelForPreset("outfit", outfitPreset, locale) : "",
    accessories: accessoryPreset ? labelForPreset("accessory", accessoryPreset, locale) : "",
    appearanceMemory: "",
    forbiddenElements: params.forbiddenOverride ?? extractForbiddenElements(haystack),
    usageContext: params.usageContext?.trim() ?? "",
    worldProfileId: null,
  };

  return { prefill, reasons };
}
