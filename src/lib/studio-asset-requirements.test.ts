import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  assertNotEditorVariantEndpoint,
  briefWizardKindForRequirement,
  isAudioRequirementKind,
  isVisualRequirementKind,
  pickerCategoryForRequirement,
  resolveGenerateEndpoint,
  STUDIO_ASSET_REQUIREMENT_ENDPOINTS,
} from "@/lib/studio-asset-requirement-routing";
import {
  findCachedMusicAsset,
  findCachedSfxAsset,
  findCachedVoiceAsset,
} from "@/lib/studio-asset-requirement-audio";
import {
  buildMissingAssetRequirements,
  normalizeRequirementStatus,
} from "@/lib/studio-brief-asset-wizards";
import { buildStoryPlanFromBrief } from "@/lib/studio-build-story-plan";
import { buildProductionBrief } from "@/lib/studio-production-brief-builder";
import { DEFAULT_BRIEF_V4_SELECTIONS } from "@/types/studio-production-brief-v4";

describe("studio asset requirements routing", () => {
  it("never routes generate flows to editor variant API", () => {
    for (const endpoint of Object.values(STUDIO_ASSET_REQUIREMENT_ENDPOINTS)) {
      assert.doesNotThrow(() => assertNotEditorVariantEndpoint(endpoint));
    }
    assert.throws(() => assertNotEditorVariantEndpoint("/api/editor/instruction/variant"));
  });

  it("maps kinds to wizard, picker, and generate endpoints", () => {
    assert.equal(briefWizardKindForRequirement("mascot"), "character");
    assert.equal(pickerCategoryForRequirement("sfx"), "sfx");
    assert.equal(pickerCategoryForRequirement("mascot"), "mascots");
    assert.equal(isAudioRequirementKind("music"), true);
    assert.equal(isVisualRequirementKind("team"), true);
    assert.ok(resolveGenerateEndpoint({ id: "r1", kind: "voice", label: "VO", sceneIds: [], status: "missing", estimatedCredits: 1 }).includes("voice-preview-draft"));
    assert.equal(
      resolveGenerateEndpoint({ id: "r2", kind: "character", label: "Hero", sceneIds: [], status: "missing", estimatedCredits: 2 }),
      STUDIO_ASSET_REQUIREMENT_ENDPOINTS.generateImage
    );
  });

  it("normalizes legacy linked/generated statuses to attached", () => {
    assert.equal(normalizeRequirementStatus("linked"), "attached");
    assert.equal(normalizeRequirementStatus("generated"), "attached");
    assert.equal(normalizeRequirementStatus("processing"), "processing");
  });
});

describe("studio asset requirements audio cache", () => {
  it("reuses user library previews before provider calls", () => {
    const voiceHit = findCachedVoiceAsset(
      [
        {
          cloneId: "c1",
          name: "Narrator",
          previewUrl: "https://cdn.example.com/voice.mp3",
          createdAt: "",
          language: "nl",
          status: "completed",
          voiceProfileRef: "warm",
          provider: "elevenlabs",
          characterCount: 0,
          storyboardCount: 0,
          characterIds: [],
          storyboardIds: [],
          lastUsedAt: "",
        },
      ],
      "Narrator"
    );
    assert.equal(voiceHit.hit, true);
    assert.equal(voiceHit.source, "user_voice_library");

    const musicHit = findCachedMusicAsset(
      [
        {
          id: "m1",
          kind: "music",
          name: "Warm track",
          category: "corporate",
          mood: "warm",
          energy: "medium",
          audioUrl: "https://cdn.example.com/music.mp3",
          storageKey: "k",
          durationSeconds: 30,
          createdAt: "",
        },
      ],
      "Warm track"
    );
    assert.equal(musicHit.hit, true);

    const sfxMiss = findCachedSfxAsset([], "Whoosh");
    assert.equal(sfxMiss.hit, false);
  });
});

describe("studio asset requirements panel wiring", () => {
  it("panel source does not import editor variant client", () => {
    const panelPath = join(process.cwd(), "src/components/studio/studio-generate-missing-assets-panel.tsx");
    const source = readFileSync(panelPath, "utf8");
    assert.equal(source.includes("instruction/variant"), false);
    assert.equal(source.includes("executeEditorInstructionVariantApi"), false);
    assert.ok(source.includes("studio-asset-requirement-routing"));
    assert.ok(source.includes("StudioAssetRequirementDebugPanel"));
  });

  it("builds mascot, team, voice, music, and sfx requirements", () => {
    const brief = buildProductionBrief({
      idea: "Mascot team promo with voice and music",
      characters: [],
      locations: [],
      props: [],
      worlds: [],
      projectMemory: null,
    })!;
    const plan = buildStoryPlanFromBrief({ brief, selections: DEFAULT_BRIEF_V4_SELECTIONS });
    plan.scenes[0]!.requiredAssets.push("Brand mascot", "Team host", "City location");
    const reqs = buildMissingAssetRequirements({ storyPlan: plan });
    const kinds = reqs.map((r) => r.kind);
    assert.ok(kinds.includes("mascot"));
    assert.ok(kinds.includes("team"));
    assert.ok(kinds.includes("music") || kinds.includes("voice"));
    assert.ok(kinds.includes("sfx"));
  });
});
