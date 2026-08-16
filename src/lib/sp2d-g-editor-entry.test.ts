import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

describe("SP.2D-G workspace shell-first bootstrap", () => {
  const shell = readFileSync(join(ROOT, "src/components/studio/studio-workspace-shell.tsx"), "utf8");

  it("loads storyboard before clearing loading (entities do not gate editable)", () => {
    assert.match(shell, /fetchStudioStoryboard\(storyboardId\)/);
    assert.match(shell, /setLoading\(false\)/);
    assert.match(shell, /setEntitiesHydrating\(true\)/);
    // Entity fan-out must not sit in the same awaited Promise.all as storyboard.
    assert.doesNotMatch(
      shell,
      /await Promise\.all\(\[\s*fetchStudioStoryboard/
    );
    assert.match(shell, /fetchStudioLocations\(\)/);
    assert.match(shell, /fetchStudioProjectMemory\(\)/);
  });

  it("dynamic-imports Director V2 (not critical shell chunk)", () => {
    assert.match(shell, /dynamic\(/);
    assert.match(shell, /studio-director-panel-v2/);
    assert.doesNotMatch(
      shell,
      /import \{ StudioDirectorPanelV2 \} from "@\/components\/studio\/director-v2\/studio-director-panel-v2"/
    );
  });

  it("reuses hydrated session.user instead of always forcing auth network", () => {
    assert.match(shell, /if \(!session\.user\)/);
    assert.match(shell, /fetchAuthSessionJson\(\)/);
    assert.doesNotMatch(shell, /fetchAuthSessionJson\(\{ force: true \}\)/);
  });
});

describe("SP.2D-G immediate edit → save contract (scene update client)", () => {
  it("exposes updateStudioSceneApi for post-open save without requiring entity libraries", () => {
    const client = readFileSync(join(ROOT, "src/lib/studio-storyboards-client.ts"), "utf8");
    assert.match(client, /export async function updateStudioSceneApi/);
    assert.match(client, /export async function fetchStudioStoryboard/);

    // Shell save path uses updateStudioSceneApi after storyboard is loaded.
    const shell = readFileSync(join(ROOT, "src/components/studio/studio-workspace-shell.tsx"), "utf8");
    assert.match(shell, /updateStudioSceneApi/);
    assert.match(shell, /setSceneDirty\(false\)/);
  });
});
