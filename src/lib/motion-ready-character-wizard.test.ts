import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapVisionJsonToAnalysis } from "@/lib/studio-asset-vision-analysis";
import {
  applyAiSuggestionsToAnswers,
  buildFullBodyGenerationPrompt,
  buildMotionReadySaveMetadata,
  createEmptyMotionReadyWizardState,
  detectMotionCharacterParts,
  handsAndFeetRequiredForMotionReady,
  isFullBodyFlow,
  isMascotFlow,
  isPortraitOnlyFlow,
  motionReadyWizardSeedFromSource,
  motionReadyWizardToAssetDraft,
  portraitUploadDetectsMissingBody,
  resolveMotionWizardQuestions,
  seedAnalysisFromVision,
  shouldOpenEditorByDefault,
  summarizeMotionReadiness,
  validateMotionReadyCharacter,
} from "@/lib/motion-ready-character-wizard";

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

describe("motion-ready-character-wizard", () => {
  it("portrait upload detects missing body", () => {
    assert.equal(portraitUploadDetectsMissingBody(PORTRAIT_VISION), true);
    const parts = detectMotionCharacterParts(PORTRAIT_VISION);
    assert.ok(parts.find((p) => p.id === "legs")?.status !== "present");
    assert.ok(parts.find((p) => p.id === "feet")?.status !== "present");
  });

  it("portrait flow asks dynamic body questions", () => {
    const parts = detectMotionCharacterParts(PORTRAIT_VISION);
    const summary = summarizeMotionReadiness({ vision: PORTRAIT_VISION, parts });
    const questions = resolveMotionWizardQuestions({
      vision: PORTRAIT_VISION,
      bodyVisibility: summary.bodyVisibility,
      parts,
    });
    assert.ok(isPortraitOnlyFlow(summary.bodyVisibility));
    assert.ok(questions.some((q) => q.id === "body_style"));
    assert.ok(questions.some((q) => q.id === "clothing"));
    assert.ok(questions.some((q) => q.id === "pose"));
  });

  it("full-body upload skips unnecessary questions", () => {
    const parts = detectMotionCharacterParts(FULL_BODY_VISION);
    const summary = summarizeMotionReadiness({ vision: FULL_BODY_VISION, parts });
    const questions = resolveMotionWizardQuestions({
      vision: FULL_BODY_VISION,
      bodyVisibility: summary.bodyVisibility,
      parts,
    });
    assert.ok(isFullBodyFlow(summary.bodyVisibility));
    assert.equal(questions.length, 2);
    assert.ok(questions.every((q) => q.id === "keep_clothing" || q.id === "remove_background"));
  });

  it("mascot upload preserves mascot style in generation prompt", () => {
    const parts = detectMotionCharacterParts(MASCOT_VISION);
    const questions = resolveMotionWizardQuestions({
      vision: MASCOT_VISION,
      bodyVisibility: "partial",
      parts,
    });
    assert.ok(isMascotFlow(MASCOT_VISION));
    assert.ok(questions.some((q) => q.id === "preserve_mascot_style"));
    const answers = applyAiSuggestionsToAnswers(questions);
    const prompt = buildFullBodyGenerationPrompt({
      vision: MASCOT_VISION,
      answers: { ...answers, preserveMascotStyle: true },
      missingParts: ["arms", "legs", "feet"],
    });
    assert.match(prompt, /mascot style/i);
    assert.match(prompt, /Preserve face identity/i);
  });

  it("generated output includes full body metadata", () => {
    let state = createEmptyMotionReadyWizardState({ id: "proj_1", title: "HC Video" });
    state = seedAnalysisFromVision(state, PORTRAIT_VISION);
    state = {
      ...state,
      generatedFullBodyUrl: "https://example.com/full.png",
      generatedFullBodyStorageKey: "full.png",
      transparentPngUrl: "https://example.com/full.png",
      answers: { clothing: "green shirt", pose: "neutral_standing", bodyStyle: "realistic" },
    };
    const metadata = buildMotionReadySaveMetadata(state);
    assert.equal(metadata.projectId, "proj_1");
    assert.equal(metadata.generatedFullBodyUrl, "https://example.com/full.png");
    assert.ok(metadata.generatedMissingParts.length > 0);
    assert.equal(metadata.motionReady, true);
  });

  it("hands and feet required for motion-ready before generation", () => {
    const parts = detectMotionCharacterParts(PORTRAIT_VISION);
    assert.equal(handsAndFeetRequiredForMotionReady(parts), true);
  });

  it("approve saves draft mapped to library character", () => {
    let state = createEmptyMotionReadyWizardState();
    state = seedAnalysisFromVision(state, PORTRAIT_VISION);
    state = {
      ...state,
      characterName: "Chef Motion",
      generatedFullBodyUrl: "https://example.com/generated.png",
      generatedFullBodyStorageKey: "generated.png",
      previewApproved: true,
    };
    const draft = motionReadyWizardToAssetDraft(state);
    assert.equal(draft.entryPath, "prepare_for_animation");
    assert.equal(draft.referenceImageUrl, "https://example.com/generated.png");
    assert.equal(draft.fields.motionReady, "true");
  });

  it("approve attaches project id in metadata", () => {
    const state = {
      ...seedAnalysisFromVision(createEmptyMotionReadyWizardState({ id: "hc_123", title: "Community Video" }), PORTRAIT_VISION),
      generatedFullBodyUrl: "https://example.com/body.png",
    };
    const metadata = buildMotionReadySaveMetadata(state);
    assert.equal(metadata.projectId, "hc_123");
  });

  it("motionReadyWizardSeedFromSource preloads analysis step", () => {
    const seeded = motionReadyWizardSeedFromSource({
      sourceImage: "https://example.com/portrait.jpg",
      sourceName: "Chef",
    });
    assert.equal(seeded.step, "analysis");
    assert.equal(seeded.visionStatus, "loading");
    assert.equal(seeded.sourceReferenceImageUrl, "https://example.com/portrait.jpg");
  });

  it("wizard does not open editor by default", () => {
    const state = createEmptyMotionReadyWizardState();
    assert.equal(shouldOpenEditorByDefault(state), false);
    assert.equal(state.step, "upload");
  });

  it("advanced editor only opens by explicit click", () => {
    const state = { ...createEmptyMotionReadyWizardState(), openEditorRequested: true };
    assert.equal(shouldOpenEditorByDefault(state), true);
    const validation = validateMotionReadyCharacter({
      generatedFullBodyUrl: "https://example.com/full.png",
      parts: detectMotionCharacterParts(PORTRAIT_VISION),
      readinessScore: 40,
    });
    assert.equal(validation.motionReady, true);
  });
});
