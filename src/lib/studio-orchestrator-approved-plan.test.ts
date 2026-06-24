import { describe, expect, it } from "vitest";
import {
  resolveApprovedRenderBatchPlan,
  resolveApprovedSceneCount,
  validatePlanStoryboardParity,
} from "@/lib/studio-orchestrator-approved-plan";
import { buildPhotoMoviePlan } from "@/lib/studio-photo-movie-plan";
import type { HcOrchestratorState } from "@/types/studio-video-production";

describe("studio-orchestrator-approved-plan", () => {
  it("prefers photo movie plan over long form for execution", () => {
    const photoMoviePlan = buildPhotoMoviePlan({ photoCount: 20, intent: "travel_vlog" });
    const orchestrator = {
      photoMoviePlan,
      longFormPlan: { sceneCount: 12, targetSeconds: 180 },
    } as HcOrchestratorState;

    const batch = resolveApprovedRenderBatchPlan(orchestrator);
    expect(batch?.totalScenes).toBe(photoMoviePlan.sceneCount);
    expect(resolveApprovedSceneCount(orchestrator)).toBe(photoMoviePlan.sceneCount);
  });

  it("rejects storyboard parity mismatch", () => {
    const orchestrator = {
      musicVideoPlan: { sceneCount: 18 },
    } as HcOrchestratorState;
    const result = validatePlanStoryboardParity({ orchestrator, storyboardSceneCount: 5 });
    expect(result.ok).toBe(false);
  });
});
