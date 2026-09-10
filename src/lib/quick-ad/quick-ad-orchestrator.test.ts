import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildQuickAdPipelineMessage,
  inferQuickAdIntent,
  quickAdProjectName,
} from "@/lib/quick-ad/quick-ad-intent";
import {
  generateQuickAdProject,
  QUICK_AD_EXPORT_ACTION,
  reviseQuickAdProject,
} from "@/lib/quick-ad/quick-ad-orchestrator";

const CERT_STORY =
  "Ik maak zelf taarten in Vlaardingen en wil meer klanten uit mijn buurt bereiken. Maak een korte verticale advertentie voor Instagram en Facebook. Het moet warm, lokaal en professioneel aanvoelen. Laat duidelijk zien dat mensen mijn taarten kunnen bestellen.";

describe("Quick Ad intent + orchestrator", () => {
  it("infers product, location, tone, platforms and CTA from ordinary Dutch", () => {
    const intent = inferQuickAdIntent({ story: CERT_STORY });
    assert.equal(intent.format, "9:16");
    assert.equal(intent.durationSeconds, 20);
    assert.equal(intent.purpose, "social_ad");
    assert.ok(intent.platforms.includes("instagram"));
    assert.ok(intent.platforms.includes("facebook"));
    assert.match(String(intent.location), /Vlaardingen/i);
    assert.match(String(intent.product), /taarten/i);
    assert.match(intent.cta, /Bestel/i);
    assert.match(intent.tone, /warm|professioneel|lokaal/i);
  });

  it("builds pipeline message without requiring prompt engineering", () => {
    const intent = inferQuickAdIntent({ story: CERT_STORY });
    const msg = buildQuickAdPipelineMessage({ story: CERT_STORY, intent });
    assert.match(msg, /taarten/i);
    assert.match(msg, /Bestel/i);
    assert.doesNotMatch(msg, /keyframe|provider|vidu|ffmpeg/i);
  });

  it("generates a one-photo ai_everything project with scenes and CTA", () => {
    const { project, intent } = generateQuickAdProject({
      imageUrl: "blob:test-photo",
      story: CERT_STORY,
    });
    assert.equal(project.metadata?.quickAd, true);
    assert.equal(project.metadata?.publishEntryMode, "ai_everything");
    assert.equal(project.imageUrl, "blob:test-photo");
    assert.ok((project.durationSeconds ?? 0) <= 20);
    assert.equal(intent.format, "9:16");
    assert.ok(Array.isArray(project.metadata?.publishScenes));
    assert.ok((project.metadata?.publishScenes as unknown[]).length >= 3);
    assert.equal(QUICK_AD_EXPORT_ACTION, "publish_photo_story");
    assert.match(quickAdProjectName(intent, CERT_STORY), /taarten|Advertentie/i);
  });

  it("revises without dropping original story or photo", () => {
    const first = generateQuickAdProject({
      imageUrl: "blob:test-photo",
      story: CERT_STORY,
    });
    const revised = reviseQuickAdProject({
      project: first.project,
      revisionInstruction: "Maak hem korter en zet bestellen duidelijker in beeld.",
    });
    assert.equal(revised.project.id, first.project.id);
    assert.equal(revised.project.imageUrl, "blob:test-photo");
    assert.equal(revised.project.metadata?.quickAdStory, CERT_STORY);
    assert.match(String(revised.pipelineMessage), /Aanpassing:/);
    assert.match(String(revised.pipelineMessage), /korter/i);
  });

  it("Growth and Studio self-ad stories resolve a CTA", () => {
    const growth = inferQuickAdIntent({
      story:
        "Maak een korte zakelijke social advertentie voor Growth van HomeCheff. Gericht op ondernemers die sneller klanten willen vinden.",
    });
    assert.match(growth.cta, /Growth|Meer info/i);

    const studio = inferQuickAdIntent({
      story:
        "Maak een korte advertentie voor HomeCheff Studio. Laat zien dat een ondernemer met een foto en beschrijving snel content kan maken.",
    });
    assert.match(studio.cta, /Studio|Meer info/i);
  });
});
