import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { getAllowedApiOrigins } from "@/lib/allowed-api-origins";
import {
  HOMECHEFF_BRAND_ICON_PATHS,
  homeCheffSiteIcons,
} from "@/lib/homecheff-brand-icon";
import {
  getCanonicalStudioOrigin,
  LEGACY_MOTION_ORIGIN,
  OFFICIAL_STUDIO_ORIGIN,
} from "@/lib/public-origin";
import { absoluteUrl } from "@/lib/seo/site-metadata";

const ROOT = process.cwd();

describe("HomeCheff Studio domain migration", () => {
  it("official studio origin is studio.homecheff.eu", () => {
    assert.equal(OFFICIAL_STUDIO_ORIGIN, "https://studio.homecheff.eu");
    assert.equal(getCanonicalStudioOrigin(), OFFICIAL_STUDIO_ORIGIN);
  });

  it("next.config permanently redirects motion host to studio host", () => {
    const next = readFileSync(join(ROOT, "next.config.ts"), "utf8");
    assert.match(next, /motion\.homecheff\.eu/);
    assert.match(next, /studio\.homecheff\.eu\/:path\*/);
    assert.match(next, /permanent:\s*true/);
  });

  it("allowed API origins include studio and legacy motion during transition", () => {
    const origins = getAllowedApiOrigins();
    assert.ok(origins.includes(OFFICIAL_STUDIO_ORIGIN));
    assert.ok(origins.includes(LEGACY_MOTION_ORIGIN));
  });

  it("metadata and sitemap fall back to studio.homecheff.eu", () => {
    const prevApp = process.env.NEXT_PUBLIC_APP_URL;
    const prevStudio = process.env.NEXT_PUBLIC_STUDIO_URL;
    const prevVercel = process.env.VERCEL_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_STUDIO_URL;
    delete process.env.VERCEL_URL;
    try {
      assert.equal(absoluteUrl("/pricing"), "https://studio.homecheff.eu/pricing");
    } finally {
      if (prevApp !== undefined) process.env.NEXT_PUBLIC_APP_URL = prevApp;
      if (prevStudio !== undefined) process.env.NEXT_PUBLIC_STUDIO_URL = prevStudio;
      if (prevVercel !== undefined) process.env.VERCEL_URL = prevVercel;
    }
  });

  it("root layout wires brand icons globally", () => {
    const layout = readFileSync(join(ROOT, "src/app/layout.tsx"), "utf8");
    assert.match(layout, /ROOT_SITE_METADATA/);
    const icons = homeCheffSiteIcons();
    assert.ok(Array.isArray(icons.icon));
    assert.ok(Array.isArray(icons.apple));
  });

  it("globe-man brand icon assets exist", () => {
    for (const file of [
      "homecheff-globe-man.png",
      "favicon.ico",
      "favicon-16x16.png",
      "favicon-32x32.png",
      "apple-touch-icon.png",
      "favicon.svg",
      "site.webmanifest",
    ]) {
      assert.equal(existsSync(join(ROOT, "public", file)), true, `missing public/${file}`);
    }
    assert.equal(HOMECHEFF_BRAND_ICON_PATHS.primary, "/homecheff-globe-man.png");
  });

  it("app shell uses HomeCheffBrandMark not gradient placeholder", () => {
    const shell = readFileSync(join(ROOT, "src/components/layout/app-shell.tsx"), "utf8");
    assert.match(shell, /HomeCheffBrandMark/);
    assert.doesNotMatch(shell, /accentGradient/);
  });

  it("suite nav keeps Verbruik out of primary nav", () => {
    const nav = readFileSync(join(ROOT, "src/lib/homecheff-primary-nav-config.ts"), "utf8");
    const suite = readFileSync(join(ROOT, "src/components/layout/app-shell-primary-nav.tsx"), "utf8");
    assert.doesNotMatch(nav, /href:\s*"\/usage"/);
    assert.doesNotMatch(suite, /\/usage/);
    const userBar = readFileSync(join(ROOT, "src/components/layout/app-shell-user-bar.tsx"), "utf8");
    assert.match(userBar, /\/usage/);
  });

  it("placeholder favicons are not referenced in runtime code", () => {
    const sources = [
      "src/app/layout.tsx",
      "src/lib/seo/site-metadata.ts",
      "src/lib/homecheff-brand-icon.ts",
      "public/site.webmanifest",
    ];
    for (const file of sources) {
      const text = readFileSync(join(ROOT, file), "utf8");
      assert.doesNotMatch(text, /\/globe\.svg/);
      assert.doesNotMatch(text, /\/next\.svg/);
      assert.doesNotMatch(text, /\/vercel\.svg/);
      assert.doesNotMatch(text, /\/window\.svg/);
    }
  });
});
