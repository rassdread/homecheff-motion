/**
 * Auto-bootstrap storyboard from orchestrator — internal artifact, no manual wizard.
 */

import { buildBriefFromOrchestratorState } from "@/lib/studio-orchestrator-brief-builder";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import { applyDecisionsToDirectorProposal } from "@/lib/studio-asset-decision-execution";
import { emptyAssetDecisionRegistry } from "@/lib/studio-asset-decision-storage";
import { createStudioStoryboard, getStudioStoryboardById } from "@/server/studio/studio-storyboard-service";
import { applyDirectorProposalServer } from "@/server/studio/studio-director-apply-server";
import { listStudioCharacters } from "@/server/studio/studio-character-service";
import { listStudioLocations } from "@/server/studio/studio-location-service";
import { listStudioProps } from "@/server/studio/studio-prop-service";
import { listStudioWorldProfiles } from "@/server/studio/studio-world-profile-service";
import type { SessionUser } from "@/server/auth/session";
import type { HcOrchestratorState } from "@/types/studio-video-production";
import { resolveApprovedSceneCount, validatePlanStoryboardParity } from "@/lib/studio-orchestrator-approved-plan";

export type OrchestratorBootstrapResult =
  | {
      ok: true;
      storyboardId: string;
      sceneCount: number;
      title: string;
    }
  | { ok: false; error: string; code?: string };

export async function bootstrapStoryboardFromOrchestrator(params: {
  viewer: Pick<SessionUser, "id" | "role">;
  orchestrator: HcOrchestratorState;
  idea?: string;
  characterId?: string;
}): Promise<OrchestratorBootstrapResult> {
  const orchestrator: HcOrchestratorState = {
    ...params.orchestrator,
    idea: params.idea?.trim() || params.orchestrator.idea,
    characterId: params.characterId ?? params.orchestrator.characterId,
  };

  const [characters, locations, props, worlds] = await Promise.all([
    listStudioCharacters(params.viewer),
    listStudioLocations(params.viewer),
    listStudioProps(params.viewer),
    listStudioWorldProfiles(params.viewer),
  ]);

  const brief = buildBriefFromOrchestratorState({
    orchestrator,
    characters,
    locations,
    props,
    worlds,
  });

  if (!brief) {
    return { ok: false, error: "Could not build video plan.", code: "BRIEF_FAILED" };
  }

  const title = brief.goal.trim().slice(0, 160) || brief.idea.trim().slice(0, 160);
  const created = await createStudioStoryboard(params.viewer.id, {
    title,
    description: brief.idea.slice(0, 4000),
    promptStyleProfile: brief.targetStyle.promptStyleProfile,
    directorProfile: brief.targetStyle.directorProfile,
    aiDirectorPrompt: brief.idea,
  });

  if ("error" in created) {
    return { ok: false, error: created.error.message, code: created.error.code };
  }

  const storyboardId = created.storyboard.id;
  const registry = emptyAssetDecisionRegistry({ briefIdea: brief.idea });
  registry.storyboardId = storyboardId;

  if (orchestrator.characterId) {
    const hero = characters.find((c) => c.id === orchestrator.characterId);
    if (hero) {
      registry.decisions.push({
        id: `hero-${hero.id}`,
        kind: "character",
        mode: "use_existing",
        name: hero.name,
        existingId: hero.id,
        decidedAt: new Date().toISOString(),
        source: "production_brief",
      });
    }
  }

  const storyboard = await getStudioStoryboardById(storyboardId, params.viewer);
  if (!storyboard) {
    return { ok: false, error: "Storyboard not found after create.", code: "NOT_FOUND" };
  }

  const targetSceneCount = resolveApprovedSceneCount(orchestrator);

  const proposal = buildDirectorProposal({
    idea: brief.idea,
    storyboard: { ...storyboard, aiDirectorPrompt: brief.idea },
    characters,
    locations,
    props,
    worlds,
    productionBrief: brief,
    assetDecisionRegistry: registry,
    styleStrength: brief.targetStyle.styleStrength,
    targetSceneCount,
    t: (key, p) => p?.title ?? p?.description ?? String(key),
  });

  if (!proposal) {
    return { ok: true, storyboardId, sceneCount: 0, title };
  }

  const withDecisions = applyDecisionsToDirectorProposal(proposal, registry);
  const applied = await applyDirectorProposalServer({
    storyboardId,
    proposal: withDecisions,
    viewer: params.viewer,
    mode: "all",
    existingScenes: [],
  });

  if (!applied.ok) {
    return { ok: false, error: applied.errors.join("; "), code: "APPLY_FAILED" };
  }

  const parity = validatePlanStoryboardParity({
    orchestrator,
    storyboardSceneCount: applied.sceneCount,
  });
  if (!parity.ok) {
    return { ok: false, error: parity.error, code: "PLAN_STORYBOARD_MISMATCH" };
  }

  return { ok: true, storyboardId, sceneCount: applied.sceneCount, title };
}
