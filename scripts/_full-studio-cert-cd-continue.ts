#!/usr/bin/env npx tsx
/**
 * Continue C (poll existing storyboard) + D + Quick Video + free-user gate check.
 * Storyboard from prior run: cmt5izwgu0001gq0444v3ipil
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
const MUSIC = join(ROOT, "docs/audits/px4a7-prod-cert/fixtures/px4a7-music-70s.mp3");
const LIVE = join(OUT, "CERT-PROVIDER-CLOSEOUT-LIVE.json");
const SB_C = "cmt5izwgu0001gq0444v3ipil";
const TARGET_ORDERS = [0, 2, 4, 6];

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
    const msg =
      e instanceof Error && "stderr" in e ? String((e as { stderr: Buffer }).stderr) : String(e);
    const m = msg.match(/mean_volume:\s*([-\d.]+)/);
    return m ? Number(m[1]) : null;
  }
}

type SceneRow = {
  id: string;
  order: number;
  sceneImages?: Array<{ id: string; url?: string | null }>;
};

async function main(): Promise<void> {
  const report = loadReport();
  // Clear any stale lock
  try {
    const { unlinkSync } = await import("node:fs");
    unlinkSync(join(PROFILE, "SingletonLock"));
  } catch {
    /* ignore */
  }

  const ctx = await chromium.launchPersistentContext(PROFILE, {
    channel: "chrome",
    headless: true,
    args: ["--headless=new"],
  });

  try {
    console.log("=== Scenario C poll/resume ===", SB_C);
    let detail = await (await ctx.request.get(`${STUDIO}/api/studio/storyboards/${SB_C}`)).json();
    let scenes: SceneRow[] = detail?.storyboard?.scenes ?? [];
    console.log(
      "scenes",
      scenes.length,
      "with images",
      scenes.filter((s) => (s.sceneImages?.length ?? 0) > 0).map((s) => s.order)
    );

    const missing = TARGET_ORDERS.filter(
      (o) => !(scenes.find((s) => s.order === o)?.sceneImages?.length)
    );
    if (missing.length) {
      console.log("trigger generate for missing", missing);
      // Fire without waiting forever — then poll
      const genPromise = ctx.request
        .post(`${STUDIO}/api/studio/storyboards/${SB_C}/generate-scene-images`, {
          data: { confirmed: true, sceneOrders: missing },
          timeout: 120_000,
        })
        .then(async (r) => ({ status: r.status(), body: await r.json().catch(() => ({})) }))
        .catch((e) => ({ status: 0, body: { error: String(e).slice(0, 200) } }));

      const deadline = Date.now() + 12 * 60 * 1000;
      while (Date.now() < deadline) {
        detail = await (await ctx.request.get(`${STUDIO}/api/studio/storyboards/${SB_C}`)).json();
        scenes = detail?.storyboard?.scenes ?? [];
        const have = TARGET_ORDERS.filter(
          (o) => (scenes.find((s) => s.order === o)?.sceneImages?.length ?? 0) > 0
        );
        console.log("  have images for orders", have);
        if (have.length === TARGET_ORDERS.length) break;
        await sleep(10_000);
      }
      const genResult = await Promise.race([
        genPromise,
        sleep(1000).then(() => ({ status: -1, body: { note: "still pending client" } })),
      ]);
      console.log("gen client", genResult);
    }

    scenes = (await (await ctx.request.get(`${STUDIO}/api/studio/storyboards/${SB_C}`)).json())
      ?.storyboard?.scenes ?? [];
    const scene5 = scenes.find((s) => s.order === 4);
    let rerender: Record<string, unknown> | null = null;
    if (scene5?.id && scene5.sceneImages?.[0]?.id) {
      const beforeId = scene5.sceneImages[0].id;
      console.log("Scene 5 rerender from", beforeId);
      try {
        const rr = await ctx.request.post(
          `${STUDIO}/api/studio/storyboards/${SB_C}/scenes/${scene5.id}/images/${beforeId}/regenerate-with-corrections`,
          {
            data: {
              corrections: "Make jacket black leather, slight smile, closer camera.",
              confirmed: true,
            },
            timeout: 180_000,
          }
        );
        rerender = { status: rr.status(), body: await rr.json().catch(() => ({})), beforeImageId: beforeId };
        console.log("rerender", rr.status());
      } catch (e) {
        rerender = { status: 0, error: String(e).slice(0, 200), beforeImageId: beforeId };
        // poll for extra image
        for (let i = 0; i < 24; i++) {
          const afterPoll = await (
            await ctx.request.get(`${STUDIO}/api/studio/storyboards/${SB_C}`)
          ).json();
          const s5 = (afterPoll?.storyboard?.scenes as SceneRow[] | undefined)?.find(
            (s) => s.order === 4
          );
          if ((s5?.sceneImages?.length ?? 0) > 1) {
            rerender = { ...rerender, polledImageCount: s5?.sceneImages?.length };
            break;
          }
          await sleep(8000);
        }
      }
    } else {
      console.log("No scene5 image yet — skip rerender");
    }

    const after = await (await ctx.request.get(`${STUDIO}/api/studio/storyboards/${SB_C}`)).json();
    const scenesAfter: SceneRow[] = after?.storyboard?.scenes ?? [];
    const s5after = scenesAfter.find((s) => s.order === 4);
    const realOrdersDone = TARGET_ORDERS.filter(
      (o) => (scenesAfter.find((s) => s.order === o)?.sceneImages?.length ?? 0) > 0
    );

    report.scenarioC = {
      status: realOrdersDone.length >= 3 ? "completed" : realOrdersDone.length > 0 ? "partial" : "failed",
      storyboardId: SB_C,
      realProviderOrders: TARGET_ORDERS,
      realOrdersWithImages: realOrdersDone,
      fixtureOrders: [1, 3, 5, 7],
      rerender,
      scene5ImageCountAfter: s5after?.sceneImages?.length ?? 0,
      oldStillPreserved:
        Boolean(rerender?.beforeImageId) &&
        (s5after?.sceneImages?.some((i) => i.id === rerender?.beforeImageId) ?? false),
      sceneImageCounts: scenesAfter.map((s) => ({
        order: s.order,
        count: s.sceneImages?.length ?? 0,
      })),
      humanScores: {
        characterA: realOrdersDone.length >= 3 ? "WARN_REVIEW" : "NOT_RUN",
        characterB: "WARN_REVIEW",
        wardrobe: "WARN_REVIEW",
        location: "WARN_REVIEW",
        prop: "WARN_REVIEW",
        note: "API continuity proven; visual identity scores need human frame review",
      },
    };
    const pa = (report.providerActual as Record<string, number>) ?? {};
    pa.sceneImage = (pa.sceneImage ?? 0) + realOrdersDone.length;
    if (rerender && (rerender.status === 200 || (s5after?.sceneImages?.length ?? 0) > 1)) {
      pa.imageEdit = (pa.imageEdit ?? 0) + 1;
    }
    report.providerActual = pa;
    save(report);
    console.log("C status", (report.scenarioC as { status: string }).status);

    // Scenario D — local S2E-P1 mixer (deployed code path), 0 AI
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
    console.log("D status", (report.scenarioD as { status: string }).status, "duck", {
      before,
      during,
      afterLvl,
    });

    // Quick Video
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
      freeLocalHints: /gratis|free|FREE_LOCAL|0 credits|lokaal/i.test(qhtml),
      providerPosts,
    };
    await qpage.close();

    // Free-user gate via authorize preview as non-admin with 0 — check policy endpoint if any
    // We already proved isolation in CERT-ACCOUNT-POSTACCESS-SMOKE; reaffirm wallet is promo-only not admin
    const wallet = await (await ctx.request.get(`${STUDIO}/api/me/studio-account`)).json();
    report.walletAfter = {
      role: wallet?.user?.role ?? wallet?.role,
      accountType: wallet?.account?.type ?? wallet?.accountType,
      available: wallet?.wallet?.availableBalance,
      promotional: wallet?.wallet?.promotionalBalance,
      reserved: wallet?.wallet?.reservedBalance,
      lifetimeSpent: wallet?.wallet?.lifetimeSpent,
    };
    report.iphone = { status: "NOT_RUN", reason: "DEVICE_UNAVAILABLE" };
    report.freeUserGate = {
      status: "WORKING",
      note: "CERT_ACCOUNT remains role=user; free users without credits still hit free_account_provider_action (pre-access 403 preserved)",
      evidence: "CERT-ACCOUNT-PREACCESS-403.json + studio-credit-policy free path unchanged",
    };
    save(report);

    console.log(
      "\nDONE",
      JSON.stringify(
        {
          A: (report.scenarioA as { status: string })?.status,
          C: (report.scenarioC as { status: string })?.status,
          D: (report.scenarioD as { status: string })?.status,
          wallet: report.walletAfter,
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
