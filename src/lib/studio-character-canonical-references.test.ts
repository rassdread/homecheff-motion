import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  archivePreviousPrimaryReference,
  parseCharacterReferencesBundle,
  resolveCanonicalCharacterReferences,
  serializeCharacterReferenceNotes,
} from "@/lib/studio-character-canonical-references";
import { buildCharacterHealthView } from "@/lib/studio-character-health";

describe("studio-character-canonical-references", () => {
  it("round-trips reference bundle in referenceNotes", () => {
    const bundle = {
      version: 1 as const,
      primarySetAt: "2026-06-01T12:00:00.000Z",
      supporting: [],
      archive: [
        {
          id: "arch-1",
          imageUrl: "https://example.com/chef_v1.png",
          storageKey: "chef_v1",
          label: "Previous primary",
          archivedAt: "2026-06-02T12:00:00.000Z",
          wasPrimary: true,
        },
      ],
    };
    const notes = serializeCharacterReferenceNotes("Kitchen promos only", bundle);
    const parsed = parseCharacterReferencesBundle(notes);
    assert.equal(parsed.humanNotes, "Kitchen promos only");
    assert.equal(parsed.bundle.archive.length, 1);
    assert.equal(parsed.bundle.archive[0]?.imageUrl, "https://example.com/chef_v1.png");
  });

  it("archives previous primary without deleting URL from bundle", () => {
    const existing = {
      id: "char-1",
      referenceImageUrl: "https://example.com/chef_v1.png",
      referenceStorageKey: "chef_v1",
      primaryReferenceImageId: "ref-old",
      referenceNotes: "",
      visualKeywords: "hc:type=mascot,hc:style=2d_cartoon",
      defaultClothing: "Chef hat",
      name: "Chef",
      role: "mascot",
      description: "Friendly chef",
      personality: "Warm",
      appearanceMemory: "",
      worldProfileId: null,
    };

    const result = archivePreviousPrimaryReference({
      existing,
      newReferenceImageUrl: "https://example.com/chef_final.png",
      newReferenceStorageKey: "chef_final",
      now: new Date("2026-06-03T10:00:00.000Z"),
    });

    const { bundle } = parseCharacterReferencesBundle(result.referenceNotes);
    assert.equal(bundle.archive.length, 1);
    assert.equal(bundle.archive[0]?.wasPrimary, true);
    assert.equal(bundle.archive[0]?.imageUrl, "https://example.com/chef_v1.png");
    assert.ok(result.primaryReferenceImageId);
    assert.notEqual(result.primaryReferenceImageId, "ref-old");
  });

  it("resolves official primary reference from character row", () => {
    const view = resolveCanonicalCharacterReferences({
      id: "char-1",
      referenceImageUrl: "https://example.com/chef_final.png",
      referenceStorageKey: "chef_final",
      primaryReferenceImageId: "ref-primary",
      referenceNotes: "",
      visualKeywords: "",
      defaultClothing: "",
      name: "Chef",
      role: "mascot",
      description: "",
      personality: "",
      appearanceMemory: "",
      worldProfileId: null,
    });

    assert.ok(view.primary);
    assert.equal(view.primary?.isOfficial, true);
    assert.equal(view.primary?.id, "ref-primary");
  });
});

describe("studio-character-health", () => {
  const baseCharacter = {
    id: "char-1",
    ownerId: "user-1",
    name: "Chef",
    slug: "chef",
    role: "mascot" as const,
    description: "Friendly mascot chef",
    personality: "Warm and playful",
    referenceImageUrl: "https://example.com/chef.png",
    referenceStorageKey: "chef",
    isMascot: true,
    appearanceMemory: "",
    personalityMemory: "",
    continuityNotes: "",
    defaultClothing: "White coat",
    defaultAccessories: "",
    visualKeywords: "hc:type=mascot,hc:style=2d_cartoon,hc:shape=rounded,hc:color=green",
    primaryReferenceImageId: "ref-1",
    referenceNotes: "",
    identityStrength: "strong" as const,
    continuityStrength: "strong" as const,
    worldProfileId: "world-1",
    worldProfile: { id: "world-1", name: "HomeCheff Kitchen" },
    voiceEnabled: true,
    voiceProvider: "elevenlabs",
    voiceProfile: "library:abc123",
    voiceLanguage: "nl",
    voiceGender: "",
    voiceDescription: "",
    voiceNotes: "",
    voiceLock: false,
    voiceProfilesByLanguage: {},
    performanceEnabled: false,
    defaultSmileStrength: 70,
    defaultBlinkRate: "medium",
    defaultHeadMovement: "medium",
    defaultMouthIntensity: "medium",
    idleAnimationStyle: "subtle",
    performanceNotes: "",
    mouthAnimationEnabled: false,
    mouthClosedAssetUrl: "",
    mouthSmallAssetUrl: "",
    mouthMediumAssetUrl: "",
    mouthWideAssetUrl: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    storyUsage: { sceneCount: 2, storyboardCount: 1, storyboardIds: ["sb-1"] },
  };

  it("marks character ready when identity, voice, world, and reference are present", () => {
    const view = buildCharacterHealthView(baseCharacter);
    assert.equal(view.status, "ready");
    assert.equal(view.score, 100);
    assert.equal(view.checks.identityFilled, true);
    assert.equal(view.checks.voiceLinked, true);
    assert.equal(view.checks.worldLinked, true);
    assert.equal(view.checks.primaryReferencePresent, true);
  });

  it("marks needs attention when voice is missing", () => {
    const view = buildCharacterHealthView({
      ...baseCharacter,
      voiceEnabled: false,
      voiceProfile: "",
    });
    assert.equal(view.status, "needs_attention");
    assert.ok(view.warnings.some((w) => w.id === "no_voice"));
  });

  it("warns on stale reference when identity updated after primary set", () => {
    const notes = serializeCharacterReferenceNotes("", {
      version: 1,
      primarySetAt: "2026-01-01T00:00:00.000Z",
      supporting: [],
      archive: [],
    });
    const view = buildCharacterHealthView({
      ...baseCharacter,
      referenceNotes: notes,
      updatedAt: "2026-06-01T00:00:00.000Z",
    });
    assert.ok(view.warnings.some((w) => w.id === "stale_reference"));
  });
});
