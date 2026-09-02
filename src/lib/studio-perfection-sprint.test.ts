/**
 * Studio Product Perfection Sprint — regression guards for IA/trust closeouts.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildLegacyPrimaryNavItems } from "@/lib/homecheff-primary-nav-config";

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("studio perfection sprint IA", () => {
  it("legacy nav has single Studio entry and no Videos tab", () => {
    const legacy = buildLegacyPrimaryNavItems();
    const studioItems = legacy.filter((i) => i.href === "/studio");
    assert.equal(studioItems.length, 1);
    assert.equal(legacy.some((i) => i.href === "/videos"), false);
    assert.equal(legacy.some((i) => i.labelKey === "nav.myVideos"), false);
  });

  it("redirects /create and /videos list to canonical surfaces", () => {
    const config = read("next.config.ts");
    assert.match(config, /source: "\/create".*destination: "\/studio"/s);
    assert.match(config, /source: "\/videos".*destination: "\/projects"/s);
  });

  it("create page redirects to /studio", () => {
    const page = read("src/app/create/page.tsx");
    assert.match(page, /redirect\(["']\/studio["']\)/);
    assert.doesNotMatch(page, /MaakChoicePage/);
  });

  it("providers page is admin-gated on the server", () => {
    const page = read("src/app/studio/providers/page.tsx");
    assert.match(page, /canAccessAdmin/);
    assert.match(page, /redirect\(["']\/studio["']\)/);
    assert.doesNotMatch(page, /"use client"/);
  });

  it("language export uses beta de-emphasis wrapper in story workspace", () => {
    const panels = read("src/components/studio/studio-workspace-production-panels.tsx");
    assert.match(panels, /LanguageExportBetaSection/);
    assert.doesNotMatch(panels, /LanguageExportPanel/);
  });

  it("story music tool hides director panel unless advanced features", () => {
    const panel = read("src/components/studio/studio-workspace-tool-panel.tsx");
    assert.match(panel, /useStudioAdvancedFeatures/);
    assert.match(panel, /advancedFeatures \?\s*\n\s*<StudioMusicDirectorPanel/s);
  });

  it("QV signature transitions collapse on mobile", () => {
    const picker = read("src/components/photo-video/photo-video-transition-picker.tsx");
    assert.match(picker, /px4a-transition-group-signature-mobile/);
    assert.match(picker, /<details/);
  });

  it("pricing copy states subscriptions include monthly HC grants", () => {
    const nl = read("src/i18n/locales/nl.ts");
    const en = read("src/i18n/locales/en.ts");
    assert.match(nl, /maandelijkse HC voor Studio-acties/);
    assert.match(en, /monthly HC for Studio actions/);
    assert.doesNotMatch(nl, /geen gratis maandelijkse credits/);
    assert.doesNotMatch(en, /not free monthly credits/);
  });
});
