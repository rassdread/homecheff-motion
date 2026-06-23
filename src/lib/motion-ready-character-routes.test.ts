import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { resolveDeprecatedCharacterEntry } from "@/lib/character-cluster-routes";
import {
  buildMotionReadyCharacterWizardHref,
  buildMotionReadyHrefFromEditorDocument,
  MOTION_READY_CHARACTER_WIZARD_PATH,
  resolvesToMotionReadyWizard,
} from "@/lib/motion-ready-character-routes";
import {
  isFullBodyFlow,
  isPortraitOnlyFlow,
  motionReadyWizardSeedFromSource,
  resolveMotionWizardQuestions,
  shouldOpenEditorByDefault,
  detectMotionCharacterParts,
  summarizeMotionReadiness,
} from "@/lib/motion-ready-character-wizard";
import { mapVisionJsonToAnalysis } from "@/lib/studio-asset-vision-analysis";

const ROOT = process.cwd();

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

describe("motion-ready-character-routes", () => {
  it("Later animeren / motion_prepare routes to motion-ready wizard", () => {
    assert.equal(resolvesToMotionReadyWizard({ workflow: "motion_prepare" }), true);
    assert.equal(buildMotionReadyCharacterWizardHref(), MOTION_READY_CHARACTER_WIZARD_PATH);
  });

  it("prepare_for_animation redirect targets motion-ready wizard", () => {
    const motion = resolveDeprecatedCharacterEntry({ entry: "prepare_for_animation", storyboardId: "sb_1" });
    assert.ok(motion?.redirectTo.startsWith(MOTION_READY_CHARACTER_WIZARD_PATH));
    assert.equal(resolvesToMotionReadyWizard({ entry: "prepare_for_animation" }), true);
  });

  it("existing editor image is passed as sourceImage", () => {
    const href = buildMotionReadyHrefFromEditorDocument({
      backgroundUrl: "https://cdn.example.com/portrait.jpg",
      name: "Chef portrait",
      sessionId: "sess_abc",
      hcProjectId: "hc_123",
      storyboardId: "sb_9",
      sceneId: "scene_4",
    });
    assert.match(href, /^\/studio\/characters\/motion-ready\?/);
    assert.match(href, /sourceImage=https%3A%2F%2Fcdn\.example\.com%2Fportrait\.jpg/);
    assert.match(href, /sourceAsset=sess_abc/);
    assert.match(href, /hcProject=hc_123/);
    assert.match(href, /storyboardId=sb_9/);
    assert.match(href, /sceneId=scene_4/);
    assert.match(href, /sourceName=Chef/);
  });

  it("EditorStartScreen routes motion_prepare to Character Studio hub", () => {
    const src = readFileSync(join(ROOT, "src/components/editor/editor-start-screen.tsx"), "utf8");
    assert.match(src, /workflow === "motion_prepare"/);
    assert.match(src, /buildCharacterStudioHubHref/);
    assert.doesNotMatch(src, /finishOpen\(document, phase\.workflow[\s\S]*motion_prepare/);
  });

  it("wizard does not open full editor by default", () => {
    const wizardSrc = readFileSync(
      join(ROOT, "src/components/studio/studio-motion-ready-character-wizard.tsx"),
      "utf8"
    );
    assert.match(wizardSrc, /shouldOpenEditorByDefault/);
    assert.match(wizardSrc, /openAdvancedEditor/);
    assert.match(wizardSrc, /preview\.advancedEditor/);
    assert.equal(shouldOpenEditorByDefault(motionReadyWizardSeedFromSource({
      sourceImage: "https://example.com/a.jpg",
    })), false);
  });

  it("portrait source shows missing body parts in wizard seed flow", () => {
    const parts = detectMotionCharacterParts(PORTRAIT_VISION);
    const summary = summarizeMotionReadiness({ vision: PORTRAIT_VISION, parts });
    assert.ok(isPortraitOnlyFlow(summary.bodyVisibility));
    assert.ok(summary.missingParts.includes("legs") || summary.missingParts.includes("feet"));
  });

  it("portrait asks dynamic questions and full-body skips body_style", () => {
    const portraitParts = detectMotionCharacterParts(PORTRAIT_VISION);
    const portraitSummary = summarizeMotionReadiness({ vision: PORTRAIT_VISION, parts: portraitParts });
    const portraitQuestions = resolveMotionWizardQuestions({
      vision: PORTRAIT_VISION,
      bodyVisibility: portraitSummary.bodyVisibility,
      parts: portraitParts,
    });
    assert.ok(portraitQuestions.some((q) => q.id === "body_style"));

    const fullParts = detectMotionCharacterParts(FULL_BODY_VISION);
    const fullSummary = summarizeMotionReadiness({ vision: FULL_BODY_VISION, parts: fullParts });
    const fullQuestions = resolveMotionWizardQuestions({
      vision: FULL_BODY_VISION,
      bodyVisibility: fullSummary.bodyVisibility,
      parts: fullParts,
    });
    assert.ok(isFullBodyFlow(fullSummary.bodyVisibility));
    assert.equal(fullQuestions.some((q) => q.id === "body_style"), false);
  });

  it("motion-ready page forwards source query params to wizard", () => {
    const pageSrc = readFileSync(join(ROOT, "src/app/studio/characters/motion-ready/page.tsx"), "utf8");
    assert.match(pageSrc, /sourceImage=\{searchParams\.get\("sourceImage"\)\}/);
    assert.match(pageSrc, /sceneId=\{searchParams\.get\("sceneId"\)\}/);
    assert.match(pageSrc, /hcProject/);
  });

  it("approve saves motion-ready character to library pipeline", () => {
    const saveSrc = readFileSync(join(ROOT, "src/lib/character-cluster-save.ts"), "utf8");
    assert.match(saveSrc, /route === "motion-ready"/);
    assert.match(saveSrc, /registerCompletedGenerationInLibraryClient/);
    const wizardSrc = readFileSync(
      join(ROOT, "src/components/studio/studio-motion-ready-character-wizard.tsx"),
      "utf8"
    );
    assert.match(wizardSrc, /saveCharacterFromCluster/);
    assert.match(wizardSrc, /route: "motion-ready"/);
  });

  it("sceneId is forwarded for scene attach after save", () => {
    const wizardSrc = readFileSync(
      join(ROOT, "src/components/studio/studio-motion-ready-character-wizard.tsx"),
      "utf8"
    );
    assert.match(wizardSrc, /attachCharacterToStoryboardScene/);
    assert.match(wizardSrc, /sceneId/);
  });
});
