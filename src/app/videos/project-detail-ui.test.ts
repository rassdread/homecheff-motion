import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  VIDEO_PREVIEW_MAIN_FRAME_CLASS,
  VIDEO_PREVIEW_MAIN_VIDEO_CLASS,
  VIDEO_PREVIEW_VERSION_FRAME_CLASS,
} from "@/components/ui/video-preview";

const __dirname = dirname(fileURLToPath(import.meta.url));
const detailPage = readFileSync(join(__dirname, "[id]/page.tsx"), "utf8");
const versionsPanel = readFileSync(
  join(__dirname, "../../components/instant/video-versions-panel.tsx"),
  "utf8"
);
const quickActions = readFileSync(
  join(__dirname, "../../components/videos/project-detail-quick-actions.tsx"),
  "utf8"
);

describe("project detail page UX", () => {
  it("uses compact VideoPreview main variant", () => {
    assert.match(detailPage, /VideoPreview/);
    assert.match(detailPage, /variant="main"/);
    assert.match(VIDEO_PREVIEW_MAIN_FRAME_CLASS, /max-h-\[55vh\]/);
    assert.match(VIDEO_PREVIEW_MAIN_VIDEO_CLASS, /object-contain/);
  });

  it("shows quick actions card", () => {
    assert.match(detailPage, /ProjectDetailQuickActions/);
    assert.match(quickActions, /projectDetail\.quickActions\.title/);
  });

  it("groups video versions in detail layout", () => {
    assert.match(detailPage, /layout="detail"/);
    assert.match(versionsPanel, /version-original/);
    assert.match(versionsPanel, /version-clean/);
    assert.match(versionsPanel, /version-languages/);
    assert.match(versionsPanel, /projectDetail\.versions\.originalTitle/);
    assert.match(versionsPanel, /projectDetail\.versions\.cleanTitle/);
  });

  it("shows repair quick action only when not completed", () => {
    assert.match(detailPage, /showRepairQuickAction/);
    assert.match(detailPage, /!hasCompletedInstantFinal/);
  });

  it("hides duplicate recovery buttons on progress panel", () => {
    assert.match(detailPage, /hideRecoveryActions/);
  });

  it("collapses admin playback debug under advanced details", () => {
    assert.match(detailPage, /projectDetail\.advanced\.title/);
    assert.match(detailPage, /<details[^>]*>[\s\S]*PlaybackDebugPanel/);
  });

  it("user-facing quick action copy avoids technical terms", () => {
    assert.doesNotMatch(detailPage, /projectDetail\.quickActions[\s\S]*FFmpeg/);
    assert.doesNotMatch(detailPage, /projectDetail\.quickActions[\s\S]*worker/i);
    assert.match(detailPage, /projectDetail\.quickActions\.textRerender\.hint/);
  });

  it("mobile preview uses viewport-capped max-height", () => {
    assert.match(VIDEO_PREVIEW_MAIN_FRAME_CLASS, /max-h-\[55vh\]/);
    assert.match(detailPage, /overflow-x-hidden/);
  });
});
