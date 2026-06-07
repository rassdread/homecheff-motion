import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import {
  characterIdentityFormFromCharacter,
  type CharacterIdentityFormValues,
} from "@/lib/studio-character-identity-fields";
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

/** Build AI Director character identity suggestion for compare / prefill. */
export function buildCharacterIdentityAiSuggestion(params: {
  storyboard: StudioStoryboardDetail;
  character: StudioCharacterListItem;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  memory?: StudioProjectMemorySnapshot | null;
  locale?: "en" | "nl";
}): Partial<CharacterIdentityFormValues> | null {
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
    .flatMap((s) => s.proposedCharacters)
    .find((p) => normalizeName(p.name) === normalizeName(params.character.name));
  const refMatch = proposal.scenes
    .flatMap((s) => s.characterRefs)
    .find(
      (r) =>
        r.existingId === params.character.id ||
        normalizeName(r.name) === normalizeName(params.character.name)
    );

  if (!proposed && !refMatch) {
    const firstProposed = proposal.scenes.flatMap((s) => s.proposedCharacters)[0];
    if (!firstProposed) {
      return null;
    }
    return {
      name: firstProposed.name,
      personality: params.storyboard.description.slice(0, 200),
      usageContext: idea.slice(0, 400),
    };
  }

  const name = proposed?.name ?? refMatch?.name ?? params.character.name;
  return {
    name,
    personality: params.storyboard.description.slice(0, 200) || idea.slice(0, 200),
    usageContext: idea.slice(0, 400),
  };
}

export function diffCharacterIdentityForm(
  current: CharacterIdentityFormValues,
  suggested: Partial<CharacterIdentityFormValues>
): Array<keyof CharacterIdentityFormValues> {
  const keys = Object.keys(suggested) as Array<keyof CharacterIdentityFormValues>;
  return keys.filter((key) => {
    const next = suggested[key];
    if (next === undefined || next === null) return false;
    return String(current[key] ?? "").trim() !== String(next).trim();
  });
}

export function hasCharacterIdentitySuggestion(
  character: StudioCharacterListItem,
  suggestion: Partial<CharacterIdentityFormValues> | null
): boolean {
  if (!suggestion) return false;
  const current = characterIdentityFormFromCharacter(character);
  return diffCharacterIdentityForm(current, suggestion).length > 0;
}
