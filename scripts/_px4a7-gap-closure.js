const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PROFILE = path.resolve(".px4a7-prod-profile");
const OUT = path.resolve("docs/audits/px4a7-prod-cert");
const FIX = path.join(OUT, "fixtures");
fs.mkdirSync(OUT, { recursive: true });

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

async function run() {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    channel: "chrome",
    headless: true,
    locale: "nl-NL",
    acceptDownloads: true,
  });
  const page = ctx.pages()[0] || (await ctx.newPage());
  page.setDefaultTimeout(60000);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const photos = ["red", "green", "blue"].map((c) => path.join(FIX, `px4a7-photo-${c}.png`));
  const v10 = path.join(FIX, "px4a7-video-10s.mp4");
  const v5 = path.join(FIX, "px4a7-video-5s.mp4");
  const music = path.join(FIX, "px4a7-music-70s.mp3");

  async function openFresh() {
    await page.goto("https://studio.homecheff.eu/studio/photo-video", { waitUntil: "domcontentloaded" });
    if (await page.getByTestId("px4a-resume-fresh").count()) await page.getByTestId("px4a-resume-fresh").click();
    await wait(1000);
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
    await wait(600);
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

  // D1 D2 D3
  await openFresh();
  await addP(photos[0]);
  await addP(photos[1]);
  await addV(v10);
  await setDur(15);
  await clickVideo("first");
  await page.getByTestId("px4a-video-audio-on").click();
  await page.getByTestId("px4a-audio-none").click();
  report.D1 = probe(await exportAs("gap-audio-D1-source-on.mp4"));

  await clickVideo("first");
  await page.getByTestId("px4a-video-audio-off").click();
  report.D2 = probe(await exportAs("gap-audio-D2-source-off.mp4"));

  await clickVideo("first");
  await page.getByTestId("px4a-video-audio-on").click();
  await page.getByTestId("px4a-audio-own").click();
  await page.setInputFiles('[data-testid="px4a-audio-file"]', music);
  await wait(2000);
  report.musicWindow15 = await page.getByTestId("px4a-audio-window").getAttribute("aria-label");
  report.D3 = probe(await exportAs("gap-audio-D3-source-plus-music.mp4"));

  // D4 D5
  await openFresh();
  await addP(photos[0]);
  await addP(photos[1]);
  await addV(v10);
  await addV(v5);
  await setDur(30);
  await clickVideo("first");
  await page.getByTestId("px4a-video-audio-on").click();
  if (await page.getByTestId("px4a-video-volume").count()) await page.getByTestId("px4a-video-volume").fill("1");
  await clickVideo("last");
  await page.getByTestId("px4a-video-audio-off").click();
  await page.getByTestId("px4a-audio-own").click();
  await page.setInputFiles('[data-testid="px4a-audio-file"]', music);
  await wait(2000);
  report.musicWindow30 = await page.getByTestId("px4a-audio-window").getAttribute("aria-label");
  report.D4 = probe(await exportAs("gap-audio-D4-two-video-isolation.mp4"));

  await clickVideo("first");
  if (await page.getByTestId("px4a-video-volume").count()) await page.getByTestId("px4a-video-volume").fill("1");
  report.D5_vol100 = probe(await exportAs("gap-audio-D5-vol100.mp4"));

  await clickVideo("first");
  if (await page.getByTestId("px4a-video-volume").count()) await page.getByTestId("px4a-video-volume").fill("0.3");
  report.D5_vol30 = probe(await exportAs("gap-audio-D5-vol30.mp4"));

  await setDur(15);
  await wait(700);
  report.musicWindowBack15 = await page.getByTestId("px4a-audio-window").getAttribute("aria-label");

  // over-budget deterministic attempt
  await openFresh();
  await addP(photos[0]);
  await addV(v10);
  await addV(v10);
  await setDur(15);
  await wait(1000);
  report.overBudget = {
    text: await page.getByTestId("px4a-video-over-budget").textContent().catch(() => null),
    exportDisabled: await page.getByTestId("px4a-export-download").isDisabled(),
  };

  fs.writeFileSync(path.join(OUT, "gap-audio-overbudget.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await ctx.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
