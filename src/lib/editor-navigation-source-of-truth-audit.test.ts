/**
 * Editor navigation source-of-truth audit contracts.
 * Run: npx tsx --test src/lib/editor-navigation-source-of-truth-audit.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("editor navigation source of truth audit", () => {
  it("single editor route mounts EditorProductPage → EditorCanvasWorkspace", () => {
    const route = read("src/app/editor/page.tsx");
    const product = read("src/components/editor/editor-product-page.tsx");
    assert.match(route, /EditorProductPage/);
    assert.match(product, /EditorCanvasWorkspace/);
    assert.match(product, /EditorStartScreen/);
    assert.doesNotMatch(product, /EditorV5|EditorV6Workspace|HumanFirstEditor/);
  });

  it("editor session URL uses query param not path segment", () => {
    const product = read("src/components/editor/editor-product-page.tsx");
    assert.match(product, /\/editor\?session=/);
    assert.doesNotMatch(product, /\/editor\/\$\{/);
  });

  it("suite product definitions point to canonical editor/studio/motion/publish routes", () => {
    const suite = read("src/lib/homecheff-product-suite.ts");
    assert.match(suite, /href: "\/editor"/);
    assert.match(suite, /href: "\/studio"/);
    assert.match(suite, /href: "\/animate\/instant"/);
    assert.match(suite, /href: "\/publish"/);
  });

  it("legacy studio routes redirect to /studio", () => {
    const advanced = read("src/app/studio/advanced/page.tsx");
    const myStudio = read("src/app/studio/my-studio/page.tsx");
    assert.match(advanced, /redirect\("\/studio"\)/);
    assert.match(myStudio, /redirect\("\/studio"\)/);
  });

  it("storyboard detail route redirects to studioWorkspaceHref", () => {
    const storyboard = read("src/app/studio/storyboards/[id]/page.tsx");
    assert.match(storyboard, /studioWorkspaceHref/);
    assert.match(storyboard, /redirect/);
  });

  it("next.config aliases library and presentation to hub routes", () => {
    const next = read("next.config.ts");
    assert.match(next, /\/library.*\/studio\/assets/);
    assert.match(next, /\/presentation.*\/publish/);
    assert.match(next, /\/create.*\/maak/);
  });

  it("studio handoff links pass editorSession query param", () => {
    const banner = read("src/components/studio/editor-studio-entry-banner.tsx");
    const recommendations = read("src/components/editor/editor-asset-recommendations-panel.tsx");
    assert.match(banner, /editorSession=/);
    assert.match(recommendations, /editorSession=/);
    const workspace = read("src/components/editor/editor-canvas-workspace.tsx");
    assert.match(workspace, /editorSession=\$\{encodeURIComponent\(document\.sessionId\)\}/);
  });

  it("motion bootstrap reads editorSession on /animate/instant", () => {
    const instant = read("src/app/animate/instant/page.tsx");
    const bootstrap = read("src/hooks/use-editor-motion-bootstrap.ts");
    assert.match(instant, /EditorMotionBootstrapApply/);
    assert.match(bootstrap, /editorSession/);
  });

  it("studio entry resolves editor document from localStorage only", () => {
    const entry = read("src/lib/editor-studio-entry.ts");
    assert.match(entry, /loadEditorCanvasDocument/);
    assert.doesNotMatch(entry, /fetchEditorProject/);
  });

  it("auto-mask no longer chains click segment to refine segment route", () => {
    const workspace = read("src/components/editor/editor-canvas-workspace.tsx");
    assert.match(workspace, /if \(strategy === "rembg"\)/);
  });

  it("workspace mode tabs are source of truth for panel visibility", () => {
    const modes = read("src/lib/editor-ux-v7-workspace.ts");
    assert.match(modes, /workspace tab is the source of truth/);
    assert.match(modes, /modeShowsExportHub/);
    assert.match(modes, /modeShowsPhotoEditObjectPanels/);
  });
});
