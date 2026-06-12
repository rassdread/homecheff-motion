import assert from "node:assert/strict";
import test from "node:test";
import { resolveSafeZonesForOrientation } from "@/lib/publish-safe-zone-v2";
import { createPublishProject } from "@/lib/publish-overlay-session";
import {
  addTimelineBrandingItem,
  addTimelineMusicItem,
  addTimelineTextItem,
  addTimelineVoiceItem,
  applyTimelineToPublishProject,
  createPublishTimeline,
  loadPublishTimelineFromProject,
  patchTimelineItem,
  syncTimelineFromProject,
  timelineHasPendingRender,
} from "@/lib/publish-timeline";
import { createPhotoStoryProject, createSlideshowProject } from "@/lib/publish-photo-story";
import { DEFAULT_PUBLISH_TEXT_STYLE } from "@/lib/publish-text-styling";
import { planHasPendingChanges, upsertPublishSegmentPlan } from "@/lib/publish-change-plan";

test("add text creates timeline item", () => {
  const tl = createPublishTimeline("p1", 10);
  const next = addTimelineTextItem(tl, { text: "Hello", playhead: 2 });
  assert.equal(next.items.length, 1);
  assert.equal(next.items[0]!.text, "Hello");
  assert.equal(next.items[0]!.startTime, 2);
  assert.equal(next.items[0]!.endTime, 5);
  assert.equal(next.pendingRender, true);
});

test("text item start/end can be changed", () => {
  let tl = createPublishTimeline("p1", 10);
  tl = addTimelineTextItem(tl, { text: "Hook", playhead: 0 });
  const id = tl.items[0]!.id;
  tl = patchTimelineItem(tl, id, { startTime: 1, endTime: 4 });
  assert.equal(tl.items[0]!.startTime, 1);
  assert.equal(tl.items[0]!.endTime, 4);
});

test("text styling persists on timeline item", () => {
  let tl = createPublishTimeline("p1", 8);
  tl = addTimelineTextItem(tl, { text: "CTA", kind: "cta", fullDuration: true });
  const style = { ...DEFAULT_PUBLISH_TEXT_STYLE, font: "bold" as const, size: "xl" as const };
  tl = patchTimelineItem(tl, tl.items[0]!.id, { style });
  assert.equal(tl.items[0]!.style?.font, "bold");
  assert.equal(tl.items[0]!.style?.size, "xl");
});

test("voice tab creates voice timeline item", () => {
  const tl = addTimelineVoiceItem(createPublishTimeline("p1", 15), {
    script: "Welcome to our kitchen",
    startTime: 1,
  });
  assert.ok(tl.items.some((i) => i.kind === "voice"));
  assert.equal(tl.items.find((i) => i.kind === "voice")!.text, "Welcome to our kitchen");
});

test("music tab creates music timeline item", () => {
  const tl = addTimelineMusicItem(createPublishTimeline("p1", 20), { mood: "upbeat intro" });
  assert.ok(tl.items.some((i) => i.kind === "music"));
  assert.equal(tl.items.find((i) => i.kind === "music")!.musicMood, "upbeat intro");
});

test("branding tab creates branding timeline item", () => {
  const tl = addTimelineBrandingItem(createPublishTimeline("p1", 12), { label: "Logo watermark" });
  assert.ok(tl.items.some((i) => i.kind === "branding"));
});

test("image upload creates photo story project", () => {
  const project = createPhotoStoryProject({
    name: "Recipe card",
    imageUrl: "https://cdn.example.com/photo.jpg",
    durationSeconds: 5,
  });
  assert.equal(project.workflow, "photo_story");
  assert.equal(project.mediaKind, "image");
  const tl = loadPublishTimelineFromProject(project);
  assert.ok(tl.items.some((i) => i.kind === "photo_base"));
});

test("multiple images create slideshow project", () => {
  const project = createSlideshowProject({
    name: "Gallery",
    imageUrls: ["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"],
  });
  assert.equal(project.workflow, "slideshow");
  const tl = loadPublishTimelineFromProject(project);
  assert.equal(tl.items.filter((i) => i.kind === "slide").length, 2);
});

test("final export applies timeline without mid-edit render flag", () => {
  let tl = createPublishTimeline("p1", 10);
  tl = addTimelineTextItem(tl, { text: "Final title", kind: "title", fullDuration: true });
  let project = createPublishProject({ name: "Test", videoUrl: "https://cdn.example.com/v.mp4" });
  project = { ...project, metadata: { publishTimeline: tl } };
  assert.equal(timelineHasPendingRender(loadPublishTimelineFromProject(project)), true);
  const exported = applyTimelineToPublishProject(project);
  assert.ok(exported.overlays.some((o) => o.text === "Final title"));
  assert.equal(loadPublishTimelineFromProject(exported).pendingRender, false);
});

test("change plan defers render until export", () => {
  let plan = { projectId: "p1", segments: [], pendingRender: false, lastEditedAt: "" };
  plan = upsertPublishSegmentPlan(plan, {
    id: "s1",
    startTime: 0,
    endTime: 2,
    originalText: "",
    proposedText: "Hi",
    acceptedText: "Hi",
  });
  assert.equal(planHasPendingChanges(plan), true);
});

test("subtitles use dedicated timeline track separate from overlays", () => {
  const project = {
    ...createPublishProject({
      name: "Sub test",
      videoUrl: "https://cdn.example.com/v.mp4",
    }),
    subtitles: [{
      id: "s1",
      text: "Hello",
      startTime: 0,
      endTime: 2,
      language: "en",
      x: 0.5,
      y: 0.9,
      safeAreaStatus: "ok" as const,
    }],
  };
  const tl = syncTimelineFromProject(project);
  const sub = tl.items.find((i) => i.kind === "subtitle");
  assert.ok(sub);
  assert.equal(sub!.track, 2);
});

test("overlays use Safe Zone V2 orientation regions", () => {
  const landscape = resolveSafeZonesForOrientation("landscape");
  assert.equal(landscape.length, 8);
  assert.ok(landscape.includes("top_left"));
});
