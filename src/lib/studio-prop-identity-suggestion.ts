import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import {
  propIdentityFormFromProp,
  type PropIdentityFormValues,
} from "@/lib/studio-prop-identity-fields";
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

/** Build AI Director prop identity suggestion for compare / prefill. */
export function buildPropIdentityAiSuggestion(params: {
  storyboard: StudioStoryboardDetail;
  prop: StudioPropListItem;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  memory?: StudioProjectMemorySnapshot | null;
  locale?: "en" | "nl";
}): Partial<PropIdentityFormValues> | null {
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
    .flatMap((s) => s.proposedProps)
    .find((p) => normalizeName(p.name) === normalizeName(params.prop.name));
  const refMatch = proposal.scenes
    .flatMap((s) => s.propRefs)
    .find(
      (r) =>
        r.existingId === params.prop.id ||
        normalizeName(r.name) === normalizeName(params.prop.name)
    );

  if (!proposed && !refMatch) {
    const firstProposed = proposal.scenes.flatMap((s) => s.proposedProps)[0];
    if (!firstProposed) {
      return null;
    }
    return {
      name: firstProposed.name,
      description: params.storyboard.description.slice(0, 200),
      usageContext: idea.slice(0, 400),
    };
  }

  const name = proposed?.name ?? refMatch?.name ?? params.prop.name;
  return {
    name,
    description: params.storyboard.description.slice(0, 200) || idea.slice(0, 200),
    usageContext: idea.slice(0, 400),
  };
}

export function diffPropIdentityForm(
  current: PropIdentityFormValues,
  suggested: Partial<PropIdentityFormValues>
): Array<keyof PropIdentityFormValues> {
  const keys = Object.keys(suggested) as Array<keyof PropIdentityFormValues>;
  return keys.filter((key) => {
    const next = suggested[key];
    if (next === undefined || next === null) return false;
    if (key === "linkedCharacterIds") {
      const a = [...(current.linkedCharacterIds ?? [])].sort().join(",");
      const b = [...(Array.isArray(next) ? next : [])].sort().join(",");
      return a !== b;
    }
    return String(current[key] ?? "").trim() !== String(next).trim();
  });
}

export function hasPropIdentitySuggestion(
  prop: StudioPropListItem,
  suggestion: Partial<PropIdentityFormValues> | null
): boolean {
  if (!suggestion) return false;
  const current = propIdentityFormFromProp(prop);
  return diffPropIdentityForm(current, suggestion).length > 0;
}
