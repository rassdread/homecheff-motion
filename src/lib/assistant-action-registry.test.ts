import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ASSISTANT_ACTION_IDS,
  ASSISTANT_ACTION_REGISTRY,
  getAssistantAction,
  isRegisteredAssistantAction,
  listAssistantActions,
  listAssistantActionsByCategory,
} from "@/lib/assistant-action-registry";
import { buildCharacterClusterHref } from "@/lib/character-cluster-routes";

describe("assistant action registry", () => {
  it("registers all P5 assistant action ids", () => {
    const expected = [
      "create_character",
      "create_character_from_reference",
      "prepare_motion_character",
      "create_motion_video",
      "create_fusion",
      "create_publish_export",
      "open_project",
      "rename_project",
      "open_asset",
    ];
    assert.deepEqual([...ASSISTANT_ACTION_IDS], expected);
    assert.equal(listAssistantActions().length, expected.length);
  });

  it("actions are registry-only with canonical routes", () => {
    for (const id of ASSISTANT_ACTION_IDS) {
      const action = getAssistantAction(id);
      assert.equal(action.id, id);
      assert.equal(action.execution, "registry_only");
      assert.ok(action.canonicalRoute.startsWith("/"));
      assert.ok(action.description.length > 0);
    }
  });

  it("character actions point to character cluster routes", () => {
    assert.equal(
      ASSISTANT_ACTION_REGISTRY.create_character.canonicalRoute,
      buildCharacterClusterHref("new")
    );
    assert.equal(
      ASSISTANT_ACTION_REGISTRY.create_character_from_reference.canonicalRoute,
      buildCharacterClusterHref("from-reference")
    );
    assert.equal(
      ASSISTANT_ACTION_REGISTRY.prepare_motion_character.canonicalRoute,
      buildCharacterClusterHref("motion-ready")
    );
  });

  it("filters actions by category", () => {
    const characterActions = listAssistantActionsByCategory("character");
    assert.equal(characterActions.length, 3);
    assert.ok(characterActions.every((action) => action.category === "character"));
  });

  it("validates unknown action ids", () => {
    assert.equal(isRegisteredAssistantAction("create_character"), true);
    assert.equal(isRegisteredAssistantAction("run_unknown_tool"), false);
  });
});
