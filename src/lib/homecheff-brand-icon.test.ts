import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  HOMECHEFF_BRAND_ICON_PATHS,
  homeCheffSiteIcons,
  homeCheffWebManifestIcons,
} from "@/lib/homecheff-brand-icon";
import { HOMECHEFF_BRAND_ICON_CACHE_VERSION } from "@/lib/homecheff-brand-icon-version";

const ROOT = process.cwd();

describe("homecheff brand icon", () => {
  it("exposes globe-man SSOT path for metadata and shell", () => {
    assert.equal(HOMECHEFF_BRAND_ICON_PATHS.source, "/homecheff-globe-man.png");
    const icons = homeCheffSiteIcons();
    assert.ok(Array.isArray(icons.icon));
    assert.ok(Array.isArray(icons.apple));
  });

  it("generated public icon assets exist (no app/favicon.ico duplicate)", () => {
    for (const file of [
      "homecheff-globe-man.png",
      "favicon.ico",
      "favicon-16x16.png",
      "favicon-32x32.png",
      "apple-touch-icon.png",
      "site.webmanifest",
    ]) {
      assert.equal(existsSync(join(ROOT, "public", file)), true, `missing public/${file}`);
    }
    assert.equal(existsSync(join(ROOT, "src/app/favicon.ico")), false);
    assert.equal(existsSync(join(ROOT, "public/favicon.svg")), false);
  });

  it("metadata icons are versioned globe-man derivatives only", () => {
    const v = `?v=${HOMECHEFF_BRAND_ICON_CACHE_VERSION}`;
    const icons = homeCheffSiteIcons();
    const iconUrls = (icons.icon ?? []).map((entry) =>
      typeof entry === "string" ? entry : entry.url
    );
    assert.deepEqual(iconUrls, [
      `/favicon.ico${v}`,
      `/favicon-32x32.png${v}`,
      `/favicon-16x16.png${v}`,
    ]);
    assert.equal(icons.shortcut, `/favicon.ico${v}`);
    const apple = icons.apple ?? [];
    const appleUrl = typeof apple[0] === "string" ? apple[0] : apple[0]?.url;
    assert.equal(appleUrl, `/apple-touch-icon.png${v}`);
    assert.ok(!iconUrls.some((url) => url.includes(".svg")));
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

  it("public favicon.ico is derived from globe-man (not legacy triangle)", () => {
    const publicIco = readFileSync(join(ROOT, "public/favicon.ico"));
    assert.notEqual(publicIco.length, 25931, "legacy Create Next App triangle favicon must be replaced");
    const globeMan = readFileSync(join(ROOT, "public/homecheff-globe-man.png"));
    assert.notEqual(
      createHash("sha256").update(publicIco).digest("hex"),
      createHash("sha256").update(globeMan).digest("hex")
    );
  });

  it("layout relies on metadata icons only (no duplicate Safari head links)", () => {
    const layout = readFileSync(join(ROOT, "src/app/layout.tsx"), "utf8");
    assert.match(layout, /ROOT_SITE_METADATA/);
    assert.doesNotMatch(layout, /HomeCheffSafariIconLinks/);
    assert.doesNotMatch(layout, /<head>/);
  });

  it("app shell uses HomeCheffBrandMark", () => {
    const shell = join(ROOT, "src/components/layout/app-shell.tsx");
    const source = readFileSync(shell, "utf8");
    assert.match(source, /HomeCheffBrandMark/);
    assert.doesNotMatch(source, /accentGradient.*logoMark/s);
  });
});
