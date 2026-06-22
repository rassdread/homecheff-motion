import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HOMECHEFF_EXAMPLES } from "@/lib/homecheff-examples";
import {
  isBrokenRelativeFinalVideoPath,
  resolvePlayableVideoSrc,
} from "@/lib/playable-media-url";
import { spaceGalleryCardVideoSrc } from "@/lib/space-gallery-media";
import { studioShowcaseItemToExample } from "@/lib/showcase-item-mapper";
import {
  patchStudioCopilotLayout,
  readStudioCopilotLayout,
  resetStudioCopilotLayoutCacheForTests,
  writeStudioCopilotLayout,
} from "@/lib/studio-copilot-layout-storage";
import {
  readIdentityPreservationOverrides,
  resetIdentityPreservationCacheForTests,
  writeIdentityPreservationOverrides,
} from "@/lib/studio-copilot-identity-preservation-storage";
import {
  readStudioCopilotExpertMode,
  writeStudioCopilotExpertMode,
} from "@/lib/studio-copilot-expert-mode-storage";
import { DEFAULT_STUDIO_COPILOT_LAYOUT } from "@/types/studio-copilot-layout";
import { isHomeCheffAssistantRoute } from "@/lib/homecheff-assistant-flag";
import type { StudioShowcaseItemRecord } from "@/types/studio-showcase-item";

describe("production errors audit fixes", () => {
  it("static showcase examples do not reference broken final.mp4 paths", () => {
    for (const example of HOMECHEFF_EXAMPLES) {
      assert.equal(isBrokenRelativeFinalVideoPath(example.thumbnailUrl), false);
      assert.equal(spaceGalleryCardVideoSrc(example), null);
    }
  });

  it("resolvePlayableVideoSrc blocks relative final.mp4 placeholders", () => {
    assert.equal(
      resolvePlayableVideoSrc("/generated/animations/projects/x/final.mp4"),
      null
    );
    assert.equal(resolvePlayableVideoSrc("https://cdn.example.com/render.mp4"), "https://cdn.example.com/render.mp4");
    assert.equal(resolvePlayableVideoSrc(""), null);
  });

  it("showcase mapper sanitizes broken final.mp4 video URLs from admin DB items", () => {
    const item = {
      id: "x",
      pageKey: "home",
      title: "Demo",
      description: "Demo",
      mediaType: "video",
      mediaUrl: "/generated/animations/projects/demo/final.mp4",
      thumbnailUrl: "/homecheff-globe-man.png",
      sortOrder: 0,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    } as StudioShowcaseItemRecord;
    const example = studioShowcaseItemToExample(item);
    assert.equal(example.mediaKind, "image");
    assert.equal(spaceGalleryCardVideoSrc(example), null);
  });

  it("layout storage getSnapshot returns stable object reference", () => {
    resetStudioCopilotLayoutCacheForTests();
    writeStudioCopilotLayout(DEFAULT_STUDIO_COPILOT_LAYOUT);
    const a = readStudioCopilotLayout();
    const b = readStudioCopilotLayout();
    assert.equal(a, b);
    const patched = patchStudioCopilotLayout({ placement: "side" });
    assert.equal(patched, a);
  });

  it("identity preservation getSnapshot returns stable default reference", () => {
    resetIdentityPreservationCacheForTests();
    const a = readIdentityPreservationOverrides();
    const b = readIdentityPreservationOverrides();
    assert.equal(a, b);
    writeIdentityPreservationOverrides({
      preserveFace: false,
      preserveEyes: true,
      preserveMouth: true,
      preservePersonality: true,
      preserveBodyShape: true,
      preserveCoreShape: true,
      preserveBrandIdentity: true,
    });
    const c = readIdentityPreservationOverrides();
    const d = readIdentityPreservationOverrides();
    assert.equal(c, d);
    assert.equal(c.preserveFace, false);
    resetIdentityPreservationCacheForTests();
  });

  it("expert mode storage returns stable boolean", () => {
    writeStudioCopilotExpertMode(false);
    assert.equal(readStudioCopilotExpertMode(), false);
    writeStudioCopilotExpertMode(true);
    assert.equal(readStudioCopilotExpertMode(), true);
    writeStudioCopilotExpertMode(false);
  });

  it("default copilot layout matches SSR-stable spec", () => {
    assert.equal(DEFAULT_STUDIO_COPILOT_LAYOUT.placement, "side");
    assert.equal(DEFAULT_STUDIO_COPILOT_LAYOUT.width, 440);
    assert.equal(DEFAULT_STUDIO_COPILOT_LAYOUT.collapsedRecent, true);
    assert.equal(DEFAULT_STUDIO_COPILOT_LAYOUT.compactMode, true);
  });

  it("admin billing promotions route does not mount assistant", () => {
    assert.equal(isHomeCheffAssistantRoute("/admin/billing/promotions"), false);
  });

  it("editor route mounts assistant for copilot", () => {
    assert.equal(isHomeCheffAssistantRoute("/editor"), true);
  });
});
