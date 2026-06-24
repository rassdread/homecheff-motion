import { describe, expect, it } from "vitest";
import { buildPhotoMoviePlan } from "@/lib/studio-photo-movie-plan";

describe("buildPhotoMoviePlan", () => {
  it("plans ~30-60s for 10 photos", () => {
    const plan = buildPhotoMoviePlan({ photoCount: 10, intent: "travel_vlog" });
    expect(plan.sceneCount).toBeGreaterThanOrEqual(4);
    expect(plan.targetSeconds).toBeGreaterThanOrEqual(30);
    expect(plan.targetSeconds).toBeLessThanOrEqual(60);
    expect(plan.renderBatchCount).toBeGreaterThanOrEqual(1);
  });

  it("plans multi-batch merge for 20 photos", () => {
    const plan = buildPhotoMoviePlan({ photoCount: 20, intent: "travel_vlog" });
    expect(plan.targetSeconds).toBeGreaterThanOrEqual(90);
    expect(plan.ffmpegMergeRequired).toBe(true);
    expect(plan.renderBatchCount).toBeGreaterThan(1);
  });

  it("plans long-form batches for 40 photos", () => {
    const plan = buildPhotoMoviePlan({ photoCount: 40, intent: "photo_story" });
    expect(plan.targetSeconds).toBeGreaterThanOrEqual(180);
    expect(plan.renderBatchCount).toBeGreaterThanOrEqual(3);
  });
});
