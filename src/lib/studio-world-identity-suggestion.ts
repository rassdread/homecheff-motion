import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import {
  worldIdentityFormFromWorld,
  type WorldIdentityFormValues,
} from "@/lib/studio-world-identity-fields";
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

export function buildWorldIdentityAiSuggestion(params: {
  storyboard: StudioStoryboardDetail;
  world: StudioWorldProfileListItem;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  memory?: StudioProjectMemorySnapshot | null;
  locale?: "en" | "nl";
}): Partial<WorldIdentityFormValues> | null {
  const idea =
    params.storyboard.aiDirectorPrompt.trim() ||
    `${params.storyboard.title} ${params.storyboard.description}`.trim();
  if (!idea) return null;

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
  if (!proposal) return null;

  const refMatch = proposal.scenes
    .flatMap((s) => (s.worldRef ? [s.worldRef] : []))
    .find(
      (r) =>
        r.existingId === params.world.id ||
        normalizeName(r.name) === normalizeName(params.world.name)
    );

  if (!refMatch) {
    const sceneWorld = proposal.scenes.find((s) => s.worldRef)?.worldRef;
    if (!sceneWorld) return null;
    return {
      name: sceneWorld.name,
      description: params.storyboard.description.slice(0, 200),
      usageContext: idea.slice(0, 400),
    };
  }

  return {
    name: refMatch.name,
    description: params.storyboard.description.slice(0, 200) || idea.slice(0, 200),
    usageContext: idea.slice(0, 400),
  };
}

export function diffWorldIdentityForm(
  current: WorldIdentityFormValues,
  suggested: Partial<WorldIdentityFormValues>
): Array<keyof WorldIdentityFormValues> {
  const keys = Object.keys(suggested) as Array<keyof WorldIdentityFormValues>;
  return keys.filter((key) => {
    const next = suggested[key];
    if (next === undefined || next === null) return false;
    if (key === "renderStrategies") {
      const a = [...(current.renderStrategies ?? [])].sort().join(",");
      const b = [...(Array.isArray(next) ? next : [])].sort().join(",");
      return a !== b;
    }
    return String(current[key] ?? "").trim() !== String(next).trim();
  });
}

export function hasWorldIdentitySuggestion(
  world: StudioWorldProfileListItem,
  suggestion: Partial<WorldIdentityFormValues> | null
): boolean {
  if (!suggestion) return false;
  return diffWorldIdentityForm(worldIdentityFormFromWorld(world), suggestion).length > 0;
}
