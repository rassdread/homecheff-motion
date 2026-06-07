import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import {
  locationIdentityFormFromLocation,
  type LocationIdentityFormValues,
} from "@/lib/studio-location-identity-fields";
import { getTranslator } from "@/i18n";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

/** Build AI Director location identity suggestion for compare / prefill. */
export function buildLocationIdentityAiSuggestion(params: {
  storyboard: StudioStoryboardDetail;
  location: StudioLocationListItem;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  memory?: StudioProjectMemorySnapshot | null;
  locale?: "en" | "nl";
}): Partial<LocationIdentityFormValues> | null {
  const idea =
    params.storyboard.aiDirectorPrompt.trim() ||
    `${params.storyboard.title} ${params.storyboard.description}`.trim();
  if (!idea) {
    return null;
  }

  const t = getTranslator(params.locale ?? "en");
  const proposal = buildDirectorProposal({
    idea,
    storyboard: params.storyboard,
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds,
    projectMemory: params.memory ?? undefined,
    t,
  });
  if (!proposal) {
    return null;
  }

  const proposed = proposal.scenes
    .flatMap((s) => (s.proposedLocation ? [s.proposedLocation] : []))
    .find((p) => normalizeName(p.name) === normalizeName(params.location.name));
  const refMatch = proposal.scenes
    .flatMap((s) => (s.locationRef ? [s.locationRef] : []))
    .find(
      (r) =>
        r.existingId === params.location.id ||
        normalizeName(r.name) === normalizeName(params.location.name)
    );

  if (!proposed && !refMatch) {
    const firstProposed = proposal.scenes.flatMap((s) =>
      s.proposedLocation ? [s.proposedLocation] : []
    )[0];
    if (!firstProposed) {
      return null;
    }
    return {
      name: firstProposed.name,
      description: params.storyboard.description.slice(0, 200),
      usageContext: idea.slice(0, 400),
    };
  }

  const name = proposed?.name ?? refMatch?.name ?? params.location.name;
  return {
    name,
    description: params.storyboard.description.slice(0, 200) || idea.slice(0, 200),
    usageContext: idea.slice(0, 400),
  };
}

export function diffLocationIdentityForm(
  current: LocationIdentityFormValues,
  suggested: Partial<LocationIdentityFormValues>
): Array<keyof LocationIdentityFormValues> {
  const keys = Object.keys(suggested) as Array<keyof LocationIdentityFormValues>;
  return keys.filter((key) => {
    const next = suggested[key];
    if (next === undefined || next === null) return false;
    return String(current[key] ?? "").trim() !== String(next).trim();
  });
}

export function hasLocationIdentitySuggestion(
  location: StudioLocationListItem,
  suggestion: Partial<LocationIdentityFormValues> | null
): boolean {
  if (!suggestion) return false;
  const current = locationIdentityFormFromLocation(location);
  return diffLocationIdentityForm(current, suggestion).length > 0;
}
