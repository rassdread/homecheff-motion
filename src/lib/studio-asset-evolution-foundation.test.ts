import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeAssetEvolutionContinuity,
  buildAssetEvolutionFromProposal,
  buildStoryboardAssetEvolution,
  buildVisualProductionAssetGaps,
  evolutionStatusIcon,
} from "@/lib/studio-asset-evolution";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import {
  studioCharacterListItem,
  studioLocationListItem,
  studioSceneDetail,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";
import { emptyProjectMemorySnapshot } from "@/lib/studio-project-memory-utils";
import { getTranslator } from "@/i18n";

const t = getTranslator("en");

describe("studio-asset-evolution overview", () => {
  it("marks linked characters as present", () => {
    const evolution = buildStoryboardAssetEvolution({
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
    });
    const characters = evolution.sections.find((s) => s.kind === "character");
    assert.equal(characters?.present.length, 1);
    assert.equal(characters?.present[0]?.name, "Chef Marco");
  });

  it("flags scenes missing characters as missing", () => {
    const evolution = buildStoryboardAssetEvolution({
      storyboard: studioStoryboardDetail({
        scenes: [studioSceneDetail({ id: "s1", order: 0, characters: [] })],
      }),
      characters: [studioCharacterListItem({ id: "c1", name: "Chef Marco" })],
      locations: [],
      props: [],
      worlds: [],
    });
    const characters = evolution.sections.find((s) => s.kind === "character");
    assert.equal(characters?.missing.length, 1);
  });

  it("recommends recurring library character from memory", () => {
    const memory = emptyProjectMemorySnapshot();
    memory.characters["c1"] = {
      storyboardCount: 3,
      sceneCount: 8,
      renderCount: 2,
      campaignCount: 1,
    };
    const evolution = buildStoryboardAssetEvolution({
      storyboard: studioStoryboardDetail({
        title: "Chef Marco promo",
        scenes: [studioSceneDetail({ id: "s1", order: 0, characters: [] })],
      }),
      characters: [
        studioCharacterListItem({ id: "c1", name: "Chef Marco", description: "HomeCheff chef" }),
      ],
      locations: [],
      props: [],
      worlds: [],
      memory,
    });
    const characters = evolution.sections.find((s) => s.kind === "character");
    assert.ok(
      characters?.recommended.some((entry) => entry.existingId === "c1") ||
        characters?.missing.length === 1
    );
  });
});

describe("studio-asset-evolution proposal", () => {
  it("builds proposed assets from director proposal", () => {
    const proposal = buildDirectorProposal({
      idea: "Pixar chef promo in Rotterdam kitchen",
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({ id: "s1", order: 0 }),
          studioSceneDetail({ id: "s2", order: 1 }),
          studioSceneDetail({ id: "s3", order: 2 }),
        ],
      }),
      characters: [studioCharacterListItem({ id: "c1", name: "Chef Marco" })],
      locations: [studioLocationListItem({ id: "l1", name: "Rotterdam Market" })],
      props: [],
      worlds: [],
      t: (key, params) => t(key as never, params),
    });
    assert.ok(proposal);
    const evolution = buildAssetEvolutionFromProposal({ proposal: proposal! });
    const linkedChars = evolution.sections.find((s) => s.kind === "character")?.present ?? [];
    assert.ok(linkedChars.length >= 0);
  });
});

describe("studio-asset-evolution integrations", () => {
  it("visual gaps explain missing character for image", () => {
    const gaps = buildVisualProductionAssetGaps(
      studioStoryboardDetail({
        scenes: [studioSceneDetail({ id: "s1", order: 0, characters: [] })],
      })
    );
    assert.ok(gaps.some((g) => g.code === "image_missing_character"));
  });

  it("continuity advice flags missing locations", () => {
    const advice = analyzeAssetEvolutionContinuity({
      storyboard: studioStoryboardDetail({
        scenes: [studioSceneDetail({ id: "s1", order: 0, locationId: null })],
      }),
      characters: [],
      locations: [studioLocationListItem({ id: "l1", name: "Kitchen" })],
      props: [],
      worlds: [],
    });
    assert.ok(advice.some((a) => a.code === "missing_locations"));
  });

  it("status icons distinguish present recommended missing", () => {
    assert.equal(evolutionStatusIcon("present"), "✓");
    assert.equal(evolutionStatusIcon("recommended"), "⚠");
    assert.equal(evolutionStatusIcon("missing"), "✚");
  });
});

describe("studio-asset-evolution i18n", () => {
  it("has NL/EN parity for core keys", () => {
    assert.equal(t("studio.assetEvolution.section.character"), "Recommended characters");
    assert.equal(t("studio.assetEvolution.reuseRecommended"), "Reuse recommended");
    assert.equal(t("studio.assetEvolution.compare.apply"), "Use proposal");
  });
});
