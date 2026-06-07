/**
 * Studio V2 — Asset decision execution layer.
 * Applies user choices (use existing / build new / skip) across planners and proposals.
 */

import type { ProductionBriefAssetProposal, StudioProductionBrief } from "@/types/studio-production-brief";
import type { ProductionAssetEntry, ProductionMissingItem } from "@/types/studio-production-plan";
import type {
  AssetEvolutionEntry,
  AssetEvolutionSection,
  StoryboardAssetEvolution,
} from "@/types/studio-asset-evolution";
import type {
  ProposedAssetRef,
  ProposedNewAsset,
  ProposedScene,
  StudioDirectorProposal,
} from "@/types/studio-director-proposal";
import type { SceneGenerationMissingAsset, StudioSceneGenerationPlan } from "@/types/studio-scene-generation-plan";
import type {
  ApplyAssetDecisionInput,
  AssetDecisionKind,
  AssetDecisionMode,
  IdentityBuilderPrefill,
  ResolvedAssetDecisions,
  StudioAssetDecision,
  StudioAssetDecisionRegistry,
} from "@/types/studio-asset-decision";
import {
  isAssetDecisionFulfilled,
  isAssetDecisionPendingBuild,
} from "@/lib/studio-asset-lifecycle-resolver";

function normalizeKey(kind: AssetDecisionKind, name: string, existingId?: string): string {
  const idPart = existingId?.trim() ?? "";
  const namePart = name.trim().toLowerCase();
  return `${kind}:${idPart || namePart}`;
}

export function applyAssetDecision(
  registry: StudioAssetDecisionRegistry,
  input: ApplyAssetDecisionInput
): StudioAssetDecisionRegistry {
  const now = new Date().toISOString();
  const decision: StudioAssetDecision = {
    id: input.id,
    kind: input.kind,
    mode: input.mode,
    name: input.name.trim(),
    existingId: input.existingId,
    decidedAt: now,
    source: input.source ?? "production_brief",
    fulfilledAt: input.fulfilledAt,
  };

  const withoutDupes = registry.decisions.filter(
    (d) =>
      d.id !== input.id &&
      normalizeKey(d.kind, d.name, d.existingId) !== normalizeKey(input.kind, input.name, input.existingId)
  );

  return {
    ...registry,
    updatedAt: now,
    decisions: [...withoutDupes, decision],
  };
}

export function getAssetDecision(
  registry: StudioAssetDecisionRegistry,
  id: string
): StudioAssetDecision | undefined {
  return registry.decisions.find((d) => d.id === id);
}

export function resolveAssetDecisions(registry: StudioAssetDecisionRegistry): ResolvedAssetDecisions {
  const byId = new Map<string, StudioAssetDecision>();
  const useExisting: StudioAssetDecision[] = [];
  const buildNew: StudioAssetDecision[] = [];
  const skipped: StudioAssetDecision[] = [];

  for (const decision of registry.decisions) {
    byId.set(decision.id, decision);
    if (decision.mode === "use_existing") {
      useExisting.push(decision);
    } else if (decision.mode === "build_new") {
      buildNew.push(decision);
    } else {
      skipped.push(decision);
    }
  }

  return { useExisting, buildNew, skipped, byId };
}

export function isAssetDecisionSkipped(
  registry: StudioAssetDecisionRegistry,
  kind: AssetDecisionKind,
  params: { id?: string; name?: string; existingId?: string }
): boolean {
  for (const decision of registry.decisions) {
    if (decision.mode !== "skip" || decision.kind !== kind) {
      continue;
    }
    if (params.id && decision.id === params.id) {
      return true;
    }
    if (params.existingId && decision.existingId === params.existingId) {
      return true;
    }
    if (params.name && decision.name.trim().toLowerCase() === params.name.trim().toLowerCase()) {
      return true;
    }
  }
  return false;
}

export function defaultDecisionModeForProposal(
  asset: ProductionBriefAssetProposal
): AssetDecisionMode | undefined {
  if (asset.status === "existing" || asset.recurringMatch) {
    return "use_existing";
  }
  return undefined;
}

export function registryFromBriefProposals(params: {
  brief: StudioProductionBrief;
  choices: Record<string, AssetDecisionMode>;
  source?: StudioAssetDecision["source"];
}): StudioAssetDecisionRegistry {
  let registry = emptyRegistry(params.brief.idea);

  for (const asset of [
    ...params.brief.mainCharacters,
    ...params.brief.recommendedLocations,
    ...params.brief.recommendedProps,
  ]) {
    const mode = params.choices[asset.id] ?? defaultDecisionModeForProposal(asset);
    if (!mode) {
      continue;
    }
    registry = applyAssetDecision(registry, {
      id: asset.id,
      kind: asset.kind,
      mode,
      name: asset.name,
      existingId: asset.existingId,
      source: params.source ?? "production_brief",
    });
  }

  if (params.brief.world) {
    const worldId = `world-${params.brief.world.existingId ?? params.brief.world.name}`;
    const worldMode = params.choices[worldId];
    if (worldMode) {
      registry = applyAssetDecision(registry, {
        id: worldId,
        kind: "world",
        mode: worldMode,
        name: params.brief.world.name,
        existingId: params.brief.world.existingId,
        source: params.source ?? "production_brief",
      });
    }
  }

  return registry;
}

function emptyRegistry(briefIdea?: string): StudioAssetDecisionRegistry {
  return {
    version: 1,
    briefIdea,
    updatedAt: new Date(0).toISOString(),
    decisions: [],
  };
}

function shouldIncludeExistingRef(
  registry: StudioAssetDecisionRegistry,
  kind: AssetDecisionKind,
  ref: ProposedAssetRef
): boolean {
  if (isAssetDecisionSkipped(registry, kind, { existingId: ref.existingId, name: ref.name })) {
    return false;
  }
  const decision = registry.decisions.find(
    (d) =>
      d.kind === kind &&
      (d.existingId === ref.existingId ||
        d.name.trim().toLowerCase() === ref.name.trim().toLowerCase())
  );
  if (decision?.mode === "skip" || decision?.mode === "build_new") {
    return false;
  }
  return true;
}

function filterProposedNew(
  registry: StudioAssetDecisionRegistry,
  kind: AssetDecisionKind,
  items: ProposedNewAsset[]
): ProposedNewAsset[] {
  return items.filter((item) => {
    const decision = registry.decisions.find(
      (d) => d.id === item.tempId || d.name.trim().toLowerCase() === item.name.trim().toLowerCase()
    );
    if (decision?.mode === "skip" || decision?.mode === "use_existing") {
      return false;
    }
    if (isAssetDecisionSkipped(registry, kind, { name: item.name })) {
      return false;
    }
    return true;
  });
}

/** Apply registry to director proposal before apply — respects use/skip/build choices. */
export function applyDecisionsToDirectorProposal(
  proposal: StudioDirectorProposal,
  registry: StudioAssetDecisionRegistry
): StudioDirectorProposal {
  const resolved = resolveAssetDecisions(registry);

  const scenes: ProposedScene[] = proposal.scenes.map((scene, index) => {
    let characterRefs = scene.characterRefs.filter((ref) =>
      shouldIncludeExistingRef(registry, "character", ref)
    );
    let locationRef =
      scene.locationRef && shouldIncludeExistingRef(registry, "location", scene.locationRef)
        ? scene.locationRef
        : null;
    let propRefs = scene.propRefs.filter((ref) => shouldIncludeExistingRef(registry, "prop", ref));
    const proposedCharacters = filterProposedNew(registry, "character", scene.proposedCharacters);
    let proposedLocation =
      scene.proposedLocation &&
      !isAssetDecisionSkipped(registry, "location", { name: scene.proposedLocation.name })
        ? scene.proposedLocation
      : null;
    if (
      proposedLocation &&
      registry.decisions.some((d) => d.mode === "use_existing" && d.kind === "location")
    ) {
      proposedLocation = null;
    }
    const proposedProps = filterProposedNew(registry, "prop", scene.proposedProps);

    if (index === 0) {
      for (const decision of resolved.useExisting) {
        if (
          decision.kind === "character" &&
          decision.existingId &&
          !characterRefs.some((r) => r.existingId === decision.existingId)
        ) {
          characterRefs = [
            ...characterRefs,
            { existingId: decision.existingId, name: decision.name },
          ];
        }
        if (decision.kind === "location" && decision.existingId && !locationRef) {
          locationRef = { existingId: decision.existingId, name: decision.name };
        }
        if (
          decision.kind === "prop" &&
          decision.existingId &&
          !propRefs.some((r) => r.existingId === decision.existingId)
        ) {
          propRefs = [...propRefs, { existingId: decision.existingId, name: decision.name }];
        }
      }
    }

    return {
      ...scene,
      characterRefs,
      locationRef,
      propRefs,
      proposedCharacters,
      proposedLocation,
      proposedProps,
    };
  });

  return { ...proposal, scenes };
}

export function enrichBriefWithAssetDecisions(
  brief: StudioProductionBrief,
  registry: StudioAssetDecisionRegistry
): StudioProductionBrief {
  const filterList = (items: ProductionBriefAssetProposal[]) =>
    items.filter(
      (item) =>
        !isAssetDecisionSkipped(registry, item.kind, {
          id: item.id,
          name: item.name,
          existingId: item.existingId,
        })
    );

  return {
    ...brief,
    mainCharacters: filterList(brief.mainCharacters),
    recommendedLocations: filterList(brief.recommendedLocations),
    recommendedProps: filterList(brief.recommendedProps),
    assetDecisions: registry.decisions,
  };
}

export function filterProductionMissingItemsByDecisions(
  items: ProductionMissingItem[],
  registry: StudioAssetDecisionRegistry
): ProductionMissingItem[] {
  return items.filter((item) => {
    if (
      item.kind === "character" ||
      item.kind === "location" ||
      item.kind === "prop" ||
      item.kind === "world"
    ) {
      if (isAssetDecisionSkipped(registry, item.kind, { name: item.label, existingId: item.id })) {
        return false;
      }
      if (isAssetDecisionPendingBuild(registry, item.kind, { id: item.id, name: item.label })) {
        return false;
      }
      if (isAssetDecisionFulfilled(registry, item.kind, { id: item.id, name: item.label, existingId: item.id })) {
        return false;
      }
      const resolvedUseExisting = registry.decisions.some(
        (d) =>
          d.kind === item.kind &&
          d.mode === "use_existing" &&
          !d.fulfilledAt &&
          (d.existingId === item.id || d.name.trim().toLowerCase() === item.label.trim().toLowerCase())
      );
      if (resolvedUseExisting) {
        return false;
      }
    }
    return true;
  });
}

export function filterProductionAssetEntriesByDecisions(
  entries: ProductionAssetEntry[],
  registry: StudioAssetDecisionRegistry
): ProductionAssetEntry[] {
  return entries.filter((entry) => {
    if (entry.status !== "missing" && entry.status !== "recommended") {
      return true;
    }
    if (isAssetDecisionSkipped(registry, entry.kind, { name: entry.name, existingId: entry.id })) {
      return false;
    }
    if (isAssetDecisionPendingBuild(registry, entry.kind, { id: entry.id, name: entry.name })) {
      return false;
    }
    if (isAssetDecisionFulfilled(registry, entry.kind, { name: entry.name, existingId: entry.id })) {
      return false;
    }
    return true;
  });
}

function filterEvolutionEntries(
  entries: AssetEvolutionEntry[],
  kind: AssetDecisionKind,
  registry: StudioAssetDecisionRegistry
): AssetEvolutionEntry[] {
  return entries.filter(
    (entry) =>
      !isAssetDecisionSkipped(registry, kind, {
        name: entry.name,
        existingId: entry.existingId,
      })
  );
}

export function filterAssetEvolutionByDecisions(
  evolution: StoryboardAssetEvolution,
  registry: StudioAssetDecisionRegistry
): StoryboardAssetEvolution {
  const sections: AssetEvolutionSection[] = evolution.sections.map((section) => ({
    ...section,
    present: filterEvolutionEntries(section.present, section.kind, registry),
    missing: filterEvolutionEntries(section.missing, section.kind, registry),
    recommended: filterEvolutionEntries(section.recommended, section.kind, registry),
  }));
  return { ...evolution, sections };
}

export function filterSceneGenerationPlanByDecisions(
  plan: StudioSceneGenerationPlan,
  registry: StudioAssetDecisionRegistry
): StudioSceneGenerationPlan {
  const missingAssets = plan.missingAssets.filter(
    (asset) => !isGenerationAssetSkipped(asset, registry)
  );
  return {
    ...plan,
    missingAssets,
  };
}

function isGenerationAssetSkipped(
  asset: SceneGenerationMissingAsset,
  registry: StudioAssetDecisionRegistry
): boolean {
  const kind = asset.kind as AssetDecisionKind;
  if (kind !== "character" && kind !== "location" && kind !== "prop" && kind !== "world") {
    return false;
  }
  return isAssetDecisionSkipped(registry, kind, { name: asset.name, existingId: asset.id });
}

export function buildIdentityPrefillFromDecision(params: {
  decision: StudioAssetDecision;
  ideaContext?: string;
  storyboardId?: string;
  role?: string;
  worldProfileId?: string | null;
  visualStyle?: string;
}): IdentityBuilderPrefill {
  const role = params.role ?? (params.decision.kind === "character" ? "mascot" : undefined);
  const roleKey = role?.trim().toLowerCase() ?? "mascot";
  const characterType =
    roleKey === "human" ? "human"
    : roleKey === "animal" ? "animal"
    : roleKey === "object" ? "object_character"
    : "mascot";

  return {
    version: 1,
    kind: params.decision.kind,
    name: params.decision.name,
    role,
    characterType,
    description: params.ideaContext?.slice(0, 400) ?? "",
    personality: params.ideaContext?.slice(0, 200) ?? "",
    usageContext: params.ideaContext?.slice(0, 400) ?? "",
    visualStyle: params.visualStyle ?? "",
    worldProfileId: params.worldProfileId ?? null,
    storyboardId: params.storyboardId,
    decisionId: params.decision.id,
    ideaContext: params.ideaContext,
  };
}

export function decisionStatusLabelKey(mode: AssetDecisionMode): string {
  if (mode === "use_existing") {
    return "studio.assetDecision.status.useExisting";
  }
  if (mode === "build_new") {
    return "studio.assetDecision.status.buildNew";
  }
  return "studio.assetDecision.status.skip";
}
