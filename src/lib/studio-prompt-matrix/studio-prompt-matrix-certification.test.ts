/**
 * S.6E Preview certification harness — Continuity CT + compliance + perf + privacy.
 * Does not call providers. Safe to run in CI / local gates.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assembleCreativeSpecification,
  buildSceneStillViaMatrix,
  emptyContinuityBundle,
  getExperienceRegistryEntry,
  inspectMatrixAssembly,
  listExperiencesByCompliance,
  mapVoiceTransform,
  resolveCanonicalExperienceId,
  resolveContinuityBundleFromPromptInput,
  resolveDuration,
  resolveAspect,
  resolveStandaloneSourceContinuityBundle,
  wrapFusionTransform,
  wrapViduTransform,
  STUDIO_EXPERIENCE_REGISTRY,
  STUDIO_PROMPT_MATRIX_VERSION,
  applyPromptPresetOverlay,
} from "@/lib/studio-prompt-matrix";
import { buildScenePromptFromInput } from "@/lib/studio-prompt-builder";
import type { PromptBuilderInput } from "@/types/studio-prompt-builder";
import type { SceneMemoryBundle } from "@/types/studio-memory-snapshots";
import {
  getActionCost,
  STUDIO_ACTION_COST_REGISTRY,
} from "@/server/studio-account/studio-action-cost-registry";

function memoryFixture(): SceneMemoryBundle {
  return {
    characters: [
      {
        id: "char-1",
        name: "Chef Maya",
        role: "host",
        appearanceMemory: "Warm smile, chef coat",
        personalityMemory: "Friendly",
        continuityNotes: "Keep coat white",
        defaultClothing: "chef coat",
        defaultAccessories: "",
        visualKeywords: "chef",
        referenceImageUrl: "https://example.com/chef.jpg",
        primaryReferenceImageId: null,
        referenceNotes: "",
        identityStrength: "strong",
        continuityStrength: "strong",
        worldProfileId: "world-1",
        worldProfileName: "HomeCheff Kitchen",
      },
    ],
    location: {
      id: "loc-1",
      name: "Rotterdam Kitchen",
      category: "kitchen",
      worldMemory: "Bright kitchen",
      visualIdentity: "steel and wood",
      environmentKeywords: "kitchen",
      continuityNotes: "same kitchen",
      referenceImageUrl: "https://example.com/kitchen.jpg",
      continuityStrength: "strong",
      worldProfileId: "world-1",
      worldProfileName: "HomeCheff Kitchen",
    },
    props: [
      {
        id: "prop-1",
        name: "Cast iron pan",
        category: "cookware",
        appearanceMemory: "black skillet",
        brandingRules: "",
        continuityNotes: "keep logo-free",
        referenceImageUrl: "https://example.com/pan.jpg",
        continuityStrength: "normal",
        worldProfileId: "world-1",
        worldProfileName: "HomeCheff Kitchen",
      },
    ],
    world: {
      id: "world-1",
      name: "HomeCheff Kitchen",
      description: "Culinary world",
      visualStyle: "warm documentary",
      tone: "inviting",
      continuityRules: "same kitchen lighting",
      continuityStrength: "strong",
    },
    continuityStrength: "strong",
  };
}

function promptInput(bundle: SceneMemoryBundle = memoryFixture()): PromptBuilderInput {
  return {
    scene: {
      sceneId: "scene-1",
      title: "Plate reveal",
      description: "Chef presents the dish",
      action: "presenting",
      emotion: "excited",
      camera: "medium_shot",
    },
    location: null,
    characters: [],
    props: [],
    styleProfile: "cinematic",
    directorProfile: "storytelling",
    shotType: "medium_shot",
    cameraMovement: "dolly_in",
    sceneEnergy: "energetic",
    memoryBundle: bundle,
  };
}

describe("S.6E certification — CT matrix + compliance + perf", () => {
  it("CT-05 voice retained; CT-06 style retained", () => {
    const continuity = emptyContinuityBundle({
      ...resolveContinuityBundleFromPromptInput(promptInput()),
      voice: [
        {
          characterId: "char-1",
          voiceProvider: "elevenlabs",
          voiceProfileId: "voice-abc",
          language: "nl",
          locked: true,
        },
      ],
    });
    const spec = assembleCreativeSpecification({
      experienceId: "VOICE_TTS",
      continuity,
      selections: { voiceCharacterId: "char-1", script: "Hallo", language: "nl" },
    });
    const voice = mapVoiceTransform({ specification: spec, continuity });
    assert.equal(voice.voiceProfileId, "voice-abc");
    assert.equal(voice.locked, true);
    assert.equal(spec.style.styleProfile, "cinematic");
  });

  it("CT-09 provider transform preserves semantic continuity ids", () => {
    const matrix = buildSceneStillViaMatrix(promptInput());
    assert.deepEqual(matrix.providerRequest.continuityCharacterIds, ["char-1"]);
    assert.equal(matrix.providerRequest.continuityLocationId, "loc-1");
    assert.deepEqual(matrix.providerRequest.continuityPropIds, ["prop-1"]);
    assert.equal(matrix.providerRequest.continuityWorldId, "world-1");
  });

  it("CT-10 Studio→Vidu retains approved continuity + source still", () => {
    const continuity = resolveContinuityBundleFromPromptInput(promptInput(), {
      sourceImageUrl: "https://example.com/still.jpg",
    });
    const spec = assembleCreativeSpecification({
      experienceId: "STUDIO_MOTION_HANDOFF",
      continuity,
      selections: { aspectRatio: "9:16", durationSeconds: 8 },
    });
    const vidu = wrapViduTransform({
      specification: spec,
      continuity,
      legacyViduPrompt: "legacy",
    });
    assert.ok(vidu.approvedContinuity);
    assert.equal(vidu.sourceImageUrl, "https://example.com/still.jpg");
    assert.equal(vidu.aspectRatio, "9:16");
  });

  it("CT-11 Fusion pixel-reference contract intact", () => {
    const continuity = resolveContinuityBundleFromPromptInput(promptInput());
    continuity.continuityMeta.continuityCase = "fusion_refs";
    const fusion = wrapFusionTransform({
      specification: assembleCreativeSpecification({
        experienceId: "OUTFIT_CHANGE",
        continuity,
      }),
      continuity,
      legacyFusionPrompt: "PRESERVE identity refs",
      legacyFusionPayload: { refs: 2 },
    });
    assert.equal(fusion.pixelPreserveContract, "fusion_references_authoritative");
    assert.ok(fusion.characterRefs.every((r) => r.characterId && r.name));
  });

  it("CT-14 retry yields same identity payload", () => {
    const input = promptInput();
    const a = buildSceneStillViaMatrix(input);
    const b = buildSceneStillViaMatrix(input);
    assert.deepEqual(a.specification.continuity, b.specification.continuity);
    assert.deepEqual(
      a.providerRequest.continuityCharacterIds,
      b.providerRequest.continuityCharacterIds
    );
  });

  it("golden masters — identity sections never vanish for linked fixtures", () => {
    const cases: Array<{ name: string; bundle: SceneMemoryBundle }> = [
      {
        name: "character-only",
        bundle: { ...memoryFixture(), location: null, props: [], world: null },
      },
      {
        name: "character+location",
        bundle: { ...memoryFixture(), props: [], world: null },
      },
      {
        name: "character+location+prop",
        bundle: { ...memoryFixture(), world: null },
      },
      { name: "world-linked", bundle: memoryFixture() },
    ];
    for (const c of cases) {
      const input = promptInput(c.bundle);
      const before = buildScenePromptFromInput(input);
      const matrix = buildSceneStillViaMatrix(input);
      assert.equal(matrix.builderOutput.prompt, before.prompt, c.name);
      if (c.bundle.characters.length) {
        assert.match(matrix.builderOutput.prompt, /Chef Maya|char-1|chef coat/i);
        assert.ok(matrix.specification.modulesIncluded.includes("continuity.character"));
      }
      if (c.bundle.location) {
        assert.ok(matrix.specification.modulesIncluded.includes("continuity.location"));
      }
      if (c.bundle.props.length) {
        assert.ok(matrix.specification.modulesIncluded.includes("continuity.props"));
      }
      if (c.bundle.world) {
        assert.ok(matrix.specification.modulesIncluded.includes("continuity.world"));
      }
    }
  });

  it("food/restaurant Quick experience resolves + defaults without exposing internals", () => {
    assert.equal(
      resolveCanonicalExperienceId({ videoIntent: "restaurant_promo" }),
      "RESTAURANT_PROMO"
    );
    const continuity = resolveContinuityBundleFromPromptInput(promptInput());
    const spec = assembleCreativeSpecification({
      experienceId: "RESTAURANT_PROMO",
      continuity,
      detailLevel: "QUICK",
      selections: { platform: "tiktok", shotType: "close_up" },
    });
    assert.equal(spec.detailLevel, "QUICK");
    assert.equal(spec.composition.shotType, "close_up");
    assert.ok(spec.modulesIncluded.includes("continuity.character"));
    const debug = inspectMatrixAssembly({ specification: spec, continuity });
    assert.ok(!("prompt" in debug));
    assert.ok(!JSON.stringify(debug).includes("Warm smile"));
  });

  it("standalone Instant does not invent entities", () => {
    const continuity = resolveStandaloneSourceContinuityBundle({
      sourceImageUrl: "https://example.com/upload.jpg",
    });
    const spec = assembleCreativeSpecification({
      experienceId: "INSTANT_PHOTO_TO_VIDEO",
      continuity,
      detailLevel: "QUICK",
    });
    assert.equal(spec.continuity.characterIds.length, 0);
    assert.equal(spec.continuity.locationId, null);
    assert.equal(spec.continuity.continuityCase, "standalone_source_image");
  });

  it("duration + aspect provenance deterministic", () => {
    const d = resolveDuration({
      experienceDefault: 12,
      sceneDuration: 5,
      userOverride: 8,
      providerMax: 12,
    });
    assert.equal(d.resolvedSeconds, 8);
    assert.equal(d.provenance, "user_override");

    const a = resolveAspect({
      userOverride: "16:9",
      productDefault: "9:16",
      platformDefault: "9:16",
      providerSupported: ["9:16", "16:9"],
    });
    assert.equal(a.resolved, "16:9");
    assert.equal(a.provenance, "user_override");
  });

  it("Matrix compliance counts are honest (no false MATRIX_NATIVE flood)", () => {
    const counts = {
      MATRIX_NATIVE: listExperiencesByCompliance("MATRIX_NATIVE").length,
      MATRIX_WRAPPED: listExperiencesByCompliance("MATRIX_WRAPPED").length,
      MATRIX_PARTIAL: listExperiencesByCompliance("MATRIX_PARTIAL").length,
      LEGACY_UNMIGRATED: listExperiencesByCompliance("LEGACY_UNMIGRATED").length,
      EXPERIMENTAL: listExperiencesByCompliance("EXPERIMENTAL").length,
    };
    assert.equal(counts.MATRIX_NATIVE, 0);
    assert.ok(counts.MATRIX_WRAPPED >= 1);
    assert.ok(counts.MATRIX_PARTIAL >= 1);
    assert.ok(counts.LEGACY_UNMIGRATED >= 1);
    assert.equal(
      Object.keys(STUDIO_EXPERIENCE_REGISTRY).length,
      counts.MATRIX_NATIVE +
        counts.MATRIX_WRAPPED +
        counts.MATRIX_PARTIAL +
        counts.LEGACY_UNMIGRATED +
        counts.EXPERIMENTAL
    );
    assert.equal(getExperienceRegistryEntry("SCENE_STILL").compliance, "MATRIX_WRAPPED");
    assert.equal(STUDIO_PROMPT_MATRIX_VERSION, "6e.1");
  });

  it("performance — Continuity resolve + Matrix assemble + transform FAST", () => {
    const input = promptInput();
    const t0 = performance.now();
    for (let i = 0; i < 50; i++) {
      buildSceneStillViaMatrix(input, { durationSeconds: 8, aspectRatio: "9:16" });
    }
    const elapsed = performance.now() - t0;
    const perCall = elapsed / 50;
    assert.ok(perCall < 25, `expected <25ms/call, got ${perCall.toFixed(2)}ms`);
  });

  it("credit registry unchanged — Matrix does not decide price", () => {
    assert.ok(STUDIO_ACTION_COST_REGISTRY.scene_generation);
    assert.ok((getActionCost("scene_generation")?.defaultCreditCost ?? 0) > 0);
    assert.ok((getActionCost("voice_generation")?.defaultCreditCost ?? 0) > 0);
    assert.ok((getActionCost("fusion_render")?.defaultCreditCost ?? 0) > 0);
    assert.ok((getActionCost("motion_render")?.defaultCreditCost ?? 0) > 0);
  });

  it("preset cannot strip identity even when attacking continuity fields", () => {
    const continuity = resolveContinuityBundleFromPromptInput(promptInput());
    const base = assembleCreativeSpecification({
      experienceId: "SCENE_STILL",
      continuity,
    });
    const attacked = applyPromptPresetOverlay(base, {
      presetId: "x",
      creative: {
        styleProfile: "documentary",
        // identity-like keys must be ignored by sanitize
        ...({ characterIds: ["evil"], locationId: "evil", worldId: "evil" } as object),
      } as { styleProfile: string },
    });
    assert.deepEqual(attacked.continuity.characterIds, ["char-1"]);
    assert.equal(attacked.continuity.locationId, "loc-1");
    assert.equal(attacked.continuity.worldId, "world-1");
  });
});
