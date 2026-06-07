/**
 * Studio V2 — Production Brief Builder.
 * Thin orchestration over existing planners (no new AI, no LLM).
 */

import {
  DEFAULT_AI_DIRECTOR_STYLE_STRENGTH,
  interpretAiDirectorPrompt,
  normalizeAiDirectorStyleStrength,
  type AiDirectorStyleStrength,
} from "@/lib/studio-ai-director-interpreter";
import {
  buildDirectorProposal,
  extractProposalTopic,
} from "@/lib/studio-director-proposal-builder";
import { findRecurringMatchesForIdea } from "@/lib/studio-recurring-asset-detection";
import { extractActionSteps } from "@/lib/studio-scene-action-extraction";
import { buildStudioProductionPlan } from "@/lib/studio-production-planner";
import {
  mergeUniqueRecommendations,
  productionMemoryBriefRecommendations,
  resolveProductionMemoryProfile,
} from "@/lib/studio-production-memory-integration";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type { StudioDirectorProposal } from "@/types/studio-director-proposal";
import type {
  ProductionBriefActionIntensity,
  ProductionBriefAssetProposal,
  ProductionBriefContentType,
  ProductionBriefRecommendation,
  StudioProductionBrief,
  StudioProductionBriefInput,
} from "@/types/studio-production-brief";

const CONTENT_TYPE_LABEL: Record<ProductionBriefContentType, string> = {
  commercial: "studio.productionBrief.contentType.commercial",
  social_media: "studio.productionBrief.contentType.social",
  storytelling: "studio.productionBrief.contentType.storytelling",
  documentary: "studio.productionBrief.contentType.documentary",
  educational: "studio.productionBrief.contentType.educational",
  cinematic: "studio.productionBrief.contentType.cinematic",
};

function normalizeContentType(profile: string): ProductionBriefContentType {
  const allowed: ProductionBriefContentType[] = [
    "commercial",
    "social_media",
    "storytelling",
    "documentary",
    "educational",
    "cinematic",
  ];
  if (allowed.includes(profile as ProductionBriefContentType)) {
    return profile as ProductionBriefContentType;
  }
  return "commercial";
}

function detectActionIntensity(idea: string, actionStepCount: number): ProductionBriefActionIntensity {
  const lower = idea.toLowerCase();
  if (
    /sport|voetbal|football|soccer|nike|athletic|action|dynamic|fast|viral|tiktok|rennen|kick|score|juich/i.test(
      lower
    ) ||
    actionStepCount >= 4
  ) {
    return "high";
  }
  if (/documentary|calm|interview|observ|slow|premium|luxury|minimal/i.test(lower) || actionStepCount <= 1) {
    return "low";
  }
  return "medium";
}

function emptyBriefStoryboard(
  idea: string,
  goal: string,
  styleStrength: AiDirectorStyleStrength
): StudioStoryboardDetail {
  const interpretation = interpretAiDirectorPrompt(idea);
  return {
    id: "brief-draft",
    ownerId: "",
    title: goal || "New video story",
    description: "",
    promptStyleProfile: interpretation.promptStyleProfile,
    directorProfile: interpretation.directorProfile,
    aiDirectorPrompt: idea,
    aiDirectorStyleStrength: styleStrength,
    voiceEnabled: true,
    musicEnabled: true,
    soundEnabled: true,
    voiceLanguage: "nl",
    voiceStyle: "",
    voiceProfile: "warm_narrator",
    narrationMode: "narrator",
    voiceNarrationScript: "",
    autoSelectImprovedImage: false,
    musicStyle: "",
    musicIntensity: "medium",
    musicNarrativeRole: "",
    musicNotes: "",
    soundStyle: "",
    soundDensity: "medium",
    soundNotes: "",
    audioProductionEnabled: false,
    audioStyle: "",
    audioPriorityStrategy: "",
    audioNotes: "",
    audioAssetsEnabled: false,
    audioAssetNotes: "",
    audioAssetLinks: { version: 1 },
    sceneCount: 0,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    scenes: [],
  };
}

function uniqueAssetProposals(items: ProductionBriefAssetProposal[]): ProductionBriefAssetProposal[] {
  const seen = new Set<string>();
  const result: ProductionBriefAssetProposal[] = [];
  for (const item of items) {
    const key = `${item.kind}:${item.name.trim().toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function assetProposalsFromProposal(
  proposal: StudioDirectorProposal,
  recurringIds: Set<string>
): {
  characters: ProductionBriefAssetProposal[];
  locations: ProductionBriefAssetProposal[];
  props: ProductionBriefAssetProposal[];
} {
  const characters: ProductionBriefAssetProposal[] = [];
  const locations: ProductionBriefAssetProposal[] = [];
  const props: ProductionBriefAssetProposal[] = [];

  for (const scene of proposal.scenes) {
    for (const ref of scene.characterRefs) {
      characters.push({
        id: `char-${ref.existingId}`,
        name: ref.name,
        kind: "character",
        status: "existing",
        existingId: ref.existingId,
        reasonKey: "studio.productionBrief.asset.existingMatch",
        recurringMatch: recurringIds.has(ref.existingId),
      });
    }
    for (const item of scene.proposedCharacters) {
      characters.push({
        id: `char-new-${item.tempId}`,
        name: item.name,
        kind: "character",
        status: "new",
        reasonKey: item.reasonKey,
      });
    }
    if (scene.locationRef) {
      locations.push({
        id: `loc-${scene.locationRef.existingId}`,
        name: scene.locationRef.name,
        kind: "location",
        status: "existing",
        existingId: scene.locationRef.existingId,
        reasonKey: "studio.productionBrief.asset.existingMatch",
        recurringMatch: recurringIds.has(scene.locationRef.existingId),
      });
    }
    if (scene.proposedLocation) {
      locations.push({
        id: `loc-new-${scene.proposedLocation.tempId}`,
        name: scene.proposedLocation.name,
        kind: "location",
        status: "new",
        reasonKey: scene.proposedLocation.reasonKey,
      });
    }
    for (const ref of scene.propRefs) {
      props.push({
        id: `prop-${ref.existingId}`,
        name: ref.name,
        kind: "prop",
        status: "existing",
        existingId: ref.existingId,
        reasonKey: "studio.productionBrief.asset.existingMatch",
        recurringMatch: recurringIds.has(ref.existingId),
      });
    }
    for (const item of scene.proposedProps) {
      props.push({
        id: `prop-new-${item.tempId}`,
        name: item.name,
        kind: "prop",
        status: "new",
        reasonKey: item.reasonKey,
      });
    }
  }

  return {
    characters: uniqueAssetProposals(characters),
    locations: uniqueAssetProposals(locations),
    props: uniqueAssetProposals(props),
  };
}

function mergeRecurringAssets(
  assets: ProductionBriefAssetProposal[],
  matches: ReturnType<typeof findRecurringMatchesForIdea>,
  kind: ProductionBriefAssetProposal["kind"]
): ProductionBriefAssetProposal[] {
  const result = [...assets];
  for (const match of matches) {
    if (match.kind !== kind && !(kind === "character" && match.kind === "character")) {
      if (kind === "location" && match.kind !== "location") continue;
      if (kind === "prop" && match.kind !== "prop") continue;
      if (kind === "character" && match.kind !== "character") continue;
    }
    const mapKind =
      match.kind === "world" ? null
      : match.kind;
    if (mapKind !== kind) {
      continue;
    }
    if (result.some((a) => a.existingId === match.assetId)) {
      continue;
    }
    result.unshift({
      id: `recurring-${match.assetId}`,
      name: match.assetName,
      kind,
      status: "recommended",
      existingId: match.assetId,
      reasonKey: match.matchReasonKeys[0] ?? "studio.productionBrief.asset.recurring",
      recurringMatch: true,
    });
  }
  return uniqueAssetProposals(result);
}

function briefRecommendations(
  plan: ReturnType<typeof buildStudioProductionPlan>,
  actionIntensity: ProductionBriefActionIntensity
): ProductionBriefRecommendation[] {
  const recs: ProductionBriefRecommendation[] = plan.recommendations.map((r) => ({
    id: r.id,
    messageKey: r.messageKey,
    messageParams: r.messageParams,
    priority: r.priority,
  }));

  if (actionIntensity === "high") {
    recs.unshift({
      id: "brief-action-high",
      messageKey: "studio.productionBrief.recommendation.highAction",
      priority: "medium",
    });
  }

  if (plan.missingItems.length > 0) {
    recs.push({
      id: "brief-missing-assets",
      messageKey: "studio.productionBrief.recommendation.missingAssets",
      messageParams: { count: String(plan.missingItems.length) },
      priority: "high",
    });
  }

  return recs.slice(0, 8);
}

function worldFromProposal(
  proposal: StudioDirectorProposal,
  recurring: ReturnType<typeof findRecurringMatchesForIdea>
): StudioProductionBrief["world"] {
  const worldScene = proposal.scenes.find((s) => s.worldRef);
  if (worldScene?.worldRef) {
    return {
      name: worldScene.worldRef.name,
      existingId: worldScene.worldRef.existingId,
      reasonKey: "studio.productionBrief.world.fromAssets",
    };
  }
  const recurringWorld = recurring.find((m) => m.kind === "world");
  if (recurringWorld) {
    return {
      name: recurringWorld.assetName,
      existingId: recurringWorld.assetId,
      reasonKey: recurringWorld.matchReasonKeys[0],
    };
  }
  return null;
}

/** Re-export for tests and consumers. */
export { enrichIdeaWithProductionBrief } from "@/lib/studio-production-brief-enrichment";

/**
 * Build a structured production brief from a user idea and library context.
 * Orchestrates AI Director, Production Planner, recurring assets, and action intelligence.
 */
export function buildProductionBrief(params: StudioProductionBriefInput): StudioProductionBrief | null {
  const idea = params.idea.trim();
  if (!idea) {
    return null;
  }

  const characters = params.characters ?? [];
  const locations = params.locations ?? [];
  const props = params.props ?? [];
  const worlds = params.worlds ?? [];
  const styleStrength = normalizeAiDirectorStyleStrength(
    params.styleStrength ?? DEFAULT_AI_DIRECTOR_STYLE_STRENGTH
  );

  const interpretation = interpretAiDirectorPrompt(idea);
  const goal = extractProposalTopic(idea);
  const contentType = normalizeContentType(interpretation.directorProfile);

  const recurring = findRecurringMatchesForIdea({
    idea,
    characters,
    locations,
    props,
    worlds,
    memory: params.projectMemory,
  });
  const recurringIds = new Set(recurring.map((m) => m.assetId));

  const draftStoryboard = emptyBriefStoryboard(idea, goal, styleStrength);

  const proposal = buildDirectorProposal({
    idea,
    storyboard: draftStoryboard,
    characters,
    locations,
    props,
    worlds,
    projectMemory: params.projectMemory,
    styleStrength,
  });

  if (!proposal) {
    return null;
  }

  const actionSteps = extractActionSteps(idea);
  const actionIntensity = detectActionIntensity(idea, actionSteps.length);

  const assetSplit = assetProposalsFromProposal(proposal, recurringIds);
  const mainCharacters = mergeRecurringAssets(assetSplit.characters, recurring, "character");
  const recommendedLocations = mergeRecurringAssets(assetSplit.locations, recurring, "location");
  const recommendedProps = mergeRecurringAssets(assetSplit.props, recurring, "prop");

  const productionPlan =
    proposal.productionPlan ??
    buildStudioProductionPlan({
      storyboard: draftStoryboard,
      characters,
      locations,
      props,
      worlds,
      projectMemory: params.projectMemory,
      directorProfile: interpretation.directorProfile,
      styleProfile: interpretation.promptStyleProfile,
      productionBrief: undefined,
    });

  const estimatedDurationSeconds =
    productionPlan.estimatedDurationSeconds || proposal.scenes.length * 6;
  const estimatedShotCount =
    productionPlan.estimatedShotCount ||
    Math.max(proposal.scenes.length, productionPlan.actionPlanning.recommendedShotCount);
  const estimatedSceneCount = proposal.scenes.length;

  const linkedCharacterIds = new Set(
    mainCharacters.filter((c) => c.status === "existing").map((c) => c.existingId)
  );
  const mainCharacterCount = Math.max(
    linkedCharacterIds.size,
    mainCharacters.filter((c) => c.status !== "recommended").length,
    1
  );
  const locationCount = Math.max(
    recommendedLocations.filter((l) => l.status !== "recommended").length,
    recommendedLocations.length > 0 ? 1 : 0
  );

  const callToActionKey = proposal.text.ctaKey;
  const callToAction = goal;

  const memoryProfile = resolveProductionMemoryProfile({
    projectMemory: params.projectMemory,
    currentIdea: idea,
    characters,
    worlds,
  });
  const memoryRecommendations = productionMemoryBriefRecommendations(memoryProfile);

  const brief: StudioProductionBrief = {
    version: 1,
    idea,
    goal,
    estimatedDurationSeconds,
    contentType,
    contentTypeLabelKey: CONTENT_TYPE_LABEL[contentType],
    world: worldFromProposal(proposal, recurring),
    mainCharacters,
    recommendedLocations,
    recommendedProps,
    actionIntensity,
    targetStyle: {
      directorProfile: interpretation.directorProfile,
      promptStyleProfile: interpretation.promptStyleProfile,
      moodKeywords: interpretation.moodKeywords,
      styleStrength,
      contentType,
      contentTypeLabelKey: CONTENT_TYPE_LABEL[contentType],
    },
    callToAction,
    callToActionKey,
    recommendations: mergeUniqueRecommendations(
      briefRecommendations(productionPlan, actionIntensity),
      memoryRecommendations,
      8
    ),
    storyPreview: {
      estimatedSceneCount,
      estimatedShotCount,
      estimatedDurationSeconds,
      mainCharacterCount,
      locationCount,
    },
    productionPlan,
    productionMemoryGuidance: memoryProfile?.creationGuidance ?? null,
  };

  return brief;
}

/** Re-export for planner/director — build brief-aware production plan from idea without storyboard scenes. */
export function buildProductionPlanFromBrief(
  brief: StudioProductionBrief,
  libraries: {
    characters: StudioCharacterListItem[];
    locations: StudioLocationListItem[];
    props: StudioPropListItem[];
    worlds: StudioWorldProfileListItem[];
    projectMemory?: StudioProjectMemorySnapshot;
  }
) {
  const storyboard = emptyBriefStoryboard(
    brief.idea,
    brief.goal,
    brief.targetStyle.styleStrength
  );
  return buildStudioProductionPlan({
    storyboard,
    characters: libraries.characters,
    locations: libraries.locations,
    props: libraries.props,
    worlds: libraries.worlds,
    projectMemory: libraries.projectMemory,
    directorProfile: brief.targetStyle.directorProfile,
    styleProfile: brief.targetStyle.promptStyleProfile,
    productionBrief: brief,
  });
}
