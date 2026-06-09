import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCharacterEvolutionChoice,
  buildCanonicalEvolutionSummaryPrompt,
  findCanonicalCharacterBaseForSource,
  isCanonicalCharacterBaseRecord,
  listDerivedCharacterRoleVariants,
  qualifiesForCharacterEvolution,
  scoreMotionCharacterReferencePreference,
} from "@/lib/studio-asset-character-evolution";
import { emptyAssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { injectEvolutionWizardSteps } from "@/lib/studio-asset-wizard-evolution-flow";
import {
  formatIdentityWeightPercent,
  IDENTITY_PROFILE_CONFIGS,
} from "@/lib/studio-asset-identity-profile";
import type { StudioAsset } from "@/types/studio-media-asset";
import type { StudioCharacterListItem } from "@/types/studio-api";
import { DEFAULT_CANONICAL_EVOLUTION_CONSTRUCTION } from "@/types/studio-asset-character-evolution";

function mascotVisionDraft() {
  return {
    ...emptyAssetWizardDraft("character", "image_only"),
    sourceReferenceImageUrl: "https://example.com/globe.png",
    sourceReferenceStorageKey: "uploads/globe.png",
    sourceReferenceName: "Globe Man",
    identityAssetType: "mascot" as const,
    identityProfileLevel: "master_character" as const,
    identityProfileConfirmed: true,
    sourceVisionAnalysis: {
      objectType: "mascot" as const,
      objectTypeLabel: "Brand mascot",
      brandIdentity: "HomeCheff",
      assetFamily: "Brand mascot family",
      visualStyle: "Flat illustration",
      shapeLanguage: ["round head"],
      keyFeatures: ["globe"],
      colors: [{ label: "blue", hex: "#0067B1" }],
      suggestedPreserve: ["face structure"],
      suggestedChange: ["outfit"],
      suggestedForbidden: ["style break"],
      identityFingerprint: {
        fingerprintHash: "abc",
        faceStructure: "round",
        outlineStyle: "flat",
        silhouette: "compact",
        identityShapeMarkers: ["globe head"],
      },
      confidence: 0.9,
      characterLineage: "Primary Mascot",
    },
  };
}

describe("studio-asset-character-evolution", () => {
  it("qualifies brand mascots for evolution step", () => {
    assert.equal(qualifiesForCharacterEvolution(mascotVisionDraft()), true);
  });

  it("applies canonical base profile and semantic type", () => {
    const patch = applyCharacterEvolutionChoice(mascotVisionDraft(), "canonical_character_base");
    assert.equal(patch.identityAssetType, "canonical_character_base");
    assert.equal(patch.identityProfileLevel, "canonical_evolution");
    assert.match(patch.summaryPrompt ?? "", /Canonical Character Base/i);
  });

  it("builds canonical evolution construction prompt", () => {
    const prompt = buildCanonicalEvolutionSummaryPrompt(DEFAULT_CANONICAL_EVOLUTION_CONSTRUCTION, "Globe Base");
    assert.match(prompt, /neutral animation-ready/i);
    assert.match(prompt, /globe/i);
  });

  it("finds canonical base for brand source", () => {
    const characters = [
      {
        id: "globe",
        name: "Globe Man",
        referenceNotes:
          '[studio:semantic:v1]{"version":1,"identityAssetType":"mascot","identityProfile":"master_character"}',
      },
      {
        id: "canonical",
        name: "Globe Base",
        referenceNotes:
          '[studio:semantic:v1]{"version":1,"identityAssetType":"canonical_character_base","identityProfile":"canonical_evolution","derivedFromAssetId":"globe","parentAssetId":"globe"}',
      },
    ] as StudioCharacterListItem[];

    const found = findCanonicalCharacterBaseForSource(characters, "globe");
    assert.equal(found?.id, "canonical");
  });

  it("scores canonical base highest for motion preference", () => {
    assert.ok(
      scoreMotionCharacterReferencePreference({ identityAssetType: "canonical_character_base" }) >
        scoreMotionCharacterReferencePreference({ identityProfile: "master_character" })
    );
  });

  it("lists derived role variants from canonical base", () => {
    const assets = [
      {
        id: "canonical",
        category: "character",
        semanticContinuity: { identityAssetType: "canonical_character_base" },
      },
      {
        id: "chef",
        category: "character",
        name: "Chef",
        semanticContinuity: { derivedFromAssetId: "canonical" },
      },
    ] as StudioAsset[];

    const roles = listDerivedCharacterRoleVariants(assets, "canonical");
    assert.equal(roles.length, 1);
    assert.equal(roles[0]?.id, "chef");
  });

  it("injects evolution steps after identity profile", () => {
    const draft = mascotVisionDraft();
    draft.characterEvolutionChoice = "canonical_character_base";
    const steps = injectEvolutionWizardSteps(
      ["input", "asset_vision", "identity_profile", "source_transform", "reference"],
      draft
    );
    const evolutionIdx = steps.indexOf("character_evolution");
    const constructionIdx = steps.indexOf("canonical_evolution_construction");
    assert.ok(evolutionIdx > steps.indexOf("identity_profile"));
    assert.ok(constructionIdx > evolutionIdx);
    assert.equal(steps.includes("source_transform"), false);
  });

  it("defines canonical evolution identity profile config", () => {
    const config = IDENTITY_PROFILE_CONFIGS.canonical_evolution;
    assert.equal(formatIdentityWeightPercent("canonical_evolution"), 88);
    assert.ok(config.identityWeight >= 0.85);
    assert.ok(config.creativityWeight <= 0.25);
    assert.ok(isCanonicalCharacterBaseRecord({ identityAssetType: "canonical_character_base" }));
  });
});
