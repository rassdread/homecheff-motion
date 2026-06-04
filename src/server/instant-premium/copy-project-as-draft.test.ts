import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { buildInitialFullRerenderDraftPayload } from "@/lib/full-rerender-draft";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("copy project as draft", () => {
  it("creates a new draft project without mutating the source", () => {
    const src = readFileSync(join(__dirname, "copy-project-as-draft.ts"), "utf8");
    assert.match(src, /status: "draft"/);
    assert.match(src, /sourceProjectId: source\.id/);
    assert.doesNotMatch(src, /instantPreviousFinalVideoUrl/);
    assert.doesNotMatch(src, /outputVideoUrl: null/);
    assert.doesNotMatch(src, /fullRerenderInstantPremiumProject/);
    assert.match(src, /ensureFullRerenderDraftForProject/);
  });

  it("copies images in order with scene metadata fields", () => {
    const src = readFileSync(join(__dirname, "copy-project-as-draft.ts"), "utf8");
    assert.match(src, /order: image\.order/);
    assert.match(src, /instantSceneTexts/);
    assert.match(src, /instantTextPatches/);
    assert.match(src, /studioHandoffJson/);
  });

  it("exposes copy-as-draft API route", () => {
    const route = readFileSync(
      join(__dirname, "../../app/api/instant-premium/projects/[id]/copy-as-draft/route.ts"),
      "utf8"
    );
    assert.match(route, /copyInstantPremiumProjectAsDraft/);
    assert.match(route, /editVersionPath/);
  });

  it("draft render uses startDraftInstantPremiumProjectRender not full rerender", () => {
    const route = readFileSync(
      join(__dirname, "../../app/api/instant-premium/projects/[id]/full-rerender/route.ts"),
      "utf8"
    );
    assert.match(route, /projectRow\.status === "draft"/);
    assert.match(route, /startDraftInstantPremiumProjectRender/);
    const startSrc = readFileSync(join(__dirname, "start-draft-project-render.ts"), "utf8");
    assert.match(startSrc, /startProjectJobs/);
    assert.doesNotMatch(startSrc, /fullRerenderInstantPremiumProject/);
    assert.doesNotMatch(startSrc, /sealDefaultRenderVersion/);
  });

  it("concepts gallery lists draft status projects", () => {
    const list = readFileSync(
      join(__dirname, "../animation-projects/list-projects-handler.ts"),
      "utf8"
    );
    assert.match(list, /status: "draft"/);
    assert.match(list, /sourceProjectId/);
  });

  it("draft payload keeps scene texts attached to slots", () => {
    const payload = buildInitialFullRerenderDraftPayload({
      images: [
        { id: "img-a", previewUrl: "https://cdn/a.jpg", fileName: "a.jpg" },
        { id: "img-b", previewUrl: "https://cdn/b.jpg", fileName: "b.jpg" },
      ],
      instantSceneTexts: [
        {
          template: "scene",
          emotionMode: "auto",
          actingIntensity: "active",
          textBeats: [{ text: "Hello", startSec: 0, endSec: 2 }],
        },
        {
          template: "scene",
          emotionMode: "manual",
          emotion: "proud",
          actingIntensity: "very_active",
        },
      ],
      instantUserIntent: "Test intent",
      instantTransitionSeconds: 5,
      instantMode: "story",
    });
    assert.equal(payload.slots.length, 2);
    assert.ok(payload.slots[0]?.text);
    assert.equal(payload.slots[0]?.image?.id, "img-a");
    assert.equal(payload.slots[1]?.image?.id, "img-b");
    assert.equal(payload.initialImageIds.join(","), "img-a,img-b");
  });
});
