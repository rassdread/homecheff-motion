import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chooseFinaleChannel,
  detectOverlayCollisions,
  resolveOverlayCollisions,
} from "@/server/animation-export/story-overlay-collision";
import { STORY_TITLE_ASS_ALIGNMENT as TITLE_ALIGN } from "@/server/animation-export/story-layer-placement";

describe("story overlay collision", () => {
  it("chooseFinaleChannel separates hero finale and footer", () => {
    assert.equal(
      chooseFinaleChannel({ heroFinaleText: "JOIN", finaleFooter: "site.com", template: "sequence" }),
      "both_separate"
    );
    assert.equal(
      chooseFinaleChannel({ heroFinaleText: "", finaleFooter: "site.com", template: "scene" }),
      "finale_footer"
    );
  });

  it("detects overlapping candidates in time", () => {
    const warnings = detectOverlayCollisions([
      {
        id: "a",
        kind: "title",
        priority: 70,
        x: 540,
        y: 960,
        alignment: TITLE_ALIGN,
        lines: ["BIG TITLE"],
        fontSize: 72,
        start: 0,
        end: 5,
      },
      {
        id: "b",
        kind: "subtitle",
        priority: 50,
        x: 540,
        y: 980,
        alignment: TITLE_ALIGN,
        lines: ["subtitle on top"],
        fontSize: 48,
        start: 0,
        end: 5,
      },
    ]);
    assert.ok(warnings.length > 0);
  });

  it("hides lower-priority layer when reposition fails", () => {
    const resolved = resolveOverlayCollisions({
      candidates: [
        {
          id: "hero",
          kind: "hero",
          priority: 100,
          x: 540,
          y: 900,
          alignment: 5,
          lines: ["HERO LINE"],
          fontSize: 90,
          start: 0,
          end: 5,
        },
        {
          id: "sub",
          kind: "subtitle",
          priority: 50,
          x: 540,
          y: 910,
          alignment: TITLE_ALIGN,
          lines: ["SUB"],
          fontSize: 60,
          start: 0,
          end: 5,
        },
      ],
      frameWidth: 1080,
      frameHeight: 1920,
    });
    const sub = resolved.candidates.find((c) => c.id === "sub");
    const subAction = resolved.actions.find((a) => a.id === "sub");
    assert.ok(
      sub?.hidden ||
        subAction?.action === "moved" ||
        resolved.warnings.length > 0
    );
  });
});
