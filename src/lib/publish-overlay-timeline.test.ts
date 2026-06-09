import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addPublishOverlay,
  addPublishSubtitle,
  auditOverlaySafeArea,
  createDefaultPublishOverlay,
  parseSrtContent,
  parseVttContent,
  patchPublishOverlay,
  patchPublishSubtitle,
  publishOverlayDurationWarning,
  reorderPublishOverlayZIndex,
} from "@/lib/publish-overlay-timeline";
import { createPublishProject, savePublishProject } from "@/lib/publish-overlay-session";

describe("publish-overlay-timeline phase 6", () => {
  it("adds overlay with z-index", () => {
    let project = createPublishProject({ name: "Demo", videoUrl: "https://example.com/v.mp4" });
    project = addPublishOverlay(project, "title");
    assert.equal(project.overlays.length, 1);
    assert.equal(project.overlays[0].type, "title");
  });

  it("updates start/end timing", () => {
    let project = addPublishOverlay(createPublishProject({ name: "T", videoUrl: "x" }), "text");
    const id = project.overlays[0].id;
    project = patchPublishOverlay(project, id, { startTime: 2, endTime: 8 });
    assert.equal(project.overlays[0].startTime, 2);
    assert.equal(project.overlays[0].endTime, 8);
  });

  it("warns on safe area violation", () => {
    const overlay = createDefaultPublishOverlay("text");
    overlay.x = 0.01;
    assert.equal(auditOverlaySafeArea(overlay, "tiktok"), "fail");
  });

  it("updates z-index order", () => {
    let project = addPublishOverlay(createPublishProject({ name: "Z", videoUrl: "x" }), "text");
    project = addPublishOverlay(project, "subtitle");
    const first = project.overlays[0].id;
    project = reorderPublishOverlayZIndex(project, first, "forward");
    assert.ok(project.overlays.find((o) => o.id === first)!.zIndex >= 1);
  });

  it("saves publish project draft", () => {
    const project = createPublishProject({ name: "Save", videoUrl: "https://example.com/v.mp4" });
    const saved = savePublishProject(project);
    assert.equal(saved.id, project.id);
    assert.equal(saved.status, "draft");
  });
});

describe("publish-subtitle-timing phase 7", () => {
  it("creates manual subtitle segment", () => {
    let project = createPublishProject({ name: "Sub", videoUrl: "x" });
    project = addPublishSubtitle(project);
    assert.equal(project.subtitles.length, 1);
  });

  it("patches subtitle timing and text", () => {
    let project = addPublishSubtitle(createPublishProject({ name: "Sub", videoUrl: "x" }));
    const id = project.subtitles[0].id;
    project = patchPublishSubtitle(project, id, { text: "Hello", startTime: 1, endTime: 4 });
    assert.equal(project.subtitles[0].text, "Hello");
  });

  it("parses SRT content", () => {
    const srt = `1\n00:00:01,000 --> 00:00:03,000\nHello world`;
    const segments = parseSrtContent(srt);
    assert.equal(segments.length, 1);
    assert.match(segments[0].text, /Hello/);
  });

  it("parses VTT content", () => {
    const vtt = `WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\nHi`;
    const segments = parseVttContent(vtt);
    assert.equal(segments.length, 1);
  });

  it("flags short overlay duration", () => {
    const o = createDefaultPublishOverlay();
    o.startTime = 0;
    o.endTime = 0.5;
    assert.equal(publishOverlayDurationWarning(o), true);
  });
});
