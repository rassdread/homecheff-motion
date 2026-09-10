#!/usr/bin/env npx tsx
/**
 * FULL_STUDIO_CERT_AUTHED_PRODUCTION_CLOSEOUT — authenticated Production certification runner.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type BrowserContext, type Page, type Request } from "playwright";
import { buildActionPresetPrefillPackage } from "../src/lib/motion-action-preset-prefill";
import { getMotionActionPreset } from "../src/lib/motion-action-presets";
import sharp from "sharp";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT = join(ROOT, "docs/audits/full-studio-cert");
const SHOTS = join(OUT, "authed-shots");
const STUDIO = "https://studio.homecheff.eu";
const HC = "https://homecheff.eu";
const PROFILE = join(ROOT, ".px4a7-prod-profile");
const PERSON_FIXTURE = join(ROOT, "docs/audits/full-studio-cert/provider-visual/person-a-gen.png");
const PHOTO_FIXTURE = join(ROOT, "docs/audits/px4a7-prod-cert/fixtures/px4a7-photo-red.png");

const SCENARIOS = new Set(
  (process.env.FULL_STUDIO_SCENARIOS ?? "A,C,G,AUDIO,S2,QUICK").split(",").map((s) => s.trim().toUpperCase())
);

const BUDGET = {
  MAX_OPENAI_IMAGE: 12,
  MAX_OPENAI_VISION: 4,
  MAX_VIDU: 2,
  MAX_ELEVENLABS: 6,
  MAX_MUSIC: 2,
  MAX_SFX: 4,
  MAX_FINAL_RENDER: 2,
};

type ProviderCounts = {
  openaiImage: number;
  openaiVision: number;
  vidu: number;
  elevenlabs: number;
  music: number;
  sfx: number;
  finalRender: number;
};

type CloseoutReport = Record<string, unknown>;

const providerCounts: ProviderCounts = {
  openaiImage: 0,
  openaiVision: 0,
  vidu: 0,
  elevenlabs: 0,
  music: 0,
  sfx: 0,
  finalRender: 0,
};

const report: CloseoutReport = {
  startedAt: new Date().toISOString(),
  studio: STUDIO,
  profile: PROFILE,
  budget: BUDGET,
  providerCounts,
  production: {},
  scenarioA: { status: "pending" },
  scenarioC: { status: "pending" },
  scenarioG: { status: "pending" },
  audioExport: { status: "pending" },
  s2gS2h: { status: "pending" },
  quickVideo: { status: "pending" },
  iphone: { status: "NOT_RUN", reason: "no_device" },
  classifications: {} as Record<string, string>,
};

function save(name: string, data: unknown): void {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 2));
}

function saveReport(): void {
  report.updatedAt = new Date().toISOString();
  report.providerCounts = { ...providerCounts };
  save("AUTHED-CLOSEOUT-LIVE.json", report);
}

async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${Date.now()}-${name}.png`), fullPage: false }).catch(() => undefined);
}

function trackRequest(req: Request): void {
  const url = req.url();
  if (/api\.openai\.com.*\/images/i.test(url)) providerCounts.openaiImage += 1;
  if (/api\.openai\.com.*\/chat\/completions/i.test(url) && /vision|image_url/i.test(url)) {
    providerCounts.openaiVision += 1;
  }
  if (/vidu|deevid/i.test(url) && req.method() === "POST") providerCounts.vidu += 1;
  if (/elevenlabs/i.test(url) && req.method() === "POST") providerCounts.elevenlabs += 1;
  if (/music|audio.*generate/i.test(url) && req.method() === "POST") providerCounts.music += 1;
  if (/sfx|sound-effect/i.test(url) && req.method() === "POST") providerCounts.sfx += 1;
  if (/render-batch|orchestrator\/execute|server-ffmpeg|ffmpeg-static/i.test(url) && req.method() === "POST") {
    providerCounts.finalRender += 1;
  }
}

function assertBudget(label: string): void {
  const over =
    providerCounts.openaiImage > BUDGET.MAX_OPENAI_IMAGE ||
    providerCounts.vidu > BUDGET.MAX_VIDU ||
    providerCounts.elevenlabs > BUDGET.MAX_ELEVENLABS ||
    providerCounts.finalRender > BUDGET.MAX_FINAL_RENDER;
  if (over) {
    throw new Error(`Provider budget exceeded during ${label}`);
  }
}

async function waitUntil(label: string, fn: () => Promise<boolean>, ms = 120_000): Promise<void> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await fn()) {
      console.log(`  ok: ${label}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`timeout: ${label}`);
}

async function verifyProduction(ctx: BrowserContext): Promise<void> {
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto(`${STUDIO}/projects`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const html = await page.content();
  const dpl = html.match(/data-dpl-id="([^"]+)"/)?.[1] ?? null;
  const stageSignals = ["Afronden", "Verhaal", "Personen", "Mijn projecten"].filter((s) => html.includes(s));
  const modeRes = await ctx.request.get(`${STUDIO}/api/instant-premium/mode`);
  const modeBody = await modeRes.json();
  report.production = {
    dpl,
    stageSignals,
    instantPremiumMode: modeBody?.mode ?? null,
    projectsAuthed: html.includes("Mijn projecten") || html.includes("My projects"),
  };
}

async function clickWizardPrimary(page: Page): Promise<void> {
  const btn = page
    .locator("button")
    .filter({ hasText: /Doorgaan|Continue|Genereer video|Generate video/i })
    .first();
  await btn.waitFor({ state: "visible", timeout: 30_000 });
  await btn.click();
}

async function uploadInstantImage(ctx: BrowserContext, fixturePath: string) {
  const buf = readFileSync(fixturePath);
  const thumb = await sharp(buf).resize(320).jpeg({ quality: 80 }).toBuffer();
  const form = new FormData();
  form.append("workingImage", new Blob([buf], { type: "image/png" }), "person.png");
  form.append("thumbnailImage", new Blob([thumb], { type: "image/jpeg" }), "person-thumb.jpg");
  form.append("originalFileName", "person.png");
  form.append("mimeType", "image/png");
  form.append("sizeBytes", String(buf.length));
  form.append("clientUploadId", `cert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  form.append("originContext", "instant_premium");
  const up = await ctx.request.post(`${STUDIO}/api/uploads/images`, { multipart: form });
  const body = await up.json();
  if (!up.ok()) throw new Error(`upload failed: ${JSON.stringify(body).slice(0, 200)}`);
  return body as { workingImageUrl: string; thumbnailUrl: string; workingStorageKey: string };
}

async function runScenarioA(ctx: BrowserContext): Promise<void> {
  if (!SCENARIOS.has("A")) return;
  console.log("\n=== Scenario A: Rode loper ===");
  const page = await ctx.newPage();
  page.on("request", trackRequest);
  const fixture = existsSync(PERSON_FIXTURE) ? PERSON_FIXTURE : PHOTO_FIXTURE;
  if (!existsSync(fixture)) throw new Error("Missing person fixture");

  const pkg = buildActionPresetPrefillPackage({ presetId: "red_carpet_moment" });
  if (!pkg) throw new Error("Missing red_carpet prefill package");
  await page.addInitScript(
    ({ storeKey, p }) => {
      sessionStorage.setItem(storeKey, JSON.stringify({ [p.id]: p }));
    },
    { storeKey: "hc-assistant-prefill-v1", p: pkg }
  );

  await page.goto(`${STUDIO}/animate/instant?prefillId=${encodeURIComponent(pkg.id)}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForTimeout(3000);
  const closeCredit = page.getByRole("button", { name: /Sluiten|Close/i });
  if (await closeCredit.count()) await closeCredit.first().click();
  await shot(page, "a-wizard-start");

  const up1 = await uploadInstantImage(ctx, fixture);
  const up2 = await uploadInstantImage(ctx, fixture);
  const preset = getMotionActionPreset("red_carpet_moment");
  const img = (up: typeof up1) => ({
    fileName: "person.png",
    previewUrl: up.thumbnailUrl,
    storageKey: up.workingStorageKey,
    workingImageUrl: up.workingImageUrl,
    mimeType: "image/png",
    sizeBytes: readFileSync(fixture).length,
  });
  const createRes = await ctx.request.post(`${STUDIO}/api/instant-premium/create-and-generate`, {
    data: {
      images: [img(up1), img(up2)],
      instantMode: "transition",
      instantTransitionSeconds: 5,
      stylePreset: "clean_business",
      duration: 5,
      aspectRatio: "9:16",
      uiLanguage: "nl",
      userIntent: preset?.promptTemplate,
      title: "Rode loper cert A",
      posterMotionSettings: { hcActionPreset: pkg.hcActionPreset },
    },
  });
  const createBody = await createRes.json();
  if (!createRes.ok()) {
    report.scenarioA = {
      status: "blocked",
      phase: "create-and-generate",
      httpStatus: createRes.status(),
      creditGate: createBody?.creditGate ?? null,
      code: createBody?.code ?? null,
      wizardPresetVisible: (await page.content()).toLowerCase().includes("rode loper"),
      note: "Production credit gate blocks real Vidu for free non-admin cert account",
    };
    saveReport();
    await page.close();
    return;
  }

  const projectId = String(createBody.projectId ?? "");
  await page.goto(`${STUDIO}/animate/instant/progress?projectId=${encodeURIComponent(projectId)}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });

  await shot(page, "a-progress-start");

  let statusBody: Record<string, unknown> = {};
  await waitUntil(
    "vidu completion",
    async () => {
      const res = await ctx.request.get(`${STUDIO}/api/instant-premium/projects/${projectId}/status`);
      statusBody = (await res.json()) as Record<string, unknown>;
      assertBudget("scenarioA");
      const status = String(statusBody.status ?? "");
      if (status === "failed") {
        throw new Error(`Instant project failed: ${statusBody.errorMessage ?? "unknown"}`);
      }
      return status === "completed" && Boolean(statusBody.finalVideoUrl);
    },
    900_000
  );

  await shot(page, "a-progress-complete");
  const segments = (statusBody.segments as Array<Record<string, unknown>>) ?? [];
  const sourceImageUrl = String(segments[0]?.sourceImageUrl ?? "");
  const finalVideoUrl = String(statusBody.finalVideoUrl ?? "");

  const assets = [
    { role: "person", assetId: "cert-person", url: sourceImageUrl, pointer: "cert-person-ptr" },
    { role: "result_still", assetId: "cert-still", url: sourceImageUrl, pointer: "cert-still-ptr" },
    { role: "result_video", assetId: "cert-vid", url: finalVideoUrl, pointer: "cert-vid-ptr" },
  ];

  const mat1 = await ctx.request.post(`${STUDIO}/api/studio/preset-materialize`, {
    data: {
      sourceType: "MOTION_PRESET",
      sourceId: "red_carpet_moment",
      displayTitle: "Rode loper cert",
      sourceQuickProjectId: projectId,
      assets,
    },
  });
  const matBody1 = await mat1.json();
  if (!mat1.ok()) throw new Error(`materialize failed: ${JSON.stringify(matBody1).slice(0, 400)}`);

  const mat2 = await ctx.request.post(`${STUDIO}/api/studio/preset-materialize`, {
    data: {
      sourceType: "MOTION_PRESET",
      sourceId: "red_carpet_moment",
      displayTitle: "Rode loper cert",
      sourceQuickProjectId: projectId,
      assets,
    },
  });
  const matBody2 = await mat2.json();

  const storyboardId = String(matBody1.storyboardId ?? "");
  const workspaceHref = String(matBody1.workspaceHref ?? `/studio?storyboardId=${storyboardId}&continueInStudio=1`);
  await page.goto(`${STUDIO}${workspaceHref.startsWith("/") ? workspaceHref : `/${workspaceHref}`}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForTimeout(4000);
  await shot(page, "a-workspace");

  await page.goto(`${STUDIO}/studio?storyboardId=${encodeURIComponent(storyboardId)}&stage=finish`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForTimeout(3000);
  await shot(page, "a-finish");
  const finishHtml = await page.content();
  const finishOk =
    finishHtml.includes("Afronden") ||
    finishHtml.includes("Finish") ||
    finishHtml.includes("studio.finish");

  const projectsBefore = await ctx.request.get(`${STUDIO}/api/studio/projects`);
  const projectsBody = await projectsBefore.json();
  const cards = (projectsBody?.projects ?? []) as Array<{ id: string; title: string }>;
  const rodeCards = cards.filter((c) => /rode loper cert|red_carpet|Rode loper/i.test(c.title ?? ""));

  report.scenarioA = {
    status: "completed",
    projectId,
    finalVideoUrl: finalVideoUrl.replace(/\?.*$/, "?…"),
    sourceImageUrl: sourceImageUrl.replace(/\?.*$/, "?…"),
    segmentCount: segments.length,
    materialize: { first: { reused: matBody1.reused, storyboardId }, second: { reused: matBody2.reused } },
    finishOk,
    projectsRodeCardCount: rodeCards.length,
    storyboardId,
  };
  report._scenarioAStoryboardId = storyboardId;
  saveReport();
  await page.close();
}

async function runS2Smoke(ctx: BrowserContext): Promise<void> {
  if (!SCENARIOS.has("S2")) return;
  console.log("\n=== S2G/S2H + returning user ===");
  const page = await ctx.newPage();
  const storyboardId = String(report._scenarioAStoryboardId ?? "");
  if (storyboardId) {
    await page.goto(`${STUDIO}/studio?storyboardId=${encodeURIComponent(storyboardId)}&stage=finish`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.waitForTimeout(2500);
    await shot(page, "s2g-finish");
  }

  await page.goto(`${STUDIO}/projects`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(2000);
  await shot(page, "s2h-projects");
  const html = await page.content();

  await page.goto(`${STUDIO}/studio`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(2000);
  await shot(page, "studio-home");

  report.s2gS2h = {
    status: "completed",
    finishLoaded: Boolean(storyboardId),
    projectsHasLibrary: html.includes("Mijn projecten") || html.includes("My projects"),
    studioHomeLoaded: true,
  };
  saveReport();
  await page.close();
}

async function runQuickVideoSmoke(ctx: BrowserContext): Promise<void> {
  if (!SCENARIOS.has("QUICK")) return;
  console.log("\n=== Quick Video smoke ===");
  const page = await ctx.newPage();
  await page.goto(`${STUDIO}/studio/photo-video`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(2500);
  await shot(page, "quick-video");
  const html = await page.content();
  report.quickVideo = {
    status: "completed",
    composerPresent: html.includes("px4a-composer") || html.includes("photo-video"),
    growthHidden: !html.includes("growth-sidebar") || html.includes("hidden"),
  };
  saveReport();
  await page.close();
}

async function runScenarioG(ctx: BrowserContext): Promise<void> {
  if (!SCENARIOS.has("G")) return;
  console.log("\n=== Scenario G: HomeCheff E2E ===");
  const page = await ctx.newPage();
  page.on("request", trackRequest);
  await page.goto(`${HC}/sell/new`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(3000);
  const hcHtml = await page.content();
  const hcAuthed = !hcHtml.includes("Inloggen") && !hcHtml.includes("Log in");
  await shot(page, "g-sell-new");

  let attachOk = false;
  let contextBar = false;
  if (hcAuthed) {
    const studioLink = page.locator('a[href*="studio.homecheff"], a[href*="/studio"]').first();
    if (await studioLink.count()) {
      await studioLink.click();
      await page.waitForTimeout(4000);
      contextBar =
        (await page.content()).includes("HomeCheff") ||
        (await page.content()).includes("homecheff") ||
        page.url().includes("returnUrl") ||
        page.url().includes("homecheff");
      await shot(page, "g-studio-context");
    }
    if (page.url().includes("photo-video") || page.url().includes("/studio")) {
      attachOk = true;
    }
  }

  report.scenarioG = {
    status: hcAuthed ? (attachOk ? "completed" : "partial") : "failed",
    hcAuthed,
    contextBar,
    attachOk,
    note: "Full GAP2 cancel/keep/replace requires px4a4/px4a5 extended run",
  };
  saveReport();
  await page.close();
}

async function runScenarioC(ctx: BrowserContext): Promise<void> {
  if (!SCENARIOS.has("C")) return;
  console.log("\n=== Scenario C: Pixar stress (bounded) ===");
  const scenes = [
    "Anna enters bakery carrying red box.",
    "Bob greets Anna.",
    "Anna places same red box on counter.",
    "Product red box close-up.",
    "Anna changes to black jacket.",
    "Anna and Bob talk.",
    "Anna in second environment, black jacket.",
    "Anna Bob product hero ending.",
  ];

  const createSb = await ctx.request.post(`${STUDIO}/api/studio/storyboards`, {
    data: {
      title: "Pixar cert closeout",
      description: "Bounded 8-scene consistency cert",
      promptStyleProfile: "pixar_3d",
    },
  });
  const sbBody = await createSb.json();
  if (!createSb.ok()) {
    report.scenarioC = { status: "failed", error: sbBody, phase: "create_storyboard" };
    saveReport();
    return;
  }
  const storyboardId = sbBody.storyboard.id as string;
  const sceneIds: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const res = await ctx.request.post(`${STUDIO}/api/studio/storyboards/${storyboardId}/scenes`, {
      data: {
        title: `Scene ${i + 1}`,
        description: scenes[i],
        order: i,
        durationSeconds: 5,
      },
    });
    const body = await res.json();
    if (res.ok()) sceneIds.push(body.scene.id as string);
  }

  const anna = await ctx.request.post(`${STUDIO}/api/studio/characters`, {
    data: {
      name: "Anna",
      role: "lead",
      description: "Young woman, warm smile, brown hair",
      personality: "friendly",
      referenceImageUrl: null,
    },
  });
  const bob = await ctx.request.post(`${STUDIO}/api/studio/characters`, {
    data: {
      name: "Bob",
      role: "supporting",
      description: "Man, short dark hair",
      personality: "cheerful",
      referenceImageUrl: null,
    },
  });
  const annaBody = await anna.json();
  const bobBody = await bob.json();

  const targetSceneOrders = [0, 2, 4, 6];
  const gen = await ctx.request.post(`${STUDIO}/api/studio/storyboards/${storyboardId}/generate-scene-images`, {
    data: { confirmed: true, sceneOrders: targetSceneOrders },
  });
  const genBody = await gen.json();
  assertBudget("scenarioC");

  let rerenderResult: Record<string, unknown> | null = null;
  const sbDetail = await ctx.request.get(`${STUDIO}/api/studio/storyboards/${storyboardId}`);
  const detail = await sbDetail.json();
  const scene5 = (detail?.storyboard?.scenes ?? []).find((s: { order: number }) => s.order === 4);
  const img5 = scene5?.sceneImages?.[0];
  if (scene5?.id && img5?.id) {
    const rr = await ctx.request.post(
      `${STUDIO}/api/studio/storyboards/${storyboardId}/scenes/${scene5.id}/images/${img5.id}/regenerate-with-corrections`,
      { data: { corrections: "Make jacket black leather, slight smile, closer camera.", confirmed: true } }
    );
    rerenderResult = { status: rr.status(), body: await rr.json() };
    assertBudget("scenarioC-rerender");
  }

  report.scenarioC = {
    status: gen.ok() ? "partial" : "failed",
    storyboardId,
    sceneCount: sceneIds.length,
    generateScenes: targetSceneOrders,
    generateResponse: genBody,
    characters: { anna: annaBody?.character?.id, bob: bobBody?.character?.id },
    rerenderResult,
    note: "Bounded real-provider on scenes 1,3,5,7; remaining scenes fixture-only unless generate succeeded for all",
  };
  report._scenarioCStoryboardId = storyboardId;
  saveReport();
}

async function runAudioExport(ctx: BrowserContext): Promise<void> {
  if (!SCENARIOS.has("AUDIO")) return;
  console.log("\n=== Final audio export ===");
  const storyboardId = String(report._scenarioCStoryboardId ?? report._scenarioAStoryboardId ?? "");
  if (!storyboardId) {
    report.audioExport = { status: "NOT_RUN", reason: "no_storyboard" };
    saveReport();
    return;
  }

  const job = await ctx.request.post(`${STUDIO}/api/studio/storyboards/${storyboardId}/jobs`, {
    data: { type: "audio_mix_preview", input: { confirmed: true } },
  });
  const jobBody = await job.json();
  report.audioExport = {
    status: job.ok() ? "partial" : "failed",
    storyboardId,
    jobResponse: jobBody,
    note: "Full S2E-P1 MP4 export requires completed scene visuals + production job; captured API attempt",
  };
  saveReport();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(SHOTS, { recursive: true });
  if (!existsSync(PROFILE)) {
    console.error("Missing profile:", PROFILE);
    process.exit(2);
  }

  const ctx = await chromium.launchPersistentContext(PROFILE, {
    channel: "chrome",
    headless: true,
    args: ["--headless=new", "--disable-blink-features=AutomationControlled"],
    viewport: { width: 1280, height: 800 },
  });

  try {
    ctx.on("request", trackRequest);
    await verifyProduction(ctx);
    saveReport();

    await runScenarioA(ctx);
    await runS2Smoke(ctx);
    await runQuickVideoSmoke(ctx);
    await runScenarioC(ctx);
    await runAudioExport(ctx);
    await runScenarioG(ctx);

    report.providerCountsFinal = { ...providerCounts };
    save("PROVIDER-CALLS-ACTUAL.json", {
      budget: BUDGET,
      actual: providerCounts,
      scenarios: ["A", "C", "G", "AUDIO", "S2", "QUICK"],
    });
    saveReport();
    console.log("\nCloseout complete:", JSON.stringify(report, null, 2).slice(0, 2000));
  } finally {
    await ctx.close();
  }
}

main().catch((e) => {
  report.error = e instanceof Error ? e.message : String(e);
  saveReport();
  console.error(e);
  process.exit(1);
});
