import assert from "node:assert/strict";
import test from "node:test";
import {
  MADE_WITH_PASSION_PROJECT_ID,
  buildProjectMediaLibrary,
  classifyProbeResponses,
  queryProjectMediaLibrary,
} from "@/lib/studio-project-media-library";

const now = "2026-10-19T00:00:00.000Z";
const untitled = "Naamloze video";

test("keeps valid images and videos and hides a conclusively missing video", () => {
  const items = buildProjectMediaLibrary({
    now,
    untitledLabel: untitled,
    sceneImages: [
      {
        id: "img-1",
        projectId: "story-1",
        projectTitle: "Lokale designer campagne",
        sceneTitle: "Opening",
        createdAt: "2026-05-01T00:00:00.000Z",
        imageUrl: "https://cdn.example/scene.png",
        probe: "valid",
      },
      {
        id: "img-2",
        projectId: "story-1",
        projectTitle: "Lokale designer campagne",
        sceneTitle: "Kapot",
        createdAt: "2026-05-02T00:00:00.000Z",
        imageUrl: "https://cdn.example/missing.png",
        probe: "missing",
      },
    ],
    projects: [
      {
        id: "video-ok",
        title: "Growth promo",
        status: "completed",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
        videoUrl: "https://cdn.example/ok.mp4",
        posterUrl: "https://cdn.example/poster.png",
        durationSeconds: 12,
        probe: "valid",
        activeJob: false,
      },
      {
        id: "video-missing",
        title: "Oude test",
        status: "completed",
        createdAt: "2026-06-02T00:00:00.000Z",
        updatedAt: "2026-06-02T00:00:00.000Z",
        videoUrl: "https://cdn.example/gone.mp4",
        posterUrl: null,
        durationSeconds: 8,
        probe: "missing",
        activeJob: false,
      },
    ],
  });

  const image = items.find((item) => item.id === "scene-image:img-1");
  assert.equal(image?.section, "images");
  assert.equal(image?.playable, true);
  assert.equal(image?.projectTitle, "Lokale designer campagne — Opening");
  assert.equal(items.some((item) => item.id === "scene-image:img-2"), false);
  assert.equal(items.find((item) => item.id === "animation-video:video-ok")?.section, "videos");
  assert.equal(items.find((item) => item.projectId === "video-missing")?.section, "archive");
  assert.equal(items.find((item) => item.projectId === "video-missing")?.playable, false);
});

test("keeps a video when the check times out and does not treat a fresh render as finished", () => {
  const items = buildProjectMediaLibrary({
    now,
    untitledLabel: untitled,
    projects: [
      {
        id: "timeout",
        title: "Promo",
        status: "completed",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
        videoUrl: "https://cdn.example/slow.mp4",
        posterUrl: null,
        durationSeconds: null,
        probe: "timeout",
        activeJob: false,
      },
      {
        id: "live",
        title: "Bezig",
        status: "rendering",
        createdAt: "2026-10-18T23:00:00.000Z",
        updatedAt: "2026-10-18T23:30:00.000Z",
        videoUrl: null,
        posterUrl: null,
        durationSeconds: null,
        activeJob: true,
        probe: "unverified",
      },
    ],
    sceneImages: [],
  });
  assert.equal(items.find((item) => item.projectId === "timeout")?.section, "videos");
  assert.equal(items.find((item) => item.projectId === "live")?.section, "processing");
  assert.equal(items.find((item) => item.projectId === "live")?.playable, false);
});

test("archives a stale render, files a failed project, and leaves the protected project out", () => {
  const items = buildProjectMediaLibrary({
    now,
    untitledLabel: untitled,
    sceneImages: [],
    projects: [
      {
        id: "stale",
        title: "Create a travel movie",
        status: "rendering",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
        videoUrl: null,
        posterUrl: null,
        durationSeconds: null,
        activeJob: false,
      },
      {
        id: "failed",
        title: null,
        status: "failed",
        createdAt: "2026-08-02T00:00:00.000Z",
        updatedAt: "2026-08-02T00:00:00.000Z",
        videoUrl: null,
        posterUrl: null,
        durationSeconds: null,
        activeJob: false,
      },
      {
        id: MADE_WITH_PASSION_PROJECT_ID,
        title: "MADE WITH PASSION",
        status: "rendering",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
        videoUrl: null,
        posterUrl: null,
        durationSeconds: null,
        activeJob: false,
      },
    ],
    jobs: [
      {
        id: "job-ok",
        status: "succeeded",
        capability: "IMAGE_GENERATE",
        createdAt: "2026-10-18T00:00:00.000Z",
        updatedAt: "2026-10-18T00:00:00.000Z",
        projectId: MADE_WITH_PASSION_PROJECT_ID,
        projectTitle: "MADE WITH PASSION",
      },
      {
        id: "job-fail",
        status: "failed",
        capability: "VIDEO_GENERATE",
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z",
        projectId: null,
        projectTitle: "Losse test",
      },
    ],
  });
  assert.equal(items.find((item) => item.projectId === "stale")?.section, "archive");
  assert.equal(items.find((item) => item.projectId === "failed")?.section, "failed");
  assert.equal(items.find((item) => item.projectId === "failed")?.projectTitle, untitled);
  assert.equal(items.some((item) => item.projectId === MADE_WITH_PASSION_PROJECT_ID), false);
  assert.equal(items.some((item) => item.id === "generation-job:job-ok"), false);
  assert.equal(items.find((item) => item.id === "generation-job:job-fail")?.section, "failed");
  assert.equal(items.find((item) => item.id === "generation-job:job-fail")?.playable, false);
});

test("filters, sorts, paginates, and stays idempotent", () => {
  const input = {
    now,
    untitledLabel: untitled,
    sceneImages: Array.from({ length: 30 }, (_, index) => ({
      id: `img-${index}`,
      projectId: index < 10 ? "story-a" : "story-b",
      projectTitle: index < 10 ? "Alpha" : "Beta",
      sceneTitle: null,
      createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      imageUrl: `https://cdn.example/${index}.png`,
      probe: "valid" as const,
    })),
    projects: [],
  };
  const first = buildProjectMediaLibrary(input);
  const second = buildProjectMediaLibrary(input);
  assert.deepEqual(first.map((item) => item.id), second.map((item) => item.id));
  const page = queryProjectMediaLibrary(first, {
    section: "images",
    q: "alpha",
    projectId: "story-a",
    sort: "oldest",
    page: 1,
    pageSize: 4,
  });
  assert.equal(page.total, 10);
  assert.equal(page.items.length, 4);
  assert.equal(page.items[0]?.id, "scene-image:img-0");
  const newest = queryProjectMediaLibrary(first, { section: "all", sort: "newest", page: 2, pageSize: 24 });
  assert.equal(newest.items.length, 6);
  assert.equal(newest.counts.images, 30);
  assert.equal(newest.counts.all, 30);
});

test("a timeout is not a missing file and html is not a video", () => {
  assert.equal(classifyProbeResponses([null, null]), "timeout");
  assert.equal(classifyProbeResponses([{ status: 404, contentType: "" }, null]), "timeout");
  assert.equal(classifyProbeResponses([{ status: 404, contentType: "text/plain" }, { status: 404, contentType: "" }]), "missing");
  assert.equal(
    classifyProbeResponses([
      null,
      { status: 200, contentType: "video/mp4" },
    ]),
    "valid"
  );
  assert.equal(
    classifyProbeResponses([{ status: 200, contentType: "text/html; charset=utf-8" }]),
    "invalid"
  );
});
