import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCharacterClusterHref,
  buildFromReferenceHrefFromWizardDraft,
  resolveDeprecatedCharacterEntry,
} from "@/lib/character-cluster-routes";

const ROOT = process.cwd();

describe("character cluster P1 consolidation", () => {
  it("buildFromReferenceHrefFromWizardDraft forwards handoff params", () => {
    const href = buildFromReferenceHrefFromWizardDraft({
      sourceReferenceImageUrl: "https://example.com/photo.png",
      sourceAssetId: "asset_1",
      name: "Chef",
      hcProjectId: "hc_1",
      storyboardId: "sb_1",
      sceneId: "scene_1",
      characterId: "char_1",
    });
    assert.ok(href.startsWith("/studio/characters/from-reference?"));
    assert.match(href, /sourceImage=/);
    assert.match(href, /sourceAsset=asset_1/);
    assert.match(href, /hcProject=hc_1/);
    assert.match(href, /storyboardId=sb_1/);
    assert.match(href, /sceneId=scene_1/);
    assert.match(href, /characterId=char_1/);
    assert.match(href, /sourceName=Chef/);
  });

  it("from-reference page forwards query params to wizard", () => {
    const page = readFileSync(
      join(ROOT, "src/app/studio/characters/from-reference/page.tsx"),
      "utf8"
    );
    assert.match(page, /sourceImage/);
    assert.match(page, /sourceAsset/);
    assert.match(page, /hcProject/);
    assert.match(page, /sceneId/);
    assert.match(page, /requirementId/);
    assert.match(page, /returnTo/);
    assert.match(page, /characterId/);
  });

  it("advanced wizard redirects derive_from_reference for characters", () => {
    const wizard = readFileSync(
      join(ROOT, "src/components/studio/studio-asset-creation-wizard.tsx"),
      "utf8"
    );
    assert.match(wizard, /buildFromReferenceHrefFromWizardDraft/);
    assert.match(
      wizard,
      /kind === "character"[\s\S]*derive_from_reference[\s\S]*buildFromReferenceHrefFromWizardDraft/
    );
  });

  it("generate-missing panel removed dead extraction flow", () => {
    const panel = readFileSync(
      join(ROOT, "src/components/studio/studio-generate-missing-assets-panel.tsx"),
      "utf8"
    );
    assert.doesNotMatch(panel, /StudioCharacterExtractionFlow/);
    assert.doesNotMatch(panel, /extractReqId/);
    assert.match(panel, /activeWizard !== "character"/);
    assert.match(panel, /buildCharacterClusterHref\("from-reference"/);
  });

  it("characters library no longer uses guided=1", () => {
    const library = readFileSync(
      join(ROOT, "src/components/studio/studio-characters-library.tsx"),
      "utf8"
    );
    assert.doesNotMatch(library, /guided=1/);
    assert.match(library, /\/studio\/characters\/new/);
  });

  it("production brief uses canonical character cluster link", () => {
    const brief = readFileSync(
      join(ROOT, "src/components/studio/studio-production-brief-flow.tsx"),
      "utf8"
    );
    assert.match(brief, /buildCharacterClusterHref\("new"/);
    assert.doesNotMatch(brief, /StudioCharacterWizardPanel/);
  });

  it("AI Everything routes characters to canonical new wizard", () => {
    const panel = readFileSync(
      join(ROOT, "src/components/studio/studio-ai-everything-panel.tsx"),
      "utf8"
    );
    assert.match(panel, /isCharacterRequirementKind/);
    assert.match(panel, /nonCharacterReqs/);
    assert.match(panel, /characterReqs\.length/);
    assert.match(panel, /buildCharacterClusterHref\("new"/);
  });

  it("deprecated derive entry resolves to from-reference with characterId", () => {
    const resolved = resolveDeprecatedCharacterEntry({
      entry: "derive_from_reference",
      deriveFrom: "char_seed",
      storyboardId: "sb_2",
    });
    assert.ok(resolved?.redirectTo.includes("from-reference"));
    assert.ok(resolved?.redirectTo.includes("characterId=char_seed"));
    assert.ok(resolved?.redirectTo.includes("storyboardId=sb_2"));
  });

  it("asset requirements use only cluster paths for characters", () => {
    assert.equal(
      buildCharacterClusterHref("new", { requirementId: "req_1" }),
      "/studio/characters/new?requirementId=req_1"
    );
    assert.equal(
      buildCharacterClusterHref("from-reference", { sourceImage: "https://x.test/a.png" }).includes(
        "sourceImage="
      ),
      true
    );
    assert.equal(
      buildCharacterClusterHref("motion-ready", { hcProject: "hc_9" }),
      "/studio/characters/motion-ready?hcProject=hc_9"
    );
  });
});
