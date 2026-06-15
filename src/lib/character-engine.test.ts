import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeCharacter,
  buildCharacterEngineSaveMetadata,
  buildCharacterSummary,
  characterEngineMetadataToDraftFields,
  evaluateCharacterCompleteness,
  evaluateMotionReadiness,
  resolveCharacterEngineQuestions,
  runCharacterEngine,
} from "@/lib/character-engine";
import { mapVisionJsonToAnalysis } from "@/lib/studio-asset-vision-analysis";

const PORTRAIT_VISION = mapVisionJsonToAnalysis(
  {
    objectType: "Human",
    visualStyle: "Photo portrait head and shoulders",
    environmentHints: "busy kitchen background",
    suggestedPreserve: ["face", "green shirt"],
    keyFeatures: ["green shirt"],
    confidence: 0.8,
    identityFingerprint: { silhouette: "portrait shoulders up", proportions: "portrait" },
  },
  { sourceName: "Chef" }
);

const FULL_BODY_VISION = mapVisionJsonToAnalysis(
  {
    objectType: "Human",
    visualStyle: "Photo full body",
    environmentHints: "studio",
    suggestedPreserve: ["full body", "arms visible", "feet visible", "standing neutral"],
    keyFeatures: ["jeans", "white sneakers"],
    confidence: 0.9,
    identityFingerprint: { silhouette: "full figure standing", proportions: "full body" },
  },
  { sourceName: "Runner" }
);

const MASCOT_VISION = mapVisionJsonToAnalysis(
  {
    objectType: "Mascot",
    visualStyle: "Flat cartoon mascot",
    environmentHints: "transparent",
    suggestedPreserve: ["globe head", "chef jacket", "brand mascot style"],
    keyFeatures: ["round head", "chef outfit"],
    confidence: 0.92,
    identityFingerprint: { silhouette: "mascot", proportions: "partial body" },
  },
  { sourceName: "Globe Man" }
);

const HEAD_ONLY_VISION = mapVisionJsonToAnalysis(
  {
    objectType: "Human",
    visualStyle: "Close-up face only",
    environmentHints: "indoor",
    suggestedPreserve: ["face"],
    keyFeatures: ["face"],
    confidence: 0.75,
    identityFingerprint: { silhouette: "head only", proportions: "head only" },
  },
  { sourceName: "Face" }
);

describe("character-engine", () => {
  it("portrait vision → PORTRAIT completeness and missing body parts", () => {
    const analysis = analyzeCharacter({ vision: PORTRAIT_VISION });
    assert.equal(evaluateCharacterCompleteness(analysis), "PORTRAIT");
    assert.ok(analysis.missingParts.includes("legs") || analysis.missingParts.includes("feet"));
    const readiness = evaluateMotionReadiness({ analysis, vision: PORTRAIT_VISION, strict: true });
    assert.ok(readiness.score > 0);
    assert.ok(!readiness.ready);
    assert.ok(readiness.missingRequirements.includes("feet"));
  });

  it("head only vision → HEAD_ONLY completeness", () => {
    const analysis = analyzeCharacter({ vision: HEAD_ONLY_VISION });
    assert.equal(evaluateCharacterCompleteness(analysis), "HEAD_ONLY");
  });

  it("full body vision → COMPLETE or high readiness", () => {
    const analysis = analyzeCharacter({ vision: FULL_BODY_VISION });
    const completeness = evaluateCharacterCompleteness(analysis);
    assert.ok(completeness === "COMPLETE" || completeness === "PARTIAL");
    const readiness = evaluateMotionReadiness({ analysis, vision: FULL_BODY_VISION, strict: true });
    assert.ok(readiness.score >= 75);
  });

  it("mascot vision → MASCOT completeness", () => {
    const analysis = analyzeCharacter({ vision: MASCOT_VISION });
    assert.equal(evaluateCharacterCompleteness(analysis), "MASCOT");
    const questions = resolveCharacterEngineQuestions({ route: "motion-ready", vision: MASCOT_VISION });
    assert.ok(questions.some((q) => q.id === "preserve_mascot_style" || q.id === "ref_preserve_mascot_style"));
  });

  it("idea-only analysis → UNKNOWN completeness", () => {
    const analysis = analyzeCharacter({ idea: "chef" });
    assert.equal(evaluateCharacterCompleteness(analysis), "UNKNOWN");
    assert.ok(analysis.missingParts.length > 0);
  });

  it("motion readiness tiers", () => {
    const low = evaluateMotionReadiness({
      analysis: {
        ...analyzeCharacter({ idea: "x" }),
        readinessScore: 0,
        hasFace: false,
        hasHands: false,
        hasFeet: false,
        hasBody: false,
      },
      strict: false,
    });
    assert.equal(low.ready, false);
    assert.equal(low.score, 0);

    const mid = evaluateMotionReadiness({
      analysis: { ...analyzeCharacter({ vision: PORTRAIT_VISION }), readinessScore: 50 },
      vision: PORTRAIT_VISION,
      strict: false,
    });
    assert.equal(mid.ready, false);

    const high = evaluateMotionReadiness({
      analysis: { ...analyzeCharacter({ vision: FULL_BODY_VISION }), readinessScore: 100, hasHands: true, hasFeet: true, hasBody: true, hasFace: true },
      vision: FULL_BODY_VISION,
      strict: true,
    });
    assert.equal(high.ready, true);
  });

  it("dynamic questions for portrait, full body, mascot", () => {
    const portraitQs = resolveCharacterEngineQuestions({ route: "from-reference", vision: PORTRAIT_VISION });
    assert.ok(portraitQs.some((q) => q.id.includes("body_style")));

    const fullBodyQs = resolveCharacterEngineQuestions({ route: "from-reference", vision: FULL_BODY_VISION });
    assert.ok(fullBodyQs.some((q) => q.id.includes("keep_clothing") || q.id.includes("remove_background")));

    const mascotQs = resolveCharacterEngineQuestions({ route: "motion-ready", vision: MASCOT_VISION });
    assert.ok(mascotQs.length > 0);
  });

  it("buildCharacterSummary includes detected and missing lines", () => {
    const analysis = analyzeCharacter({ vision: PORTRAIT_VISION });
    const summary = buildCharacterSummary({ analysis, vision: PORTRAIT_VISION, strictMotion: false });
    assert.equal(summary.titleKey, "characterEngine.summary.title");
    assert.ok(summary.detectedLines.length > 0);
    assert.ok(summary.missingLines.length > 0);
    assert.ok(summary.canGenerateMissingParts);
  });

  it("save metadata and draft fields", () => {
    const engine = runCharacterEngine({ route: "from-reference", vision: PORTRAIT_VISION });
    const meta = buildCharacterEngineSaveMetadata({
      analysis: engine.analysis,
      route: "from-reference",
      vision: PORTRAIT_VISION,
    });
    assert.equal(meta.sourceRoute, "from-reference");
    assert.ok(meta.characterCompleteness);
    assert.ok(typeof meta.motionReadinessScore === "number");
    const fields = characterEngineMetadataToDraftFields(meta);
    assert.equal(fields.characterCompleteness, meta.characterCompleteness);
    assert.equal(fields.motionReady, meta.motionReady ? "true" : "false");
    assert.ok(fields.missingParts);
  });

  it("runCharacterEngine bundles analysis, questions, and save metadata", () => {
    const engine = runCharacterEngine({
      route: "new",
      idea: "A friendly cartoon mascot chef for brand videos",
      locale: "en",
    });
    assert.ok(engine.questions.length >= 0);
    assert.ok(engine.summary);
    assert.equal(engine.saveMetadata.sourceRoute, "new");
    assert.equal(engine.saveMetadata.characterType, "mascot");
  });
});
