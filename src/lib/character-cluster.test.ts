import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCharacterClusterHref,
  CHARACTER_CLUSTER_PATHS,
  flowIdForRoute,
  resolveDeprecatedCharacterEntry,
} from "@/lib/character-cluster-routes";
import {
  resolveCharacterDynamicQuestions,
  scoreCharacterIdeaConfidences,
} from "@/lib/character-dynamic-questions";
import { mapVisionJsonToAnalysis } from "@/lib/studio-asset-vision-analysis";

const ROOT = process.cwd();

describe("character-cluster", () => {
  it("create character routes correctly", () => {
    assert.equal(CHARACTER_CLUSTER_PATHS.new, "/studio/characters/new");
    assert.equal(
      buildCharacterClusterHref("new", { storyboardId: "sb_1", projectId: "hc_1" }),
      "/studio/characters/new?storyboardId=sb_1&projectId=hc_1"
    );
    assert.equal(flowIdForRoute("new"), "character_new");
  });

  it("from-reference routes correctly", () => {
    assert.equal(CHARACTER_CLUSTER_PATHS["from-reference"], "/studio/characters/from-reference");
    assert.equal(
      buildCharacterClusterHref("from-reference", { characterId: "char_1", mode: "custom_variant" }),
      "/studio/characters/from-reference?characterId=char_1&mode=custom_variant"
    );
    assert.equal(flowIdForRoute("from-reference"), "character_reference");
  });

  it("motion-ready routes correctly", () => {
    assert.equal(CHARACTER_CLUSTER_PATHS["motion-ready"], "/studio/characters/motion-ready");
    assert.equal(flowIdForRoute("motion-ready"), "character_motion_ready");
  });

  it("deprecated routes redirect", () => {
    const motion = resolveDeprecatedCharacterEntry({ entry: "prepare_for_animation", storyboardId: "sb_1" });
    assert.ok(motion?.redirectTo.includes("/studio/characters/motion-ready"));
    assert.equal(motion?.deprecated, "prepare_for_animation");

    const derive = resolveDeprecatedCharacterEntry({ entry: "derive", deriveFrom: "char_abc" });
    assert.ok(derive?.redirectTo.includes("/studio/characters/from-reference"));
    assert.ok(derive?.redirectTo.includes("characterId=char_abc"));
  });

  it("library save includes sourceRoute in client types", () => {
    const types = readFileSync(join(ROOT, "src/types/library-consistency.ts"), "utf8");
    assert.match(types, /sourceRoute/);
    const client = readFileSync(join(ROOT, "src/lib/library-consistency-client.ts"), "utf8");
    assert.match(client, /sourceRoute/);
  });

  it("HC Project attach uses ensureHcProjectOnStudioStart", () => {
    const save = readFileSync(join(ROOT, "src/lib/character-cluster-save.ts"), "utf8");
    assert.match(save, /ensureHcProjectOnStudioStart/);
    assert.match(save, /upsertHcAssetReference/);
  });

  it("dynamic questions shared across routes", () => {
    const vague = resolveCharacterDynamicQuestions({ route: "new", idea: "chef", locale: "en" });
    const detailed = resolveCharacterDynamicQuestions({
      route: "new",
      idea: "A friendly adult chef mascot in green apron, cinematic realistic style, warm personality for community cooking video",
      locale: "en",
    });
    assert.ok(vague.length >= detailed.length);

    const vision = mapVisionJsonToAnalysis(
      { objectType: "Human", visualStyle: "Photo portrait", confidence: 0.8 },
      { sourceName: "Chef" }
    );
    const refQuestions = resolveCharacterDynamicQuestions({
      route: "from-reference",
      vision,
      referenceMode: "custom_variant",
      locale: "en",
    });
    assert.ok(refQuestions.some((q) => q.id.startsWith("ref_")));

    const motionQuestions = resolveCharacterDynamicQuestions({
      route: "motion-ready",
      vision,
      locale: "en",
    });
    assert.ok(motionQuestions.length > 0);
  });

  it("asset requirements use canonical routes", () => {
    const panel = readFileSync(join(ROOT, "src/components/studio/studio-generate-missing-assets-panel.tsx"), "utf8");
    assert.match(panel, /buildCharacterClusterHref\("from-reference"/);
    assert.match(panel, /buildCharacterClusterHref\("new"/);
  });

  it("character cards use canonical routes", () => {
    const entry = readFileSync(join(ROOT, "src/components/studio/studio-characters-entry-panel.tsx"), "utf8");
    assert.match(entry, /buildCharacterClusterHref\("from-reference"/);
    assert.match(entry, /mode: "custom_variant"/);
    assert.doesNotMatch(entry, /StudioBriefAssetWizardPanel/);
    assert.doesNotMatch(entry, /StudioCharacterExtractionFlow/);
  });

  it("entry CTAs use canonical data-flow-id", () => {
    const ctas = readFileSync(join(ROOT, "src/components/studio/studio-character-entry-ctas.tsx"), "utf8");
    assert.match(ctas, /data-flow-id="character_new"/);
    assert.match(ctas, /data-flow-id="character_reference"/);
    assert.match(ctas, /data-flow-id="character_motion_ready"/);
    assert.match(ctas, /characterCluster\.cta\.fromPhoto/);
  });
});

describe("character-cluster idea scoring", () => {
  it("asks fewer questions for detailed prompts", () => {
    const scores = scoreCharacterIdeaConfidences(
      "Realistic cinematic chef mascot in green apron, friendly warm personality, adult presenter for HomeCheff community"
    );
    const highCount = scores.filter((s) => s.score >= 0.75).length;
    assert.ok(highCount >= 2);
  });
});
