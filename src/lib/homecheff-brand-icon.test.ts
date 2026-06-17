import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  HOMECHEFF_BRAND_ICON_PATHS,
  homeCheffSiteIcons,
} from "@/lib/homecheff-brand-icon";

const ROOT = process.cwd();

describe("homecheff brand icon", () => {
  it("exposes globe-man paths for metadata and shell", () => {
    assert.equal(HOMECHEFF_BRAND_ICON_PATHS.primary, "/homecheff-globe-man.png");
    const icons = homeCheffSiteIcons();
    assert.ok(Array.isArray(icons.icon));
    assert.ok(Array.isArray(icons.apple));
  });

  it("generated public icon assets exist", () => {
    for (const file of [
      "homecheff-globe-man.png",
      "favicon.ico",
      "favicon-16x16.png",
      "favicon-32x32.png",
      "favicon.svg",
      "apple-touch-icon.png",
      "site.webmanifest",
    ]) {
      assert.equal(existsSync(join(ROOT, "public", file)), true, `missing public/${file}`);
    }
  });

  it("app favicon.ico matches public globe-man generated favicon", () => {
    const appPath = join(ROOT, "src/app/favicon.ico");
    assert.equal(existsSync(appPath), true, "missing src/app/favicon.ico");
    const publicIco = readFileSync(join(ROOT, "public/favicon.ico"));
    const appIco = readFileSync(appPath);
    assert.equal(
      createHash("sha256").update(appIco).digest("hex"),
      createHash("sha256").update(publicIco).digest("hex"),
      "src/app/favicon.ico must match public/favicon.ico (Next.js serves app/ over public/)"
    );
    assert.notEqual(appIco.length, 25931, "legacy Create Next App triangle favicon must be replaced");
  });

  it("metadata icons use Safari cache-busted globe-man URLs", () => {
    const icons = homeCheffSiteIcons();
    const iconUrls = (icons.icon ?? []).map((entry) =>
      typeof entry === "string" ? entry : entry.url
    );
    assert.ok(iconUrls.some((url) => url === "/favicon-32x32.png?v=2"));
    assert.equal(icons.shortcut, "/favicon.ico?v=2");
    const apple = icons.apple ?? [];
    const appleUrl = typeof apple[0] === "string" ? apple[0] : apple[0]?.url;
    assert.equal(appleUrl, "/apple-touch-icon.png?v=2");
  });

  it("layout emits explicit Safari icon links", () => {
    const layout = readFileSync(join(ROOT, "src/app/layout.tsx"), "utf8");
    assert.match(layout, /HomeCheffSafariIconLinks/);
    const links = readFileSync(
      join(ROOT, "src/components/brand/homecheff-safari-icon-links.tsx"),
      "utf8"
    );
    assert.match(links, /HOMECHEFF_SAFARI_ICON_URLS\.faviconIco/);
    assert.match(links, /HOMECHEFF_SAFARI_ICON_URLS\.favicon32/);
    assert.match(links, /HOMECHEFF_SAFARI_ICON_URLS\.appleTouchIcon/);
  });

  it("app shell uses HomeCheffBrandMark", () => {
    const shell = join(ROOT, "src/components/layout/app-shell.tsx");
    const source = readFileSync(shell, "utf8");
    assert.match(source, /HomeCheffBrandMark/);
    assert.doesNotMatch(source, /accentGradient.*logoMark/s);
  });
});
