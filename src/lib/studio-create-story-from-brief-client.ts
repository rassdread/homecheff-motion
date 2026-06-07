import {
  createStudioStoryboardApi,
  updateStudioStoryboardApi,
} from "@/lib/studio-storyboards-client";
import { applyDirectorProposal } from "@/lib/studio-director-proposal-apply";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
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
import type { ProposalTextResolver } from "@/lib/studio-director-proposal-apply";

export type CreateStoryFromBriefResult =
  | { ok: true; storyboardId: string; href: string }
  | { ok: false; error: string; status?: number };

export async function createStoryboardFromProductionBrief(params: {
  brief: StudioProductionBrief;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  projectMemory?: StudioProjectMemorySnapshot;
  t: ProposalTextResolver;
  applyProposal?: boolean;
}): Promise<CreateStoryFromBriefResult> {
  const title = params.brief.goal.trim().slice(0, 160) || params.brief.idea.trim().slice(0, 160);
  if (!title) {
    return { ok: false, error: "Title is required" };
  }

  const createRes = await createStudioStoryboardApi({
    title,
    description: params.brief.idea.slice(0, 4000),
    promptStyleProfile: params.brief.targetStyle.promptStyleProfile,
    directorProfile: params.brief.targetStyle.directorProfile,
    aiDirectorPrompt: params.brief.idea,
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
    aiDirectorStyleStrength: params.brief.targetStyle.styleStrength,
  });

  if (params.applyProposal !== false) {
    const proposal = buildDirectorProposal({
      idea: params.brief.idea,
      storyboard: { ...storyboard, aiDirectorPrompt: params.brief.idea },
      characters: params.characters,
      locations: params.locations,
      props: params.props,
      worlds: params.worlds,
      projectMemory: params.projectMemory,
      productionBrief: params.brief,
      styleStrength: params.brief.targetStyle.styleStrength,
      t: params.t,
    });

    if (proposal) {
      const applyResult = await applyDirectorProposal({
        storyboardId,
        proposal,
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
