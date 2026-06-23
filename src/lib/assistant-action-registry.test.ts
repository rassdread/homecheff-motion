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
      "edit_mascot",
      "create_motion_video",
      "create_fusion",
      "create_publish_export",
      "open_project",
      "rename_project",
      "open_asset",
      "prepare_outfit",
      "prepare_logo_placement",
      "prepare_background",
      "prepare_location",
      "prepare_prop",
      "prepare_vehicle",
      "prepare_music",
      "prepare_sfx",
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
    assert.equal(characterActions.length, 4);
    assert.ok(characterActions.every((action) => action.category === "character"));
    const preparationActions = listAssistantActionsByCategory("preparation");
    assert.equal(preparationActions.length, 8);
    assert.ok(preparationActions.every((action) => action.execution === "registry_only"));
  });

  it("validates unknown action ids", () => {
    assert.equal(isRegisteredAssistantAction("create_character"), true);
    assert.equal(isRegisteredAssistantAction("run_unknown_tool"), false);
  });
});
