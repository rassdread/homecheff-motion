import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseSimpleStudioPurpose,
  SIMPLE_STUDIO_CATALOG,
  simpleStudioCatalogEntry,
} from "@/lib/simple-studio/catalog";
import { buildCreativePlanV2, extractQuotedDialogue } from "@/lib/simple-studio/intent-routing";
import { inferSimpleStudioIntent } from "@/lib/simple-studio/intent-infer";
import {
  generateSimpleStudioProject,
  reviseSimpleStudioProject,
  simpleStudioExportActionForPlan,
  SIMPLE_STUDIO_EXPORT_ACTION,
} from "@/lib/simple-studio/orchestrator";

const CERT_STORY =
  "Ik maak zelf taarten in Vlaardingen en wil meer klanten uit mijn buurt bereiken. Maak een korte verticale advertentie voor Instagram en Facebook. Het moet warm, lokaal en professioneel aanvoelen. Laat duidelijk zien dat mensen mijn taarten kunnen bestellen.";

const TALKING =
  'Laat deze persoon zeggen: "Welkom bij HomeCheff. Hier vind je bijzondere producten uit je eigen buurt." Laat hem natuurlijk bewegen en gebruik rustige achtergrondmuziek.';

describe("Simple Studio catalog + orchestrator", () => {
  it("exposes the purpose tree with shared orchestration for photo+story intents", () => {
    const purposes = SIMPLE_STUDIO_CATALOG.map((e) => e.purpose);
    assert.ok(purposes.includes("advertisement"));
    assert.ok(purposes.includes("talking_photo"));
    assert.equal(simpleStudioCatalogEntry("advertisement").href, "/studio/quick-ad");
    assert.equal(simpleStudioCatalogEntry("animation").usesSharedOrchestrator, false);
  });

  it("parses purpose query safely", () => {
    assert.equal(parseSimpleStudioPurpose("product_video"), "product_video");
    assert.equal(parseSimpleStudioPurpose("nope"), "advertisement");
  });

  it("infers advertisement intent from ordinary Dutch", () => {
    const intent = inferSimpleStudioIntent({
      story: CERT_STORY,
      purpose: "advertisement",
    });
    assert.equal(intent.format, "9:16");
    assert.match(String(intent.location), /Vlaardingen/i);
  });

  it("Creative Plan V2 routes dialogue, music, and honest lipsync limits", () => {
    const plan = buildCreativePlanV2({
      story: TALKING,
      media: [{ id: "1", kind: "image", url: "blob:face" }],
      purposeHint: "universal",
    });
    assert.equal(plan.purpose, "talking_photo");
    assert.equal(plan.speechMode, "dialogue");
    assert.ok(plan.dialogue);
    assert.match(plan.dialogue!, /Welkom bij HomeCheff/i);
    assert.equal(plan.voice.required, true);
    assert.equal(plan.music.required, true);
    assert.ok(["calm", "warm", "auto"].includes(plan.music.mood));
    assert.equal(plan.lipsync.requested, true);
    assert.equal(plan.lipsync.available, false);
    assert.ok(plan.engineChain.includes("voice_tts"));
    assert.ok(plan.engineChain.includes("free_music"));
    assert.ok(plan.engineChain.includes("audio_mux"));
    assert.ok(!plan.engineChain.includes("motion_deeplink"));
  });

  it("supports multi-photo slideshow chain", () => {
    const plan = buildCreativePlanV2({
      story:
        "Maak van deze vier foto’s een professionele productvideo van ongeveer 15 seconden. Rustige overgangen, moderne muziek en eindig met Bekijk het aanbod.",
      media: [
        { id: "a", kind: "image", url: "blob:1" },
        { id: "b", kind: "image", url: "blob:2" },
        { id: "c", kind: "image", url: "blob:3" },
        { id: "d", kind: "image", url: "blob:4" },
      ],
      purposeHint: "universal",
    });
    assert.equal(plan.purpose, "product_video");
    assert.ok(plan.engineChain.includes("slideshow"));
    assert.equal(simpleStudioExportActionForPlan(plan), "publish_slideshow");
    assert.match(String(plan.cta), /Bekijk|aanbod|Meer/i);
  });

  it("extracts quoted dialogue accurately", () => {
    assert.match(String(extractQuotedDialogue(TALKING)), /Welkom/);
  });

  it("generates multi-photo project and revises", () => {
    const first = generateSimpleStudioProject({
      purpose: "product_video",
      media: [
        { id: "1", kind: "image", url: "blob:a" },
        { id: "2", kind: "image", url: "blob:b" },
      ],
      story: "Maak een productvideo met rustige muziek en eindig met Bekijk het aanbod.",
    });
    assert.equal(first.project.metadata?.simpleStudio, true);
    assert.ok(first.plan.engineChain.includes("slideshow"));
    assert.ok(first.plan);

    const revised = reviseSimpleStudioProject({
      project: first.project,
      revisionInstruction: "Geen muziek.",
    });
    assert.equal(revised.project.id, first.project.id);
    assert.equal(revised.plan.music.mood, "none");
    assert.equal(SIMPLE_STUDIO_EXPORT_ACTION, "publish_photo_story");
  });

  it("keeps Quick Ad advertisement markers for purpose=advertisement", () => {
    const { project } = generateSimpleStudioProject({
      purpose: "advertisement",
      imageUrl: "blob:ad",
      story: CERT_STORY,
    });
    assert.equal(project.metadata?.quickAd, true);
    assert.equal(project.metadata?.simpleStudioPurpose, "advertisement");
  });
});
