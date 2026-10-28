/**
 * Authenticated local film certification.
 * Refuses any database other than homecheff_studio_v27_2_test on 127.0.0.1.
 */
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { chromium, type Page } from "playwright";

const execFileAsync = promisify(execFile);
const base = "http://127.0.0.1:3462";
const password = "v272-local-only-password";
const evidence = path.resolve("docs/studio-v27-2/evidence");
const media = "/tmp/homecheff-studio-v27-2-cert-media";
const ffmpeg = process.env.FFMPEG || "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg";
const ffprobe = process.env.FFPROBE || "/opt/homebrew/bin/ffprobe";

const report: Record<string, unknown> = { forbiddenHosts: [] as string[], steps: {} as Record<string, unknown> };

function assertLocal() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/homecheff_studio_v27_2_test") {
    throw new Error("Certification refused a non-disposable database.");
  }
  if (process.env.VERCEL || process.env.VERCEL_ENV) throw new Error("Vercel environment is set.");
}

async function ffmpegRun(args: string[]) {
  await execFileAsync(ffmpeg, ["-y", ...args]);
}

async function makeAssets() {
  await mkdir(media, { recursive: true });
  await ffmpegRun(["-f", "lavfi", "-i", "color=c=0xF4A261:s=960x540:d=1", "-frames:v", "1", path.join(media, "kitchen.png")]);
  const clips = [
    ["scene-1.mp4", "0x1D4E89", "8"],
    ["scene-2.mp4", "0xC44536", "8"],
    ["scene-3.mp4", "0x006D52", "8"],
    ["logo.mp4", "0x041428", "6"],
  ] as const;
  for (const [name, color, seconds] of clips) {
    await ffmpegRun([
      "-f", "lavfi", "-i", `color=c=${color}:s=1280x720:d=${seconds}`,
      "-f", "lavfi", "-i", `sine=frequency=330:duration=${seconds}`,
      "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
      path.join(media, name),
    ]);
  }
  await ffmpegRun(["-f", "lavfi", "-i", "sine=frequency=220:duration=3", path.join(media, "voice.wav")]);
  await ffmpegRun(["-f", "lavfi", "-i", "sine=frequency=110:duration=30", path.join(media, "music.wav")]);
  await ffmpegRun(["-f", "lavfi", "-i", "sine=frequency=880:duration=1", path.join(media, "sfx.wav")]);
}

async function login(page: Page, email: string) {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  const button = page.locator('form button[type="submit"]');
  await button.waitFor();
  await page.waitForFunction(() => {
    const node = document.querySelector('form button[type="submit"]');
    return !!node && Object.keys(node).some((key) => key.startsWith("__react"));
  });
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60000, waitUntil: "commit" }),
    button.evaluate((node) => (node as HTMLButtonElement).click()),
  ]);
}

async function shot(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(evidence, name), fullPage: false });
}

async function fillIntent(page: Page, text: string) {
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(`${base}/studio`, { waitUntil: "domcontentloaded" });
  const box = await composer(page);
  const field = box.getByTestId("studio-ai-home-prompt");
  await field.waitFor();
  await field.fill("");
  await field.fill(text);
  await page.waitForFunction((value) => {
    const fields = [...document.querySelectorAll('[data-testid="studio-ai-home-prompt"]')];
    return fields.some((node) => (node as HTMLTextAreaElement).value === value);
  }, text);
  await box.getByTestId("studio-ai-home-submit").click();
  await box.getByTestId("studio-ai-home-confirm").waitFor();
  const summary = await box.getByTestId("studio-ai-home-confirm-summary").innerText();
  await box.getByTestId("studio-ai-home-confirm-make").click();
  await page.waitForTimeout(800);
  return `${page.url()} :: ${summary.replace(/\s+/g, " ").slice(0, 180)}`;
}

function composer(page: Page) {
  return page.locator('[data-testid="studio-ai-home-composer"]').last();
}

async function overflow(page: Page) {
  return page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    text: (document.querySelector("h1")?.textContent || "").trim().slice(0, 120),
  }));
}

async function main() {
  assertLocal();
  await mkdir(evidence, { recursive: true });
  await makeAssets();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
  const forbidden: string[] = [];
  context.on("request", (request) => {
    try {
      const host = new URL(request.url()).hostname;
      if (host.endsWith("homecheff.eu") || host.includes("neon.tech") || host === "api.openai.com" || host.includes("elevenlabs") || host.endsWith("stripe.com") || host.includes("vidu")) {
        forbidden.push(host);
      }
    } catch {
      /* ignore */
    }
  });
  const page = await context.newPage();
  const steps = report.steps as Record<string, unknown>;
  try {
    await login(page, "v272-user-a@studio.local.test");
    steps.login = page.url();
    await page.goto(`${base}/studio`, { waitUntil: "domcontentloaded" });
    const home = composer(page);
    await home.waitFor();
    steps.homepage = await home.getByTestId("studio-ai-home-prompt").isVisible();
    const intents = [
      "Animeer deze foto",
      "Maak een productfoto",
      "Maak een reclamevideo",
      "Maak een stem",
      "Maak achtergrondmuziek",
      "Maak een geluidseffect",
      "Maak een video",
    ];
    const routes: Record<string, string> = {};
    for (const text of intents) {
      routes[text] = await fillIntent(page, text);
    }
    steps.intents = routes;
    console.log("intents-done");

    const filmPrompt = "V27.2 Synthetic Film Certification. Create a 30-second promotional film with three scenes, one recurring character, voice-over, background music, a sound effect and an ending logo.";
    steps.filmRoute = await fillIntent(page, filmPrompt);
    await page.waitForURL(/\/studio\/projects\/[^/]+/, { timeout: 30000 });
    const projectId = page.url().split("/studio/projects/")[1]?.split("?")[0] ?? "";
    steps.projectId = projectId;
    steps.projectUrl = page.url();
    console.log("film-open", projectId);
    await shot(page, "film-created-1440.png");

    await page.goto(`${base}/studio/projects/${projectId}?section=scenes`, { waitUntil: "domcontentloaded" });
    const add = page.locator("main").getByRole("button", { name: "Add scene" }).last();
    let existingScenes = await page.getByRole("button", { name: /^\d+\./ }).count();
    while (existingScenes < 3) {
      await add.evaluate((node) => (node as HTMLButtonElement).click());
      await page.getByRole("button", { name: new RegExp(`^${existingScenes + 1}\\.`) }).first().waitFor({ timeout: 20000 });
      existingScenes += 1;
    }
    const sceneTitles = ["Introduction", "Main action", "Closing logo and call to action"];
    const sceneDescriptions = [
      "Open on the guide in a warm kitchen.",
      "The guide prepares the product and shows the result.",
      "The HomeCheff logo and a call to action close the film.",
    ];
    for (let index = 0; index < 3; index += 1) {
      await page.getByRole("button", { name: /^\d+\./ }).nth(index).evaluate((node) => (node as HTMLButtonElement).click());
      const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Save scene" }) }).first();
      await form.locator("input").first().evaluate((node, value) => {
        const input = node as HTMLInputElement;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }, sceneTitles[index]);
      await form.locator("textarea").first().evaluate((node, value) => {
        const input = node as HTMLTextAreaElement;
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
        setter?.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }, sceneDescriptions[index]);
      await form.getByRole("button", { name: "Save scene" }).evaluate((node) => (node as HTMLButtonElement).click());
      await page.getByRole("button", { name: new RegExp(`${index + 1}\\. ${sceneTitles[index]}`) }).first().waitFor();
    }
    steps.scenesSaved = sceneTitles;

    await page.goto(`${base}/studio/projects/${projectId}?section=characters`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("studio-v272-browse-characters").click();
    await page.getByRole("button", { name: /V272 Guide/ }).click();
    await page.getByText("V272 Guide").first().waitFor();
    steps.characterAttached = true;

    await page.goto(`${base}/studio/projects/${projectId}?section=scenes`, { waitUntil: "domcontentloaded" });
    for (let index = 0; index < 3; index += 1) {
      await page.getByRole("button", { name: new RegExp(`${index + 1}\\. ${sceneTitles[index]}`) }).first().evaluate((node) => (node as HTMLButtonElement).click());
      await page.getByRole("button", { name: "Load existing characters" }).evaluate((node) => (node as HTMLButtonElement).click());
      await page.getByRole("checkbox", { name: "V272 Guide" }).evaluate((node) => (node as HTMLInputElement).click());
      await page.getByRole("button", { name: "Save scene" }).first().evaluate((node) => (node as HTMLButtonElement).click());
      await page.waitForTimeout(400);
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Introduction/ }).first().waitFor();
    const persisted = [];
    for (const title of sceneTitles) persisted.push(await page.getByRole("button", { name: new RegExp(title) }).count());
    steps.scenesAfterRefresh = persisted;

    const png = await readFile(path.join(media, "kitchen.png"));
    const upload = await page.context().request.post(`${base}/api/uploads/images`, {
      multipart: {
        workingImage: { name: "kitchen.png", mimeType: "image/png", buffer: png },
        thumbnailImage: { name: "kitchen-thumb.png", mimeType: "image/png", buffer: png },
        originalFileName: "kitchen.png",
        mimeType: "image/png",
        sizeBytes: String(png.length),
        clientUploadId: "v272-kitchen",
        assetType: "reference_image",
      },
    });
    const uploadBody = await upload.json();
    steps.uploadStatus = upload.status();
    steps.uploadBody = uploadBody;
    const imageUrl = String(uploadBody.workingImageUrl || "");
    const imagePath = new URL(imageUrl).pathname;
    const ownerGet = await page.context().request.get(`${base}${imagePath}`);
    steps.ownerImageStatus = ownerGet.status();
    steps.ownerImageBytes = (await ownerGet.body()).length;

    await page.goto(`${base}/studio/projects/${projectId}?section=scenes`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /2\. Main action/ }).evaluate((node) => (node as HTMLButtonElement).click());
    const wizard = page.getByTestId("studio-v27-scene-wizards");
    steps.wizardHrefs = await wizard.locator("a").evaluateAll((nodes) => nodes.map((node) => (node as HTMLAnchorElement).href));
    const voiceHref = steps.wizardHrefs as string[];
    const voiceLink = voiceHref.find((href) => href.includes("mode=voice") || href.includes("tool=voice"));
    if (voiceLink) {
      await page.goto(voiceLink, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      steps.voiceUrl = page.url();
      const script = page.locator("textarea").first();
      if (await script.count()) {
        await script.evaluate((node, value) => {
          const input = node as HTMLTextAreaElement;
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
          setter?.call(input, value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }, "Welkom bij HomeCheff. Dit is de lokale certificatiefilm.");
      }
      steps.voiceText = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 500);
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await page.goto(`${base}/studio/projects/${projectId}?section=timeline`, { waitUntil: "domcontentloaded", timeout: 60000 });
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await page.waitForTimeout(1000);
      }
    }
    await page.getByRole("button", { name: /Create timeline|Play/ }).first().waitFor({ timeout: 30000 });
    const createTimeline = page.getByRole("button", { name: "Create timeline" });
    if (await createTimeline.count()) {
      await createTimeline.evaluate((node) => (node as HTMLButtonElement).click());
      await page.getByTestId("film-timeline-play").waitFor({ timeout: 20000 });
    }
    async function addFile(accept: string, file: string, note: string) {
      await page.locator(`input[accept*="${accept}"]`).first().setInputFiles(file);
      await page.getByText(note).waitFor({ timeout: 20000 });
    }
    const existingClips = await page.evaluate(async (id) => {
      const response = await fetch(`/api/studio/projects/${id}/timeline`);
      const body = (await response.json()) as { timeline?: { tracks?: Array<{ type?: string; clips?: unknown[] }> } };
      const tracks = body.timeline?.tracks ?? [];
      let video = 0;
      let dialogue = 0;
      let music = 0;
      let sfx = 0;
      for (const track of tracks) {
        const clips = track.clips?.length ?? 0;
        if (track.type === "VIDEO") video += clips;
        if (track.type === "DIALOGUE") dialogue += clips;
        if (track.type === "MUSIC") music += clips;
        if (track.type === "SFX") sfx += clips;
      }
      return { video, dialogue, music, sfx };
    }, projectId);
    steps.existingClips = existingClips;
    if (existingClips.video < 3) {
      await addFile("video", path.join(media, "scene-1.mp4"), "Video added");
      await addFile("video", path.join(media, "scene-2.mp4"), "Video added");
      await addFile("video", path.join(media, "scene-3.mp4"), "Video added");
      await addFile("video", path.join(media, "logo.mp4"), "Video added");
    }
    if (existingClips.dialogue < 1) {
      await addFile("audio/wav", path.join(media, "voice.wav"), "Voice added");
    }
    if (existingClips.music < 1) {
      const uploaded = page.waitForResponse((response) => response.url().includes("/api/studio/audio-library/upload") && response.request().method() === "POST");
      await page.locator('input[accept*="audio/wav"]').nth(1).setInputFiles(path.join(media, "music.wav"));
      steps.musicUpload = (await uploaded).status();
    }
    if (existingClips.sfx < 1) {
      const uploaded = page.waitForResponse((response) => response.url().includes("/api/studio/audio-library/upload") && response.request().method() === "POST");
      await page.locator('input[accept*="audio/wav"]').nth(2).setInputFiles(path.join(media, "sfx.wav"));
      steps.sfxUpload = (await uploaded).status();
    }
    steps.timelineButtons = await page.locator("[data-testid='film-timeline-clock']").innerText();
    console.log("timeline-ready", steps.existingClips);
    const mode = page.getByTestId("film-timeline-mode");
    if ((await mode.innerText()).includes("Advanced")) {
      await mode.evaluate((node) => (node as HTMLButtonElement).click());
    }
    await page.locator("button.absolute.top-2").first().waitFor({ state: "visible", timeout: 20000 });
    async function selectFirstClip() {
      await page.locator("button.absolute.top-2").first().evaluate((node) => {
        const button = node as HTMLButtonElement;
        const rect = button.getBoundingClientRect();
        const x = rect.left + 8;
        button.dispatchEvent(new PointerEvent("pointerdown", { clientX: x, bubbles: true }));
        window.dispatchEvent(new PointerEvent("pointerup", { clientX: x, bubbles: true }));
      });
    }
    await selectFirstClip();
    await page.getByTestId("film-clip-start").waitFor({ timeout: 10000 });
    async function setClipField(testId: string, value: string) {
      await page.getByTestId(testId).evaluate((node, next) => {
        const input = node as HTMLInputElement;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(input, next);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }, value);
    }
    await setClipField("film-clip-start", "500");
    await setClipField("film-clip-trim", "200");
    await page.getByRole("button", { name: "Save clip" }).evaluate((node) => (node as HTMLButtonElement).click());
    await page.getByText("Clip saved").waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByTestId("film-timeline-play").waitFor({ timeout: 20000 });
    await page.locator("button.absolute.top-2").first().waitFor({ state: "visible", timeout: 20000 });
    await selectFirstClip();
    steps.timelineAfterReload = {
      start: await page.getByTestId("film-clip-start").inputValue(),
      trim: await page.getByTestId("film-clip-trim").inputValue(),
      clock: await page.getByTestId("film-timeline-clock").innerText(),
    };
    await page.getByTestId("film-timeline-play").evaluate((node) => (node as HTMLButtonElement).click());
    await page.waitForTimeout(1200);
    const playback = await page.getByTestId("film-timeline-video").evaluate((node) => {
      const video = node as HTMLVideoElement;
      return { paused: video.paused, readyState: video.readyState, currentTime: video.currentTime, duration: video.duration };
    }).catch((error: Error) => ({ error: error.message }));
    steps.playback = playback;
    steps.audioMarkers = await page.getByTestId("film-timeline-audio").getAttribute("data-markers");
    await page.getByTestId("film-timeline-seek").fill("4000");
    await page.getByTestId("film-timeline-seek").dispatchEvent("change");
    await page.getByTestId("film-timeline-play").evaluate((node) => (node as HTMLButtonElement).click());
    steps.seekClock = await page.getByTestId("film-timeline-clock").getAttribute("data-ms");
    await shot(page, "timeline-1440.png");

    const downloadPromise = page.waitForEvent("download", { timeout: 180000 });
    await page.getByTestId("film-export-mp4").evaluate((node) => (node as HTMLButtonElement).click());
    const download = await downloadPromise;
    const downloadPath = path.join(evidence, "v272-film.mp4");
    await download.saveAs(downloadPath);
    const probe = await execFileAsync(ffprobe, ["-v", "error", "-show_entries", "format=duration,size:stream=codec_type,codec_name", "-of", "json", downloadPath]);
    steps.exportProbe = JSON.parse(probe.stdout);
    steps.exportNote = await page.getByRole("status").innerText().catch(() => "");

    const widths = [1440, 1280, 1080, 1024, 768, 390, 360];
    const layout: Record<string, unknown> = {};
    for (const width of widths) {
      await page.setViewportSize({ width, height: width < 800 ? 844 : 900 });
      await page.goto(`${base}/studio/projects/${projectId}?section=scenes`, { waitUntil: "domcontentloaded" });
      layout[String(width)] = await overflow(page);
      if (width === 390 || width === 768 || width === 1440) await shot(page, `scenes-${width}.png`);
    }
    steps.layout = layout;
    await page.setViewportSize({ width: 1440, height: 900 });

    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await login(otherPage, "v272-user-b@studio.local.test");
    const deniedPage = await otherPage.goto(`${base}/studio/projects/${projectId}?section=scenes`, { waitUntil: "domcontentloaded" });
    steps.userBProjectStatus = deniedPage?.status();
    steps.userBProjectText = (await otherPage.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 240);
    const deniedMedia = await other.request.get(`${base}${imagePath}`);
    steps.userBImageStatus = deniedMedia.status();
    const deniedTimeline = await other.request.get(`${base}/api/studio/projects/${projectId}/timeline`);
    steps.userBTimelineStatus = deniedTimeline.status();
    await other.close();

    const zero = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const zeroPage = await zero.newPage();
    await login(zeroPage, "v272-user-c@studio.local.test");
    await zeroPage.goto(`${base}/studio`, { waitUntil: "domcontentloaded" });
    const zeroBox = zeroPage.locator('[data-testid="studio-ai-home-composer"]').last();
    steps.zeroHomepage = await zeroBox.getByTestId("studio-ai-home-prompt").isVisible();
    const zeroPrompt = "V272 Zero HC film. A short free editing check.";
    await zeroPage.evaluate(() => sessionStorage.clear());
    await zeroBox.getByTestId("studio-ai-home-prompt").evaluate((node, value) => {
      const input = node as HTMLTextAreaElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setter?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, zeroPrompt);
    await zeroBox.getByTestId("studio-ai-home-submit").evaluate((node) => (node as HTMLButtonElement).click());
    await zeroBox.getByTestId("studio-ai-home-confirm-make").evaluate((node) => (node as HTMLButtonElement).click());
    await zeroPage.waitForURL(/\/studio\/projects\//, { timeout: 30000 });
    const zeroProject = zeroPage.url().split("/studio/projects/")[1]?.split("?")[0] ?? "";
    await zeroPage.goto(`${base}/studio/projects/${zeroProject}?section=scenes`, { waitUntil: "domcontentloaded" });
    await zeroPage.getByRole("button", { name: "Add scene" }).first().evaluate((node) => (node as HTMLButtonElement).click());
    await zeroPage.getByRole("button", { name: /^1\./ }).waitFor({ timeout: 20000 });
    const sceneHref = zeroPage.url();
    const sceneButton = await zeroPage.getByRole("button", { name: /^1\./ }).innerText();
    steps.zeroScene = sceneButton;
    const sceneId = await zeroPage.evaluate(async (id) => {
      const marked = document.querySelector("[data-scene-id]")?.getAttribute("data-scene-id");
      if (marked) return marked;
      const response = await fetch(`/api/studio/projects/${id}/timeline`);
      const body = (await response.json()) as { timeline?: { scenes?: Array<{ id?: string }> } };
      return body.timeline?.scenes?.[0]?.id ?? "";
    }, zeroProject);
    const quote = await zero.request.post(`${base}/api/studio/projects/${zeroProject}/scenes/${sceneId}/dialogue`, {
      data: { action: "quote" },
    });
    steps.zeroQuoteStatus = quote.status();
    steps.zeroQuote = await quote.json();
    steps.zeroProject = zeroProject;
    steps.sceneHref = sceneHref;
    await zero.close();
  } finally {
    report.forbiddenHosts = forbidden;
    await writeFile(path.join(evidence, "browser-report.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch(async (error) => {
  const text = error instanceof Error ? error.stack ?? error.message : String(error);
  report.fatal = text.replace(/password=[^&\s"]+/gi, "password=[redacted]");
  await mkdir(evidence, { recursive: true }).catch(() => undefined);
  await writeFile(path.join(evidence, "browser-report.json"), JSON.stringify(report, null, 2)).catch(() => undefined);
  console.error(error);
  process.exit(1);
});
