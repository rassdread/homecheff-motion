/**
 * Server-side director proposal apply (no client fetch).
 */

import type { TranslationKey } from "@/i18n";
import {
  proposedSceneToCreateInput,
  proposedSceneToUpdateInput,
  proposalToStoryboardPatch,
} from "@/lib/studio-director-proposal-apply";
import {
  createStudioScene,
  updateStudioScene,
  updateStudioStoryboard,
} from "@/server/studio/studio-storyboard-service";
import type { SessionUser } from "@/server/auth/session";
import type { StudioSceneDetail } from "@/types/studio-api";
import type { DirectorProposalApplyMode, StudioDirectorProposal } from "@/types/studio-director-proposal";

const serverProposalT = (
  key: TranslationKey,
  params?: Record<string, string>
): string => {
  if (params?.title) return params.title;
  if (params?.description) return params.description;
  if (params?.action) return params.action;
  return key;
};

export async function applyDirectorProposalServer(params: {
  storyboardId: string;
  proposal: StudioDirectorProposal;
  viewer: Pick<SessionUser, "id" | "role">;
  mode?: DirectorProposalApplyMode;
  existingScenes?: StudioSceneDetail[];
}): Promise<{ ok: true; sceneCount: number } | { ok: false; errors: string[] }> {
  const mode = params.mode ?? "all";
  const errors: string[] = [];
  let sceneCount = 0;
  const existingByOrder = [...(params.existingScenes ?? [])].sort((a, b) => a.order - b.order);

  const storyboardPatch = proposalToStoryboardPatch(params.proposal, mode);
  if (storyboardPatch) {
    const update = await updateStudioStoryboard(params.storyboardId, params.viewer, storyboardPatch);
    if ("error" in update) {
      errors.push(update.error.message);
    }
  }

  if (mode === "assets" || mode === "all" || mode === "scenes") {
    for (const proposed of params.proposal.scenes) {
      const updateBody = proposedSceneToUpdateInput(proposed, mode, serverProposalT);
      const targetId = proposed.existingSceneId ?? existingByOrder[proposed.order]?.id ?? null;

      if (targetId) {
        const sceneRes = await updateStudioScene(
          params.storyboardId,
          targetId,
          params.viewer,
          updateBody
        );
        if ("error" in sceneRes) {
          errors.push(sceneRes.error.message);
        } else {
          sceneCount += 1;
        }
        continue;
      }

      if (mode === "assets") {
        continue;
      }

      const input = proposedSceneToCreateInput(proposed, serverProposalT);
      const created = await createStudioScene(params.storyboardId, params.viewer, input);
      if ("error" in created) {
        errors.push(created.error.message);
      } else {
        sceneCount += 1;
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, sceneCount };
}

export { serverProposalT };
