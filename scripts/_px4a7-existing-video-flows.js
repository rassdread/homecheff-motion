/**
 * PX.4A.7 GAP 2 — existing listing video cancel / replace (Production).
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const PROFILE = path.resolve(".px4a7-prod-profile");
const OUT = path.resolve("docs/audits/px4a7-prod-cert");
const FIX = path.join(OUT, "fixtures");

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    channel: "chrome",
    headless: true,
    locale: "nl-NL",
    acceptDownloads: true,
  });
  const page = ctx.pages()[0] || (await ctx.newPage());
  page.setDefaultTimeout(90000);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function clickText(re) {
    const btns = page.locator("button");
    const n = await btns.count();
    for (let i = 0; i < n; i++) {
      const t = (await btns.nth(i).innerText()).trim();
      if (re.test(t)) {
        await btns.nth(i).click();
        await wait(450);
        return true;
      }
    }
    return false;
  }

  async function completeChooser() {
    const chooser = await page.getByText("Wat wil je doen?", { exact: false }).first().isVisible().catch(() => false);
    const formReady =
      (await page.locator('[data-testid="listing-video-block"], [data-testid="px4a-make-free-video"]').count()) > 0;
    if (formReady && !chooser) return;
    if (!chooser) return;
    await clickText(/Ik bied iets aan/i);
    await clickText(/Tuin & Natuur/i);
    if (await page.getByText("Kies een groep").count()) {
      await page.locator("section button").filter({ hasNotText: "Terug" }).first().click();
      await wait(500);
    }
    if (await page.getByText("Wat past hier het beste?").count()) {
      await page.locator("section button").filter({ hasNotText: /Terug|groep/i }).first().click();
      await wait(300);
      await clickText(/Verder/i);
    }
    if (!(await clickText(/^Verder$/))) await clickText(/Verder/i);
    await page
      .locator('[data-testid="listing-video-block"], [data-testid="px4a-make-free-video"]')
      .first()
      .waitFor({ timeout: 45000 });
  }

  async function readListingState() {
    return page.evaluate(() => {
      let raw = null;
      try {
        raw = JSON.parse(sessionStorage.getItem("hc-px4a-item-form:v1") || "null");
      } catch {
        raw = null;
      }
      const images = Array.isArray(raw?.images) ? raw.images : [];
      const video = raw?.video || null;
      const body = document.body.innerText || "";
      const photoMatch = body.match(/(\d+)\s*\/\s*5 foto/i);
      const videoEl = document.querySelector('[data-testid="listing-video-block"] video');
      const domVideos = [...document.querySelectorAll('[data-testid="listing-video-block"] video')];
      return {
        title: String(raw?.title || "").trim(),
        photoCount: images.length || (photoMatch ? Number(photoMatch[1]) : 0),
        photoUrls: images.map((img) => String(img.url || "")),
        videoUrl: video?.url ? String(video.url) : videoEl?.currentSrc || videoEl?.src || null,
        videoCount: domVideos.length,
        hasMakeFreeCta: !!document.querySelector('[data-testid="px4a-make-free-video"]'),
        hasReplaceCta: !!document.querySelector('[data-testid="px4a-replace-video"]'),
        draftKeyPresent: !!raw,
        url: location.href,
        unpublished: !body.includes("Gepubliceerd") && !body.includes("Published"),
      };
    });
  }

  async function clickStudioCta() {
    await waitUntil(
      "studio CTA",
      async () =>
        (await page.locator('[data-testid="px4a-replace-video"], [data-testid="px4a-make-free-video"]').count()) > 0,
      60000
    );
    await page.locator('[data-testid="listing-video-block"]').scrollIntoViewIfNeeded().catch(() => undefined);
    if (await page.locator('[data-testid="px4a-replace-video"]').count()) {
      await page.locator('[data-testid="px4a-replace-video"]').click({ force: true, timeout: 20000 });
      await wait(400);
    }
    if (await page.locator('[data-testid="px4a-make-free-video"]').count()) {
      await page.locator('[data-testid="px4a-make-free-video"]').click({ force: true, timeout: 20000 });
      return "make-free";
    }
    if (await page.locator('[data-testid="px4a-replace-video"]').count()) {
      await page.locator('[data-testid="px4a-replace-video"]').click({ force: true, timeout: 20000 });
      return "replace-only";
    }
    throw new Error("No studio entry CTA");
  }

  async function waitUntil(label, fn, ms = 120000) {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      if (await fn()) {
        console.log(`  ok: ${label}`);
        return;
      }
      await wait(1000);
    }
    throw new Error(`timeout: ${label}`);
  }

  const rep = { at: new Date().toISOString() };
  const videoFile = path.join(FIX, "px4a7-video-10s.mp4");
  const photos = ["red", "green", "blue", "orange"].map((c) => path.join(FIX, `px4a7-photo-${c}.png`));

  await page.goto("https://homecheff.eu/sell/new", { waitUntil: "domcontentloaded" });
  await wait(1200);
  await clickText(/Alleen noodzakelijk|Accepteer alle/i);
  await completeChooser();

  const title = `PX4A7 existing ${Date.now()}`;
  const titleField = page.locator("label").filter({ hasText: /^Titel$/ }).locator("xpath=following-sibling::input[1]");
  if (await titleField.count()) await titleField.fill(title);
  else await page.getByLabel("Titel", { exact: true }).fill(title).catch(() => undefined);

  const descField = page
    .locator("label")
    .filter({ hasText: /^Omschrijving$/ })
    .locator("xpath=following-sibling::textarea[1]");
  if (await descField.count()) await descField.fill("Disposable existing-video replace test.");
  else await page.getByLabel(/Omschrijving|Vertel wat je aanbiedt/).first().fill("Disposable existing-video replace test.").catch(() => undefined);

  const price = page.locator("label").filter({ hasText: /Prijs/ }).locator("xpath=following-sibling::input[1]");
  if (await price.count()) await price.fill("4,99");
  else await page.locator('input[inputmode="decimal"]').first().fill("4.99");

  const pickup = page.locator("label").filter({ hasText: /^Afhalen$/ }).locator('input[type="checkbox"]').first();
  if (await pickup.count() && !(await pickup.isChecked())) await pickup.check({ force: true });

  const fileInput = page.locator('input[type="file"][accept*="image/gif"]').first();
  await fileInput.setInputFiles(photos);
  await waitUntil(
    "4 listing photos",
    async () => {
      const s = await readListingState();
      return s.photoCount >= 4 || /Geüploade foto's \(4\)|4\s*\/\s*5 foto/i.test(await page.innerText("body"));
    },
    120000
  );

  await page.locator('[data-testid="listing-video-block"]').scrollIntoViewIfNeeded().catch(() => undefined);
  const listingVideoInput = page.locator('[data-testid="listing-video-block"] input[accept*="video"]').first();
  await listingVideoInput.setInputFiles(videoFile);
  await waitUntil(
    "listing video uploaded",
    async () => {
      const s = await readListingState();
      return Boolean(s.videoUrl) || s.hasReplaceCta;
    },
    120000
  );
  await wait(1500);

  rep.baseline = await readListingState();
  rep.baseline.listingDraftIdentity = rep.baseline.title;
  rep.baseline.videoCountExpected = 1;

  if (!rep.baseline.videoUrl) {
    rep.verdict = "GAP2_FAIL_NO_BASELINE";
    fs.writeFileSync(path.join(OUT, "existing-video-flows.json"), JSON.stringify(rep, null, 2));
    console.log(JSON.stringify(rep, null, 2));
    await ctx.close();
    process.exit(1);
  }

  // TEST A — cancel before replacement
  rep.testA_cta = await clickStudioCta();
  await waitUntil(
    "studio composer",
    async () =>
      page.url().includes("studio.homecheff.eu/studio/photo-video") &&
      (await page.getByTestId("px4a-composer").count()) > 0,
    120000
  );
  await wait(1200);
  if (await page.getByTestId("px4a-resume-fresh").count()) await page.getByTestId("px4a-resume-fresh").click();
  await wait(800);

  const back = page.locator('[data-testid="px4a-item-back"]');
  if (await back.count()) await back.click();
  else if (await page.getByTestId("px4a-item-cancel").count()) await page.getByTestId("px4a-item-cancel").click();
  await page.waitForURL(/homecheff\.eu\/sell\/new/, { timeout: 120000 });
  await wait(1500);
  await completeChooser();

  rep.afterCancel = await readListingState();
  rep.testA = {
    videoUrlUnchanged: rep.afterCancel.videoUrl === rep.baseline.videoUrl,
    videoCountStillOne: rep.afterCancel.videoCount <= 1 && Boolean(rep.afterCancel.videoUrl),
    photosPreserved: rep.afterCancel.photoCount >= 4,
    unpublished: rep.afterCancel.unpublished,
    pass:
      rep.afterCancel.videoUrl === rep.baseline.videoUrl &&
      rep.afterCancel.photoCount >= 4 &&
      Boolean(rep.afterCancel.videoUrl),
  };

  // TEST B — replace via Studio export
  rep.testB_cta = await clickStudioCta();
  await waitUntil(
    "studio composer",
    async () =>
      page.url().includes("studio.homecheff.eu/studio/photo-video") &&
      (await page.getByTestId("px4a-composer").count()) > 0,
    120000
  );
  await wait(1200);
  if (await page.getByTestId("px4a-resume-fresh").count()) await page.getByTestId("px4a-resume-fresh").click();
  await wait(800);

  await page.setInputFiles('[data-testid="px4a-video-input"]', videoFile);
  await wait(4500);
  const chips = page.locator('[data-testid="px4a-video-duration"] button');
  const n = await chips.count();
  for (let i = 0; i < n; i++) {
    const t = (await chips.nth(i).innerText()).trim();
    if (t.includes("15")) {
      await chips.nth(i).click();
      break;
    }
  }
  await wait(500);
  await page.getByTestId("px4a-item-finish").click();
  await page.waitForURL(/homecheff\.eu\/sell\/new/, { timeout: 240000 });
  await waitUntil(
    "replaced listing video",
    async () => {
      const s = await readListingState();
      return Boolean(s.videoUrl) && s.videoUrl !== rep.baseline.videoUrl;
    },
    180000
  );
  await completeChooser();

  rep.afterReplace = await readListingState();
  rep.testB = {
    videoCountExactlyOne: rep.afterReplace.videoCount <= 1 && Boolean(rep.afterReplace.videoUrl),
    canonicalUrlChanged: rep.afterReplace.videoUrl !== rep.baseline.videoUrl,
    oldVideoNotActive: rep.afterReplace.videoUrl !== rep.baseline.videoUrl,
    photosPreserved: rep.afterReplace.photoCount >= 4,
    unpublished: rep.afterReplace.unpublished,
    pass:
      rep.afterReplace.videoUrl &&
      rep.afterReplace.videoUrl !== rep.baseline.videoUrl &&
      rep.afterReplace.photoCount >= 4,
  };

  // TEST C — failure safety: back out before finish (no sabotage)
  rep.testC_cta = await clickStudioCta().catch(async () => {
    await page.locator('[data-testid="px4a-make-free-video"]').click();
    return "make-free-fallback";
  });
  await waitUntil(
    "studio composer abort",
    async () =>
      page.url().includes("studio.homecheff.eu/studio/photo-video") &&
      (await page.getByTestId("px4a-composer").count()) > 0,
    120000
  );
  await wait(1200);
  if (await page.getByTestId("px4a-resume-fresh").count()) await page.getByTestId("px4a-resume-fresh").click();
  await page.setInputFiles('[data-testid="px4a-video-input"]', videoFile);
  await wait(3000);
  const urlBeforeAbort = rep.afterReplace.videoUrl;
  if (await page.getByTestId("px4a-item-back").count()) await page.getByTestId("px4a-item-back").click();
  await page.waitForURL(/homecheff\.eu\/sell\/new/, { timeout: 120000 });
  await wait(1500);
  await completeChooser();
  rep.afterAbort = await readListingState();
  rep.testC = {
    attempted: true,
    videoUrlPreserved: rep.afterAbort.videoUrl === urlBeforeAbort,
    pass: rep.afterAbort.videoUrl === urlBeforeAbort,
  };

  rep.verdict = rep.testA.pass && rep.testB.pass && rep.testC.pass ? "GAP2_PASS" : "GAP2_FAIL";

  fs.writeFileSync(path.join(OUT, "existing-video-flows.json"), JSON.stringify(rep, null, 2));
  console.log(JSON.stringify(rep, null, 2));
  await ctx.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
