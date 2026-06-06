import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";

const WORKSPACE_EMBED_KEYS = [
  "studio.workspace.voice.hint",
  "studio.workspace.text.hint",
  "studio.workspace.subtitles.hint",
  "studio.workspace.translate.hint",
  "studio.workspace.export.hint",
  "studio.workspace.music.planningHint",
  "studio.workspace.sound.planningHint",
  "studio.workspace.motion.emptyTitle",
  "studio.workspace.createNew",
  "studio.workspace.assets.addCharacter",
  "studio.workspace.assets.chooseLocation",
  "studio.workspace.assets.removeFromScene",
  "studio.workspace.assets.noSceneHint",
] as const;

describe("Studio workspace embed", () => {
  it("has workspace embed copy in nl and en", () => {
    for (const key of WORKSPACE_EMBED_KEYS) {
      assert.ok(nl[key], `missing nl key ${key}`);
      assert.ok(en[key], `missing en key ${key}`);
    }
  });

  it("wires real tool panels in workspace shell when a story is loaded", () => {
    const shellPath = join(process.cwd(), "src/components/studio/studio-workspace-shell.tsx");
    const src = readFileSync(shellPath, "utf8");
    assert.match(src, /StudioWorkspaceToolPanel/);
    assert.doesNotMatch(src, /StudioToolPlaceholderPanel/);
  });

  it("embeds voice director panel in workspace tool panel", () => {
    const panelPath = join(process.cwd(), "src/components/studio/studio-workspace-tool-panel.tsx");
    const src = readFileSync(panelPath, "utf8");
    assert.match(src, /StudioVoiceDirectorPanel/);
    assert.match(src, /LanguageExportPanel/);
    assert.match(src, /StudioMusicDirectorPanel/);
    assert.match(src, /StudioTextBeatsPreviewPanel/);
  });

  it("uses scene asset panel in workspace shell instead of redirect list", () => {
    const shellPath = join(process.cwd(), "src/components/studio/studio-workspace-shell.tsx");
    const src = readFileSync(shellPath, "utf8");
    assert.match(src, /StudioWorkspaceSceneAssetsPanel/);
    assert.doesNotMatch(src, /StudioWorkspaceAssetsList/);
  });

  it("keeps asset picker and create sheet in scene assets panel", () => {
    const panelPath = join(process.cwd(), "src/components/studio/studio-workspace-scene-assets-panel.tsx");
    const src = readFileSync(panelPath, "utf8");
    assert.match(src, /StudioWorkspaceAssetPicker/);
    assert.match(src, /StudioWorkspaceAssetCreateSheet/);
    assert.match(src, /updateStudioSceneApi/);
  });
});
