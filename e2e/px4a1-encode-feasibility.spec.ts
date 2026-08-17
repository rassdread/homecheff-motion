import { devices, expect, test, type Page } from "@playwright/test";
import {
  claimedRecorderMimes,
  isHomecheffListingVideoMime,
  planClientEncode,
  PHOTO_VIDEO_WECODECS_AVC_CONFIG,
} from "../src/lib/photo-video/encode-capability";

type ProbeResult = {
  userAgent: string;
  hasMediaRecorder: boolean;
  hasCaptureStream: boolean;
  claims: Array<{ mimeType: string; claimed: boolean }>;
  requestedMime: string | null;
  actualBlobMime: string | null;
  actualBlobSize: number;
  recordError: string | null;
  webCodecsPresent: boolean;
  webCodecsAvcSupported: boolean | null;
};

const PROBE_HTML = `<!doctype html>
<html><body>
<canvas id="c" width="320" height="180"></canvas>
<script>
async function probe() {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  const candidates = ${JSON.stringify(
    [
      'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4;codecs=avc1.42E01E",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ]
  )};
  const hasMediaRecorder = typeof MediaRecorder !== "undefined";
  const claims = candidates.map((mimeType) => {
    try {
      return { mimeType, claimed: hasMediaRecorder && MediaRecorder.isTypeSupported(mimeType) };
    } catch (e) {
      return { mimeType, claimed: false };
    }
  });
  const requestedMime = claims.find((row) => row.claimed)?.mimeType || null;
  let actualBlobMime = null;
  let actualBlobSize = 0;
  let recordError = null;
  const hasCaptureStream = typeof canvas.captureStream === "function";
  if (hasMediaRecorder && hasCaptureStream) {
    try {
      const stream = canvas.captureStream(30);
      const recorder = requestedMime
        ? new MediaRecorder(stream, { mimeType: requestedMime, videoBitsPerSecond: 800000 })
        : new MediaRecorder(stream, { videoBitsPerSecond: 800000 });
      const chunks = [];
      recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
      const stopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = () => reject(new Error("recorder error"));
      });
      recorder.start();
      const start = performance.now();
      await new Promise((resolve) => {
        function frame(now) {
          ctx.fillStyle = "#006D52";
          ctx.fillRect(0, 0, 320, 180);
          ctx.fillStyle = "#fff";
          ctx.fillRect((now / 8) % 280, 60, 40, 40);
          if (now - start < 1200) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
      if (typeof recorder.requestData === "function") {
        try { recorder.requestData(); } catch (e) {}
      }
      recorder.stop();
      await stopped;
      const blob = new Blob(chunks, { type: recorder.mimeType || requestedMime || "" });
      actualBlobMime = blob.type || recorder.mimeType || null;
      actualBlobSize = blob.size;
    } catch (err) {
      recordError = err && err.message ? String(err.message) : String(err);
    }
  }
  let webCodecsAvcSupported = null;
  const webCodecsPresent = typeof VideoEncoder !== "undefined";
  if (webCodecsPresent && VideoEncoder.isConfigSupported) {
    try {
      const support = await VideoEncoder.isConfigSupported(${JSON.stringify(PHOTO_VIDEO_WECODECS_AVC_CONFIG)});
      webCodecsAvcSupported = Boolean(support && support.supported);
    } catch (e) {
      webCodecsAvcSupported = false;
    }
  }
  return {
    userAgent: navigator.userAgent,
    hasMediaRecorder,
    hasCaptureStream,
    claims,
    requestedMime,
    actualBlobMime,
    actualBlobSize,
    recordError,
    webCodecsPresent,
    webCodecsAvcSupported,
  };
}
window.__px4a1Probe = probe;
</script>
</body></html>`;

async function runProbe(page: Page): Promise<ProbeResult> {
  await page.setContent(PROBE_HTML, { waitUntil: "domcontentloaded" });
  return page.evaluate(() => (window as unknown as { __px4a1Probe: () => Promise<ProbeResult> }).__px4a1Probe());
}

test.describe("PX.4A.1 encode feasibility", () => {
  test("records claimed MIME vs real canvas Blob", async ({ page }, testInfo) => {
    const result = await runProbe(page);
    const plan = planClientEncode({
      hasMediaRecorder: result.hasMediaRecorder,
      actualBlobMime: result.actualBlobMime,
      actualBlobSize: result.actualBlobSize,
      claimedMp4: result.claims.some(
        (row) => row.claimed && isHomecheffListingVideoMime(row.mimeType)
      ),
      webCodecsAvcSupported: result.webCodecsAvcSupported,
    });

    console.log(
      JSON.stringify(
        {
          project: testInfo.project.name,
          ...result,
          plan,
        },
        null,
        2
      )
    );

    expect(result.hasCaptureStream).toBeTruthy();
    expect(claimedRecorderMimes((type) => result.claims.find((row) => row.mimeType === type)?.claimed ?? false).length).toBe(
      result.claims.length
    );
    if (result.hasMediaRecorder && !result.recordError) {
      if (result.actualBlobSize === 0) {
        expect(result.webCodecsAvcSupported === true || Boolean(result.actualBlobMime)).toBeTruthy();
      } else {
        expect(result.actualBlobSize).toBeGreaterThan(0);
      }
    }
  });
});

test.describe("PX.4A.1 encode feasibility — Chromium Android Pixel 5 profile", () => {
  test.skip(({ browserName }) => browserName !== "chromium");

  test("Pixel 5 claimed vs real Blob", async ({ browser }, testInfo) => {
    const context = await browser.newContext({ ...devices["Pixel 5"] });
    const page = await context.newPage();
    const result = await runProbe(page);
    const plan = planClientEncode({
      hasMediaRecorder: result.hasMediaRecorder,
      actualBlobMime: result.actualBlobMime,
      actualBlobSize: result.actualBlobSize,
      claimedMp4: result.claims.some(
        (row) => row.claimed && isHomecheffListingVideoMime(row.mimeType)
      ),
      webCodecsAvcSupported: result.webCodecsAvcSupported,
    });
    console.log(
      JSON.stringify({ project: testInfo.project.name, profile: "Pixel 5", ...result, plan }, null, 2)
    );
    expect(result.hasMediaRecorder).toBeTruthy();
    await context.close();
  });
});
