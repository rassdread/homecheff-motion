import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { brand } from "@/lib/brand";
import { studioVisual, STUDIO_COLORS } from "@/lib/studio-visual-tokens";

describe("studio visual system", () => {
  it("defines HomeCheff brand colors", () => {
    assert.equal(STUDIO_COLORS.green, "#006D52");
    assert.equal(STUDIO_COLORS.blue, "#0067B1");
    assert.equal(brand.studioGreen, STUDIO_COLORS.green);
    assert.equal(brand.studioBlue, STUDIO_COLORS.blue);
  });

  it("uses cinematic page background for product routes", () => {
    assert.match(brand.softGradientBg, /studio-page-bg/);
  });

  it("app shell uses dark glass header", () => {
    const chrome = readFileSync("src/components/layout/app-shell-chrome.tsx", "utf8");
    assert.match(chrome, /studioVisual\.header/);
    assert.doesNotMatch(chrome, /border-emerald-100 bg-white/);
  });

  it("primary nav uses gradient active state", () => {
    const nav = readFileSync("src/components/layout/app-shell-primary-nav.tsx", "utf8");
    assert.match(nav, /studioVisual\.navActive/);
    assert.match(nav, /studioVisual\.navInactive/);
  });

  it("app card supports light glass variant", () => {
    const card = readFileSync("src/components/ui/app-card.tsx", "utf8");
    assert.match(card, /variant/);
    assert.match(card, /studioVisual\.cardLight/);
  });

  it("gradient button supports primary and secondary variants", () => {
    const btn = readFileSync("src/components/ui/gradient-button.tsx", "utf8");
    assert.match(btn, /GradientButtonVariant/);
    assert.match(btn, /studioVisual\.btnGradientPrimary/);
    assert.match(btn, /studioVisual\.btnOutline/);
  });

  it("editor v2 shell uses studio surface tokens", () => {
    const editor = readFileSync("src/components/editor/editor-v2-workflow-shell.tsx", "utf8");
    assert.match(editor, /studioVisual\.editorSurface/);
    const menu = readFileSync("src/components/editor/editor-menu.tsx", "utf8");
    assert.match(menu, /studioVisual\.editorSurface/);
  });

  it("globals imports studio visual system css", () => {
    const globals = readFileSync("src/app/globals.css", "utf8");
    const tokens = readFileSync("src/app/studio-visual-system.css", "utf8");
    assert.match(globals, /studio-visual-system\.css/);
    assert.match(tokens, /--studio-green/);
  });
});
