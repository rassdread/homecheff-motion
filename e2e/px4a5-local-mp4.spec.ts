import { readFileSync } from "node:fs";
import { join } from "node:path";
import { devices, expect, test, type Page } from "@playwright/test";

const BUNDLE = readFileSync(join(process.cwd(), "node_modules/mediabunny/dist/bundles/mediabunny.mjs"), "utf8");

type EncodeProbe = {
  userAgent: string;
  webCodecsPresent: boolean;
  codec: string | null;
  ok: boolean;
  bytes: number;
  hasFtyp: boolean;
  wallMs: number;
  error: string | null;
};

const PROBE_HTML = `<!doctype html>
<html><head><meta charset="utf-8"></head><body>
<canvas id="c" width="640" height="360"></canvas>
<script type="module">
import * as MB from "/mediabunny.mjs";
async function probe() {
  const started = performance.now();
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d", { alpha: false });
  const webCodecsPresent = typeof VideoEncoder !== "undefined";
  try {
    const codec = await MB.getFirstEncodableVideoCodec(["avc"], {
      width: 640,
      height: 360,
      quality: new MB.Quality({ bitrate: 1000000 }),
    });
    if (codec !== "avc") {
      return {
        userAgent: navigator.userAgent,
        webCodecsPresent,
        codec: codec || null,
        ok: false,
        bytes: 0,
        hasFtyp: false,
        wallMs: Math.round(performance.now() - started),
        error: "unsupported",
      };
    }
    const target = new MB.BufferTarget();
    const output = new MB.Output({
      format: new MB.Mp4OutputFormat({ fastStart: "in-memory" }),
      target,
    });
    const source = new MB.CanvasSource(canvas, {
      codec: "avc",
      quality: new MB.Quality({ bitrate: 1000000, bitrateMode: "variable" }),
      keyFrameInterval: 1,
    });
    output.addVideoTrack(source, { frameRate: 30 });
    await output.start();
    const fps = 30;
    for (let i = 0; i < fps; i += 1) {
      ctx.fillStyle = "#006D52";
      ctx.fillRect(0, 0, 640, 360);
      ctx.fillStyle = "#ffffff";
      ctx.font = "42px sans-serif";
      ctx.fillText("HomeCheff Studio", 36, 170);
      ctx.fillRect(24 + i * 8, 240, 36, 36);
      await source.add(i / fps, 1 / fps, i % 15 === 0 ? { keyFrame: true } : undefined);
    }
    source.close();
    await output.finalize();
    const buffer = target.buffer;
    const view = buffer ? new Uint8Array(buffer) : new Uint8Array();
    const hasFtyp =
      view.byteLength >= 12 &&
      String.fromCharCode(view[4], view[5], view[6], view[7]) === "ftyp";
    return {
      userAgent: navigator.userAgent,
      webCodecsPresent,
      codec,
      ok: hasFtyp && view.byteLength > 0,
      bytes: view.byteLength,
      hasFtyp,
      wallMs: Math.round(performance.now() - started),
      error: null,
    };
  } catch (err) {
    return {
      userAgent: navigator.userAgent,
      webCodecsPresent,
      codec: null,
      ok: false,
      bytes: 0,
      hasFtyp: false,
      wallMs: Math.round(performance.now() - started),
      error: err && err.message ? String(err.message) : String(err),
    };
  }
}
window.__px4a5Encode = probe;
</script>
</body></html>`;

async function runEncode(page: Page): Promise<EncodeProbe> {
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.endsWith("/mediabunny.mjs")) {
      await route.fulfill({
        status: 200,
        contentType: "text/javascript; charset=utf-8",
        body: BUNDLE,
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: PROBE_HTML,
    });
  });
  await page.goto("https://px4a5.local/probe.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => typeof (window as unknown as { __px4a5Encode?: unknown }).__px4a5Encode === "function"
  );
  return page.evaluate(() =>
    (
      window as unknown as { __px4a5Encode: () => Promise<EncodeProbe> }
    ).__px4a5Encode()
  );
}

test.describe("PX.4A.5 local H.264 MP4", () => {
  test("WebCodecs AVC muxes a non-empty MP4 with ftyp", async ({ page }, testInfo) => {
    const result = await runEncode(page);
    console.log(JSON.stringify({ project: testInfo.project.name, ...result }, null, 2));
    testInfo.attach("px4a5-encode.json", {
      body: Buffer.from(JSON.stringify(result, null, 2)),
      contentType: "application/json",
    });
    expect(result.webCodecsPresent).toBeTruthy();
    expect(result.ok).toBeTruthy();
    expect(result.hasFtyp).toBeTruthy();
    expect(result.bytes).toBeGreaterThan(1024);
    expect(result.codec).toBe("avc");
  });
});

test.describe("PX.4A.5 local H.264 MP4 — Chromium Android Pixel 5", () => {
  test.skip(({ browserName }) => browserName !== "chromium");

  test("Pixel 5 muxes a non-empty MP4", async ({ browser }, testInfo) => {
    const context = await browser.newContext({ ...devices["Pixel 5"] });
    const page = await context.newPage();
    const result = await runEncode(page);
    console.log(JSON.stringify({ project: testInfo.project.name, profile: "Pixel 5", ...result }, null, 2));
    expect(result.ok).toBeTruthy();
    expect(result.hasFtyp).toBeTruthy();
    expect(result.bytes).toBeGreaterThan(1024);
    await context.close();
  });
});
