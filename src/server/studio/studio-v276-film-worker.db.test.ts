/**
 * Local video-worker certification for the film timeline job.
 * Uses the disposable database only. Does not call the live Render service.
 */
import assert from "node:assert/strict";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { pathToFileURL, fileURLToPath } from "node:url";
import { hashPassword } from "@/server/auth/session";

const execFileAsync = promisify(execFile);
const CERT_DB = "homecheff_film_cert_2u";
const SECRET = "local-film-worker-test";

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

test("film timeline job runs on the local video worker", { timeout: 120_000 }, async (t) => {
  const url = isolatedDatabaseUrl();
  if (!url) {
    t.skip("FILM_CERT_DATABASE_URL is not configured");
    return;
  }
  const mediaDir = await mkdtemp(path.join(tmpdir(), "v276-film-worker-"));
  process.env.DATABASE_URL = url;
  process.env.STUDIO_LOCAL_MEDIA_DIR = mediaDir;
  process.env.NODE_ENV = "test";
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;

  const ffmpeg = "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg";
  const ffprobe = "/opt/homebrew/bin/ffprobe";
  const picture = path.join(mediaDir, "clip.mp4");
  const voice = path.join(mediaDir, "voice.wav");
  const music = path.join(mediaDir, "music.wav");
  const sfx = path.join(mediaDir, "sfx.wav");
  await run(ffmpeg, ["-y", "-f", "lavfi", "-i", "color=c=0x224466:s=320x180:r=25:d=1", "-c:v", "libx264", "-pix_fmt", "yuv420p", picture]);
  await run(ffmpeg, ["-y", "-f", "lavfi", "-i", "sine=frequency=220:sample_rate=44100:duration=1", "-ac", "2", voice]);
  await run(ffmpeg, ["-y", "-f", "lavfi", "-i", "sine=frequency=110:sample_rate=44100:duration=1", "-ac", "2", music]);
  await run(ffmpeg, ["-y", "-f", "lavfi", "-i", "sine=frequency=880:sample_rate=44100:duration=0.2", "-ac", "2", sfx]);

  const { prisma } = await import("@/lib/prisma");
  const { createOwnedFilmProject } = await import("@/server/studio/studio-film-preparation");
  const { addTimelineClip, createFilmTimeline, getFilmTimeline } = await import("@/server/studio/studio-timeline-service");
  const { upsertLibraryAsset } = await import("@/server/studio-library/library-asset-service");
  const { startTimelineExportJob, rememberTimelineExportRequest, readTimelineExportJob } = await import(
    "@/server/studio/studio-timeline-export-job"
  );

  const stamp = Date.now();
  const owner = await prisma.user.create({
    data: { email: `v276-worker-${stamp}@example.test`, passwordHash: hashPassword("film-cert-local-only"), role: "user" },
  });
  const other = await prisma.user.create({
    data: { email: `v276-other-${stamp}@example.test`, passwordHash: hashPassword("film-cert-local-only"), role: "user" },
  });
  await prisma.studioAccount.create({ data: { userId: owner.id, accountType: "creator", accountStatus: "active" } });
  await prisma.studioWallet.create({
    data: { userId: owner.id, balance: 500, promotionalBalance: 500, lifetimeGranted: 500 },
  });
  const film = await createOwnedFilmProject({ ownerId: owner.id, title: "Worker film", idempotencyKey: `v276-${stamp}` });
  assert.equal("error" in film, false);
  if ("error" in film) return;
  const created = await createFilmTimeline(owner.id, film.projectId);
  assert.equal("error" in created, false);
  if ("error" in created || !created.timeline) return;

  async function place(trackType: string, family: string, file: string, startMs: number) {
    const current = await getFilmTimeline(owner.id, film.projectId);
    if ("error" in current || !current.timeline) throw new Error("timeline missing");
    const track = current.timeline.tracks.find((item) => item.type === trackType);
    assert.ok(track);
    const asset = await upsertLibraryAsset({
      ownerId: owner.id,
      projectId: film.projectId,
      family,
      title: trackType,
      sourceKind: "v276",
      sourceId: `${stamp}-${trackType}`,
      previewUrl: pathToFileURL(file).href,
      downloadUrl: pathToFileURL(file).href,
      storageKey: file,
      mimeType: family === "video" ? "video/mp4" : "audio/wav",
      durationSeconds: 1,
      creditsSpent: 0,
    });
    const added = await addTimelineClip({
      ownerId: owner.id,
      projectId: film.projectId,
      revision: current.timeline.revision,
      trackId: track!.id,
      sourceKind: "library_asset",
      sourceId: asset.id,
      startMs,
      durationMs: 1000,
    });
    assert.equal("error" in added, false);
  }
  await place("VIDEO", "video", picture, 0);
  await place("DIALOGUE", "voice", voice, 0);
  await place("MUSIC", "music", music, 0);
  await place("SFX", "sfx", sfx, 0);

  const timeline = await getFilmTimeline(owner.id, film.projectId);
  if ("error" in timeline || !timeline.timeline?.storyboardId) throw new Error("timeline missing");
  const job = await startTimelineExportJob({
    ownerId: owner.id,
    storyboardId: timeline.timeline.storyboardId,
    projectId: film.projectId,
  });
  await rememberTimelineExportRequest({
    jobId: job.id,
    ownerId: owner.id,
    projectId: film.projectId,
    revision: timeline.timeline.revision,
    burnLanguage: "",
    width: 720,
    height: 1280,
  });
  assert.equal(await readTimelineExportJob(job.id, other.id), null);

  const worker = await startWorker(url, mediaDir);
  try {
    const first = await postJob(job.id);
    assert.equal(first.statusCode, 202, JSON.stringify(first));
    assert.ok(first.ms < 5_000, `accept took ${first.ms}ms`);
    const stored = await waitForTerminal(
      () => prisma.studioGenerationJob.findUniqueOrThrow({ where: { id: job.id } }),
      ["succeeded", "failed"],
    );
    assert.equal(stored.status, "succeeded");
    assert.ok(stored.outputAssetId);
    const asset = await prisma.studioLibraryAsset.findFirstOrThrow({
      where: { id: stored.outputAssetId!, ownerId: owner.id },
    });
    assert.ok(asset.downloadUrl.startsWith("file:"));
    const info = await probe(ffprobe, fileURLToPath(asset.downloadUrl));
    assert.equal(info.video, "h264");
    assert.equal(info.audio, "aac");
    assert.equal(info.width, 720);
    assert.equal(info.height, 1280);
    const second = await postJob(job.id);
    assert.equal(second.statusCode, 200);
    assert.equal(second.libraryAssetId, stored.outputAssetId);
    const assets = await prisma.studioLibraryAsset.count({
      where: { ownerId: owner.id, sourceKind: "timeline_export" },
    });
    assert.equal(assets, 1);
    const wallet = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: owner.id } });
    assert.equal(wallet.balance, 500);
    assert.equal(wallet.lifetimeSpent, 0);
    const finished = await prisma.studioGenerationJob.findUniqueOrThrow({ where: { id: job.id } });
    assert.equal(finished.creditsCharged, 0);
    assert.equal(finished.status, "succeeded");

    const emptyFilm = await createOwnedFilmProject({
      ownerId: owner.id,
      title: "Empty film",
      idempotencyKey: `v276-empty-${stamp}`,
    });
    if ("error" in emptyFilm) throw new Error("empty film");
    await createFilmTimeline(owner.id, emptyFilm.projectId);
    const emptyTimeline = await getFilmTimeline(owner.id, emptyFilm.projectId);
    if ("error" in emptyTimeline || !emptyTimeline.timeline?.storyboardId) throw new Error("empty timeline");
    const emptyJob = await startTimelineExportJob({
      ownerId: owner.id,
      storyboardId: emptyTimeline.timeline.storyboardId,
      projectId: emptyFilm.projectId,
    });
    await rememberTimelineExportRequest({
      jobId: emptyJob.id,
      ownerId: owner.id,
      projectId: emptyFilm.projectId,
      revision: emptyTimeline.timeline.revision,
      burnLanguage: "",
      width: 720,
      height: 1280,
    });
    const failed = await postJob(emptyJob.id);
    assert.equal(failed.statusCode, 202);
    const emptyRow = await waitForTerminal(
      () => prisma.studioGenerationJob.findUniqueOrThrow({ where: { id: emptyJob.id } }),
      ["failed", "succeeded"],
    );
    assert.equal(emptyRow.status, "failed");
    const walletAfter = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: owner.id } });
    assert.equal(walletAfter.balance, 500);
  } finally {
    worker.kill("SIGTERM");
  }
});

async function run(binary: string, args: string[]) {
  await execFileAsync(binary, args, { timeout: 30_000 });
}

async function probe(ffprobe: string, file: string) {
  const { stdout } = await execFileAsync(ffprobe, [
    "-v", "error",
    "-show_entries", "stream=codec_name,codec_type,width,height",
    "-of", "json",
    file,
  ]);
  const parsed = JSON.parse(stdout) as {
    streams?: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number }>;
  };
  const video = parsed.streams?.find((stream) => stream.codec_type === "video");
  const audio = parsed.streams?.find((stream) => stream.codec_type === "audio");
  return { video: video?.codec_name ?? "", audio: audio?.codec_name ?? "", width: video?.width ?? 0, height: video?.height ?? 0 };
}

async function postJob(jobId: string) {
  const started = Date.now();
  const response = await fetch(`http://127.0.0.1:8091/jobs/film-timeline/${jobId}/render`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: "{}",
  });
  const body = (await response.json()) as { ok?: boolean; libraryAssetId?: string; downloadUrl?: string; code?: string; status?: string };
  return { ...body, statusCode: response.status, ms: Date.now() - started };
}

async function waitForTerminal<T extends { status: string }>(read: () => Promise<T>, terminal: string[]) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const row = await read();
    if (terminal.includes(row.status)) return row;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error("Job did not finish.");
}

async function startWorker(databaseUrl: string, mediaDir: string): Promise<ChildProcess> {
  const child = spawn(
    process.execPath,
    [path.join(process.cwd(), "node_modules/tsx/dist/cli.mjs"), "worker/video-worker.ts"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: "8091",
        VIDEO_WORKER_SECRET: SECRET,
        DATABASE_URL: databaseUrl,
        STUDIO_LOCAL_MEDIA_DIR: mediaDir,
        NODE_ENV: "test",
        FFMPEG_PATH: "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg",
        FFPROBE_PATH: "/opt/homebrew/bin/ffprobe",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) {
      throw new Error("Video worker exited before listening.");
    }
    try {
      const health = await fetch("http://127.0.0.1:8091/health");
      if (health.ok) return child;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  child.kill("SIGTERM");
  throw new Error("Video worker did not become ready.");
}
