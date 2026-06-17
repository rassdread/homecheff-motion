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

const ROOT = process.cwd();

describe("homecheff brand icon", () => {
  it("exposes globe-man SSOT path for metadata and shell", () => {
    assert.equal(HOMECHEFF_BRAND_ICON_PATHS.source, "/homecheff-globe-man.png");
    const icons = homeCheffSiteIcons();
    assert.ok(Array.isArray(icons.icon));
    assert.ok(Array.isArray(icons.apple));
  });

  it("generated v4 public icon assets exist (no query-param cache bust)", () => {
    for (const file of [
      "homecheff-globe-man.png",
      "homecheff-favicon-v4.ico",
      "homecheff-favicon-16-v4.png",
      "homecheff-favicon-32-v4.png",
      "homecheff-apple-touch-icon-v4.png",
      "favicon.ico",
      "site.webmanifest",
    ]) {
      assert.equal(existsSync(join(ROOT, "public", file)), true, `missing public/${file}`);
    }
    assert.equal(existsSync(join(ROOT, "src/app/favicon.ico")), false);
    assert.equal(existsSync(join(ROOT, "public/favicon.svg")), false);
  });

  it("metadata icons use v4 filenames with PNG before ICO", () => {
    const icons = homeCheffSiteIcons();
    const iconUrls = (icons.icon ?? []).map((entry) =>
      typeof entry === "string" ? entry : entry.url
    );
    assert.deepEqual(iconUrls, [
      "/homecheff-favicon-32-v4.png",
      "/homecheff-favicon-16-v4.png",
      "/homecheff-favicon-v4.ico",
      "/favicon.ico",
    ]);
    assert.equal(icons.shortcut, "/homecheff-favicon-v4.ico");
    const apple = icons.apple ?? [];
    const appleUrl = typeof apple[0] === "string" ? apple[0] : apple[0]?.url;
    assert.equal(appleUrl, "/homecheff-apple-touch-icon-v4.png");
    assert.ok(!iconUrls.some((url) => url.includes("?v=")));
    assert.ok(!iconUrls.some((url) => url.includes(".svg")));
  });

  it("v4 favicon bytes match globe-man derivatives", () => {
    const v4Ico = readFileSync(join(ROOT, "public/homecheff-favicon-v4.ico"));
    const legacyIco = readFileSync(join(ROOT, "public/favicon.ico"));
    assert.equal(
      createHash("sha256").update(v4Ico).digest("hex"),
      createHash("sha256").update(legacyIco).digest("hex")
    );
    const v4Png = readFileSync(join(ROOT, "public/homecheff-favicon-32-v4.png"));
    const legacyPng = readFileSync(join(ROOT, "public/favicon-32x32.png"));
    assert.equal(
      createHash("sha256").update(v4Png).digest("hex"),
      createHash("sha256").update(legacyPng).digest("hex")
    );
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
    assert.ok(!manifest.icons.some((icon: { src: string }) => icon.src.includes("?v=")));
  });

  it("layout relies on metadata icons only (no duplicate head links)", () => {
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
