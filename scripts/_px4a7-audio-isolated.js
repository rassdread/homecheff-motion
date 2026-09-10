const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PROFILE = path.resolve(".px4a7-prod-profile");
const OUT = path.resolve("docs/audits/px4a7-prod-cert");
const FIX = path.join(OUT, "fixtures");

function probe(file) {
  const j = JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration,size:stream=codec_type,codec_name", "-of", "json", file],
      { encoding: "utf8" }
    )
  );
  const v = (j.streams || []).find((s) => s.codec_type === "video");
  const a = (j.streams || []).find((s) => s.codec_type === "audio");
  return {
    duration: Number(j.format?.duration || 0),
    bytes: Number(j.format?.size || 0),
    videoCodec: v?.codec_name || null,
    audioCodec: a?.codec_name || null,
  };
}

function rmsWindow(file, start, end) {
  const filter = `atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS,astats=metadata=1:reset=1`;
  const out = execFileSync(
    "ffmpeg",
    ["-v", "error", "-i", file, "-af", filter, "-f", "null", "-"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  const lines = out.split(/\r?\n/).filter((l) => l.includes("RMS level dB"));
  const vals = lines
    .map((l) => Number((l.match(/RMS level dB:\s*(-?[0-9.]+)/) || [])[1]))
    .filter((n) => Number.isFinite(n));
  if (!vals.length) return null;
  vals.sort((a, b) => a - b);
  return vals[Math.floor(vals.length / 2)];
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    channel: "chrome",
    headless: true,
    locale: "nl-NL",
    acceptDownloads: true,
  });
  const page = ctx.pages()[0] || (await ctx.newPage());
  page.setDefaultTimeout(60000);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const photo = path.join(FIX, "px4a7-photo-red.png");
  const vA = path.join(FIX, "px4a7-video-10s.mp4");
  const vB = path.join(FIX, "px4a7-video-5s.mp4");
  const music = path.join(FIX, "px4a7-music-70s.mp3");

  async function openFresh() {
    await page.goto("https://studio.homecheff.eu/studio/photo-video", { waitUntil: "domcontentloaded" });
    if (await page.getByTestId("px4a-resume-fresh").count()) await page.getByTestId("px4a-resume-fresh").click();
    await wait(900);
  }
  async function addP(f) {
    await page.setInputFiles('[data-testid="px4a-file-input"]', f);
    await wait(2200);
  }
  async function addV(f) {
    await page.setInputFiles('[data-testid="px4a-video-input"]', f);
    await wait(4200);
  }
  async function setDur(sec) {
    const chips = page.locator('[data-testid="px4a-video-duration"] button');
    const n = await chips.count();
    for (let i = 0; i < n; i++) {
      const t = (await chips.nth(i).innerText()).trim();
      if (t.includes(String(sec))) {
        await chips.nth(i).click();
        await wait(300);
        return;
      }
    }
  }
  async function clickVideo(order) {
    const thumbs = page.locator('[data-testid^="px4a-video-thumb-"]');
    const n = await thumbs.count();
    if (!n) throw new Error("no video thumbs found");
    const target = order === "last" ? thumbs.nth(n - 1) : thumbs.first();
    const li = target.locator("xpath=ancestor::li[1]");
    await li.locator("button").first().click();
    await wait(500);
    await page.getByTestId("px4a-video-trim").waitFor({ timeout: 10000 });
  }
  async function exportAs(name) {
    await page.waitForFunction(() => {
      const b = document.querySelector('[data-testid="px4a-export-download"]');
      return b && !b.disabled;
    }, { timeout: 120000 });
    const [dl] = await Promise.all([
      page.waitForEvent("download", { timeout: 240000 }),
      page.getByTestId("px4a-export-download").click(),
    ]);
    const out = path.join(OUT, name);
    await dl.saveAs(out);
    return out;
  }

  const report = { at: new Date().toISOString() };

  // B1/B2/B3: isolated source volume
  await openFresh();
  await addP(photo);
  await addV(vA);
  await setDur(15);
  await page.getByTestId("px4a-audio-none").click();

  await clickVideo("first");
  await page.getByTestId("px4a-video-audio-on").click();
  if (await page.getByTestId("px4a-video-volume").count()) await page.getByTestId("px4a-video-volume").fill("1");
  const b1File = await exportAs("gap-b1-source-on-100.mp4");
  report.B1 = { file: b1File, ...probe(b1File) };

  await clickVideo("first");
  await page.getByTestId("px4a-video-audio-off").click();
  const b2File = await exportAs("gap-b2-source-off.mp4");
  report.B2 = { file: b2File, ...probe(b2File) };

  await clickVideo("first");
  await page.getByTestId("px4a-video-audio-on").click();
  if (await page.getByTestId("px4a-video-volume").count()) await page.getByTestId("px4a-video-volume").fill("0.3");
  const b3File = await exportAs("gap-b3-source-on-30.mp4");
  report.B3 = { file: b3File, ...probe(b3File) };
  report.B3_rms = {
    window: "2-8s",
    vol100: rmsWindow(b1File, 2, 8),
    vol30: rmsWindow(b3File, 2, 8),
  };

  // B4 own music only
  await clickVideo("first");
  await page.getByTestId("px4a-video-audio-off").click();
  await page.getByTestId("px4a-audio-own").click();
  await page.setInputFiles('[data-testid="px4a-audio-file"]', music);
  await wait(2000);
  report.musicWindow15 = await page.getByTestId("px4a-audio-window").getAttribute("aria-label");
  const b4File = await exportAs("gap-b4-own-music-only.mp4");
  report.B4 = { file: b4File, ...probe(b4File) };

  // B5 + two-video isolation
  await openFresh();
  await addP(photo);
  await addV(vA);
  await addV(vB);
  await setDur(30);
  await page.getByTestId("px4a-transition-cut").click().catch(() => undefined);
  await page.getByTestId("px4a-audio-own").click();
  await page.setInputFiles('[data-testid="px4a-audio-file"]', music);
  await wait(2000);
  report.musicWindow30 = await page.getByTestId("px4a-audio-window").getAttribute("aria-label");
  await clickVideo("first");
  await page.getByTestId("px4a-video-audio-on").click();
  await clickVideo("last");
  await page.getByTestId("px4a-video-audio-off").click();
  const b5File = await exportAs("gap-b5-music-plus-sourceA.mp4");
  report.B5 = { file: b5File, ...probe(b5File) };
  report.musicWindowBack15 = null;
  await setDur(15);
  await wait(600);
  report.musicWindowBack15 = await page.getByTestId("px4a-audio-window").getAttribute("aria-label");

  fs.writeFileSync(path.join(OUT, "gap-audio-isolated.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await ctx.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
