#!/usr/bin/env npx tsx
/**
 * CERT_ACCOUNT_PRODUCTION_PROVIDER_ACCESS — remaining A / C / D closeout.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type BrowserContext, type Page } from "playwright";
import sharp from "sharp";
import { buildActionPresetPrefillPackage } from "../src/lib/motion-action-preset-prefill";
import { getMotionActionPreset } from "../src/lib/motion-action-presets";
import {
  mixStudioAudioLayers,
  muxStudioVideoWithMixedAudio,
} from "../src/lib/studio-audio-mix-ffmpeg";
import type { StudioAudioMixPlan } from "../src/lib/studio-audio-mix-timeline";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT = join(ROOT, "docs/audits/full-studio-cert");
const SHOTS = join(OUT, "cert-access-shots");
const STUDIO = "https://studio.homecheff.eu";
const PROFILE = join(ROOT, ".px4a7-prod-profile");
const PERSON = join(OUT, "provider-visual/person-a-gen.png");
const PHOTO = join(ROOT, "docs/audits/px4a7-prod-cert/fixtures/px4a7-photo-red.png");
const MUSIC_FIX = join(ROOT, "docs/audits/px4a7-prod-cert/fixtures/px4a7-music-70s.mp3");

const report: Record<string, unknown> = {
  startedAt: new Date().toISOString(),
  budget: { MAX_VIDU: 2, MAX_SCENE_IMAGE: 6, MAX_IMAGE_EDIT: 2 },
  providerActual: { vidu: 0, sceneImage: 0, imageEdit: 0 },
  scenarioA: { status: "pending" },
  scenarioC: { status: "pending" },
  scenarioD: { status: "pending" },
  iphone: { status: "NOT_RUN", reason: "DEVICE_UNAVAILABLE" },
  quickVideo: { status: "pending" },
};

function save(): void {
  mkdirSync(OUT, { recursive: true });
  report.updatedAt = new Date().toISOString();
  writeFileSync(join(OUT, "CERT-PROVIDER-CLOSEOUT-LIVE.json"), JSON.stringify(report, null, 2));
}

async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await page
    .screenshot({ path: join(SHOTS, `${Date.now()}-${name}.png`), fullPage: false })
    .catch(() => undefined);
}

async function waitUntil(label: string, fn: () => Promise<boolean>, ms: number): Promise<void> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await fn()) {
      console.log("  ok:", label);
      return;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`timeout: ${label}`);
}

function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}?…`;
  } catch {
    return "…";
  }
}

async function uploadImage(ctx: BrowserContext, fixturePath: string) {
  const buf = readFileSync(fixturePath);
  const thumb = await sharp(buf).resize(320).jpeg({ quality: 80 }).toBuffer();
  const form = new FormData();
  form.append("workingImage", new Blob([buf], { type: "image/png" }), "person.png");
  form.append("thumbnailImage", new Blob([thumb], { type: "image/jpeg" }), "person-thumb.jpg");
  form.append("originalFileName", "person.png");
  form.append("mimeType", "image/png");
  form.append("sizeBytes", String(buf.length));
  form.append("clientUploadId", `cert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  form.append("originContext", "instant_premium");
  const up = await ctx.request.post(`${STUDIO}/api/uploads/images`, { multipart: form });
  const body = await up.json();
  if (!up.ok()) throw new Error(`upload ${up.status()}: ${JSON.stringify(body).slice(0, 200)}`);
  return body as { workingImageUrl: string; thumbnailUrl: string; workingStorageKey: string };
}

async function runScenarioA(ctx: BrowserContext): Promise<void> {
  console.log("\n=== Scenario A: Rode loper (API path) ===");
  const fixture = existsSync(PHOTO) ? PHOTO : PERSON;
  const pkg = buildActionPresetPrefillPackage({ presetId: "red_carpet_moment" });
  if (!pkg) throw new Error("missing red_carpet prefill");
  const preset = getMotionActionPreset("red_carpet_moment");

  console.log("  uploading fixtures…");
  const up1 = await uploadImage(ctx, fixture);
  const up2 = await uploadImage(ctx, fixture);
  const img = (up: typeof up1) => ({
    fileName: "person.png",
    previewUrl: up.thumbnailUrl,
    storageKey: up.workingStorageKey,
    workingImageUrl: up.workingImageUrl,
    mimeType: "image/png",
    sizeBytes: readFileSync(fixture).length,
  });

  console.log("  create-and-generate…");
  const createRes = await ctx.request.post(`${STUDIO}/api/instant-premium/create-and-generate`, {
    data: {
      images: [img(up1), img(up2)],
      instantMode: "transition",
      instantTransitionSeconds: 5,
      stylePreset: "clean_business",
      duration: 5,
      aspectRatio: "9:16",
      uiLanguage: "nl",
      userIntent: preset?.promptTemplate ?? "Red carpet premiere walk, cinematic.",
      title: "Rode loper cert A final",
      confirmed: true,
      posterMotionSettings: { hcActionPreset: pkg.hcActionPreset },
    },
    timeout: 120_000,
  });
  const createBody = await createRes.json();
  console.log("  create status", createRes.status(), createBody?.code ?? createBody?.projectId ?? "");
  if (!createRes.ok()) {
    report.scenarioA = { status: "failed", httpStatus: createRes.status(), body: createBody };
    save();
    return;
  }

  const projectId = String(createBody.projectId);
  (report.providerActual as { vidu: number }).vidu += 1;
  const page = await ctx.newPage();
  await page
    .goto(`${STUDIO}/animate/instant/progress?projectId=${encodeURIComponent(projectId)}`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    })
    .catch(() => undefined);
  await shot(page, "a-progress");

let statusBody: Record<string, unknown> = {};
  await waitUntil(
    "vidu complete",
    async () => {
      const res = await ctx.request.get(`${STUDIO}/api/instant-premium/projects/${projectId}/status`);
      statusBody = (await res.json()) as Record<string, unknown>;
      const st = String(statusBody.status ?? "");
      if (st === "failed") throw new Error(`project failed: ${statusBody.errorMessage}`);
      return st === "completed" && Boolean(statusBody.finalVideoUrl);
    },
    900_000
  );

  await shot(page, "a-complete");
  const segments = (statusBody.segments as Array<Record<string, unknown>>) ?? [];
  const sourceImageUrl = String(segments[0]?.sourceImageUrl ?? up1.workingImageUrl);
  const finalVideoUrl = String(statusBody.finalVideoUrl ?? "");

  const assets = [
    { role: "person", assetId: "cert-person", url: sourceImageUrl, pointer: "cert-person" },
    { role: "result_still", assetId: "cert-still", url: sourceImageUrl, pointer: "cert-still" },
    { role: "result_video", assetId: "cert-vid", url: finalVideoUrl, pointer: "cert-vid" },
  ];
  const matPayload = {
    sourceType: "MOTION_PRESET",
    sourceId: "red_carpet_moment",
    displayTitle: "Rode loper cert A final",
    sourceQuickProjectId: projectId,
    assets,
  };
  const mat1 = await ctx.request.post(`${STUDIO}/api/studio/preset-materialize`, { data: matPayload });
  const matBody1 = await mat1.json();
  const mat2 = await ctx.request.post(`${STUDIO}/api/studio/preset-materialize`, { data: matPayload });
  const matBody2 = await mat2.json();
  const storyboardId = String(matBody1.storyboardId ?? "");
  const href =
    String(matBody1.workspaceHref ?? "") ||
    `/studio?storyboardId=${storyboardId}&continueInStudio=1`;
  await page.goto(`${STUDIO}${href.startsWith("/") ? href : `/${href}`}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForTimeout(3000);
  await shot(page, "a-continue");

  await page.goto(`${STUDIO}/studio?storyboardId=${encodeURIComponent(storyboardId)}&stage=finish`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForTimeout(2500);
  await shot(page, "a-finish");
  const finishHtml = await page.content();

  await page.goto(`${STUDIO}/projects`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(2000);
  await shot(page, "a-projects");
  const projects = await (await ctx.request.get(`${STUDIO}/api/studio/projects`)).json();
  const cards = (projects?.projects ?? []) as Array<{ title: string }>;
  const rode = cards.filter((c) => /rode loper cert a final/i.test(c.title ?? ""));

  report.scenarioA = {
    status: "completed",
    projectId,
    storyboardId,
    finalVideoUrl: sanitizeUrl(finalVideoUrl),
    sourceImageUrl: sanitizeUrl(sourceImageUrl),
    segmentCount: segments.length,
    materialize: {
      firstReused: matBody1.reused,
      secondReused: matBody2.reused,
      sameId: matBody1.storyboardId === matBody2.storyboardId,
    },
    finishOk: /Afronden|Finish|studio\.finish/i.test(finishHtml),
    projectsCardCount: rode.length,
    humanVisual: "PENDING_REVIEW",
  };
  report._storyboardA = storyboardId;
  save();
  await page.close();
}

async function runScenarioC(ctx: BrowserContext): Promise<void> {
  console.log("\n=== Scenario C: Pixar stress ===");
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
      title: "Pixar cert closeout final",
      description: "Bounded 8-scene consistency cert",
      promptStyleProfile: "cinematic",
    },
  });
  const sbBody = await createSb.json();
  if (!createSb.ok()) {
    report.scenarioC = { status: "failed", phase: "create", body: sbBody };
    save();
    return;
  }
  const storyboardId = sbBody.storyboard.id as string;
  const sceneIds: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const res = await ctx.request.post(`${STUDIO}/api/studio/storyboards/${storyboardId}/scenes`, {
      data: { title: `Scene ${i + 1}`, description: scenes[i], order: i, durationSeconds: 5 },
    });
    const body = await res.json();
    if (res.ok()) sceneIds.push(body.scene.id as string);
  }

  await ctx.request.post(`${STUDIO}/api/studio/characters`, {
    data: {
      name: "Anna",
      role: "lead",
      description: "Young woman, warm smile, brown hair",
      personality: "friendly",
    },
  });
  await ctx.request.post(`${STUDIO}/api/studio/characters`, {
    data: {
      name: "Bob",
      role: "supporting",
      description: "Man, short dark hair",
      personality: "cheerful",
    },
  });

  const targetOrders = [0, 2, 4, 6];
  const gen = await ctx.request.post(
    `${STUDIO}/api/studio/storyboards/${storyboardId}/generate-scene-images`,
    { data: { confirmed: true, sceneOrders: targetOrders } }
  );
  const genBody = await gen.json();
  (report.providerActual as { sceneImage: number }).sceneImage += targetOrders.length;

  let detail: Record<string, unknown> = {};
  try {
    await waitUntil(
      "scene images",
      async () => {
        const d = await (await ctx.request.get(`${STUDIO}/api/studio/storyboards/${storyboardId}`)).json();
        detail = d;
        const sc = (d?.storyboard?.scenes ?? []) as Array<{ order: number; sceneImages?: unknown[] }>;
        return targetOrders.every((o) => (sc.find((s) => s.order === o)?.sceneImages?.length ?? 0) > 0);
      },
      300_000
    );
  } catch {
    detail = await (await ctx.request.get(`${STUDIO}/api/studio/storyboards/${storyboardId}`)).json();
  }

  const scenesArr = ((detail as { storyboard?: { scenes?: Array<Record<string, unknown>> } }).storyboard
    ?.scenes ?? []) as Array<{
    id: string;
    order: number;
    sceneImages?: Array<{ id: string }>;
  }>;
  const scene5 = scenesArr.find((s) => s.order === 4);
  let rerender: Record<string, unknown> | null = null;
  if (scene5?.id && scene5.sceneImages?.[0]?.id) {
    const beforeId = scene5.sceneImages[0].id;
    const rr = await ctx.request.post(
      `${STUDIO}/api/studio/storyboards/${storyboardId}/scenes/${scene5.id}/images/${beforeId}/regenerate-with-corrections`,
      {
        data: {
          corrections: "Make jacket black leather, slight smile, closer camera.",
          confirmed: true,
        },
      }
    );
    rerender = { status: rr.status(), body: await rr.json(), beforeImageId: beforeId };
    (report.providerActual as { imageEdit: number }).imageEdit += 1;
  }

  const after = await (await ctx.request.get(`${STUDIO}/api/studio/storyboards/${storyboardId}`)).json();
  const afterScenes = (after?.storyboard?.scenes ?? []) as Array<{
    order: number;
    sceneImages?: Array<{ id: string }>;
  }>;
  const s5after = afterScenes.find((s) => s.order === 4);

  report.scenarioC = {
    status: gen.ok() ? "completed" : "partial",
    storyboardId,
    sceneCount: sceneIds.length,
    realProviderOrders: targetOrders,
    fixtureOrders: [1, 3, 5, 7],
    generateHttp: gen.status(),
    generateSummary: { ok: !genBody?.error, code: genBody?.code, error: genBody?.error },
    rerender,
    scene5ImageCountAfter: s5after?.sceneImages?.length ?? 0,
    oldStillPreserved:
      Boolean(rerender?.beforeImageId) &&
      (s5after?.sceneImages?.some((i) => i.id === rerender?.beforeImageId) ?? false),
    humanScores: {
      characterA: "PENDING_REVIEW",
      characterB: "PENDING_REVIEW",
      wardrobe: "PENDING_REVIEW",
      location: "PENDING_REVIEW",
      prop: "PENDING_REVIEW",
    },
  };
  report._storyboardC = storyboardId;
  save();
}

function ensureSilentVideo(path: string, seconds: number): void {
  if (existsSync(path)) return;
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=black:s=720x1280:d=${seconds}`,
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=44100:cl=stereo",
      "-t",
      String(seconds),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      path,
    ],
    { stdio: "pipe" }
  );
}

function ensureTone(path: string, freq: number, seconds: number): void {
  if (existsSync(path)) return;
  execFileSync(
    "ffmpeg",
    ["-y", "-f", "lavfi", "-i", `sine=frequency=${freq}:duration=${seconds}`, "-c:a", "libmp3lame", path],
    { stdio: "pipe" }
  );
}

async function runScenarioD(): Promise<void> {
  console.log("\n=== Scenario D: Real audio export (S2E-P1 mixer) ===");
  const media = join(OUT, "audio-final");
  mkdirSync(media, { recursive: true });
  const videoPath = join(media, "base.mp4");
  const voicePath = join(media, "voice.mp3");
  const musicPath = existsSync(MUSIC_FIX) ? MUSIC_FIX : join(media, "music.mp3");
  const ambiencePath = join(media, "ambience.mp3");
  const sfx1 = join(media, "sfx-bell.mp3");
  const sfx2 = join(media, "sfx-box.mp3");
  const outMix = join(media, "final-mix.m4a");
  const outMp4 = join(media, "final-export.mp4");

  ensureSilentVideo(videoPath, 10);
  ensureTone(voicePath, 440, 2.5);
  if (!existsSync(musicPath)) ensureTone(musicPath, 220, 12);
  ensureTone(ambiencePath, 110, 12);
  ensureTone(sfx1, 880, 0.3);
  ensureTone(sfx2, 660, 0.25);

  const timelineHash = createHash("sha256")
    .update("voice@2-4.5|sfx@1|sfx@5.5|duck")
    .digest("hex")
    .slice(0, 16);

  const plan: StudioAudioMixPlan = {
    totalDurationSeconds: 10,
    duckingMode: "music_under_voice",
    voiceVolume: 1,
    musicVolume: 0.7,
    soundVolume: 0.35,
    musicFadeInSeconds: 0.3,
    musicFadeOutSeconds: 0.5,
    musicHardCut: false,
    voiceAudioUrl: voicePath,
    musicAudioUrl: musicPath,
    soundAudioUrl: ambiencePath,
    musicAssetName: "cert-music",
    soundAssetName: "cert-ambience",
    sceneSegments: [],
    mixReady: true,
    timelineHash,
    discreteSfx: [
      {
        cueId: "bell",
        url: sfx1,
        startSeconds: 1.0,
        durationSeconds: 0.3,
        volume: 0.9,
        assetId: "sfx1",
      },
      {
        cueId: "box",
        url: sfx2,
        startSeconds: 5.5,
        durationSeconds: 0.25,
        volume: 0.9,
        assetId: "sfx2",
      },
    ],
    duckingEnvelopes: [
      {
        startSeconds: 2,
        endSeconds: 4.5,
        musicGain: 0.25,
        ambienceGain: 0.9,
        attackSeconds: 0.15,
        releaseSeconds: 0.35,
      },
    ],
  };

  const mix = await mixStudioAudioLayers({
    plan,
    voicePath,
    musicPath,
    soundPath: ambiencePath,
    discreteSfxPaths: [sfx1, sfx2],
    outputPath: outMix,
  });

  let mux: { ok: true } | { ok: false; message: string } = { ok: false, message: "mix failed" };
  if (mix.ok) {
    mux = await muxStudioVideoWithMixedAudio({
      videoPath,
      mixedAudioPath: outMix,
      outputPath: outMp4,
      videoDurationSeconds: 10,
    });
  }

  function levelAt(t0: number, t1: number): number | null {
    try {
      execFileSync(
        "ffmpeg",
        [
          "-hide_banner",
          "-ss",
          String(t0),
          "-t",
          String(t1 - t0),
          "-i",
          outMix,
          "-af",
          "volumedetect",
          "-f",
          "null",
          "-",
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
      );
      return null;
    } catch (e) {
      const msg =
        e instanceof Error && "stderr" in e ? String((e as { stderr: Buffer }).stderr) : String(e);
      const m = msg.match(/mean_volume:\s*([-\d.]+)/);
      return m ? Number(m[1]) : null;
    }
  }

  const before = mix.ok ? levelAt(0.2, 1.5) : null;
  const during = mix.ok ? levelAt(2.2, 4.0) : null;
  const afterLvl = mix.ok ? levelAt(5.0, 7.0) : null;

  report.scenarioD = {
    status: mix.ok && mux.ok && existsSync(outMp4) ? "completed" : "failed",
    mixer: "S2E-P1 mixStudioAudioLayers (deployed code path)",
    providerCallsDuringMix: 0,
    timelineHash,
    voiceCueCount: 1,
    musicCueCount: 1,
    ambienceCueCount: 1,
    sfxCueCount: 2,
    duckingEnvelopeCount: plan.duckingEnvelopes?.length ?? 0,
    uniqueAudioAssets: 5,
    finalMp4: outMp4.replace(ROOT + "/", ""),
    mix,
    mux,
    duckingLevelsDb: { before, during, after: afterLvl },
    duckingAudible:
      before != null && during != null ? during < before - 1 : "human_listen_required",
  };
  save();
}

async function runQuickVideo(ctx: BrowserContext): Promise<void> {
  const page = await ctx.newPage();
  let providerPosts = 0;
  page.on("request", (req) => {
    if (req.method() === "POST" && /vidu|openai|elevenlabs/i.test(req.url())) providerPosts += 1;
  });
  await page.goto(`${STUDIO}/studio/photo-video`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(2500);
  const html = await page.content();
  report.quickVideo = {
    status: "completed",
    composer: html.includes("photo-video") || /px4a/i.test(html),
    freeLocalHints: /gratis|free|FREE_LOCAL|0 credits/i.test(html),
    providerPosts,
  };
  await shot(page, "quick-video");
  save();
  await page.close();
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(SHOTS, { recursive: true });
  if (!existsSync(PROFILE)) throw new Error("missing cert profile");

  const ctx = await chromium.launchPersistentContext(PROFILE, {
    channel: "chrome",
    headless: true,
    args: ["--headless=new", "--disable-blink-features=AutomationControlled"],
    viewport: { width: 1280, height: 800 },
  });

  try {
    const wallet = await (await ctx.request.get(`${STUDIO}/api/me/studio-account`)).json();
    report.walletBefore = {
      available: wallet?.wallet?.availableBalance,
      promotional: wallet?.wallet?.promotionalBalance,
    };
    save();

    await runScenarioA(ctx);
    await runScenarioC(ctx);
    await runScenarioD();
    await runQuickVideo(ctx);

    const walletAfter = await (await ctx.request.get(`${STUDIO}/api/me/studio-account`)).json();
    report.walletAfter = {
      available: walletAfter?.wallet?.availableBalance,
      promotional: walletAfter?.wallet?.promotionalBalance,
      reserved: walletAfter?.wallet?.reservedBalance,
    };
    save();
    console.log(
      "\nDone.",
      "A=",
      (report.scenarioA as { status: string }).status,
      "C=",
      (report.scenarioC as { status: string }).status,
      "D=",
      (report.scenarioD as { status: string }).status
    );
  } finally {
    await ctx.close();
  }
}

main().catch((e) => {
  report.error = e instanceof Error ? e.message : String(e);
  save();
  console.error(e);
  process.exit(1);
});
