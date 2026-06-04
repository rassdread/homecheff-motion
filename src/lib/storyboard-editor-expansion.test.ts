import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("storyboard editor expansion stability", () => {
  it("does not auto-collapse scenes when text is added", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/instant/storyboard-editor.tsx"),
      "utf8"
    );
    assert.equal(source.includes("sceneHasText(scene) && !expanded"), false);
    assert.equal(source.includes("!collapsed || expanded"), false);
    assert.ok(source.includes("expandedSceneId === sceneId"));
  });

  it("uses stable sceneId keys for scene rows", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/instant/storyboard-editor.tsx"),
      "utf8"
    );
    assert.ok(source.includes('key={sceneId}'));
    assert.equal(source.includes("image?.id ?? index"), false);
  });

  it("scrolls on user expand only via pending scroll intent", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/instant/storyboard-editor.tsx"),
      "utf8"
    );
    assert.ok(source.includes("pendingUserScrollSceneId"));
    assert.ok(source.includes("onUserToggleExpanded"));
    assert.ok(source.includes("scrollFrameRowIntoView"));
  });
});
