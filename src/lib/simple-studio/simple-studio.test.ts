import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseSimpleStudioPurpose,
  SIMPLE_STUDIO_CATALOG,
  simpleStudioCatalogEntry,
} from "@/lib/simple-studio/catalog";
import { inferSimpleStudioIntent } from "@/lib/simple-studio/intent-infer";
import {
  generateSimpleStudioProject,
  reviseSimpleStudioProject,
  SIMPLE_STUDIO_EXPORT_ACTION,
} from "@/lib/simple-studio/orchestrator";

const CERT_STORY =
  "Ik maak zelf taarten in Vlaardingen en wil meer klanten uit mijn buurt bereiken. Maak een korte verticale advertentie voor Instagram en Facebook. Het moet warm, lokaal en professioneel aanvoelen. Laat duidelijk zien dat mensen mijn taarten kunnen bestellen.";

describe("Simple Studio catalog + orchestrator", () => {
  it("exposes the purpose tree with shared orchestration for photo+story intents", () => {
    const purposes = SIMPLE_STUDIO_CATALOG.map((e) => e.purpose);
    assert.ok(purposes.includes("advertisement"));
    assert.ok(purposes.includes("product_video"));
    assert.ok(purposes.includes("talking_photo"));
    assert.ok(purposes.includes("story"));
    assert.ok(purposes.includes("social_video"));
    assert.ok(purposes.includes("animation"));
    assert.ok(purposes.includes("general"));
    assert.equal(simpleStudioCatalogEntry("advertisement").href, "/studio/quick-ad");
    assert.equal(simpleStudioCatalogEntry("animation").usesSharedOrchestrator, false);
    assert.equal(simpleStudioCatalogEntry("general").free, true);
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
    assert.equal(intent.purpose, "advertisement");
    assert.match(String(intent.location), /Vlaardingen/i);
    assert.match(intent.cta, /Bestel/i);
  });

  it("generates and revises product_video via shared engine", () => {
    const first = generateSimpleStudioProject({
      purpose: "product_video",
      imageUrl: "blob:test-photo",
      story: "Dit is mijn ambachtelijke honing uit de buurt. Laat zien hoe puur het is.",
    });
    assert.equal(first.project.metadata?.simpleStudio, true);
    assert.equal(first.project.metadata?.simpleStudioPurpose, "product_video");
    assert.equal(first.project.metadata?.quickAd, false);
    assert.equal(first.intent.format, "9:16");
    assert.ok((first.project.metadata?.publishScenes as unknown[]).length >= 2);

    const revised = reviseSimpleStudioProject({
      project: first.project,
      revisionInstruction: "Maak hem korter.",
    });
    assert.equal(revised.project.id, first.project.id);
    assert.equal(revised.project.imageUrl, "blob:test-photo");
    assert.match(revised.pipelineMessage, /Aanpassing:/);
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
