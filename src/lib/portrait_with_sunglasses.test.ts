import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  auditAccessoryDetection,
  computeVisionTrustScore,
  explainPartDetectionDecision,
  isEvidenceBackedPart,
  portraitWithSunglassesFixture,
} from "@/lib/editor-vision-evidence-audit";
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

describe("portrait with sunglasses — vision evidence audit V2", () => {
  it("detects sunglasses and rejects invisible pants/jacket/tie/shoes", () => {
    const analysis = portraitWithSunglassesFixture();
    const sections = splitAnalysisIntoTruthSections(analysis, { assetType: "human" });
    const labels = detectedLabels(sections);

    assert.ok(labels.some((l) => l.includes("sunglasses")), "sunglasses must be detected");
    assert.ok(labels.some((l) => l.includes("head")));
    assert.ok(labels.some((l) => l.includes("hair")));
    assert.ok(labels.some((l) => l.includes("eyes")));
    assert.ok(labels.some((l) => l.includes("mouth")));
    assert.ok(labels.some((l) => l.includes("beard")));
    assert.ok(labels.some((l) => l.includes("shirt")));

    const estimated = sections.estimated.map((p) => p.label.toLowerCase());
    assert.ok(estimated.some((l) => l.includes("necklace")), "weak necklace stays in Estimated, not hidden");

    for (const forbidden of ["pants", "shoes", "tie", "jacket"]) {
      assert.equal(
        labels.some((l) => l.includes(forbidden)),
        false,
        `detected must not include ${forbidden}`
      );
    }

    const pantsExplanation = explainPartDetectionDecision(
      analysis.parts.find((p) => p.key === "pants")!,
      { assetType: "human", allParts: analysis.parts }
    );
    assert.equal(pantsExplanation.decision, "REJECTED");
    assert.equal(pantsExplanation.evidenceBacked, false);

    const sunglassesExplanation = explainPartDetectionDecision(
      analysis.parts.find((p) => p.key === "sunglasses")!,
      { assetType: "human", allParts: analysis.parts }
    );
    assert.equal(sunglassesExplanation.decision, "DETECTED");
    assert.equal(sunglassesExplanation.source, "openai_vision");
  });

  it("accessory audit flags sunglasses as detected with bbox", () => {
    const analysis = portraitWithSunglassesFixture();
    const audit = auditAccessoryDetection(analysis.parts, { assetType: "human" });
    const sunglasses = audit.find((r) => r.accessory === "sunglasses");
    assert.ok(sunglasses);
    assert.equal(sunglasses.detected, true);
    assert.equal(sunglasses.hasBbox, true);
    assert.equal(sunglasses.source, "openai_vision");
  });

  it("vision trust score is 100% when all detected parts are evidence-backed", () => {
    const analysis = portraitWithSunglassesFixture();
    const sections = splitAnalysisIntoTruthSections(analysis, { assetType: "human" });
    const score = computeVisionTrustScore(sections.detected, { assetType: "human" });
    assert.equal(score, 100);
  });
});

describe("vision evidence audit V2 — regression scenarios", () => {
  it("dog head only — head/eyes/ears detected; paws/tail/legs rejected", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "head", label: "Head", category: "head" }),
        part({ key: "eyes", label: "Eyes", category: "eyes" }),
        part({ key: "ears", label: "Ears", category: "head" }),
        part({ key: "paws", label: "Paws", category: "paws", source: "openai_vision", confidence: 0.9 }),
        part({ key: "tail", label: "Tail", category: "tail", source: "estimated", confidence: 0.6 }),
        part({ key: "legs", label: "Legs", category: "legs", source: "openai_vision", confidence: 0.85 }),
      ],
      characterLabel: "Dog",
      openAiUsed: true,
      templateUsed: false,
    };

    const labels = detectedLabels(splitAnalysisIntoTruthSections(analysis, { assetType: "animal" }));
    assert.ok(labels.some((l) => l.includes("head")));
    assert.ok(labels.some((l) => l.includes("eyes")));
    assert.ok(labels.some((l) => l.includes("ears")));

    for (const forbidden of ["paw", "tail", "leg"]) {
      assert.equal(labels.some((l) => l.includes(forbidden)), false, `must not detect ${forbidden}`);
    }
  });

  it("full-body human — pants and shoes allowed with RT-DETR evidence", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "head", label: "Head", category: "head", source: "openai_vision", confidence: 0.9 }),
        part({ key: "shirt", label: "Shirt", category: "shirt" }),
        part({ key: "pants", label: "Pants", category: "pants", source: "rtdetr", confidence: 0.91 }),
        part({ key: "shoes", label: "Shoes", category: "shoes", source: "rtdetr", confidence: 0.89 }),
      ],
      characterLabel: "Person",
      openAiUsed: true,
      templateUsed: false,
    };

    const labels = detectedLabels(splitAnalysisIntoTruthSections(analysis, { assetType: "human" }));
    assert.ok(labels.some((l) => l.includes("pants")));
    assert.ok(labels.some((l) => l.includes("shoe")));
    assert.ok(isEvidenceBackedPart(analysis.parts.find((p) => p.key === "pants")!));
    assert.ok(isEvidenceBackedPart(analysis.parts.find((p) => p.key === "shoes")!));
  });

  it("mascot portrait — globe/face detected; no human clothing inferred", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "face", label: "Face", category: "face", source: "openai_vision", confidence: 0.88 }),
        part({ key: "eyes", label: "Eyes", category: "eyes" }),
        part({ key: "mouth", label: "Mouth", category: "mouth" }),
        part({
          key: "globe",
          label: "Globe",
          category: "globe",
          group: "prop",
          source: "rtdetr",
          confidence: 0.9,
        }),
        part({ key: "pants", label: "Pants", category: "pants", source: "openai_vision", confidence: 0.86 }),
        part({ key: "tie", label: "Tie", category: "tie", source: "estimated", confidence: 0.55 }),
      ],
      characterLabel: "Mascot",
      openAiUsed: true,
      templateUsed: false,
    };

    const labels = detectedLabels(splitAnalysisIntoTruthSections(analysis, { assetType: "mascot" }));
    assert.ok(labels.some((l) => l.includes("globe")));
    assert.ok(labels.some((l) => l.includes("face")));
    assert.ok(labels.some((l) => l.includes("eyes")));
    assert.ok(labels.some((l) => l.includes("mouth")));
    assert.equal(labels.some((l) => l.includes("pants")), false);
    assert.equal(labels.some((l) => l.includes("tie")), false);
  });

  it("isEvidenceBackedPart rejects estimated and taxonomy sources", () => {
    const estimated = part({ key: "pants", label: "Pants", source: "estimated", confidence: 0.99 });
    const taxonomy = part({ key: "tail", label: "Tail", source: "taxonomy_fallback", confidence: 0.99 });
    assert.equal(isEvidenceBackedPart(estimated), false);
    assert.equal(isEvidenceBackedPart(taxonomy), false);
  });

  it("polygon and mask count as evidence for hard detector", () => {
    const withPolygon = part({
      key: "pants",
      label: "Pants",
      category: "pants",
      bbox: { x: 0, y: 0, width: 0, height: 0 },
      polygon: [{ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }, { x: 0.8, y: 0.9 }],
      source: "rtdetr",
      confidence: 0.9,
    });
    assert.equal(isEvidenceBackedPart(withPolygon), true);
  });
});
