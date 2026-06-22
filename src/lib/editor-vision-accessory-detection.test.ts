import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACCESSORY_MIN_CONFIDENCE,
  auditAllAccessories,
  BODY_PART_MIN_CONFIDENCE,
  enrichAnalysisWithVisionKeyFeatureAccessories,
  evaluateAccessoryDetection,
  isAccessoryPart,
  SMALL_ACCESSORY_ON_HEAD_MIN_CONFIDENCE,
} from "@/lib/editor-vision-accessory-detection";
import { portraitWithSunglassesFixture } from "@/lib/editor-vision-evidence-audit";
import { splitAnalysisIntoTruthSections } from "@/lib/editor-vision-truth-mode";
import type { IllustrationPartAnalysisResult, IllustrationPartSpec } from "@/types/editor-illustration-parts";

function part(
  input: Pick<IllustrationPartSpec, "key" | "label"> &
    Partial<Omit<IllustrationPartSpec, "key" | "label">>
): IllustrationPartSpec {
  return {
    category: "face",
    group: "character",
    bbox: { x: 0.2, y: 0.2, width: 0.2, height: 0.2 },
    source: "rtdetr",
    confidence: 0.88,
    editable: true,
    ...input,
  };
}

function detectedLabels(sections: ReturnType<typeof splitAnalysisIntoTruthSections>): string[] {
  return sections.detected.map((p) => p.label.toLowerCase());
}

describe("editor vision accessory detection layer", () => {
  it("uses separate confidence thresholds for body parts vs accessories", () => {
    assert.equal(BODY_PART_MIN_CONFIDENCE, 0.75);
    assert.equal(ACCESSORY_MIN_CONFIDENCE, 0.65);
    assert.equal(SMALL_ACCESSORY_ON_HEAD_MIN_CONFIDENCE, 0.6);
  });

  it("1 — portrait with sunglasses → sunglasses detected", () => {
    const analysis = portraitWithSunglassesFixture();
    const sections = splitAnalysisIntoTruthSections(analysis, { assetType: "human" });
    const labels = detectedLabels(sections);

    assert.ok(labels.some((l) => l.includes("sunglasses")));
    assert.ok(labels.some((l) => l.includes("head")));
    assert.ok(labels.some((l) => l.includes("hair")));
    assert.ok(labels.some((l) => l.includes("beard")));
    assert.ok(labels.some((l) => l.includes("shirt")));

    const verdict = evaluateAccessoryDetection("sunglasses", analysis.parts, "human");
    assert.equal(verdict.detected, true);
    assert.equal(verdict.accepted, true);
    assert.equal(verdict.source, "openai_vision");
  });

  it("2 — portrait without sunglasses → no sunglasses", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "head", label: "Head", category: "head", source: "openai_vision", confidence: 0.9 }),
        part({ key: "hair", label: "Hair", category: "head", source: "openai_vision", confidence: 0.88 }),
        part({ key: "eyes", label: "Eyes", category: "eyes" }),
      ],
      characterLabel: "Person",
      openAiUsed: true,
      templateUsed: false,
    };

    const labels = detectedLabels(splitAnalysisIntoTruthSections(analysis, { assetType: "human" }));
    assert.equal(labels.some((l) => l.includes("sunglasses")), false);

    const verdict = evaluateAccessoryDetection("sunglasses", analysis.parts, "human");
    assert.equal(verdict.detected, false);
    assert.match(verdict.reason, /not identified/i);
  });

  it("3 — dog with collar → collar detected", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "head", label: "Head", category: "head" }),
        part({ key: "collar", label: "Collar", category: "prop", group: "prop", source: "rtdetr", confidence: 0.9 }),
      ],
      characterLabel: "Dog",
      openAiUsed: false,
      templateUsed: false,
    };

    const labels = detectedLabels(splitAnalysisIntoTruthSections(analysis, { assetType: "animal" }));
    assert.ok(labels.some((l) => l.includes("collar")));

    const verdict = evaluateAccessoryDetection("collar", analysis.parts, "animal");
    assert.equal(verdict.detected, true);
    assert.equal(verdict.source, "rtdetr");
  });

  it("4 — mascot with globe → globe detected", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "face", label: "Face", category: "face", source: "openai_vision", confidence: 0.86 }),
        part({
          key: "globe",
          label: "Globe",
          category: "globe",
          group: "prop",
          source: "rtdetr",
          confidence: 0.88,
        }),
      ],
      characterLabel: "Mascot",
      openAiUsed: true,
      templateUsed: false,
    };

    const labels = detectedLabels(splitAnalysisIntoTruthSections(analysis, { assetType: "mascot" }));
    assert.ok(labels.some((l) => l.includes("globe")));

    const verdict = evaluateAccessoryDetection("globe", analysis.parts, "mascot");
    assert.equal(verdict.detected, true);
  });

  it("5 — invisible accessory → rejected", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "head", label: "Head", category: "head" }),
        part({
          key: "necklace",
          label: "Necklace",
          category: "prop",
          source: "estimated",
          confidence: 0.58,
        }),
      ],
      characterLabel: "Person",
      openAiUsed: true,
      templateUsed: false,
    };

    const labels = detectedLabels(splitAnalysisIntoTruthSections(analysis, { assetType: "human" }));
    assert.equal(labels.some((l) => l.includes("necklace")), false);

    const verdict = evaluateAccessoryDetection("necklace", analysis.parts, "human");
    assert.equal(verdict.detected, false);
    assert.equal(verdict.accepted, false);
    assert.match(verdict.reason, /no detector evidence|template inference/i);
  });

  it("head-attached sunglasses at 62% confidence are detected on face region", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "face", label: "Face", category: "face", source: "openai_vision", confidence: 0.88 }),
        part({
          key: "sunglasses",
          label: "Sunglasses",
          category: "eyes",
          source: "openai_vision",
          confidence: 0.62,
          bbox: { x: 0.32, y: 0.13, width: 0.36, height: 0.08 },
        }),
      ],
      characterLabel: "Person",
      openAiUsed: true,
      templateUsed: false,
    };

    const labels = detectedLabels(splitAnalysisIntoTruthSections(analysis, { assetType: "human" }));
    assert.ok(labels.some((l) => l.includes("sunglasses")));
  });

  it("auditAllAccessories returns detected/confidence/source/reason per accessory", () => {
    const analysis = portraitWithSunglassesFixture();
    const audit = auditAllAccessories(analysis.parts, "human");
    const sunglasses = audit.find((r) => r.accessory === "sunglasses");
    assert.ok(sunglasses);
    assert.equal(sunglasses.detected, true);
    assert.ok(sunglasses.confidence !== null && sunglasses.confidence >= 0.65);
    assert.equal(sunglasses.source, "openai_vision");
    assert.ok(sunglasses.reason.length > 0);
  });

  it("isAccessoryPart recognizes human/animal/mascot accessories", () => {
    assert.equal(isAccessoryPart(part({ key: "sunglasses", label: "Sunglasses" }), "human"), true);
    assert.equal(isAccessoryPart(part({ key: "collar", label: "Collar" }), "animal"), true);
    assert.equal(isAccessoryPart(part({ key: "globe", label: "Globe" }), "mascot"), true);
    assert.equal(isAccessoryPart(part({ key: "pants", label: "Pants", category: "pants" }), "human"), false);
  });

  it("live WhatsApp portrait — keyFeatures Sunglasses injects detected part", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "head", label: "Head", category: "head", source: "openai_vision", confidence: 0.97 }),
        part({ key: "eyes", label: "Eyes", category: "eyes", source: "openai_vision", confidence: 0.95 }),
        part({ key: "mouth", label: "Mouth", category: "mouth", source: "openai_vision", confidence: 0.9 }),
        part({ key: "shirt", label: "Shirt", category: "shirt", source: "openai_vision", confidence: 0.85 }),
      ],
      characterLabel: "Person",
      openAiUsed: true,
      templateUsed: true,
    };

    const vision = {
      objectType: "human" as const,
      objectTypeLabel: "Human",
      visualStyle: "Realistic",
      keyFeatures: ["Curly hair", "Sunglasses", "Casual t-shirt", "Facial hair"],
      colors: [],
      shapeLanguage: [],
      brandIdentity: "",
      materialHints: "",
      environmentHints: "",
      suggestedPreserve: [],
      suggestedChange: [],
      suggestedForbidden: [],
      confidence: 0.9,
      safetyNotes: [],
      assetFamily: "",
      characterLineage: "",
      brandRecognitionConfidence: 0.5,
      identityFingerprint: {
        fingerprintHash: "test",
        identityShapeMarkers: [],
        accessoryPattern: "",
        silhouette: "",
      },
    };

    const enriched = enrichAnalysisWithVisionKeyFeatureAccessories(analysis, vision);
    const labels = detectedLabels(splitAnalysisIntoTruthSections(enriched, { assetType: "human" }));

    assert.ok(labels.some((l) => l.includes("sunglasses")));
    const audit = evaluateAccessoryDetection("sunglasses", enriched.parts, "human");
    assert.equal(audit.detected, true);
    assert.equal(audit.source, "openai_vision");
  });
});
