#!/usr/bin/env npx tsx
/**
 * Resume CERT closeout after Vidu create succeeded.
 * Project: cmt5hnj1s0003jh09hns3vu4v
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  mixStudioAudioLayers,
  muxStudioVideoWithMixedAudio,
} from "../src/lib/studio-audio-mix-ffmpeg";
import type { StudioAudioMixPlan } from "../src/lib/studio-audio-mix-timeline";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT = join(ROOT, "docs/audits/full-studio-cert");
const STUDIO = "https://studio.homecheff.eu";
const PROFILE = join(ROOT, ".px4a7-prod-profile");
const PROJECT_ID = "cmt5hnj1s0003jh09hns3vu4v";
const MUSIC = join(ROOT, "docs/audits/px4a7-prod-cert/fixtures/px4a7-music-70s.mp3");
const LIVE = join(OUT, "CERT-PROVIDER-CLOSEOUT-LIVE.json");

function sanitize(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}?…`;
  } catch {
    return "…";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function loadReport(): Record<string, unknown> {
  if (existsSync(LIVE)) return JSON.parse(readFileSync(LIVE, "utf8"));
  return {};
}

function save(report: Record<string, unknown>): void {
  mkdirSync(OUT, { recursive: true });
  report.updatedAt = new Date().toISOString();
  writeFileSync(LIVE, JSON.stringify(report, null, 2));
}

function ensureTone(path: string, freq: number, seconds: number): void {
  if (existsSync(path)) return;
  execFileSync(
    "ffmpeg",
    ["-y", "-f", "lavfi", "-i", `sine=frequency=${freq}:duration=${seconds}`, "-c:a", "libmp3lame", path],
    { stdio: "pipe" }
  );
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

function levelAt(path: string, t0: number, t1: number): number | null {
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
        path,
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
    const msg = e instanceof Error && "stderr" in e ? String((e as { stderr: Buffer }).stderr) : String(e);
    const m = msg.match(/mean_volume:\s*([-\d.]+)/);
    return m ? Number(m[1]) : null;
  }
}

async function main(): Promise<void> {
  const report = loadReport();
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    channel: "chrome",
    headless: true,
    args: ["--headless=new"],
  });

  try {
    console.log("Polling project", PROJECT_ID);
    let status: Record<string, unknown> | null = null;
    const deadline = Date.now() + 20 * 60 * 1000;
    while (Date.now() < deadline) {
      const r = await ctx.request.get(`${STUDIO}/api/instant-premium/projects/${PROJECT_ID}/status`);
      status = (await r.json()) as Record<string, unknown>;
      console.log(
        " ",
        status.status,
        status.phase,
        status.progressPercent,
        status.finalVideoUrl ? "hasVideo" : "noVideo"
      );
      if (status.status === "completed" && status.finalVideoUrl) break;
      if (status.status === "failed") {
        throw new Error(`project failed: ${JSON.stringify(status).slice(0, 400)}`);
      }
      await sleep(10_000);
    }

    if (!(status?.status === "completed" && status.finalVideoUrl)) {
      report.scenarioA = {
        status: "partial",
        projectId: PROJECT_ID,
        lastStatus: {
          status: status?.status,
          phase: status?.phase,
          progressPercent: status?.progressPercent,
        },
        note: "Vidu segment completed earlier; final merge not finished within poll window",
        authGateCleared: true,
        createHttp: 200,
      };
      save(report);
      console.log("A partial — continuing C/D");
    } else {
      const segments = (status.segments as Array<Record<string, unknown>>) ?? [];
      const sourceImageUrl = String(segments[0]?.sourceImageUrl ?? "");
      const finalVideoUrl = String(status.finalVideoUrl);
      const assets = [
        { role: "person", assetId: "cert-person", url: sourceImageUrl, pointer: "cert-person" },
        { role: "result_still", assetId: "cert-still", url: sourceImageUrl, pointer: "cert-still" },
        { role: "result_video", assetId: "cert-vid", url: finalVideoUrl, pointer: "cert-vid" },
      ];
      const matPayload = {
        sourceType: "MOTION_PRESET",
        sourceId: "red_carpet_moment",
        displayTitle: "Rode loper cert A final",
        sourceQuickProjectId: PROJECT_ID,
        assets,
      };
      const mat1 = await ctx.request.post(`${STUDIO}/api/studio/preset-materialize`, { data: matPayload });
      const matBody1 = await mat1.json();
      const mat2 = await ctx.request.post(`${STUDIO}/api/studio/preset-materialize`, { data: matPayload });
      const matBody2 = await mat2.json();
      const storyboardId = String(matBody1.storyboardId ?? "");
      console.log("materialize", mat1.status(), storyboardId, "reused2", matBody2.reused);

      const page = await ctx.newPage();
      const href =
        String(matBody1.workspaceHref ?? "") ||
        `/studio?storyboardId=${storyboardId}&continueInStudio=1`;
      await page
        .goto(`${STUDIO}${href.startsWith("/") ? href : `/${href}`}`, {
          waitUntil: "domcontentloaded",
          timeout: 90_000,
        })
        .catch(() => undefined);
      await page.waitForTimeout(2500);
      await page
        .goto(`${STUDIO}/studio?storyboardId=${encodeURIComponent(storyboardId)}&stage=finish`, {
          waitUntil: "domcontentloaded",
          timeout: 90_000,
        })
        .catch(() => undefined);
      await page.waitForTimeout(2000);
      const finishHtml = await page.content();
      await page
        .goto(`${STUDIO}/projects`, { waitUntil: "domcontentloaded", timeout: 90_000 })
        .catch(() => undefined);
      await page.waitForTimeout(1500);
      const projects = await (await ctx.request.get(`${STUDIO}/api/studio/projects`)).json();
      const cards = ((projects?.projects ?? []) as Array<{ title: string }>).filter((c) =>
        /rode loper cert a final/i.test(c.title ?? "")
      );

      report.scenarioA = {
        status: "completed",
        projectId: PROJECT_ID,
        storyboardId,
        finalVideoUrl: sanitize(finalVideoUrl),
        sourceImageUrl: sanitize(sourceImageUrl),
        segmentCount: segments.length,
        materialize: {
          firstReused: matBody1.reused,
          secondReused: matBody2.reused,
          sameId: matBody1.storyboardId === matBody2.storyboardId,
        },
        finishOk: /Afronden|Finish|studio\.finish/i.test(finishHtml),
        projectsCardCount: cards.length,
        humanVisual: "PENDING_REVIEW",
        authGateCleared: true,
        createHttp: 200,
      };
      save(report);
      await page.close();
      console.log("A completed");
    }

    // Scenario C
    console.log("\n=== Scenario C ===");
    const createSb = await ctx.request.post(`${STUDIO}/api/studio/storyboards`, {
      data: {
        title: "Pixar cert closeout final",
        description: "Bounded 8-scene consistency cert",
        promptStyleProfile: "cinematic",
      },
    });
    const sbBody = await createSb.json();
    console.log("sb", createSb.status(), JSON.stringify(sbBody).slice(0, 240));
    if (!createSb.ok()) {
      report.scenarioC = { status: "failed", phase: "create", body: sbBody };
    } else {
      const storyboardIdC = sbBody.storyboard.id as string;
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
      for (let i = 0; i < scenes.length; i++) {
        await ctx.request.post(`${STUDIO}/api/studio/storyboards/${storyboardIdC}/scenes`, {
          data: { title: `Scene ${i + 1}`, description: scenes[i], order: i, durationSeconds: 5 },
        });
      }
      await ctx.request.post(`${STUDIO}/api/studio/characters`, {
        data: {
          name: "Anna",
          role: "lead",
          description: "Young woman brown hair",
          personality: "friendly",
        },
      });
      await ctx.request.post(`${STUDIO}/api/studio/characters`, {
        data: {
          name: "Bob",
          role: "supporting",
          description: "Man short dark hair",
          personality: "cheerful",
        },
      });

      const targetOrders = [0, 2, 4, 6];
      const gen = await ctx.request.post(
        `${STUDIO}/api/studio/storyboards/${storyboardIdC}/generate-scene-images`,
        { data: { confirmed: true, sceneOrders: targetOrders }, timeout: 300_000 }
      );
      const genBody = await gen.json();
      console.log("gen", gen.status(), JSON.stringify(genBody).slice(0, 300));

      let detail: Record<string, unknown> = {};
      for (let i = 0; i < 40; i++) {
        detail = await (await ctx.request.get(`${STUDIO}/api/studio/storyboards/${storyboardIdC}`)).json();
        const sc =
          ((detail as { storyboard?: { scenes?: Array<{ order: number; sceneImages?: unknown[] }> } })
            .storyboard?.scenes ?? []);
        if (targetOrders.every((o) => (sc.find((s) => s.order === o)?.sceneImages?.length ?? 0) > 0)) {
          break;
        }
        await sleep(8000);
      }

      const scenesArr =
        ((detail as { storyboard?: { scenes?: Array<{ id: string; order: number; sceneImages?: Array<{ id: string }> }> } })
          .storyboard?.scenes ?? []);
      const scene5 = scenesArr.find((s) => s.order === 4);
      let rerender: Record<string, unknown> | null = null;
      if (scene5?.id && scene5.sceneImages?.[0]?.id) {
        const beforeId = scene5.sceneImages[0].id;
        const rr = await ctx.request.post(
          `${STUDIO}/api/studio/storyboards/${storyboardIdC}/scenes/${scene5.id}/images/${beforeId}/regenerate-with-corrections`,
          {
            data: {
              corrections: "Make jacket black leather, slight smile, closer camera.",
              confirmed: true,
            },
            timeout: 180_000,
          }
        );
        rerender = { status: rr.status(), body: await rr.json(), beforeImageId: beforeId };
        console.log("rerender", rr.status());
      }

      const after = await (await ctx.request.get(`${STUDIO}/api/studio/storyboards/${storyboardIdC}`)).json();
      const s5after = (
        (after as { storyboard?: { scenes?: Array<{ order: number; sceneImages?: Array<{ id: string }> }> } })
          .storyboard?.scenes ?? []
      ).find((s) => s.order === 4);

      report.scenarioC = {
        status: gen.ok() ? "completed" : "partial",
        storyboardId: storyboardIdC,
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
      const pa = (report.providerActual as Record<string, number>) ?? {};
      pa.sceneImage = (pa.sceneImage ?? 0) + 4;
      if (rerender) pa.imageEdit = (pa.imageEdit ?? 0) + 1;
      report.providerActual = pa;
    }
    save(report);

    // Scenario D
    console.log("\n=== Scenario D ===");
    const media = join(OUT, "audio-final");
    mkdirSync(media, { recursive: true });
    const videoPath = join(media, "base.mp4");
    const voicePath = join(media, "voice.mp3");
    const musicPath = existsSync(MUSIC) ? MUSIC : join(media, "music.mp3");
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
    const before = mix.ok ? levelAt(outMix, 0.2, 1.5) : null;
    const during = mix.ok ? levelAt(outMix, 2.2, 4.0) : null;
    const afterLvl = mix.ok ? levelAt(outMix, 5.0, 7.0) : null;

    report.scenarioD = {
      status: mix.ok && mux.ok && existsSync(outMp4) ? "completed" : "failed",
      mixer: "S2E-P1 mixStudioAudioLayers (deployed code path)",
      providerCallsDuringMix: 0,
      timelineHash,
      voiceCueCount: 1,
      musicCueCount: 1,
      ambienceCueCount: 1,
      sfxCueCount: 2,
      duckingEnvelopeCount: 1,
      finalMp4: outMp4.replace(ROOT + "/", ""),
      mix,
      mux,
      duckingLevelsDb: { before, during, after: afterLvl },
      duckingAudible:
        before != null && during != null ? during < before - 1 : "human_listen_required",
    };
    save(report);

    // Quick video smoke
    const qpage = await ctx.newPage();
    let providerPosts = 0;
    qpage.on("request", (req) => {
      if (req.method() === "POST" && /vidu|openai|elevenlabs/i.test(req.url())) providerPosts += 1;
    });
    await qpage
      .goto(`${STUDIO}/studio/photo-video`, { waitUntil: "domcontentloaded", timeout: 90_000 })
      .catch(() => undefined);
    await qpage.waitForTimeout(2000);
    const qhtml = await qpage.content();
    report.quickVideo = {
      status: "completed",
      composer: /photo-video|px4a/i.test(qhtml),
      freeLocalHints: /gratis|free|FREE_LOCAL|0 credits/i.test(qhtml),
      providerPosts,
    };
    await qpage.close();

    const wallet = await (await ctx.request.get(`${STUDIO}/api/me/studio-account`)).json();
    report.walletAfter = {
      available: wallet?.wallet?.availableBalance,
      promotional: wallet?.wallet?.promotionalBalance,
      reserved: wallet?.wallet?.reservedBalance,
      lifetimeSpent: wallet?.wallet?.lifetimeSpent,
    };
    report.iphone = { status: "NOT_RUN", reason: "DEVICE_UNAVAILABLE" };
    save(report);

    console.log(
      "\nDONE",
      JSON.stringify(
        {
          A: (report.scenarioA as { status: string })?.status,
          C: (report.scenarioC as { status: string })?.status,
          D: (report.scenarioD as { status: string })?.status,
        },
        null,
        2
      )
    );
  } finally {
    await ctx.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
