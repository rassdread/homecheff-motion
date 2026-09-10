import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INTENTIONAL_LEGACY_STUDIO_WALLET_ACTIONS,
  STUDIO_TO_CENTRAL_HC_ACTION,
  isCentralHcMandatoryAction,
  studioActionToCentralHcAction,
} from "@/server/studio-account/studio-central-hc-spend-policy";
import { STUDIO_ACTION_TYPES } from "@/server/studio-account/studio-action-cost-registry";

describe("Studio multiplatform HC mapping (global)", () => {
  it("maps Simple Studio voice + lipsync to central HC actions", () => {
    assert.equal(studioActionToCentralHcAction("voice_generation"), "voice_generation");
    assert.equal(studioActionToCentralHcAction("lipsync_talking_avatar"), "lipsync_talking_avatar");
    assert.equal(isCentralHcMandatoryAction("voice_generation"), true);
    assert.equal(isCentralHcMandatoryAction("lipsync_talking_avatar"), true);
  });

  it("maps Growth-catalog provider actions and leaves intentional local actions unmapped", () => {
    assert.equal(studioActionToCentralHcAction("motion_render"), "motion_render_5s_720p_turbo");
    assert.equal(studioActionToCentralHcAction("premium_vision_analysis"), "premium_vision_analysis");
    assert.equal(studioActionToCentralHcAction("music_generation"), "music_generation");
    assert.equal(studioActionToCentralHcAction("sfx_generation"), "sfx_generation");
    assert.equal(studioActionToCentralHcAction("voice_clone"), "voice_clone");
    assert.equal(studioActionToCentralHcAction("image_generation"), "image_generation");

    assert.equal(studioActionToCentralHcAction("publish_photo_story"), null);
    assert.equal(studioActionToCentralHcAction("publish_mp4_export"), null);
    assert.equal(studioActionToCentralHcAction("ai_analysis"), null);
    assert.equal(isCentralHcMandatoryAction("publish_photo_story"), false);
  });

  it("covers every StudioActionType as either mapped or intentional-legacy", () => {
    const legacy = new Set<string>(INTENTIONAL_LEGACY_STUDIO_WALLET_ACTIONS);
    const mapped = new Set(Object.keys(STUDIO_TO_CENTRAL_HC_ACTION));
    for (const action of STUDIO_ACTION_TYPES) {
      const central = studioActionToCentralHcAction(action);
      if (central) {
        assert.ok(
          mapped.has(action) || action.includes("motion") || action.includes("vision"),
          `mapped action missing explicit registry entry: ${action}`,
        );
      } else {
        assert.ok(legacy.has(action), `unmapped action not declared intentional-legacy: ${action}`);
      }
    }
  });

  it("does not contain Steve-specific IDs or account patches", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const root = path.join(process.cwd(), "src/server/studio-account");
    const files = [
      "studio-central-hc-spend-policy.ts",
      "studio-account-service.ts",
      "studio-credit-authorization.ts",
      "hc-central-adapter.ts",
    ];
    for (const file of files) {
      const text = await fs.readFile(path.join(root, file), "utf8");
      assert.doesNotMatch(text, /cmszybweq0000jl046b7qqvt5/);
      assert.doesNotMatch(text, /c54bbbcf-1323-4539-8e30-c2a6b7f95662/);
      assert.doesNotMatch(text, /steve@homecheff\.eu/i);
      assert.doesNotMatch(text, /4154/);
    }
  });
});
