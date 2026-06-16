import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  LIBRARY_DARK_SURFACE_CONTRAST,
  libraryFilterChipClasses,
  studioLibraryVisual,
} from "@/lib/studio-library-visual";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";

const ROOT = process.cwd();

const LIBRARY_ROUTE_FILES = [
  "src/app/library/page.tsx",
  "src/app/studio/assets/page.tsx",
  "src/app/studio/assets/browse/page.tsx",
  "src/components/studio/studio-assets-hub.tsx",
  "src/components/studio/studio-assets-hub-section.tsx",
  "src/components/studio/studio-library-consistency-browse.tsx",
  "src/components/studio/studio-asset-library.tsx",
  "src/components/studio/studio-library-page-hero.tsx",
  "src/components/studio/studio-library-recent-section.tsx",
  "src/components/suite/studio-product-landing-page.tsx",
  "src/components/suite/studio-page-intro.tsx",
  "src/components/suite/service-landing-nav.tsx",
] as const;

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

/** Relative luminance → contrast ratio (WCAG). */
function contrastRatio(hex1: string, hex2: string): number {
  function lum(hex: string) {
    const n = parseInt(hex.slice(1), 16);
    const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
  }
  const l1 = lum(hex1);
  const l2 = lum(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("studio library contrast — design tokens", () => {
  it("documents WCAG AA pairs for dark Studio surfaces", () => {
    for (const pair of Object.values(LIBRARY_DARK_SURFACE_CONTRAST)) {
      const ratio = contrastRatio(pair.fg, pair.bg);
      assert.ok(
        ratio >= pair.minRatio,
        `${pair.fg} on ${pair.bg} = ${ratio.toFixed(2)} (need ${pair.minRatio})`
      );
    }
  });

  it("filter chips use white background and slate-900 text when unselected", () => {
    assert.match(studioLibraryVisual.filterChip, /bg-white/);
    assert.match(studioLibraryVisual.filterChip, /text-slate-900/);
    assert.match(studioLibraryVisual.filterChip, /hover:text-slate-950/);
    assert.match(libraryFilterChipClasses(false), /text-slate-900/);
    assert.match(libraryFilterChipClasses(true), /navActive|from-\[#006D52\]/);
  });

  it("hero tokens match required hierarchy", () => {
    assert.match(studioLibraryVisual.heroBreadcrumb, /text-slate-300/);
    assert.match(studioLibraryVisual.heroBackLink, /text-green-300/);
    assert.match(studioLibraryVisual.heroTitle, /text-white/);
    assert.match(studioLibraryVisual.heroDescription, /text-slate-300/);
    assert.match(studioLibraryVisual.sectionTitle, /text-white/);
  });

  it("form controls use readable light surfaces on dark pages", () => {
    assert.match(studioLibraryVisual.formControl, /bg-white/);
    assert.match(studioLibraryVisual.formControl, /text-slate-900/);
    assert.match(studioLibraryVisual.formControlWide, /placeholder:text-slate-500/);
  });
});

describe("studio library contrast — route implementation", () => {
  for (const file of LIBRARY_ROUTE_FILES) {
    it(`${file} avoids dark text on studio-page-bg without light panel`, () => {
      const source = read(file);
      if (!source.includes("studio-page-bg") && !source.includes("studioLibraryVisual.pageMain")) {
        return;
      }
      assert.doesNotMatch(
        source,
        /text-slate-900[\s\S]{0,80}studio-page-bg/,
        `${file} must not pair text-slate-900 with page background`
      );
    });
  }

  it("browse page uses StudioLibraryPageHero and library tokens", () => {
    const browse = read("src/components/studio/studio-library-consistency-browse.tsx");
    assert.match(browse, /StudioLibraryPageHero/);
    assert.match(browse, /libraryFilterChipClasses/);
    assert.match(browse, /studioLibraryVisual\.pageMain/);
    assert.doesNotMatch(browse, /text-slate-900/);
  });

  it("asset library uses filter chip tokens and data-testid tabs", () => {
    const lib = read("src/components/studio/studio-asset-library.tsx");
    assert.match(lib, /libraryFilterChipClasses/);
    assert.match(lib, /data-testid="studio-asset-library-tabs"/);
    assert.match(lib, /studioLibraryVisual\.formControl/);
    assert.doesNotMatch(lib, /text-slate-700 ring-1 ring-slate-200/);
  });

  it("hub section uses breadcrumb hero on dark background", () => {
    const section = read("src/components/studio/studio-assets-hub-section.tsx");
    assert.match(section, /StudioLibraryPageHero/);
    assert.match(section, /suite\.breadcrumb\.library/);
    assert.match(section, /studioLibraryVisual\.pageMain/);
  });

  it("assets hub uses light panels for grouped sections", () => {
    const hub = read("src/components/studio/studio-assets-hub.tsx");
    assert.match(hub, /studioLibraryVisual\.lightPanel/);
    assert.match(hub, /studioLibraryVisual\.heroTitleLarge/);
  });

  it("library card clamps titles to two lines", () => {
    const card = read("src/components/studio/studio-library-card.tsx");
    assert.match(card, /line-clamp-2/);
    assert.match(card, /text-zinc-900/);
  });

  it("landing intro uses readable hierarchy on dark Studio pages", () => {
    const intro = read("src/components/suite/studio-page-intro.tsx");
    const nav = read("src/components/suite/service-landing-nav.tsx");
    assert.match(intro, /text-slate-300/);
    assert.match(intro, /headingOnDark/);
    assert.match(nav, /text-green-300/);
    assert.match(nav, /text-slate-300/);
  });

  it("library route pages use scroll-safe pageMain token", () => {
    for (const path of [
      "src/components/studio/studio-assets-hub.tsx",
      "src/components/studio/studio-library-consistency-browse.tsx",
      "src/components/studio/studio-assets-hub-section.tsx",
    ]) {
      assert.match(read(path), /studioLibraryVisual\.pageMain/);
    }
  });
});

describe("studio library contrast — i18n", () => {
  const keys = [
    "studio.mediaAsset.tab.all",
    "studio.mediaAsset.tab.favorites",
    "studio.mediaAsset.tab.recent",
    "studio.mediaAsset.tab.character",
    "studio.mediaAsset.tab.prop",
    "studio.mediaAsset.tab.location",
    "studio.mediaAsset.tab.world",
    "studio.mediaAsset.tab.reference_image",
    "library.consistency.browse.tab.recent",
    "studio.assetsHub.title",
    "suite.pageIntro.library.description",
  ] as const;

  for (const key of keys) {
    it(`NL and EN have copy for ${key}`, () => {
      assert.ok(nl[key as keyof typeof nl]?.length, `nl missing ${key}`);
      assert.ok(en[key as keyof typeof en]?.length, `en missing ${key}`);
    });
  }
});
