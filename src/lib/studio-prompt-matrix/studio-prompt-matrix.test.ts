import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assembleCreativeSpecification,
  assertMandatoryContinuityPresent,
  buildSceneStillViaMatrix,
  emptyContinuityBundle,
  inspectMatrixAssembly,
  mapOptionToSpecPath,
  applyMappedOption,
  resolveAspect,
  resolveCanonicalExperienceId,
  resolveContinuityBundleFromPromptInput,
  resolveDuration,
  resolveStandaloneSourceContinuityBundle,
  applyPromptPresetOverlay,
  wrapFusionTransform,
  wrapViduTransform,
  mapVoiceTransform,
  mapAudioTransform,
  getExperienceRegistryEntry,
  listExperiencesByCompliance,
  STUDIO_PROMPT_MATRIX_VERSION,
} from "@/lib/studio-prompt-matrix";
import { buildScenePromptFromInput } from "@/lib/studio-prompt-builder";
import type { PromptBuilderInput } from "@/types/studio-prompt-builder";
import type { SceneMemoryBundle } from "@/types/studio-memory-snapshots";
import type { CreativeSpecification } from "@/lib/studio-prompt-matrix/creative-specification";

function memoryFixture(partial?: Partial<SceneMemoryBundle>): SceneMemoryBundle {
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
    ...partial,
  };
}

function promptInput(memory?: SceneMemoryBundle | null): PromptBuilderInput {
  const bundle = memory === null ? undefined : memory ?? memoryFixture();
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

describe("S.6E Prompt Matrix — experience IDs", () => {
  it("maps outfit fans to OUTFIT_CHANGE", () => {
    assert.equal(
      resolveCanonicalExperienceId({ fusionIntent: "outfit_from_reference" }),
      "OUTFIT_CHANGE"
    );
    assert.equal(resolveCanonicalExperienceId({ characterStudioFlow: "outfit" }), "OUTFIT_CHANGE");
  });

  it("maps food and social intents", () => {
    assert.equal(
      resolveCanonicalExperienceId({ videoIntent: "restaurant_promo" }),
      "RESTAURANT_PROMO"
    );
    assert.equal(
      resolveCanonicalExperienceId({ videoIntent: "social_campaign" }),
      "SOCIAL_CAMPAIGN"
    );
    assert.equal(resolveCanonicalExperienceId({ instantStyle: "food_promo" }), "FOOD_PROMO");
  });
});

describe("S.6E ContinuityBundle + mandatory modules", () => {
  it("CT-01/02/03/04 — linked character/location/props/world remain", () => {
    const bundle = resolveContinuityBundleFromPromptInput(promptInput());
    assert.deepEqual(
      bundle.characters.map((c) => c.id),
      ["char-1"]
    );
    assert.equal(bundle.location?.id, "loc-1");
    assert.deepEqual(
      bundle.props.map((p) => p.id),
      ["prop-1"]
    );
    assert.equal(bundle.world?.id, "world-1");
    const check = assertMandatoryContinuityPresent(bundle);
    assert.equal(check.ok, true);
  });

  it("CT-13 — unlinked simple upload does not invent entities", () => {
    const bundle = resolveStandaloneSourceContinuityBundle({
      sourceImageUrl: "https://example.com/upload.jpg",
    });
    assert.equal(bundle.characters.length, 0);
    assert.equal(bundle.location, null);
    assert.equal(bundle.continuityMeta.continuityCase, "standalone_source_image");
  });

  it("CT-12 — quick path with entities does not drop entities", () => {
    const continuity = resolveContinuityBundleFromPromptInput(promptInput());
    const spec = assembleCreativeSpecification({
      experienceId: "SCENE_STILL",
      continuity,
      detailLevel: "QUICK",
    });
    assert.deepEqual(spec.continuity.characterIds, ["char-1"]);
    assert.equal(spec.continuity.locationId, "loc-1");
    assert.ok(spec.modulesIncluded.includes("continuity.character"));
    assert.ok(spec.modulesIncluded.includes("continuity.location"));
    assert.ok(spec.modulesIncluded.includes("continuity.props"));
    assert.ok(spec.modulesIncluded.includes("continuity.world"));
  });
});

describe("S.6E duration + aspect resolution", () => {
  it("duration precedence: user > intent > scene > experience", () => {
    const r = resolveDuration({
      userOverride: 8,
      intentDuration: 30,
      sceneDuration: 5,
      experienceDefault: 12,
    });
    assert.equal(r.resolvedSeconds, 8);
    assert.equal(r.provenance, "user_override");
  });

  it("duration provider clamp is explicit", () => {
    const r = resolveDuration({
      sceneDuration: 20,
      providerMax: 12,
    });
    assert.equal(r.resolvedSeconds, 12);
    assert.equal(r.provenance, "provider_constraint");
    assert.equal(r.clampedByProvider, true);
  });

  it("aspect preserves product default 9:16 with provenance", () => {
    const r = resolveAspect({});
    assert.equal(r.resolved, "9:16");
    assert.equal(r.provenance, "product_default");
  });

  it("user aspect override wins over platform", () => {
    const r = resolveAspect({
      userOverride: "16:9",
      platformDefault: "9:16",
    });
    assert.equal(r.resolved, "16:9");
    assert.equal(r.provenance, "user_override");
  });
});

describe("S.6E option wiring", () => {
  it("maps shot/movement/energy/action/emotion/style/duration/aspect/platform", () => {
    const families = [
      ["shotType", "wide_shot", "composition.shotType"],
      ["cameraMovement", "dolly_in", "camera.movement"],
      ["energy", "intense", "movement.energy"],
      ["action", "cooking", "performance.action"],
      ["emotion", "calm", "performance.emotion"],
      ["style", "cinematic", "style.styleProfile"],
      ["director", "homecheff_storyteller", "style.directorProfile"],
      ["lighting", "soft_key", "lighting"],
      ["duration", "8", "duration.resolvedSeconds"],
      ["aspect", "16:9", "aspectRatio.resolved"],
      ["platform", "tiktok", "platform"],
    ] as const;

    for (const [family, ui, path] of families) {
      const mapping = mapOptionToSpecPath(family, ui);
      assert.equal(mapping.specPath, path);
      const spec: Record<string, unknown> = {};
      applyMappedOption(spec, mapping);
      // smoke: leaf set
      assert.ok(JSON.stringify(spec).includes(mapping.canonicalValue) || family === "duration");
    }
  });

  it("changing one selection changes CreativeSpecification field", () => {
    const continuity = resolveContinuityBundleFromPromptInput(promptInput());
    const a = assembleCreativeSpecification({
      experienceId: "SCENE_STILL",
      continuity,
      selections: { shotType: "close_up" },
    });
    const b = assembleCreativeSpecification({
      experienceId: "SCENE_STILL",
      continuity,
      selections: { shotType: "wide_shot" },
    });
    assert.equal(a.composition.shotType, "close_up");
    assert.equal(b.composition.shotType, "wide_shot");
    assert.notEqual(a.composition.shotType, b.composition.shotType);
  });
});

describe("S.6E preset safety + brand honesty", () => {
  it("CT-07/08 — preset cannot overwrite identity; brand optional", () => {
    const continuity = resolveContinuityBundleFromPromptInput(promptInput());
    continuity.brand = {
      brandKitId: "brand-1",
      name: "HomeCheff",
      fields: { primaryColor: "#111" },
      available: true,
    };
    let spec = assembleCreativeSpecification({
      experienceId: "SCENE_STILL",
      continuity,
      promptPreset: {
        presetId: "preset-1",
        creative: {
          styleProfile: "editorial",
          objective: "preset_objective",
        },
      },
      explicitUserLock: ["styleProfile"],
    });
    assert.deepEqual(spec.continuity.characterIds, ["char-1"]);
    assert.equal(spec.style.styleProfile, "cinematic");
    assert.equal(spec.brand.available, true);
    assert.equal(spec.brand.overlayApplied, true);

    const attacked = applyPromptPresetOverlay(spec, {
      presetId: "evil",
      creative: {
        // @ts-expect-error intentional identity attack vectors stripped by sanitize
        characterIds: ["other"],
        styleProfile: "noir",
      } as { styleProfile: string },
    });
    assert.deepEqual(attacked.continuity.characterIds, ["char-1"]);
  });
});

describe("S.6E scene still golden-master sections", () => {
  it("Matrix-wrapped scene still keeps semantic sections vs direct builder", () => {
    const input = promptInput();
    const before = buildScenePromptFromInput(input);
    const matrix = buildSceneStillViaMatrix(input, { durationSeconds: 8 });

    assert.equal(matrix.builderOutput.prompt, before.prompt);
    assert.equal(matrix.builderOutput.sections.characters, before.sections.characters);
    assert.equal(matrix.builderOutput.sections.location, before.sections.location);
    assert.equal(matrix.builderOutput.sections.continuity, before.sections.continuity);
    assert.equal(matrix.builderOutput.sections.identity, before.sections.identity);

    assert.ok(matrix.specification.modulesIncluded.includes("continuity.character"));
    assert.equal(matrix.providerRequest.pixelConditioning, "partial_text_qa");
    assert.equal(matrix.providerRequest.matrixVersion, STUDIO_PROMPT_MATRIX_VERSION);
    assert.deepEqual(matrix.specification.continuity.characterIds, ["char-1"]);
  });

  it("character-only / location-only fixtures retain modules", () => {
    const charOnly = buildSceneStillViaMatrix(
      promptInput(
        memoryFixture({
          location: null,
          props: [],
          world: null,
        })
      )
    );
    assert.ok(charOnly.specification.modulesIncluded.includes("continuity.character"));
    assert.ok(!charOnly.specification.modulesIncluded.includes("continuity.location"));

    const locOnly = buildSceneStillViaMatrix(
      promptInput(
        memoryFixture({
          characters: [],
          props: [],
          world: null,
        })
      )
    );
    assert.ok(locOnly.specification.modulesIncluded.includes("continuity.location"));
  });
});

describe("S.6E transforms + experience contracts", () => {
  it("Fusion wrapper keeps distinct character refs and pixel contract", () => {
    const continuity = resolveContinuityBundleFromPromptInput(
      promptInput(
        memoryFixture({
          characters: [
            ...memoryFixture().characters,
            {
              ...memoryFixture().characters[0]!,
              id: "char-2",
              name: "Guest",
              referenceImageUrl: "https://example.com/guest.jpg",
            },
          ],
        })
      )
    );
    continuity.continuityMeta.continuityCase = "fusion_refs";
    const spec = assembleCreativeSpecification({
      experienceId: "OUTFIT_CHANGE",
      continuity,
    });
    const fusion = wrapFusionTransform({
      specification: spec,
      continuity,
      legacyFusionPrompt: "PRESERVE_FACE legacy",
    });
    assert.equal(fusion.characterRefs.length, 2);
    assert.equal(fusion.pixelPreserveContract, "fusion_references_authoritative");
    assert.match(fusion.legacyFusionPrompt ?? "", /PRESERVE_FACE/);
  });

  it("Vidu Studio handoff retains approved continuity; standalone uses source image", () => {
    const studio = assembleCreativeSpecification({
      experienceId: "STUDIO_MOTION_HANDOFF",
      continuity: resolveContinuityBundleFromPromptInput(promptInput()),
      selections: { durationSeconds: 8, aspectRatio: "9:16" },
    });
    const viduStudio = wrapViduTransform({
      specification: studio,
      continuity: resolveContinuityBundleFromPromptInput(promptInput()),
      legacyViduPrompt: "legacy vidu",
    });
    assert.ok(viduStudio.approvedContinuity);
    assert.deepEqual(viduStudio.approvedContinuity?.characterIds, ["char-1"]);

    const standaloneBundle = resolveStandaloneSourceContinuityBundle({
      sourceImageUrl: "https://example.com/still.jpg",
      durationSeconds: 5,
    });
    const standaloneSpec = assembleCreativeSpecification({
      experienceId: "INSTANT_PHOTO_TO_VIDEO",
      continuity: standaloneBundle,
      selections: { durationSeconds: 5 },
    });
    const viduSolo = wrapViduTransform({
      specification: standaloneSpec,
      continuity: standaloneBundle,
    });
    assert.equal(viduSolo.approvedContinuity, null);
    assert.equal(viduSolo.sourceImageUrl, "https://example.com/still.jpg");
  });

  it("Voice + audio mappings preserve continuity voice ownership", () => {
    const continuity = emptyContinuityBundle({
      voice: [
        {
          characterId: "char-1",
          voiceProvider: "elevenlabs",
          voiceProfileId: "voice-1",
          language: "nl",
          locked: true,
        },
      ],
      world: memoryFixture().world,
    });
    const voiceSpec = assembleCreativeSpecification({
      experienceId: "VOICE_TTS",
      continuity,
      selections: { voiceCharacterId: "char-1", script: "Welkom", language: "nl" },
    });
    const voice = mapVoiceTransform({ specification: voiceSpec, continuity });
    assert.equal(voice.characterId, "char-1");
    assert.equal(voice.locked, true);
    assert.equal(voice.script, "Welkom");

    const audioSpec = assembleCreativeSpecification({
      experienceId: "MUSIC_GENERATE",
      continuity,
      selections: { audioMood: "warm", audioEnergy: "calm", durationSeconds: 30 },
    });
    const audio = mapAudioTransform({
      specification: audioSpec,
      continuity,
      kind: "music",
    });
    assert.equal(audio.mood, "warm");
    assert.equal(audio.worldAmbience, "inviting");
  });

  it("representative experiences produce valid specs or declared legacy", () => {
    const ids = [
      "SCENE_STILL",
      "RESTAURANT_PROMO",
      "SOCIAL_CAMPAIGN",
      "OUTFIT_CHANGE",
      "CHARACTER_FUSION",
      "INSTANT_PHOTO_TO_VIDEO",
      "MOTION_PRESET",
      "VOICE_TTS",
      "MUSIC_GENERATE",
      "SFX_GENERATE",
    ] as const;
    for (const id of ids) {
      const entry = getExperienceRegistryEntry(id);
      assert.ok(entry.compliance);
      assert.notEqual(entry.compliance, undefined);
      const continuity =
        id === "INSTANT_PHOTO_TO_VIDEO" || id === "MOTION_PRESET"
          ? resolveStandaloneSourceContinuityBundle({
              sourceImageUrl: "https://example.com/x.jpg",
            })
          : resolveContinuityBundleFromPromptInput(promptInput());
      const spec = assembleCreativeSpecification({ experienceId: id, continuity });
      assert.equal(spec.experience, id);
      assert.equal(spec.matrixVersion, STUDIO_PROMPT_MATRIX_VERSION);
    }
    assert.ok(listExperiencesByCompliance("LEGACY_UNMIGRATED").length >= 1);
  });

  it("debug inspection omits full prompt text", () => {
    const matrix = buildSceneStillViaMatrix(promptInput());
    const debug = inspectMatrixAssembly({
      specification: matrix.specification,
      continuity: matrix.continuity,
      providerTransform: "openai_image",
    });
    assert.equal(debug.experience, "SCENE_STILL");
    assert.equal(debug.characterCount, 1);
    assert.ok(!("prompt" in debug));
  });
});

describe("S.6E provider-neutral matrix", () => {
  it("modulesIncluded does not mention provider brand names", () => {
    const spec: CreativeSpecification = assembleCreativeSpecification({
      experienceId: "SCENE_STILL",
      continuity: resolveContinuityBundleFromPromptInput(promptInput()),
    });
    const joined = spec.modulesIncluded.join(" ");
    assert.doesNotMatch(joined, /vidu|openai|elevenlabs/i);
  });
});
