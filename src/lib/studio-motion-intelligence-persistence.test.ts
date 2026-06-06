import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertStudioJsonWithinSizeLimit,
  sanitizeMotionHandoffForStorage,
  STUDIO_HANDOFF_JSON_MAX_BYTES,
} from "@/lib/studio-motion-handoff-storage";
import {
  buildProjectStudioQaResponse,
  buildStudioImageLineageFingerprint,
  buildStudioProjectImportFromWizard,
  imageChangesAffectStudioIntelligence,
  studioMetadataPrismaFields,
  validateStudioProjectImport,
} from "@/lib/studio-project-metadata";
import { buildMotionStudioIntelligenceSnapshot } from "@/lib/build-motion-studio-intelligence";
import { promptVersionMetadata } from "@/test/motion-test-fixtures";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { PersistedWizardState } from "@/lib/instant-premium-wizard-storage";

function minimalHandoff(): MotionHandoffPayload {
  return {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: "sb-test",
    title: "Test board",
    description: "x".repeat(5000),
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    shotDiversityScore: 50,
    characterMemory: [],
    locationMemory: null,
    propMemory: [],
    worldMemory: null,
    continuityStrength: "strong",
    consistencyReport: null,
    overallConsistencyScore: 72,
    driftWarnings: [],
    correctionRecommendations: [],
    consistencyHistory: [],
    latestImprovementScore: null,
    visionReport: null,
    overallVisionScore: 80,
    visionWarnings: [],
    characterConsistencyReport: null,
    overallCharacterConsistencyScore: 75,
    characterDriftWarnings: [],
    perSceneCharacterIdentityScores: [],
    scenes: [
      {
        sceneId: "sc-1",
        order: 0,
        title: "Scene 1",
        description: "Test",
        location: null,
        characters: [],
        props: [],
        action: "walk",
        emotion: "calm",
        camera: "wide_shot",
        transitionToNext: "",
        durationSeconds: 5,
        generatedPrompt: "LONG ".repeat(2000),
        stylePrompt: "style",
        continuityPrompt: "cont",
        promptVersion: promptVersionMetadata({
          generatedAt: "2026-06-19T12:00:00.000Z",
          sceneId: "sc-1",
          generatedPrompt: "prompt",
        }),
        studioContext: {
          source: "studio",
          storyboardId: "sb-test",
          sceneId: "sc-1",
          action: "walk",
          emotion: "calm",
          camera: "wide_shot",
          transitionToNext: "",
          location: null,
          characters: [],
          props: [],
          notes: "",
        },
        selectedSceneImageId: "img-1",
        selectedSceneImageUrl: "https://example.com/a.jpg",
        selectedSceneImagePromptVersion: 1,
        selectedSceneImageGenerationVersion: 1,
        sceneImageReference: null,
        sceneConsistencyScore: 70,
        sceneConsistencyReport: null,
        sceneConsistencyRecommendations: [],
        sceneCorrectionRecommendations: [],
        sceneVisionScore: 78,
        sceneVisionReport: null,
        selectedImageScore: 74,
        selectedImageVisionScore: 78,
        selectedImageConsistencyScore: 70,
        selectedImageImprovementScore: null,
        selectedImageRecommended: true,
      },
    ],
  };
}

describe("studio motion intelligence persistence", () => {
  it("sanitizes handoff and enforces size guard", () => {
    const sanitized = sanitizeMotionHandoffForStorage(minimalHandoff());
    assert.equal(sanitized.storyboardId, "sb-test");
    const scene = (sanitized.scenes as Record<string, unknown>[])[0]!;
    assert.equal(scene.generatedPrompt, undefined);
    assert.equal(scene.selectedSceneImageUrl, "https://example.com/a.jpg");
    const size = assertStudioJsonWithinSizeLimit("handoff", sanitized, STUDIO_HANDOFF_JSON_MAX_BYTES);
    assert.equal(size.ok, true);
  });

  it("rejects oversized studio import intelligence", () => {
    const intelligence = buildMotionStudioIntelligenceSnapshot(minimalHandoff());
    const huge = {
      storyboardId: "sb-test",
      storyboardTitle: "Test",
      handoffVersion: 9,
      intelligence: {
        ...intelligence,
        sceneBreakdowns: Array.from({ length: 400 }, (_, i) => ({
          sceneId: `sc-${i}`,
          order: i,
          title: `Scene ${i}`,
          visionScore: 50,
          consistencyScore: 50,
          combinedImageScore: 50,
          hasSelectedImage: true,
          characters: [],
          driftWarnings: ["x".repeat(500)],
        })),
        driftWarnings: Array.from({ length: 400 }, (_, i) => ({
          id: `w-${i}`,
          message: "x".repeat(500),
          severity: "low" as const,
          affectedSceneOrders: [0],
        })),
      },
    };
    const validated = validateStudioProjectImport(huge);
    assert.equal(validated.ok, false);
  });

  it("builds wizard import and prisma fields", () => {
    const intelligence = buildMotionStudioIntelligenceSnapshot(minimalHandoff());
    const state: PersistedWizardState = {
      version: 1,
      savedAt: new Date().toISOString(),
      draftId: "d1",
      step: 1,
      stylePreset: "food_promo",
      motionText: "",
      continuityStrength: "balanced",
      chips: [],
      lockedTextMode: true,
      lockedTextLayers: [],
      chipTextBySlot: {},
      aspectRatio: "9:16",
      fastRenderMode: false,
      images: [],
      studioHandoff: {
        storyboardId: "sb-test",
        storyboardTitle: "Test board",
        handoffVersion: 9,
        importedAt: new Date().toISOString(),
        intelligence,
      },
      sceneSlots: [
        {
          sceneId: "sc-1",
          text: {
            template: "hero",
            transitionDurationSeconds: 5,
            durationSeconds: 5,
            heroText: "",
            title: "",
            subtitle: "",
            extraLines: [],
            accentWords: "",
            lines: [],
            heroFinale: false,
            heroFinaleText: "",
            finaleFooter: "",
            footerLines: [],
          },
          image: {
            id: "local-1",
            originalFileName: "a.jpg",
            remoteWorkingUrl: "https://example.com/a.jpg",
            mimeType: "image/jpeg",
            sizeBytes: 1024,
            bakedText: {
              enabled: false,
              status: "none",
              blocks: [],
              exactText: "",
              positionY: 0.12,
              manualMode: false,
            },
          },
          studioContext: {
            source: "studio",
            storyboardId: "sb-test",
            sceneId: "sc-1",
            action: "walk",
            emotion: "calm",
            camera: "wide_shot",
            transitionToNext: "",
            location: null,
            characters: [],
            props: [],
            notes: "",
          },
        },
      ],
    };
    const imported = buildStudioProjectImportFromWizard(state);
    assert.ok(imported);
    const fields = studioMetadataPrismaFields(imported!);
    assert.equal(fields.studioSourceStoryboardId, "sb-test");
    assert.equal(fields.studioIntelligenceStatus, "current");
    const fp = buildStudioImageLineageFingerprint(imported!.imageLineage ?? []);
    assert.match(fp, /sc-1/);
  });

  it("builds project studio QA from stored row", () => {
    const intelligence = buildMotionStudioIntelligenceSnapshot(minimalHandoff());
    const stored = {
      ...intelligence,
      imageLineage: [{ order: 0, sceneId: "sc-1", studioSceneImageId: "img-1", previewUrl: "https://x" }],
      imageLineageFingerprint: "0:sc-1:img-1:https://x",
    };
    const qa = buildProjectStudioQaResponse({
      studioSourceStoryboardId: "sb-test",
      studioSourceStoryboardTitle: "Test board",
      studioHandoffVersion: 9,
      studioImportedAt: new Date(),
      studioIntelligenceJson: stored,
      studioIntelligenceStatus: "current",
    });
    assert.ok(qa);
    assert.ok(qa!.readiness.tier === "ready" || qa!.readiness.tier === "strong");
    assert.equal(qa!.intelligence.storyboardId, "sb-test");
  });

  it("returns null QA for legacy project without metadata", () => {
    const qa = buildProjectStudioQaResponse({
      studioSourceStoryboardId: null,
      studioSourceStoryboardTitle: null,
      studioHandoffVersion: null,
      studioImportedAt: null,
      studioIntelligenceJson: null,
      studioIntelligenceStatus: null,
    });
    assert.equal(qa, null);
  });

  it("detects image changes that should mark intelligence stale", () => {
    assert.equal(
      imageChangesAffectStudioIntelligence({
        beforeImageCount: 2,
        afterImageCount: 2,
        reordered: false,
        addedCount: 0,
        removedCount: 0,
        replacedCount: 1,
        addedImageIds: [],
        removedImageIds: [],
        replacedImageIds: ["a"],
      }),
      true
    );
    assert.equal(
      imageChangesAffectStudioIntelligence({
        beforeImageCount: 2,
        afterImageCount: 2,
        reordered: false,
        addedCount: 0,
        removedCount: 0,
        replacedCount: 0,
        addedImageIds: [],
        removedImageIds: [],
        replacedImageIds: [],
      }),
      false
    );
  });
});
