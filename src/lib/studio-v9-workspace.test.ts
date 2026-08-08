import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";

const V9_KEYS = [
  "studio.v9.changePlan.title",
  "studio.v9.voice.title",
  "studio.v9.music.title",
  "studio.v9.sfx.title",
  "studio.v9.right.panelLabel",
] as const;

describe("Studio V9 workspace", () => {
  it("has V9 i18n keys in nl and en", () => {
    for (const key of V9_KEYS) {
      assert.ok(nl[key], `missing nl ${key}`);
      assert.ok(en[key], `missing en ${key}`);
    }
  });

  it("renders three-pane layout in workspace shell", () => {
    const shell = readFileSync(
      join(process.cwd(), "src/components/studio/studio-workspace-shell.tsx"),
      "utf8"
    );
    assert.match(shell, /data-testid="studio-three-pane-layout"/);
    assert.match(shell, /lg:grid-cols-\[minmax\(180px,240px\)_minmax\(0,1fr\)_minmax\(260px,340px\)\]/);
    assert.match(shell, /data-testid="studio-adaptive-workspace"/);
    assert.match(shell, /StudioWorkspaceCenterScenePreview/);
  });

  it("shows persistent change plan panel on the right", () => {
    const right = readFileSync(
      join(process.cwd(), "src/components/studio/studio-workspace-v9-right-panel.tsx"),
      "utf8"
    );
    assert.match(right, /StudioWorkspaceChangePlanPanel/);
    assert.match(right, /data-testid="studio-v9-right-panel"/);
  });

  it("wires voice library panel in voice tool", () => {
    const panel = readFileSync(
      join(process.cwd(), "src/components/studio/studio-workspace-tool-panel.tsx"),
      "utf8"
    );
    assert.match(panel, /StudioV9VoiceLibraryPanel/);
    assert.match(panel, /StudioV9MusicPanel/);
    assert.match(panel, /StudioV9SoundEffectsPanel/);
  });

  it("voice library panel exposes browse and apply actions", () => {
    const voice = readFileSync(
      join(process.cwd(), "src/components/studio/studio-v9-voice-library-panel.tsx"),
      "utf8"
    );
    assert.match(voice, /data-testid="studio-v9-voice-library-panel"/);
    assert.match(voice, /data-testid="studio-v9-voice-apply-project"/);
    assert.match(voice, /useVoiceLibrary/);
  });

  it("music generation enqueues change plan item", () => {
    const music = readFileSync(
      join(process.cwd(), "src/components/studio/studio-v9-music-panel.tsx"),
      "utf8"
    );
    assert.match(music, /enqueueChange/);
    assert.match(music, /data-testid="studio-v9-music-generate"/);
  });

  it("SFX generation adds scene-scoped change plan item", () => {
    const sfx = readFileSync(
      join(process.cwd(), "src/components/studio/studio-v9-sound-effects-panel.tsx"),
      "utf8"
    );
    assert.match(sfx, /applyTarget: "scene"/);
    assert.match(sfx, /data-testid="studio-v9-sfx-add-scene"/);
  });

  it("persists audio workspace state in HC blob patch types", () => {
    const state = readFileSync(
      join(process.cwd(), "src/types/studio-workspace-state.ts"),
      "utf8"
    );
    assert.match(state, /audioChangePlan/);
    assert.match(state, /audioProjectAssets/);
  });

  it("AI Director audio suggestions enqueue change plan", () => {
    const rail = readFileSync(
      join(process.cwd(), "src/components/studio/studio-production-insights-rail.tsx"),
      "utf8"
    );
    assert.match(rail, /buildStudioDirectorAudioSuggestions/);
    assert.match(rail, /enqueueChange/);
    assert.match(rail, /data-testid="studio-director-audio-suggestion"/);
  });

  it("production review shows voice music and SFX summary", () => {
    const review = readFileSync(
      join(process.cwd(), "src/components/studio/studio-workspace-audio-review-summary.tsx"),
      "utf8"
    );
    assert.match(review, /data-testid="studio-audio-review-summary"/);
    assert.match(review, /studio\.v9\.review\.voice/);
    assert.match(review, /studio\.v9\.review\.music/);
    assert.match(review, /studio\.v9\.review\.sfx/);
  });

  it("tool strip tabs map to real panels (no placeholder-only tools for audio)", () => {
    const strip = readFileSync(
      join(process.cwd(), "src/components/studio/studio-tool-strip.tsx"),
      "utf8"
    );
    assert.match(strip, /voice/);
    assert.match(strip, /music/);
    assert.match(strip, /sound/);
    const panel = readFileSync(
      join(process.cwd(), "src/components/studio/studio-workspace-tool-panel.tsx"),
      "utf8"
    );
    assert.doesNotMatch(panel, /StudioToolPlaceholderPanel/);
  });
});
