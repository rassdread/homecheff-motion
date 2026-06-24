import { describe, expect, it } from "vitest";
import { filterMotionHandoffBySceneIndices } from "@/lib/studio-production-handoff-filter";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";

function samplePayload(sceneCount: number): MotionHandoffPayload {
  return {
    version: 1,
    storyboardId: "sb-1",
    title: "Test",
    description: "",
    scenes: Array.from({ length: sceneCount }, (_, i) => ({
      sceneId: `scene-${i}`,
      order: i,
      title: `Scene ${i}`,
      description: "",
      action: "",
      emotion: "happy",
      durationSeconds: 5,
      selectedSceneImageUrl: `https://example.com/${i}.jpg`,
    })),
  } as MotionHandoffPayload;
}

describe("filterMotionHandoffBySceneIndices", () => {
  it("keeps only requested scene indices", () => {
    const filtered = filterMotionHandoffBySceneIndices(samplePayload(6), [0, 2, 4]);
    expect(filtered.scenes).toHaveLength(3);
    expect(filtered.scenes.map((s) => s.sceneId)).toEqual(["scene-0", "scene-2", "scene-4"]);
  });
});
