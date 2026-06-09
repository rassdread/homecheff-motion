import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("studio asset navigation", () => {
  it("includes Library nav item pointing to assets hub", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/homecheff-primary-nav-config.ts"),
      "utf8"
    );
    assert.match(src, /href: "\/studio\/assets"|resolveProductHref\("assets"\)/);
    assert.match(src, /authOnly: true/);
    assert.ok(/nav\.library|suite\.nav\.library/.test(src));
  });

  it("excludes /studio/assets from Studio nav active match", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/homecheff-primary-nav-config.ts"),
      "utf8"
    );
    assert.match(src, /!pathname\.startsWith\("\/studio\/assets"\)/);
  });

  it("routes videos section to media/videos under library hub", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/studio-asset-hub-sections.ts"), "utf8");
    assert.match(src, /\/studio\/assets\/media\/videos/);
    assert.match(src, /externalHref: "\/videos"/);
  });
});
