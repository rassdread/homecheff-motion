import assert from "node:assert/strict";
import test from "node:test";
import {
  creativeWorkflowForLegacy,
  historyHref,
  historyPresentation,
  safePreviewUrl,
  studioOpenPath,
  unifiedProjectHref,
} from "@/lib/studio-v24-history";

test("legacy records open inside the unified studio", () => {
  assert.equal(studioOpenPath("storyboard", "sb 1"), "/studio/open/storyboard/sb%201");
  assert.equal(creativeWorkflowForLegacy("storyboard"), "film");
  assert.equal(creativeWorkflowForLegacy("animation"), "video");
  assert.equal(unifiedProjectHref("project-1", "film"), "/studio/projects/project-1?workflow=film");
  assert.equal(
    historyHref({ sourceType: "creative", sourceId: "project-1", creativeKind: "film" }),
    "/studio/projects/project-1?workflow=film",
  );
  assert.equal(historyHref({ sourceType: "animation", sourceId: "motion-1" }), "/studio/open/animation/motion-1");
  assert.equal(historyHref({ sourceType: "image", sourceId: "canvas-1" }), "/studio/open/image/canvas-1");
  assert.equal(historyHref({ sourceType: "character", sourceId: "char-1" }), "/studio/characters/char-1");
});

test("library outputs stay assets and flattened images stay read-only", () => {
  const image = historyPresentation({ sourceType: "asset", family: "image" });
  assert.equal(image.role, "asset");
  assert.equal(image.editable, false);
  assert.equal(image.action, "view");
  const voice = historyPresentation({ sourceType: "asset", family: "voice" });
  assert.equal(voice.action, "play");
  assert.equal(voice.editable, false);
  const canvas = historyPresentation({ sourceType: "image" });
  assert.equal(canvas.editable, true);
  assert.equal(canvas.action, "edit_image");
});

test("preview urls reject empty and non-http values", () => {
  assert.equal(safePreviewUrl(""), null);
  assert.equal(safePreviewUrl("javascript:alert(1)"), null);
  assert.equal(safePreviewUrl("/media/thumb.png"), "/media/thumb.png");
  assert.equal(safePreviewUrl("https://127.0.0.1/cert-still.png"), "https://127.0.0.1/cert-still.png");
});
