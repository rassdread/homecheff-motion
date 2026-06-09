import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("studio asset navigation", () => {
  it("includes Assets nav item pointing to /studio/assets", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/layout/app-shell-primary-nav.tsx"),
      "utf8"
    );
    assert.match(src, /href: "\/studio\/assets"/);
    assert.match(src, /labelKey: "nav\.assets"/);
    assert.match(src, /authOnly: true/);
  });

  it("excludes /studio/assets from Studio nav active match", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/layout/app-shell-primary-nav.tsx"),
      "utf8"
    );
    assert.match(src, /!pathname\.startsWith\("\/studio\/assets"\)/);
  });

  it("routes videos section to media/videos under assets hub", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/studio-asset-hub-sections.ts"), "utf8");
    assert.match(src, /\/studio\/assets\/media\/videos/);
    assert.match(src, /externalHref: "\/videos"/);
  });
});
