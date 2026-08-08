/**
 * S.3 generation UX status + paid display harness (no provider calls).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  normalizeStudioGenerationUxStatus,
  studioGenerationAllowsContinueEditing,
} from "@/lib/studio-generation-ux-status";
import {
  SCENE_GENERATION_DISPLAY_CREDITS,
  VOICE_GENERATION_DISPLAY_CREDITS,
} from "@/lib/studio-credit-constants";
import { STUDIO_ACTION_COST_REGISTRY } from "@/server/studio-account/studio-action-cost-registry";

describe("S.3 generation UX status", () => {
  it("maps known backend statuses", () => {
    assert.equal(normalizeStudioGenerationUxStatus("queued"), "queued");
    assert.equal(normalizeStudioGenerationUxStatus("generating"), "generating");
    assert.equal(normalizeStudioGenerationUxStatus("processing"), "processing");
    assert.equal(normalizeStudioGenerationUxStatus("completed"), "completed");
    assert.equal(normalizeStudioGenerationUxStatus("failed"), "failed");
    assert.equal(normalizeStudioGenerationUxStatus(null, { busy: true }), "generating");
  });

  it("allows continue editing during in-flight generation", () => {
    assert.equal(studioGenerationAllowsContinueEditing("generating"), true);
    assert.equal(studioGenerationAllowsContinueEditing("failed"), false);
  });
});

describe("S.3 paid-action display harness", () => {
  it("display credits match registry defaults (no drift)", () => {
    assert.equal(
      SCENE_GENERATION_DISPLAY_CREDITS,
      STUDIO_ACTION_COST_REGISTRY.scene_generation.defaultCreditCost
    );
    assert.equal(
      VOICE_GENERATION_DISPLAY_CREDITS,
      STUDIO_ACTION_COST_REGISTRY.voice_generation.defaultCreditCost
    );
  });

  it("wires generation status chrome into image and voice panels", () => {
    const image = readFileSync(
      join(process.cwd(), "src/components/studio/studio-scene-image-panel.tsx"),
      "utf8"
    );
    const voice = readFileSync(
      join(process.cwd(), "src/components/studio/studio-voice-preview-panel.tsx"),
      "utf8"
    );
    assert.match(image, /StudioGenerationStatusChrome/);
    assert.match(voice, /StudioGenerationStatusChrome/);
    const chrome = readFileSync(
      join(process.cwd(), "src/components/studio/studio-generation-status-chrome.tsx"),
      "utf8"
    );
    assert.match(chrome, /studio-generation-retry/);
    assert.match(chrome, /data-generation-state/);
  });

  it("exposes music/sfx/voice ownership and preview mode controls", () => {
    const tools = readFileSync(
      join(process.cwd(), "src/components/studio/studio-workspace-tool-panel.tsx"),
      "utf8"
    );
    const shell = readFileSync(
      join(process.cwd(), "src/components/studio/studio-workspace-shell.tsx"),
      "utf8"
    );
    const preview = readFileSync(
      join(process.cwd(), "src/components/studio/studio-workspace-center-scene-preview.tsx"),
      "utf8"
    );
    assert.match(tools, /studio-audio-ownership-music/);
    assert.match(tools, /studio-audio-ownership-sound/);
    assert.match(tools, /studio-audio-ownership-voice/);
    assert.match(shell, /workspaceViewMode/);
    assert.match(preview, /studio-enter-preview/);
    assert.match(preview, /studio-exit-preview/);
  });
});
