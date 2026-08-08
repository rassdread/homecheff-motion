/**
 * S.3 creative workflow — place persistence, stage inference, scene select contract.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inferStudioCreativeStage,
  STUDIO_CREATIVE_STAGES,
  STUDIO_VOCABULARY,
} from "@/lib/studio-creative-workflow";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("S.3 creative vocabulary", () => {
  it("defines core terms and stages", () => {
    assert.ok(STUDIO_VOCABULARY.project);
    assert.ok(STUDIO_VOCABULARY.scene);
    assert.ok(STUDIO_VOCABULARY.render);
    assert.equal(STUDIO_CREATIVE_STAGES.includes("edit"), true);
  });

  it("infers setup when there are no scenes", () => {
    assert.equal(inferStudioCreativeStage({ hasScenes: false, activeTool: "story" }), "setup");
  });

  it("infers idea when brief exists without scenes", () => {
    assert.equal(
      inferStudioCreativeStage({ hasScenes: false, activeTool: "story", hasIdeaBrief: true }),
      "idea"
    );
  });

  it("infers build for story tool with scenes", () => {
    assert.equal(inferStudioCreativeStage({ hasScenes: true, activeTool: "story" }), "build");
  });

  it("infers render/export from tools", () => {
    assert.equal(inferStudioCreativeStage({ hasScenes: true, activeTool: "render" }), "render");
    assert.equal(inferStudioCreativeStage({ hasScenes: true, activeTool: "export" }), "export");
    assert.equal(inferStudioCreativeStage({ hasScenes: true, activeTool: "visual" }), "edit");
  });
});

describe("S.3 scene selection contract", () => {
  it("does not force activeTool back to story on scene select", () => {
    const shell = readFileSync(
      join(process.cwd(), "src/components/studio/studio-workspace-shell.tsx"),
      "utf8"
    );
    assert.match(shell, /const selectScene = \(sceneId: string\) => \{/);
    assert.doesNotMatch(
      shell,
      /const selectScene = \(sceneId: string\) => \{\s*setActiveSceneId\(sceneId\);\s*setActiveTool\("story"\);/
    );
    assert.match(shell, /writeStudioWorkspacePlace/);
    assert.match(shell, /saveState=\{saveState\}/);
    const header = readFileSync(
      join(process.cwd(), "src/components/studio/studio-shell-header.tsx"),
      "utf8"
    );
    assert.match(header, /data-testid="studio-save-state"/);
  });

  it("wires workspace scene reorder controls", () => {
    const sidebar = readFileSync(
      join(process.cwd(), "src/components/studio/studio-workspace-scene-sidebar.tsx"),
      "utf8"
    );
    assert.match(sidebar, /onMoveScene/);
    assert.match(sidebar, /data-testid="studio-scene-move-up"/);
  });

  it("shows credit estimate on scene image generate", () => {
    const panel = readFileSync(
      join(process.cwd(), "src/components/studio/studio-scene-image-panel.tsx"),
      "utf8"
    );
    assert.match(panel, /SCENE_GENERATION_DISPLAY_CREDITS/);
    assert.match(panel, /studio-scene-image-credit-hint/);
  });

  it("mirrors scene/voice display credits to registry reserved USD", async () => {
    const {
      SCENE_GENERATION_DISPLAY_CREDITS,
      VOICE_GENERATION_DISPLAY_CREDITS,
      usdToCredits,
      SCENE_GENERATION_RESERVED_USD,
      VOICE_GENERATION_RESERVED_USD,
    } = await import("@/lib/studio-credit-constants");
    const { STUDIO_ACTION_COST_REGISTRY } = await import(
      "@/server/studio-account/studio-action-cost-registry"
    );
    assert.equal(
      SCENE_GENERATION_DISPLAY_CREDITS,
      usdToCredits(SCENE_GENERATION_RESERVED_USD)
    );
    assert.equal(
      VOICE_GENERATION_DISPLAY_CREDITS,
      usdToCredits(VOICE_GENERATION_RESERVED_USD)
    );
    assert.equal(
      STUDIO_ACTION_COST_REGISTRY.scene_generation.defaultCreditCost,
      SCENE_GENERATION_DISPLAY_CREDITS
    );
    assert.equal(
      STUDIO_ACTION_COST_REGISTRY.voice_generation.defaultCreditCost,
      VOICE_GENERATION_DISPLAY_CREDITS
    );
  });
});
