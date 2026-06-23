import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCharacterStudioCopilotRoute,
  detectCharacterStudioFlowFromMessage,
} from "@/lib/character-studio-copilot";

describe("character studio copilot routing", () => {
  it("routes mascot prompts to mascot transform flow", () => {
    const match = detectCharacterStudioFlowFromMessage("ik wil een mascotte veranderen");
    assert.equal(match.kind, "flow");
    if (match.kind === "flow") {
      assert.equal(match.flowId, "mascot_transform");
      assert.match(match.route, /flow=mascot_transform/);
    }
  });

  it("routes outfit prompts", () => {
    const route = buildCharacterStudioCopilotRoute("nieuwe outfit voor dit personage");
    assert.match(route ?? "", /flow=outfit/);
  });

  it("routes human to mascot prompts", () => {
    const route = buildCharacterStudioCopilotRoute("maak een chef van deze foto");
    assert.match(route ?? "", /flow=(mascot_transform|human_to_mascot)/);
  });

  it("routes logo placement prompts", () => {
    const route = buildCharacterStudioCopilotRoute("logo plaatsen op jas");
    assert.match(route ?? "", /flow=logo_placement/);
  });

  it("routes 3d versie to character upgrade", () => {
    const match = detectCharacterStudioFlowFromMessage("3d versie van mascotte");
    assert.equal(match.kind, "flow");
    if (match.kind === "flow") {
      assert.equal(match.flowId, "character_upgrade");
    }
  });

  it("ignores unrelated prompts", () => {
    assert.equal(detectCharacterStudioFlowFromMessage("exporteer naar pdf").kind, "none");
  });
});
