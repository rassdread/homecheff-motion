import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStudioConsistencyOverview,
  levelFromScore,
} from "@/lib/studio-consistency-overview";
import {
  studioCharacterListItem,
  studioLocationListItem,
  studioSceneDetail,
  studioSceneImageListItem,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

describe("studio-consistency-overview", () => {
  it("levelFromScore maps thresholds", () => {
    assert.equal(levelFromScore(90), "ready");
    assert.equal(levelFromScore(70), "almost_ready");
    assert.equal(levelFromScore(40), "needs_work");
  });

  it("buildStudioConsistencyOverview returns eight domains", () => {
    const overview = buildStudioConsistencyOverview({
      storyboard: studioStoryboardDetail({ scenes: [] }),
      characters: [],
    });
    assert.equal(overview.domains.length, 8);
    assert.ok(overview.overallScore >= 0 && overview.overallScore <= 100);
    assert.equal(overview.renderReadiness.level, "needs_work");
  });

  it("buildStudioConsistencyOverview scores prepared storyboard higher", () => {
    const weak = buildStudioConsistencyOverview({
      storyboard: studioStoryboardDetail({
        scenes: [studioSceneDetail({ order: 0, id: "s1" })],
      }),
      characters: [],
    });
    const strong = buildStudioConsistencyOverview({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            id: "s1",
            description: "Sergio opens the meeting",
            characters: [studioCharacterListItem({ id: "c1", name: "Sergio" })],
            location: studioLocationListItem({ id: "l1", name: "Office" }),
            shotType: "medium_wide",
            emotion: "focused",
            sceneImages: [
              studioSceneImageListItem({ id: "img1", sceneId: "s1", status: "completed" }),
            ],
          }),
          studioSceneDetail({
            order: 1,
            id: "s2",
            description: "Team reacts to the plan",
            characters: [studioCharacterListItem({ id: "c1", name: "Sergio" })],
            location: studioLocationListItem({ id: "l1", name: "Office" }),
            shotType: "close_up",
            emotion: "hopeful",
            sceneImages: [
              studioSceneImageListItem({ id: "img2", sceneId: "s2", status: "completed" }),
            ],
          }),
        ],
      }),
      characters: [
        studioCharacterListItem({
          id: "c1",
          name: "Sergio",
          voiceLock: true,
          voiceProfile: "warm_narrator",
          personality: "Calm leader",
          referenceImageUrl: "https://example.com/sergio.jpg",
        }),
      ],
    });
    assert.ok(strong.overallScore > weak.overallScore);
    assert.equal(strong.domains.find((d) => d.id === "render")?.level, "ready");
  });
});
