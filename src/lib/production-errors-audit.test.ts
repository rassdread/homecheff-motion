import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HOMECHEFF_EXAMPLES } from "@/lib/homecheff-examples";
import {
  isBrokenRelativeFinalVideoPath,
  resolvePlayableVideoSrc,
} from "@/lib/playable-media-url";
import { spaceGalleryCardVideoSrc } from "@/lib/space-gallery-media";
import { DEFAULT_STUDIO_COPILOT_LAYOUT } from "@/types/studio-copilot-layout";
import { isHomeCheffAssistantRoute } from "@/lib/homecheff-assistant-flag";

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
