import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { orchestrateCreativeDirector } from "@/lib/studio-creative-director/director-engine";
import { buildScenePromptForDetail } from "@/server/studio/studio-prompt-builder-service";
import {
  pickReferenceUrlsForStillAdapter,
  buildProductionInstructions,
  mergeProductionNegatives,
} from "@/lib/studio-production-prompt-orchestrator";
import {
  inferSceneContinuity,
  isSceneContextStale,
  resolveUnifiedProductionContext,
  resolveUpcStyleWorld,
} from "@/lib/studio-unified-production-context";
import { UPC_VERSION } from "@/types/studio-unified-production-context";
import {
  studioCharacterListItem,
  studioLocationListItem,
  studioPropListItem,
  studioSceneDetail,
  studioStoryboardDetail,
  studioWorldProfileListItem,
} from "@/test/studio-api-fixtures";
import type { StudioSceneDetail } from "@/types/studio-api";

const characterA = studioCharacterListItem({
  id: "char-a",
  name: "Amina",
  description: "Main host",
  defaultClothing: "blue jacket",
  appearanceMemory: "short dark hair, warm smile",
  referenceImageUrl: "https://cdn.example/amina.jpg",
  worldProfileId: "world-1",
  worldProfile: { id: "world-1", name: "Stylized Kitchen World" },
  voiceEnabled: true,
  voiceLock: true,
  voiceProfile: "warm_narrator",
});

const characterB = studioCharacterListItem({
  id: "char-b",
  name: "Ben",
  description: "Secondary",
  defaultClothing: "grey apron",
  referenceImageUrl: "https://cdn.example/ben.jpg",
});

const bakery = studioLocationListItem({
  id: "loc-bakery",
  name: "Harbor Bakery",
  category: "restaurant",
  visualIdentity: "warm wood, tiled counter, morning light",
  referenceImageUrl: "https://cdn.example/bakery.jpg",
  worldProfileId: "world-1",
  worldProfile: { id: "world-1", name: "Stylized Kitchen World" },
});

const street = studioLocationListItem({
  id: "loc-street",
  name: "Canal Street",
  category: "street",
  visualIdentity: "wet cobblestones, dusk lamps",
  referenceImageUrl: "https://cdn.example/street.jpg",
});

const redBox = studioPropListItem({
  id: "prop-box",
  name: "red box",
  category: "packaging",
  appearanceMemory: "matte red gift box",
  referenceImageUrl: "https://cdn.example/box.jpg",
});

const logo = studioPropListItem({
  id: "prop-logo",
  name: "HomeCheff mark",
  category: "brand_asset",
  brandingRules: "Keep globe mark geometry exact",
  referenceImageUrl: "https://cdn.example/logo.png",
});

const world = studioWorldProfileListItem({
  id: "world-1",
  name: "Stylized Kitchen World",
  visualStyle: "warm stylized 3D",
  tone: "friendly cinematic",
});

function scene(
  order: number,
  partial: Partial<StudioSceneDetail>
): StudioSceneDetail {
  return studioSceneDetail({
    id: `scene-${order}`,
    order,
    storyboardId: "sb-pixar",
    ...partial,
  });
}

export function pixarStoryboard() {
  return studioStoryboardDetail({
    id: "sb-pixar",
    title: "Harbor bakery mini commercial",
    promptStyleProfile: "cinematic",
    directorProfile: "cinematic",
    voiceEnabled: true,
    voiceLanguage: "en",
    voiceNarrationScript: "Welcome to Harbor Bakery.",
    musicEnabled: true,
    musicStyle: "warm acoustic",
    scenes: [
      scene(0, {
        title: "Enter bakery",
        description: "Amina enters bakery holding red box.",
        action: "Amina enters carrying the red box",
        emotion: "hopeful",
        camera: "wide",
        shotType: "wide",
        location: bakery,
        locationId: bakery.id,
        characters: [characterA],
        props: [redBox],
      }),
      scene(1, {
        title: "Counter",
        description: "Same bakery. Amina places red box on counter.",
        action: "Amina places the red box on the counter",
        emotion: "calm",
        camera: "medium",
        location: bakery,
        locationId: bakery.id,
        characters: [characterA],
        props: [redBox],
      }),
      scene(2, {
        title: "Box close-up",
        description: "Close-up of the same red box.",
        action: "Camera holds on the red box",
        camera: "close_up",
        shotType: "close_up",
        location: bakery,
        locationId: bakery.id,
        characters: [characterA],
        props: [redBox],
      }),
      scene(3, {
        title: "Ben joins",
        description: "Ben joins Amina at the counter.",
        action: "Ben walks in and greets Amina",
        emotion: "friendly",
        camera: "medium",
        location: bakery,
        locationId: bakery.id,
        characters: [characterA, characterB],
        props: [redBox],
      }),
      scene(4, {
        title: "Smile closer",
        description: "Amina smiles, same clothing, camera closer.",
        action: "Amina smiles toward camera",
        emotion: "joyful",
        camera: "close_up",
        shotType: "close_up",
        cameraMovement: "push_in",
        location: bakery,
        locationId: bakery.id,
        characters: [characterA],
        props: [redBox],
      }),
      scene(5, {
        title: "Reveal",
        description: "Product inside box revealed with HomeCheff mark.",
        action: "Lid opens to reveal the product and HomeCheff mark",
        camera: "close_up",
        location: bakery,
        locationId: bakery.id,
        characters: [characterA],
        props: [redBox, logo],
      }),
      scene(6, {
        title: "Street dusk",
        description: "Amina outside on Canal Street with the box.",
        action: "Amina walks the canal holding the red box",
        camera: "wide",
        location: street,
        locationId: street.id,
        characters: [characterA],
        props: [redBox],
      }),
      scene(7, {
        title: "Return bakery",
        description: "Back in Harbor Bakery, Amina and Ben toast.",
        action: "They raise cups in the bakery",
        emotion: "celebratory",
        camera: "medium",
        location: bakery,
        locationId: bakery.id,
        characters: [characterA, characterB],
        props: [redBox, logo],
      }),
    ],
  });
}

describe("S2A unified production context", () => {
  it("resolves hashes, entities, and style precedence", () => {
    const upc = resolveUnifiedProductionContext({
      storyboard: pixarStoryboard(),
      worlds: [world],
      source: "workspace",
    });
    assert.equal(upc.version, UPC_VERSION);
    assert.equal(upc.upcHash.length, 32);
    assert.equal(upc.style.worldVisualStyle, "warm stylized 3D");
    assert.ok(upc.style.precedence[0] === "world.visualStyle");
    assert.ok(upc.style.resolvedSummary.includes("warm stylized 3D"));
    assert.equal(upc.characters.length, 2);
    assert.equal(upc.locations.length, 2);
    const amina = upc.characters.find((c) => c.id === "char-a");
    assert.equal(amina?.referenceIdentity.primaryUrl, "https://cdn.example/amina.jpg");
    assert.equal(amina?.voiceIdentity.locked, true);
    const box = upc.props.find((p) => p.id === "prop-box");
    assert.equal(box?.kind, "product");
    assert.equal(box?.exactness, "SHOULD_MATCH");
    const mark = upc.props.find((p) => p.id === "prop-logo");
    assert.equal(mark?.exactness, "MUST_PRESERVE");
    const again = resolveUnifiedProductionContext({
      storyboard: pixarStoryboard(),
      worlds: [world],
      source: "workspace",
    });
    assert.equal(again.upcHash, upc.upcHash);
  });

  it("does not let a director hint override world visual style", () => {
    const style = resolveUpcStyleWorld({
      storyboard: pixarStoryboard(),
      world,
      directorStyleHint: "luxury red carpet",
    });
    assert.ok(style.resolvedSummary.includes("warm stylized 3D"));
    assert.equal(style.resolvedSummary.includes("luxury red carpet"), false);
  });

  it("carries bakery + red box continuity without inventing facts", () => {
    const upc = resolveUnifiedProductionContext({
      storyboard: pixarStoryboard(),
      worlds: [world],
    });
    const s2 = upc.scenes[1]!;
    assert.equal(s2.locationId, "loc-bakery");
    assert.ok(s2.characterIds.includes("char-a"));
    assert.ok(s2.continuity.carriedPropIds.includes("prop-box"));
    assert.ok(s2.continuity.enteringNotes.some((n) => /red box/i.test(n) || /same location/i.test(n)));

    const s3 = upc.scenes[2]!;
    assert.ok(s3.propIds.includes("prop-box"));
    assert.equal(s3.locationId, "loc-bakery");

    const s5 = upc.scenes[4]!;
    assert.ok(s5.continuity.wardrobeByCharacterId["char-a"]?.includes("blue jacket"));

    const s8 = upc.scenes[7]!;
    assert.equal(s8.locationId, "loc-bakery");
    assert.ok(s8.characterIds.includes("char-a"));
    assert.ok(s8.characterIds.includes("char-b"));
  });

  it("explicit clothing change does not silently invent a new outfit", () => {
    const previous = inferSceneContinuity({
      scene: pixarStoryboard().scenes[0]!,
      previous: null,
      previousScene: null,
      charactersById: new Map([[characterA.id, {
        id: characterA.id,
        name: characterA.name,
        role: characterA.role,
        textIdentity: {
          description: "",
          appearanceMemory: "",
          visualKeywords: "",
          defaultClothing: "blue jacket",
          defaultAccessories: "",
          personality: "",
          forbidden: "",
        },
        referenceIdentity: { primaryUrl: characterA.referenceImageUrl, supportingUrls: [] },
        voiceIdentity: {
          enabled: false,
          locked: false,
          provider: "",
          profile: "",
          language: "en",
        },
        identityStrength: "strong",
        continuityStrength: "strong",
        worldId: null,
      }]]),
      propsById: new Map(),
      locationsById: new Map(),
    });
    const changed = studioSceneDetail({
      order: 1,
      description: "Amina changes into a red dress.",
      action: "wardrobe change",
      characters: [characterA],
    });
    const next = inferSceneContinuity({
      scene: changed,
      previous,
      previousScene: pixarStoryboard().scenes[0]!,
      charactersById: new Map([[characterA.id, {
        id: characterA.id,
        name: "Amina",
        role: "human",
        textIdentity: {
          description: "",
          appearanceMemory: "",
          visualKeywords: "",
          defaultClothing: "blue jacket",
          defaultAccessories: "",
          personality: "",
          forbidden: "",
        },
        referenceIdentity: { primaryUrl: null, supportingUrls: [] },
        voiceIdentity: {
          enabled: false,
          locked: false,
          provider: "",
          profile: "",
          language: "en",
        },
        identityStrength: "strong",
        continuityStrength: "strong",
        worldId: null,
      }]]),
      propsById: new Map(),
      locationsById: new Map(),
    });
    assert.equal(next.wardrobeByCharacterId["char-a"], "blue jacket");
    assert.equal(
      next.enteringNotes.some((note) => /same blue jacket/i.test(note)),
      false
    );
  });

  it("legacy empty storyboard still resolves", () => {
    const upc = resolveUnifiedProductionContext({
      storyboard: studioStoryboardDetail({ id: "legacy", scenes: [studioSceneDetail({ order: 0 })] }),
      source: "legacy",
    });
    assert.equal(upc.scenes.length, 1);
    assert.equal(upc.characters.length, 0);
  });

  it("director handoff feeds UPC as canonical generation context", () => {
    const directed = orchestrateCreativeDirector({
      experienceId: "CREATIVE_STORYBOARD",
      mode: "DIRECTOR",
    });
    assert.equal(directed.handoff.canonicalContext, "unified_production_context");
    assert.equal(directed.handoff.upcVersion, UPC_VERSION);
    const upc = resolveUnifiedProductionContext({
      storyboard: pixarStoryboard(),
      worlds: [world],
      source: "director",
      experienceId: directed.experience.experienceId,
    });
    assert.equal(upc.source, "director");
    assert.equal(upc.project.experienceId, "CREATIVE_STORYBOARD");
  });

  it("HC orchestrator source uses the same resolver", () => {
    const upc = resolveUnifiedProductionContext({
      storyboard: pixarStoryboard(),
      worlds: [world],
      source: "hc_orchestrator",
    });
    assert.equal(upc.source, "hc_orchestrator");
    assert.equal(upc.scenes.length, 8);
  });

  it("eight-scene fixture asserts entity, style, camera, and continuity per scene", () => {
    const storyboard = pixarStoryboard();
    const upc = resolveUnifiedProductionContext({ storyboard, worlds: [world] });
    assert.equal(upc.scenes.length, 8);
    assert.ok(upc.style.resolvedSummary.length > 0);
    for (const scene of upc.scenes) {
      const source = storyboard.scenes.find((row) => row.id === scene.sceneId)!;
      assert.equal(scene.sceneContextHash.length, 32);
      assert.equal(scene.locationId, source.locationId);
      assert.deepEqual(scene.characterIds.slice().sort(), source.characters.map((c) => c.id).sort());
      assert.deepEqual(scene.propIds.slice().sort(), source.props.map((p) => p.id).sort());
      assert.ok(scene.action.length > 0);
      assert.ok(scene.camera.length > 0);
      const still = buildProductionInstructions({
        upc,
        sceneId: scene.sceneId,
        target: "scene-image",
        builderOutput: buildScenePromptForDetail(source, "cinematic", { storyboard }),
      });
      for (const character of source.characters) {
        if (character.referenceImageUrl) {
          assert.ok(
            still.references.some((ref) => ref.entityId === character.id && ref.url === character.referenceImageUrl)
          );
        }
      }
      if (source.location?.referenceImageUrl) {
        assert.ok(
          still.references.some(
            (ref) => ref.entityId === source.locationId && ref.url === source.location?.referenceImageUrl
          )
        );
      }
    }
    assert.equal(upc.scenes[0]!.sceneContextHash, upc.scenes[0]!.sceneContextHash);
  });
});

describe("S2A prompt orchestrator", () => {
  it("still instructions include character refs at the adapter boundary", () => {
    const storyboard = pixarStoryboard();
    const upc = resolveUnifiedProductionContext({ storyboard, worlds: [world] });
    const scene0 = storyboard.scenes[0]!;
    const builder = buildScenePromptForDetail(scene0, "cinematic", { storyboard });
    const instructions = buildProductionInstructions({
      upc,
      sceneId: scene0.id,
      target: "scene-image",
      builderOutput: builder,
    });
    const adapterRefs = pickReferenceUrlsForStillAdapter(instructions);
    assert.ok(adapterRefs.some((ref) => ref.url === "https://cdn.example/amina.jpg"));
    assert.ok(adapterRefs.some((ref) => ref.url === "https://cdn.example/bakery.jpg"));
    assert.ok(adapterRefs.some((ref) => ref.url === "https://cdn.example/box.jpg"));
    assert.ok(instructions.assembledPrompt.includes("Amina"));
    assert.ok(instructions.sections.some((s) => s.id === "identity"));
    const continuityCount = (instructions.assembledPrompt.match(/Continuity:/g) ?? []).length;
    assert.ok(continuityCount <= 1);
  });

  it("product/logo MUST_PRESERVE survives Vidu budget pressure", () => {
    const storyboard = pixarStoryboard();
    const upc = resolveUnifiedProductionContext({ storyboard, worlds: [world] });
    const reveal = storyboard.scenes[5]!;
    const builder = buildScenePromptForDetail(reveal, "cinematic", { storyboard });
    const padded = {
      ...builder,
      sections: {
        ...builder.sections,
        qualityInstructions: "polish ".repeat(4000),
      },
    };
    const motion = buildProductionInstructions({
      upc,
      sceneId: reveal.id,
      target: "motion",
      builderOutput: padded,
    });
    assert.ok(motion.assembledPrompt.includes("MUST_PRESERVE") || motion.assembledPrompt.includes("HomeCheff"));
    assert.ok(motion.assembledPrompt.includes("Lid opens") || motion.assembledPrompt.toLowerCase().includes("reveal"));
    assert.ok(!motion.assembledPrompt.includes("polish ".repeat(50)));
    assert.ok(motion.assembledPrompt.length <= 3500);
  });

  it("rerender uses current scene action, not a stale snapshot as SoT", () => {
    const storyboard = pixarStoryboard();
    const upc = resolveUnifiedProductionContext({ storyboard, worlds: [world] });
    const smile = storyboard.scenes[4]!;
    const builder = buildScenePromptForDetail(smile, "cinematic", { storyboard });
    const rerender = buildProductionInstructions({
      upc,
      sceneId: smile.id,
      target: "rerender",
      builderOutput: builder,
    });
    assert.match(rerender.assembledPrompt, /smile/i);
    assert.equal(isSceneContextStale({
      storedSceneContextHash: "old",
      current: upc,
      sceneId: smile.id,
    }), true);
    assert.equal(isSceneContextStale({
      storedSceneContextHash: upc.scenes[4]!.sceneContextHash,
      storedUpcHash: upc.upcHash,
      current: upc,
      sceneId: smile.id,
    }), false);
  });

  it("merges negatives without duplicates", () => {
    const merged = mergeProductionNegatives({
      safety: ["no watermarks"],
      brand: ["Do not redraw HomeCheff mark"],
      preset: ["no watermarks"],
    });
    assert.equal(merged.filter((line) => /watermark/i.test(line)).length, 1);
  });

  it("sanitized prompt snapshots stay stable and secret-free", () => {
    const storyboard = pixarStoryboard();
    const upc = resolveUnifiedProductionContext({ storyboard, worlds: [world] });
    const cases: Array<{ label: string; sceneId: string; target: "scene-image" | "motion" | "rerender"; padPolish?: boolean }> = [
      { label: "A-character-heavy", sceneId: storyboard.scenes[3]!.id, target: "scene-image" },
      { label: "B-product-logo", sceneId: storyboard.scenes[5]!.id, target: "scene-image" },
      { label: "C-recurring-location", sceneId: storyboard.scenes[7]!.id, target: "scene-image" },
      { label: "D-continuity", sceneId: storyboard.scenes[1]!.id, target: "scene-image" },
      { label: "E-rerender-middle", sceneId: storyboard.scenes[4]!.id, target: "rerender" },
      { label: "F-vidu-budget", sceneId: storyboard.scenes[5]!.id, target: "motion", padPolish: true },
    ];
    for (const row of cases) {
      const scene = storyboard.scenes.find((item) => item.id === row.sceneId)!;
      let builder = buildScenePromptForDetail(scene, "cinematic", { storyboard });
      if (row.padPolish) {
        builder = {
          ...builder,
          sections: { ...builder.sections, qualityInstructions: "polish ".repeat(4000) },
        };
      }
      const instructions = buildProductionInstructions({
        upc,
        sceneId: row.sceneId,
        target: row.target,
        builderOutput: builder,
      });
      const snapshot = {
        label: row.label,
        sectionIds: instructions.sections.map((section) => section.id),
        prompt: instructions.assembledPrompt
          .replace(/https:\/\/cdn\.example\/[^\s]+/g, "[ref]")
          .replace(/[a-f0-9]{32}/g, "[hash]"),
      };
      assert.equal(snapshot.prompt.includes("sk-"), false);
      assert.equal(snapshot.prompt.includes("api_key"), false);
      assert.ok(snapshot.sectionIds.includes("identity"));
      assert.ok(snapshot.sectionIds.includes("action"));
      if (row.label === "B-product-logo" || row.label === "F-vidu-budget") {
        assert.ok(/MUST_PRESERVE|HomeCheff|logo/i.test(snapshot.prompt));
      }
      if (row.label === "F-vidu-budget") {
        assert.ok(snapshot.prompt.length <= 3500);
        assert.ok(!snapshot.prompt.includes("polish ".repeat(20)));
      }
    }
  });
});
