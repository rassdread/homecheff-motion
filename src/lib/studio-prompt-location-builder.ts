import type { LocationSnapshot } from "@/types/studio-location-snapshot";
import { buildLocationIdentityPromptContext } from "@/lib/studio-location-identity-visual-hints";
import type { StudioLocationListItem } from "@/types/studio-api";

const CATEGORY_HINTS: Record<string, string> = {
  city: "urban city environment",
  restaurant: "restaurant interior or dining setting",
  garden: "community garden with plants and neighborhood atmosphere",
  market: "lively market setting",
  street: "street-level urban scene",
  home: "comfortable home interior",
  office: "modern office environment",
  nature: "natural outdoor environment",
  fantasy: "stylized fantasy environment",
};

export function buildLocationPrompt(
  location: LocationSnapshot | null,
  sourceLocation?: StudioLocationListItem | null
): string {
  if (!location) {
    return "";
  }
  const parts: string[] = [];
  const categoryHint = CATEGORY_HINTS[location.category] ?? location.category;
  parts.push(`A cinematic ${location.name} scene — ${categoryHint}.`);
  if (location.description.trim()) {
    parts.push(location.description.trim());
  }
  const identityContext = buildLocationIdentityPromptContext(sourceLocation ?? null);
  if (identityContext) {
    parts.push(identityContext);
  }
  return parts.join(" ");
}
