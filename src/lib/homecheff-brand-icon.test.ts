import assert from "node:assert/strict";
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

  it("app shell uses HomeCheffBrandMark", () => {
    const shell = join(ROOT, "src/components/layout/app-shell.tsx");
    const source = readFileSync(shell, "utf8");
    assert.match(source, /HomeCheffBrandMark/);
    assert.doesNotMatch(source, /accentGradient.*logoMark/s);
  });
});
