import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  HOMECHEFF_BRAND_ICON_PATHS,
  HOMECHEFF_STATIC_ICON_PATHS,
  homeCheffSiteIcons,
  homeCheffWebManifestIcons,
} from "@/lib/homecheff-brand-icon";

const ROOT = process.cwd();

describe("homecheff brand icon", () => {
  it("exposes globe-man SSOT path for metadata and shell", () => {
    assert.equal(HOMECHEFF_BRAND_ICON_PATHS.source, "/homecheff-globe-man.png");
    const icons = homeCheffSiteIcons();
    assert.ok(icons.icon);
    assert.ok(icons.apple);
  });

  it("apple-touch-icon route serves versioned PNG", () => {
    const route = join(ROOT, "src/app/apple-touch-icon.png/route.ts");
    assert.equal(existsSync(route), true);
    assert.equal(existsSync(join(ROOT, "public/apple-touch-icon.png")), false);
  });

  it("favicon.ico route serves PNG with correct MIME (not public/static)", () => {
    const route = join(ROOT, "src/app/favicon.ico/route.ts");
    assert.equal(existsSync(route), true);
    assert.equal(existsSync(join(ROOT, "public/favicon.ico")), false);
    const source = readFileSync(route, "utf8");
    assert.match(source, /image\/png/);
    assert.match(source, /HOMECHEFF_BRAND_ICON_PATHS\.favicon32/);
  });

  it("static public favicon assets exist (no src/app icon convention)", () => {
    for (const file of [
      "homecheff-globe-man.png",
      "icon.png",
      "homecheff-favicon-16-v10.png",
      "homecheff-favicon-32-v10.png",
      "homecheff-apple-touch-icon-v10.png",
      "site.webmanifest",
    ]) {
      assert.equal(existsSync(join(ROOT, "public", file)), true, `missing public/${file}`);
    }
    for (const file of [
      "favicon.ico",
      "apple-touch-icon.png",
      "homecheff-favicon-v4.ico",
      "homecheff-favicon-32-v6.png",
      "brand/homecheff-logo.svg",
      "brand/garden-chef-mascot.svg",
    ]) {
      assert.equal(existsSync(join(ROOT, "public", file)), false, `removed asset still present: public/${file}`);
    }
    for (const file of ["icon.png", "apple-icon.png"]) {
      assert.equal(existsSync(join(ROOT, "src/app", file)), false, `src/app/${file} must not exist`);
    }
    assert.equal(existsSync(join(ROOT, "src/app/favicon.ico/route.ts")), true);
    assert.equal(existsSync(join(ROOT, "public/favicon.svg")), false);
  });

  it("metadata icons use PNG-first paths without query strings (Safari)", () => {
    const icons = homeCheffSiteIcons();
    assert.ok(Array.isArray(icons.icon));
    const iconList = icons.icon as Array<{ url: string; type?: string }>;
    assert.equal(iconList[0]?.type, "image/png");
    assert.equal(iconList[0]?.url, "/homecheff-favicon-32-v10.png");
    assert.equal(icons.shortcut, "/homecheff-favicon-32-v10.png");
    const apple = icons.apple;
    const appleUrl = typeof apple === "string" ? apple : apple?.url;
    assert.equal(appleUrl, "/homecheff-apple-touch-icon-v10.png");
    for (const entry of iconList) {
      assert.ok(!entry.url.includes("?"), `query string breaks Safari: ${entry.url}`);
    }
  });

  it("layout declares static favicon links for Safari (no JS favicon sync)", () => {
    const layout = readFileSync(join(ROOT, "src/app/layout.tsx"), "utf8");
    assert.match(layout, /ROOT_SITE_METADATA/);
    assert.match(layout, /rel="icon"/);
    assert.match(layout, /HOMECHEFF_BRAND_ICON_PATHS\.favicon32/);
    assert.doesNotMatch(layout, /HomeCheffFaviconSync/);
  });

  it("site.webmanifest icons match runtime manifest helper", () => {
    const manifest = JSON.parse(
      readFileSync(join(ROOT, "public/site.webmanifest"), "utf8")
    ) as { icons: Array<{ src: string }> };
    const expected = homeCheffWebManifestIcons().map((icon) => icon.src);
    assert.deepEqual(
      manifest.icons.map((icon: { src: string }) => icon.src),
      expected
    );
  });

  it("app shell uses HomeCheffBrandMark", () => {
    const shell = join(ROOT, "src/components/layout/app-shell.tsx");
    const source = readFileSync(shell, "utf8");
    assert.match(source, /HomeCheffBrandMark/);
    assert.doesNotMatch(source, /accentGradient.*logoMark/s);
  });
});
