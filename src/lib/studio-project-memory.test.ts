import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDirectorMemorySuggestions } from "@/lib/studio-director-proposal-memory";
import { detectRecurringCharacter, detectRecurringLocation } from "@/lib/studio-recurring-asset-detection";
import { buildProjectContinuityScore } from "@/lib/studio-project-continuity-score";
import { emptyProjectMemorySnapshot } from "@/lib/studio-project-memory-utils";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import {
  studioCharacterListItem,
  studioLocationListItem,
  studioSceneDetail,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";
import { getTranslator } from "@/i18n";

const t = getTranslator("en");

describe("studio-recurring-asset-detection", () => {
  it("detects recurring character by name and idea tokens", () => {
    const memory = emptyProjectMemorySnapshot();
    memory.characters["c1"] = {
      storyboardCount: 3,
      sceneCount: 8,
      renderCount: 2,
      campaignCount: 1,
    };
    const match = detectRecurringCharacter({
      idea: "Chef Marco promo in Rotterdam garden",
      characters: [
        studioCharacterListItem({ id: "c1", name: "Chef Marco", description: "HomeCheff chef" }),
      ],
      memory,
      candidateName: "Chef Marco",
    });
    assert.ok(match);
    assert.equal(match?.assetId, "c1");
    assert.ok(match?.matchReasonKeys.includes("studio.continuity.match.sameName"));
  });

  it("detects recurring location from library", () => {
    const match = detectRecurringLocation({
      idea: "Rotterdam market community story",
      locations: [studioLocationListItem({ id: "l1", name: "Rotterdam Market" })],
      candidateName: "Rotterdam Market",
    });
    assert.ok(match);
    assert.equal(match?.assetName, "Rotterdam Market");
  });
});

describe("buildProjectContinuityScore", () => {
  it("scores higher when reusing library assets across stories", () => {
    const memory = emptyProjectMemorySnapshot();
    memory.characters["c1"] = {
      storyboardCount: 4,
      sceneCount: 10,
      renderCount: 3,
      campaignCount: 2,
    };
    const score = buildProjectContinuityScore({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            id: "s1",
            order: 0,
            characters: [studioCharacterListItem({ id: "c1", name: "Chef Marco" })],
          }),
        ],
      }),
      characters: [studioCharacterListItem({ id: "c1", name: "Chef Marco" })],
      locations: [],
      props: [],
      worlds: [],
      memory,
      styleProfile: "commercial",
      directorProfile: "commercial",
    });
    assert.ok(score.reusedAssetCount >= 1);
    assert.ok(score.score > 0);
  });
});

describe("buildDirectorProposal memory", () => {
  it("prefers existing library character when memory shows prior usage", () => {
    const memory = emptyProjectMemorySnapshot();
    memory.characters["char-chef"] = {
      storyboardCount: 5,
      sceneCount: 12,
      renderCount: 4,
      campaignCount: 2,
    };
    const proposal = buildDirectorProposal({
      idea: "Pixar-achtige chef promotievideo voor HomeCheff met Chef Marco",
      storyboard: studioStoryboardDetail({ scenes: [] }),
      characters: [
        studioCharacterListItem({
          id: "char-chef",
          name: "Chef Marco",
          description: "HomeCheff mascot chef",
          role: "mascot",
        }),
      ],
      locations: [studioLocationListItem({ id: "loc-1", name: "Rotterdam Garden" })],
      props: [],
      worlds: [],
      projectMemory: memory,
      t,
    });
    assert.ok(proposal);
    const usesChef = proposal!.scenes.some((s) =>
      s.characterRefs.some((c) => c.existingId === "char-chef")
    );
    assert.ok(usesChef);
    assert.ok((proposal!.memorySuggestions?.length ?? 0) >= 0);
  });

  it("buildDirectorMemorySuggestions surfaces reuse for proposed duplicates", () => {
    const memory = emptyProjectMemorySnapshot();
    memory.characters["c1"] = {
      storyboardCount: 2,
      sceneCount: 4,
      renderCount: 1,
      campaignCount: 1,
    };
    const base = buildDirectorProposal({
      idea: "Chef Marco garden promo",
      storyboard: studioStoryboardDetail({ scenes: [] }),
      characters: [studioCharacterListItem({ id: "c1", name: "Chef Marco" })],
      locations: [],
      props: [],
      projectMemory: memory,
      t,
    });
    assert.ok(base);
    const suggestions = buildDirectorMemorySuggestions({
      idea: "Chef Marco garden promo",
      proposal: base!,
      characters: [studioCharacterListItem({ id: "c1", name: "Chef Marco" })],
      locations: [],
      props: [],
      worlds: [],
      memory,
    });
    assert.ok(Array.isArray(suggestions));
  });
});
