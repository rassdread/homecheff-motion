import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHARACTER_STUDIO_HUB_PATH,
  buildCharacterStudioFlowHref,
  buildCharacterStudioHubHref,
  characterStudioFlowDefinition,
  hubVisibleCharacterStudioFlows,
} from "@/lib/character-studio-hub";

describe("character studio hub", () => {
  it("exposes hub path and visible flows", () => {
    assert.equal(buildCharacterStudioHubHref(), CHARACTER_STUDIO_HUB_PATH);
    const flows = hubVisibleCharacterStudioFlows();
    assert.ok(flows.length >= 10);
    assert.ok(flows.some((f) => f.id === "outfit"));
    assert.ok(flows.some((f) => f.id === "mascot_transform"));
  });

  it("routes fusion flows through prepare shell", () => {
    assert.equal(
      buildCharacterStudioFlowHref("outfit"),
      "/studio/characters/prepare?flow=outfit"
    );
    assert.equal(
      buildCharacterStudioFlowHref("character_fusion"),
      "/studio/characters/prepare?flow=character_fusion"
    );
  });

  it("routes motion flows to motion-ready wizard", () => {
    assert.match(buildCharacterStudioFlowHref("motion_ready"), /\/studio\/characters\/motion-ready/);
    assert.match(buildCharacterStudioFlowHref("full_body"), /\/studio\/characters\/motion-ready/);
  });

  it("marks character upgrade as fusion wizard", () => {
    const def = characterStudioFlowDefinition("character_upgrade");
    assert.equal(def.kind, "fusion_wizard");
    assert.equal(def.fusionIntent, "character_upgrade");
  });
});
