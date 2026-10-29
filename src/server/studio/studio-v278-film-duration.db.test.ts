/**
 * Realistic film lengths on a local video worker.
 * Synthetic media only. Does not call the live Render service.
 */
import assert from "node:assert/strict";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { chmod, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { pathToFileURL, fileURLToPath } from "node:url";
import { hashPassword } from "@/server/auth/session";

const execFileAsync = promisify(execFile);
const CERT_DB = "homecheff_film_cert_2u";
const SECRET = "local-film-worker-test";
const PORT = 8097;
const FFMPEG = "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg";
const FFPROBE = "/opt/homebrew/bin/ffprobe";

type Metric = {
  label: string;
  acceptMs: number;
  renderMs: number;
  rssKb: number;
  cpu: number;
  tempKb: number;
  outputBytes: number;
  duration: number;
  width: number;
  height: number;
  video: string;
  audio: string;
};

function isolatedDatabaseUrl(): string | null {
  const url = process.env.FILM_CERT_DATABASE_URL?.trim() ?? "";
  if (!url) return null;
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, "");
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error("Certification database host is not local.");
  }
  if (name !== CERT_DB) throw new Error("Certification database name is not the disposable local database.");
  if (/neon|vercel|preview|prod|ep-wild-morning|ep-purple-moon|ep-withered-moon/i.test(url)) {
    throw new Error("Certification database URL looks protected.");
  }
  return url;
}

test("async film export covers realistic lengths on the local worker", { timeout: 900_000 }, async (t) => {
  const url = isolatedDatabaseUrl();
  if (!url) {
    t.skip("FILM_CERT_DATABASE_URL is not configured");
    return;
  }
  const mediaDir = await mkdtemp(path.join(tmpdir(), "v278-film-"));
  process.env.DATABASE_URL = url;
  process.env.STUDIO_LOCAL_MEDIA_DIR = mediaDir;
  process.env.NODE_ENV = "test";
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;

  const { prisma } = await import("@/lib/prisma");
  const { createOwnedFilmProject } = await import("@/server/studio/studio-film-preparation");
  const { addTimelineClip, createFilmTimeline, getFilmTimeline } = await import("@/server/studio/studio-timeline-service");
  const { saveOwnedSceneStill } = await import("@/server/studio/studio-film-owned-still");
  const { upsertLibraryAsset } = await import("@/server/studio-library/library-asset-service");
  const { startTimelineExportJob, rememberTimelineExportRequest, readTimelineExportView } = await import(
    "@/server/studio/studio-timeline-export-job"
  );

  const stale = await prisma.studioGenerationJob.findMany({
    where: { capability: "TIMELINE_EXPORT", status: { in: ["queued", "processing"] } },
    select: { id: true, metadataJson: true },
  });
  for (const row of stale) {
    const asyncJob = Boolean(row.metadataJson && typeof row.metadataJson === "object" && (row.metadataJson as { async?: unknown }).async === true);
    if (!asyncJob) continue;
    await prisma.studioGenerationJob.update({
      where: { id: row.id },
      data: { status: "cancelled", errorCode: "cancelled", cancelledAt: new Date() },
    });
  }

  const stamp = Date.now();
  const owner = await prisma.user.create({
    data: { email: `v278-worker-${stamp}@example.test`, passwordHash: hashPassword("film-cert-local-only"), role: "user" },
  });
  const other = await prisma.user.create({
    data: { email: `v278-other-${stamp}@example.test`, passwordHash: hashPassword("film-cert-local-only"), role: "user" },
  });
  await prisma.studioAccount.create({ data: { userId: owner.id, accountType: "creator", accountStatus: "active" } });
  await prisma.studioWallet.create({
    data: { userId: owner.id, balance: 500, promotionalBalance: 500, lifetimeGranted: 500 },
  });
  await prisma.studioWallet.create({
    data: { userId: other.id, balance: 500, promotionalBalance: 500, lifetimeGranted: 500 },
  });

  const metrics: Metric[] = [];
  let worker = await startWorker(url, mediaDir);
  try {
    const missing = await fetch(`http://127.0.0.1:${PORT}/jobs/film-timeline/missing/render`, { method: "POST", body: "{}" });
    assert.equal(missing.status, 401);
    const wrong = await fetch(`http://127.0.0.1:${PORT}/jobs/film-timeline/missing/render`, {
      method: "POST",
      headers: { Authorization: "Bearer wrong-token", "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(wrong.status, 401);
    const absent = await postJob("missing-job");
    assert.equal(absent.statusCode, 404);

    const film15 = await measureFilm({
      label: "15s",
      seconds: 15,
      ownerId: owner.id,
      otherId: other.id,
      stamp,
      mediaDir,
      prisma,
      createOwnedFilmProject,
      createFilmTimeline,
      getFilmTimeline,
      addTimelineClip,
      saveOwnedSceneStill,
      upsertLibraryAsset,
      startTimelineExportJob,
      rememberTimelineExportRequest,
      readTimelineExportView,
      worker,
    });
    metrics.push(film15.metric);
    assert.equal(film15.metric.video, "h264");
    assert.equal(film15.metric.audio, "aac");
    assert.ok(film15.metric.acceptMs < 3_000, `accept ${film15.metric.acceptMs}ms`);
    assert.ok(Math.abs(film15.metric.duration - 15) < 0.8, `duration ${film15.metric.duration}`);
    assert.equal(film15.metric.width, 720);
    assert.equal(film15.metric.height, 1280);
    assert.ok(film15.distinctScenes);
    assert.ok(film15.audible);
    const repeat = await postJob(film15.jobId);
    assert.equal(repeat.statusCode, 200);
    assert.equal(repeat.libraryAssetId, film15.assetId);
    const assetCount = await prisma.studioLibraryAsset.count({
      where: { ownerId: owner.id, sourceKind: "timeline_export", sourceId: { startsWith: film15.projectId } },
    });
    assert.equal(assetCount, 1);
    assert.equal(await readTimelineExportView(film15.jobId, other.id), null);

    metrics.push((await measureFilm({
      label: "30s",
      seconds: 30,
      ownerId: owner.id,
      otherId: other.id,
      stamp,
      mediaDir,
      prisma,
      createOwnedFilmProject,
      createFilmTimeline,
      getFilmTimeline,
      addTimelineClip,
      saveOwnedSceneStill,
      upsertLibraryAsset,
      startTimelineExportJob,
      rememberTimelineExportRequest,
      readTimelineExportView,
      worker,
    })).metric);

    const film60 = await measureFilm({
      label: "60s",
      seconds: 60,
      ownerId: owner.id,
      otherId: other.id,
      stamp,
      mediaDir,
      prisma,
      createOwnedFilmProject,
      createFilmTimeline,
      getFilmTimeline,
      addTimelineClip,
      saveOwnedSceneStill,
      upsertLibraryAsset,
      startTimelineExportJob,
      rememberTimelineExportRequest,
      readTimelineExportView,
      worker,
    });
    metrics.push(film60.metric);
    if (film60.metric.rssKb > 1_500_000 || film60.metric.tempKb > 2_000_000) {
      throw new Error(`STOPPED_RESOURCE rss=${film60.metric.rssKb} temp=${film60.metric.tempKb}`);
    }
    assert.equal(film60.metric.video, "h264");
    assert.equal(film60.metric.audio, "aac");
    assert.ok(Math.abs(film60.metric.duration - 60) < 1.2, `duration ${film60.metric.duration}`);

    const left = await buildFilm({
      label: "concurrent-a",
      seconds: 5,
      ownerId: owner.id,
      stamp,
      mediaDir,
      prisma,
      createOwnedFilmProject,
      createFilmTimeline,
      getFilmTimeline,
      addTimelineClip,
      saveOwnedSceneStill,
      upsertLibraryAsset,
      startTimelineExportJob,
      rememberTimelineExportRequest,
    });
    const rightOwner = other.id;
    const right = await buildFilm({
      label: "concurrent-b",
      seconds: 5,
      ownerId: rightOwner,
      stamp,
      mediaDir,
      prisma,
      createOwnedFilmProject,
      createFilmTimeline,
      getFilmTimeline,
      addTimelineClip,
      saveOwnedSceneStill,
      upsertLibraryAsset,
      startTimelineExportJob,
      rememberTimelineExportRequest,
    });
    const [leftPost, rightPost] = await Promise.all([postJob(left.jobId), postJob(right.jobId)]);
    const states = [leftPost.body.status, rightPost.body.status].sort();
    assert.deepEqual(states, ["processing", "queued"]);
    const leftDone = await waitJob(prisma, left.jobId, worker);
    const rightDone = await waitJob(prisma, right.jobId, worker);
    assert.equal(leftDone.row.status, "succeeded");
    assert.equal(rightDone.row.status, "succeeded");
    assert.notEqual(leftDone.row.outputAssetId, rightDone.row.outputAssetId);
    const leftAsset = await prisma.studioLibraryAsset.findUniqueOrThrow({ where: { id: leftDone.row.outputAssetId! } });
    const rightAsset = await prisma.studioLibraryAsset.findUniqueOrThrow({ where: { id: rightDone.row.outputAssetId! } });
    assert.equal(leftAsset.ownerId, owner.id);
    assert.equal(rightAsset.ownerId, rightOwner);

    const billed = await buildFilm({
      label: "billing",
      seconds: 2,
      ownerId: owner.id,
      stamp,
      mediaDir,
      prisma,
      createOwnedFilmProject,
      createFilmTimeline,
      getFilmTimeline,
      addTimelineClip,
      saveOwnedSceneStill,
      upsertLibraryAsset,
      startTimelineExportJob,
      rememberTimelineExportRequest,
    });
    await prisma.studioGenerationJob.update({ where: { id: billed.jobId }, data: { creditCost: 30 } });
    const billedPost = await postJob(billed.jobId);
    assert.equal(billedPost.statusCode, 422);
    assert.equal(billedPost.body.code, "billing");
    const billedRow = await prisma.studioGenerationJob.findUniqueOrThrow({ where: { id: billed.jobId } });
    assert.equal(billedRow.status, "failed");
    assert.equal(billedRow.creditsCharged, 0);

    const broken = await buildFilm({
      label: "revision",
      seconds: 2,
      ownerId: owner.id,
      stamp,
      mediaDir,
      prisma,
      createOwnedFilmProject,
      createFilmTimeline,
      getFilmTimeline,
      addTimelineClip,
      saveOwnedSceneStill,
      upsertLibraryAsset,
      startTimelineExportJob,
      rememberTimelineExportRequest,
    });
    const brokenRow = await prisma.studioGenerationJob.findUniqueOrThrow({ where: { id: broken.jobId } });
    const brokenMeta = brokenRow.metadataJson as Record<string, unknown>;
    await prisma.studioGenerationJob.update({
      where: { id: broken.jobId },
      data: { metadataJson: { ...brokenMeta, revision: 999999 } },
    });
    const brokenPost = await postJob(broken.jobId);
    assert.equal(brokenPost.statusCode, 202);
    const brokenDone = await waitJob(prisma, broken.jobId, worker);
    assert.equal(brokenDone.row.status, "failed");
    assert.equal(brokenDone.row.errorCode, "conflict");

    const missingMedia = await buildFilm({
      label: "missing-media",
      seconds: 2,
      ownerId: owner.id,
      stamp,
      mediaDir,
      prisma,
      createOwnedFilmProject,
      createFilmTimeline,
      getFilmTimeline,
      addTimelineClip,
      saveOwnedSceneStill,
      upsertLibraryAsset,
      startTimelineExportJob,
      rememberTimelineExportRequest,
    });
    await rm(missingMedia.videoPath, { force: true });
    const missingPost = await postJob(missingMedia.jobId);
    assert.equal(missingPost.statusCode, 202);
    const missingDone = await waitJob(prisma, missingMedia.jobId, worker);
    assert.equal(missingDone.row.status, "failed");
    assert.notEqual(missingDone.row.status, "succeeded");

    const storage = await buildFilm({
      label: "storage",
      seconds: 2,
      ownerId: owner.id,
      stamp,
      mediaDir,
      prisma,
      createOwnedFilmProject,
      createFilmTimeline,
      getFilmTimeline,
      addTimelineClip,
      saveOwnedSceneStill,
      upsertLibraryAsset,
      startTimelineExportJob,
      rememberTimelineExportRequest,
    });
    await chmod(mediaDir, 0o555);
    try {
      const storagePost = await postJob(storage.jobId);
      assert.equal(storagePost.statusCode, 202);
      const storageDone = await waitJob(prisma, storage.jobId, worker);
      assert.equal(storageDone.row.status, "failed");
      assert.equal(storageDone.row.errorCode, "storage");
    } finally {
      await chmod(mediaDir, 0o755);
    }

    const recovery = await buildFilm({
      label: "recovery",
      seconds: 8,
      ownerId: owner.id,
      stamp,
      mediaDir,
      prisma,
      createOwnedFilmProject,
      createFilmTimeline,
      getFilmTimeline,
      addTimelineClip,
      saveOwnedSceneStill,
      upsertLibraryAsset,
      startTimelineExportJob,
      rememberTimelineExportRequest,
    });
    const exhausted = await prisma.studioGenerationJob.create({
      data: {
        ownerId: owner.id,
        capability: "TIMELINE_EXPORT",
        actionType: "timeline_export",
        status: "processing",
        executionMode: "worker",
        idempotencyKey: `v278-exhausted-${stamp}`,
        attempt: 2,
        maxAttempts: 2,
        creditCost: 0,
        creditsCharged: 0,
        chargeFinalized: true,
        metadataJson: { async: true, projectId: recovery.projectId, revision: 1, stage: "rendering_scenes" },
      },
    });
    const recoveryPost = await postJob(recovery.jobId);
    assert.equal(recoveryPost.statusCode, 202);
    await stopWorker(worker);
    worker = await startWorker(url, mediaDir);
    const recovered = await waitJob(prisma, recovery.jobId, worker);
    assert.equal(recovered.row.status, "succeeded");
    const exhaustedRow = await prisma.studioGenerationJob.findUniqueOrThrow({ where: { id: exhausted.id } });
    assert.equal(exhaustedRow.status, "failed");
    assert.equal(exhaustedRow.errorCode, "interrupted");

    const wallet = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: owner.id } });
    const otherWallet = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: other.id } });
    assert.equal(wallet.balance, 500);
    assert.equal(wallet.lifetimeSpent, 0);
    assert.equal(otherWallet.balance, 500);
    assert.equal(otherWallet.lifetimeSpent, 0);
    const health = await fetch(`http://127.0.0.1:${PORT}/health`);
    assert.equal(health.status, 200);
    console.log(JSON.stringify({ tag: "V278_METRICS", metrics }));
  } finally {
    await chmod(mediaDir, 0o755).catch(() => undefined);
    await stopWorker(worker);
  }
});

async function measureFilm(input: FilmArgs & { otherId: string; readTimelineExportView: (jobId: string, ownerId: string) => Promise<unknown> }) {
  const built = await buildFilm(input);
  const beforeTemp = await tempUsage();
  const posted = await postJob(built.jobId);
  assert.equal(posted.statusCode, 202, JSON.stringify(posted.body));
  const done = await waitJob(input.prisma, built.jobId, input.worker);
  assert.equal(done.row.status, "succeeded", done.row.errorCode);
  const asset = await input.prisma.studioLibraryAsset.findUniqueOrThrow({ where: { id: done.row.outputAssetId! } });
  const info = await probe(fileURLToPath(asset.downloadUrl));
  const file = await stat(fileURLToPath(asset.downloadUrl));
  const audible = await meanVolume(fileURLToPath(asset.downloadUrl));
  const colors = await Promise.all([
    pixel(fileURLToPath(asset.downloadUrl), 1),
    pixel(fileURLToPath(asset.downloadUrl), Math.floor(input.seconds / 3) + 1),
    pixel(fileURLToPath(asset.downloadUrl), Math.floor((input.seconds / 3) * 2) + 1),
  ]);
  const distinct = distance(colors[0], colors[1]) > 30 && distance(colors[1], colors[2]) > 30;
  const afterTemp = await tempUsage();
  return {
    jobId: built.jobId,
    projectId: built.projectId,
    assetId: asset.id,
    distinctScenes: distinct && colors[0].b > colors[0].r && colors[2].g > colors[2].r,
    audible: audible > -45,
    metric: {
      label: input.label,
      acceptMs: posted.ms,
      renderMs: done.elapsedMs,
      rssKb: done.rssKb,
      cpu: done.cpu,
      tempKb: Math.max(0, afterTemp - beforeTemp, done.tempKb),
      outputBytes: file.size,
      duration: info.duration,
      width: info.width,
      height: info.height,
      video: info.video,
      audio: info.audio,
    } satisfies Metric,
  };
}

type FilmArgs = {
  label: string;
  seconds: number;
  ownerId: string;
  stamp: number;
  mediaDir: string;
  prisma: Awaited<typeof import("@/lib/prisma")>["prisma"];
  worker: ChildProcess;
  createOwnedFilmProject: (input: { ownerId: string; title: string; idempotencyKey: string }) => Promise<{ projectId: string } | { error: unknown }>;
  createFilmTimeline: (ownerId: string, projectId: string) => Promise<{ error?: unknown; timeline?: { storyboardId: string | null; revision: number } | null }>;
  getFilmTimeline: (ownerId: string, projectId: string) => Promise<{ error?: unknown; timeline?: { revision: number; tracks: Array<{ id: string; type: string }> } | null }>;
  addTimelineClip: (input: {
    ownerId: string;
    projectId: string;
    revision: number;
    trackId: string;
    sourceKind: string;
    sourceId: string;
    startMs: number;
    durationMs: number;
  }) => Promise<{ error?: unknown }>;
  saveOwnedSceneStill: (input: { sceneId: string; imageUrl: string; storageKey: string; description: string }) => Promise<{ id: string }>;
  upsertLibraryAsset: (input: Record<string, unknown>) => Promise<{ id: string }>;
  startTimelineExportJob: (input: { ownerId: string; storyboardId: string; projectId: string }) => Promise<{ id: string }>;
  rememberTimelineExportRequest: (input: {
    jobId: string;
    ownerId: string;
    projectId: string;
    revision: number;
    burnLanguage: string;
    width: number;
    height: number;
  }) => Promise<unknown>;
};

async function buildFilm(input: FilmArgs) {
  const sceneSeconds = Math.max(1, Math.floor(input.seconds / 3));
  const totalSeconds = sceneSeconds * 3;
  const still = path.join(input.mediaDir, `${input.label}-still.png`);
  const videoA = path.join(input.mediaDir, `${input.label}-a.mp4`);
  const videoB = path.join(input.mediaDir, `${input.label}-b.mp4`);
  const voice = path.join(input.mediaDir, `${input.label}-voice.wav`);
  const music = path.join(input.mediaDir, `${input.label}-music.wav`);
  const sfx = path.join(input.mediaDir, `${input.label}-sfx.wav`);
  await run(FFMPEG, ["-y", "-f", "lavfi", "-i", `color=c=0x224466:s=320x180:r=1:d=1`, "-frames:v", "1", still]);
  await run(FFMPEG, ["-y", "-f", "lavfi", "-i", `color=c=0x663322:s=320x180:r=25:d=${sceneSeconds}`, "-c:v", "libx264", "-pix_fmt", "yuv420p", videoA]);
  await run(FFMPEG, ["-y", "-f", "lavfi", "-i", `color=c=0x226633:s=320x180:r=25:d=${sceneSeconds}`, "-c:v", "libx264", "-pix_fmt", "yuv420p", videoB]);
  await run(FFMPEG, ["-y", "-f", "lavfi", "-i", `sine=frequency=220:sample_rate=44100:duration=${sceneSeconds}`, "-ac", "2", voice]);
  await run(FFMPEG, ["-y", "-f", "lavfi", "-i", `sine=frequency=110:sample_rate=44100:duration=${totalSeconds}`, "-ac", "2", music]);
  await run(FFMPEG, ["-y", "-f", "lavfi", "-i", "sine=frequency=880:sample_rate=44100:duration=0.4", "-ac", "2", sfx]);

  const film = await input.createOwnedFilmProject({
    ownerId: input.ownerId,
    title: input.label,
    idempotencyKey: `v278-${input.label}-${input.stamp}-${input.ownerId.slice(-4)}`,
  });
  if ("error" in film) throw new Error("film was not created");
  const created = await input.createFilmTimeline(input.ownerId, film.projectId);
  if ("error" in created || !created.timeline?.storyboardId) throw new Error("timeline was not created");
  const storyboardId = created.timeline.storyboardId;
  const scene = await input.prisma.studioScene.create({
    data: { storyboardId, order: 1, title: input.label, durationSeconds: sceneSeconds },
  });
  const stillImage = await input.saveOwnedSceneStill({
    sceneId: scene.id,
    imageUrl: pathToFileURL(still).href,
    storageKey: still,
    description: "Synthetic still",
  });

  async function place(trackType: string, sourceKind: string, sourceId: string, startMs: number, durationMs: number) {
    const current = await input.getFilmTimeline(input.ownerId, film.projectId);
    if ("error" in current || !current.timeline) throw new Error("timeline missing");
    const track = current.timeline.tracks.find((item) => item.type === trackType);
    if (!track) throw new Error(trackType);
    const added = await input.addTimelineClip({
      ownerId: input.ownerId,
      projectId: film.projectId,
      revision: current.timeline.revision,
      trackId: track.id,
      sourceKind,
      sourceId,
      startMs,
      durationMs,
    });
    if ("error" in added) {
      const code = added.error && typeof added.error === "object" && "code" in added.error ? String(added.error.code) : "unknown";
      throw new Error(`${trackType} ${sourceKind} clip was rejected: ${code}`);
    }
  }

  const videoAsset = async (file: string, family: string, sourceId: string, duration: number) => {
    const asset = await input.upsertLibraryAsset({
      ownerId: input.ownerId,
      projectId: film.projectId,
      family,
      title: sourceId,
      sourceKind: "v278",
      sourceId: `${input.stamp}-${input.label}-${sourceId}`,
      previewUrl: pathToFileURL(file).href,
      downloadUrl: pathToFileURL(file).href,
      storageKey: file,
      mimeType: family === "video" ? "video/mp4" : "audio/wav",
      durationSeconds: duration,
      creditsSpent: 0,
    });
    return asset.id;
  };

  await place("VIDEO", "scene_image", stillImage.id, 0, sceneSeconds * 1000);
  await place("VIDEO", "library_asset", await videoAsset(videoA, "video", "a", sceneSeconds), sceneSeconds * 1000, sceneSeconds * 1000);
  await place("VIDEO", "library_asset", await videoAsset(videoB, "video", "b", sceneSeconds), sceneSeconds * 2000, sceneSeconds * 1000);
  await place("DIALOGUE", "library_asset", await videoAsset(voice, "voice", "voice", sceneSeconds), 0, sceneSeconds * 1000);
  await place("MUSIC", "library_asset", await videoAsset(music, "music", "music", totalSeconds), 0, totalSeconds * 1000);
  await place("SFX", "library_asset", await videoAsset(sfx, "sfx", "sfx", 1), Math.max(0, totalSeconds * 1000 - 500), 400);

  const timeline = await input.getFilmTimeline(input.ownerId, film.projectId);
  if ("error" in timeline || !timeline.timeline) throw new Error("timeline missing");
  const job = await input.startTimelineExportJob({
    ownerId: input.ownerId,
    storyboardId,
    projectId: film.projectId,
  });
  await input.rememberTimelineExportRequest({
    jobId: job.id,
    ownerId: input.ownerId,
    projectId: film.projectId,
    revision: timeline.timeline.revision,
    burnLanguage: "",
    width: 720,
    height: 1280,
  });
  return { jobId: job.id, projectId: film.projectId, videoPath: videoA };
}

async function postJob(jobId: string) {
  const started = Date.now();
  const response = await fetch(`http://127.0.0.1:${PORT}/jobs/film-timeline/${jobId}/render`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: "{}",
  });
  const body = (await response.json().catch(() => ({}))) as { ok?: boolean; status?: string; code?: string; libraryAssetId?: string };
  return { statusCode: response.status, ms: Date.now() - started, body, libraryAssetId: body.libraryAssetId };
}

async function waitJob(
  prisma: FilmArgs["prisma"],
  jobId: string,
  worker: ChildProcess,
) {
  const started = Date.now();
  let rssKb = 0;
  let cpu = 0;
  let tempKb = 0;
  const deadline = Date.now() + 8 * 60 * 1000;
  while (Date.now() < deadline) {
    const sample = await sampleProcess(worker.pid);
    rssKb = Math.max(rssKb, sample.rssKb);
    cpu = Math.max(cpu, sample.cpu);
    tempKb = Math.max(tempKb, await tempUsage());
    if (rssKb > 1_500_000) throw new Error(`STOPPED_RESOURCE rss=${rssKb}`);
    const row = await prisma.studioGenerationJob.findUniqueOrThrow({ where: { id: jobId } });
    if (row.status === "succeeded" || row.status === "failed" || row.status === "cancelled") {
      return { row, elapsedMs: Date.now() - started, rssKb, cpu, tempKb };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Job ${jobId} did not finish.`);
}

async function stopWorker(child: ChildProcess) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    child.kill("SIGKILL");
  }
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 1_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve(undefined);
    });
  });
}

async function sampleProcess(pid: number | undefined) {
  if (!pid) return { rssKb: 0, cpu: 0 };
  try {
    const { stdout } = await execFileAsync("ps", ["-ax", "-o", "pid=,ppid=,rss=,%cpu="], { timeout: 2_000 });
    const rows = String(stdout).trim().split("\n").map((line) => {
      const [pidText, ppidText, rssText, cpuText] = line.trim().split(/\s+/);
      return { pid: Number(pidText), ppid: Number(ppidText), rssKb: Number(rssText) || 0, cpu: Number(cpuText) || 0 };
    });
    const members = new Set<number>([pid]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const row of rows) {
        if (members.has(row.ppid) && !members.has(row.pid)) {
          members.add(row.pid);
          grew = true;
        }
      }
    }
    let rssKb = 0;
    let cpu = 0;
    for (const row of rows) {
      if (!members.has(row.pid)) continue;
      rssKb += row.rssKb;
      cpu += row.cpu;
    }
    return { rssKb, cpu };
  } catch {
    return { rssKb: 0, cpu: 0 };
  }
}

async function tempUsage() {
  const names = (await readdir(tmpdir()).catch(() => [])).filter((name) => name.startsWith("studio-film-"));
  let total = 0;
  for (const name of names) {
    const info = await stat(path.join(tmpdir(), name)).catch(() => null);
    if (info?.isDirectory()) {
      const { stdout } = await execFileAsync("du", ["-sk", path.join(tmpdir(), name)], { timeout: 5_000 }).catch(() => ({ stdout: "0" }));
      total += Number(String(stdout).split(/\s+/)[0]) || 0;
    }
  }
  return total;
}

async function run(binary: string, args: string[]) {
  await execFileAsync(binary, args, { timeout: 60_000 });
}

async function probe(file: string) {
  const { stdout } = await execFileAsync(FFPROBE, [
    "-v", "error",
    "-show_entries", "format=duration:stream=codec_name,codec_type,width,height",
    "-of", "json",
    file,
  ]);
  const parsed = JSON.parse(stdout) as {
    format?: { duration?: string };
    streams?: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number }>;
  };
  const video = parsed.streams?.find((stream) => stream.codec_type === "video");
  const audio = parsed.streams?.find((stream) => stream.codec_type === "audio");
  return {
    video: video?.codec_name ?? "",
    audio: audio?.codec_name ?? "",
    width: video?.width ?? 0,
    height: video?.height ?? 0,
    duration: Number(parsed.format?.duration ?? 0),
  };
}

async function pixel(file: string, seconds: number) {
  const width = 720;
  const height = 1280;
  const { stdout } = await execFileAsync(FFMPEG, [
    "-ss", String(seconds),
    "-i", file,
    "-frames:v", "1",
    "-f", "rawvideo",
    "-pix_fmt", "rgb24",
    "pipe:1",
  ], { encoding: "buffer", maxBuffer: 8 * 1024 * 1024, timeout: 20_000 });
  const bytes = Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
  const index = ((Math.floor(height / 2) * width) + Math.floor(width / 2)) * 3;
  return { r: bytes[index] ?? 0, g: bytes[index + 1] ?? 0, b: bytes[index + 2] ?? 0 };
}

function distance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

async function meanVolume(file: string) {
  const { stderr } = await execFileAsync(FFMPEG, ["-ss", "0", "-t", "1", "-i", file, "-af", "volumedetect", "-f", "null", "-"], {
    timeout: 20_000,
  });
  const match = String(stderr).match(/mean_volume:\s*(-?\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : -99;
}

async function startWorker(databaseUrl: string, mediaDir: string): Promise<ChildProcess> {
  const child = spawn(process.execPath, [path.join(process.cwd(), "node_modules/tsx/dist/cli.mjs"), "worker/video-worker.ts"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      VIDEO_WORKER_SECRET: SECRET,
      DATABASE_URL: databaseUrl,
      STUDIO_LOCAL_MEDIA_DIR: mediaDir,
      NODE_ENV: "test",
      FFMPEG_PATH: FFMPEG,
      FFPROBE_PATH: FFPROBE,
    },
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw new Error("Video worker exited before listening.");
    try {
      const health = await fetch(`http://127.0.0.1:${PORT}/health`);
      if (health.ok) return child;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  child.kill("SIGTERM");
  throw new Error("Video worker did not become ready.");
}
