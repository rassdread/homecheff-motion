import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { Px4a5CompositorResult } from "./px4a5-compositor-harness";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "e2e/.generated");
const HARNESS_JS = join(OUT_DIR, "px4a5-compositor.js");
const WATERMARK = readFileSync(join(ROOT, "public/homecheff-globe-man.png"));

function buildHarness(): string {
  mkdirSync(OUT_DIR, { recursive: true });
  execFileSync(
    join(ROOT, "node_modules/.bin/esbuild"),
    [
      "e2e/px4a5-compositor-harness.ts",
      "--bundle",
      "--format=esm",
      `--outfile=${HARNESS_JS}`,
      "--platform=browser",
      "--alias:@=./src",
    ],
    { cwd: ROOT, stdio: "pipe" }
  );
  return readFileSync(HARNESS_JS, "utf8");
}

async function runMode(page: Page, mode: "music" | "none"): Promise<Px4a5CompositorResult> {
  const harness = buildHarness();
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.endsWith("/homecheff-globe-man.png")) {
      await route.fulfill({ status: 200, contentType: "image/png", body: WATERMARK });
      return;
    }
    if (url.endsWith("/px4a5-compositor.js")) {
      await route.fulfill({
        status: 200,
        contentType: "text/javascript; charset=utf-8",
        body: harness,
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html><meta charset="utf-8"><script type="module">
import { runPx4a5CompositorExport } from "/px4a5-compositor.js";
window.__px4a5Full = runPx4a5CompositorExport;
</script>`,
    });
  });
  await page.goto("https://px4a5.local/compositor.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => typeof (window as unknown as { __px4a5Full?: unknown }).__px4a5Full === "function"
  );
  return page.evaluate(
    (chosen) =>
      (
        window as unknown as {
          __px4a5Full: (mode: "music" | "none") => Promise<Px4a5CompositorResult>;
        }
      ).__px4a5Full(chosen),
    mode
  );
}

test.describe("PX.4A.5 full compositor export", () => {
  test.setTimeout(180_000);
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === "mobile-webkit");
  });

  test("4 photos / 10s / text / movement / watermark / own music", async ({ page }, testInfo) => {
    const result = await runMode(page, "music");
    console.log(JSON.stringify({ project: testInfo.project.name, mode: "music", ...result }, null, 2));
    expect(result.ok).toBeTruthy();
    expect(result.hasFtyp).toBeTruthy();
    expect(result.bytes).toBeGreaterThan(20_000);
    expect(result.bytes).toBeLessThan(50 * 1024 * 1024);
    expect(result.durationSeconds).toBe(10);
    expect(result.decodedDuration ?? 0).toBeGreaterThan(9);
    expect(result.decodedDuration ?? 0).toBeLessThan(11.5);
    expect(result.videoCodec).toMatch(/avc|avc1/i);
    expect(result.audioCodec).toMatch(/aac/i);
    expect(result.framesDiffer).toBeTruthy();
  });

  test("4 photos / 10s / no music", async ({ page }, testInfo) => {
    const result = await runMode(page, "none");
    console.log(JSON.stringify({ project: testInfo.project.name, mode: "none", ...result }, null, 2));
    expect(result.ok).toBeTruthy();
    expect(result.hasFtyp).toBeTruthy();
    expect(result.bytes).toBeGreaterThan(20_000);
    expect(result.durationSeconds).toBe(10);
    expect(result.videoCodec).toMatch(/avc|avc1/i);
    expect(result.audioCodec).toBeNull();
    expect(result.framesDiffer).toBeTruthy();
  });
});
