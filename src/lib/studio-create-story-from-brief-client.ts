import {
  createStudioStoryboardApi,
  updateStudioStoryboardApi,
} from "@/lib/studio-storyboards-client";
import { applyDirectorProposal } from "@/lib/studio-director-proposal-apply";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import {
  applyDecisionsToDirectorProposal,
  enrichBriefWithAssetDecisions,
} from "@/lib/studio-asset-decision-execution";
import {
  migrateDraftDecisionsToStoryboard,
  saveAssetDecisionRegistry,
} from "@/lib/studio-asset-decision-storage";
import { rememberRecentStoryboardId } from "@/lib/studio-recent-storyboard";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type { StudioProductionBrief } from "@/types/studio-production-brief";
import type { StudioAssetDecisionRegistry } from "@/types/studio-asset-decision";
import type { ProposalTextResolver } from "@/lib/studio-director-proposal-apply";

export type CreateStoryFromBriefResult =
  | { ok: true; storyboardId: string; href: string }
  | { ok: false; error: string; status?: number };

export async function createStoryboardFromProductionBrief(params: {
  brief: StudioProductionBrief;
  assetDecisionRegistry: StudioAssetDecisionRegistry;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  projectMemory?: StudioProjectMemorySnapshot;
  t: ProposalTextResolver;
  applyProposal?: boolean;
}): Promise<CreateStoryFromBriefResult> {
  const enrichedBrief = enrichBriefWithAssetDecisions(params.brief, params.assetDecisionRegistry);
  const title =
    enrichedBrief.goal.trim().slice(0, 160) || enrichedBrief.idea.trim().slice(0, 160);
  if (!title) {
    return { ok: false, error: "Title is required" };
  }

  const createRes = await createStudioStoryboardApi({
    title,
    description: enrichedBrief.idea.slice(0, 4000),
    promptStyleProfile: enrichedBrief.targetStyle.promptStyleProfile,
    directorProfile: enrichedBrief.targetStyle.directorProfile,
    aiDirectorPrompt: enrichedBrief.idea,
  });

  if (!createRes.ok) {
    const payload = createRes.data as { error?: string };
    return {
      ok: false,
      error: payload.error ?? "Could not create story",
      status: createRes.status,
    };
  }

  const storyboardId = createRes.data.storyboard.id;
  const storyboard = createRes.data.storyboard;

  await updateStudioStoryboardApi(storyboardId, {
    aiDirectorStyleStrength: enrichedBrief.targetStyle.styleStrength,
  });

  const persistedRegistry: StudioAssetDecisionRegistry = {
    ...params.assetDecisionRegistry,
    storyboardId,
    briefIdea: enrichedBrief.idea,
    updatedAt: new Date().toISOString(),
  };
  saveAssetDecisionRegistry(persistedRegistry);
  migrateDraftDecisionsToStoryboard(storyboardId, enrichedBrief.idea);

  if (params.applyProposal !== false) {
    const proposal = buildDirectorProposal({
      idea: enrichedBrief.idea,
      storyboard: { ...storyboard, aiDirectorPrompt: enrichedBrief.idea },
      characters: params.characters,
      locations: params.locations,
      props: params.props,
      worlds: params.worlds,
      projectMemory: params.projectMemory,
      productionBrief: enrichedBrief,
      assetDecisionRegistry: persistedRegistry,
      styleStrength: enrichedBrief.targetStyle.styleStrength,
      t: params.t,
    });

    if (proposal) {
      const proposalWithDecisions = applyDecisionsToDirectorProposal(proposal, persistedRegistry);
      const applyResult = await applyDirectorProposal({
        storyboardId,
        proposal: proposalWithDecisions,
        mode: "all",
        existingScenes: [],
        t: params.t,
      });
      if (!applyResult.ok) {
        return {
          ok: false,
          error: applyResult.errors.join(", ") || "Could not apply storyboard proposal",
        };
      }
    }
  }

  rememberRecentStoryboardId(storyboardId);

  return {
    ok: true,
    storyboardId,
    href: studioWorkspaceHref(storyboardId),
  };
}
