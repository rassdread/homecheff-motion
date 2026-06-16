import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ASSISTANT_RECOMMENDATION_CATALOG } from "@/lib/assistant-recommendation-catalog";
import { buildAssistantRecommendations } from "@/lib/assistant-recommendation-engine";
import { formatAssistantRecommendationCardCopy } from "@/lib/assistant-recommendation-display";
import { buildAssistantContextSnapshot } from "@/lib/assistant-context-layer";
import { GROWTH_SIDEBAR_CTA_BLOCKS } from "@/lib/growth-sidebar-cta";
import { interpolate, getTranslator } from "@/i18n";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";

function sampleRecord(overrides: Partial<LibraryConsistencyRecord> = {}): LibraryConsistencyRecord {
  return {
    id: "rec_1",
    ownerId: "user_1",
    createdBy: "user_1",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    generationType: "character",
    category: "characters",
    registryAssetId: overrides.registryAssetId ?? "char_1",
    backingStore: "prisma_character",
    backingId: "char_1",
    assetUrl: "https://cdn.example/char.png",
    storageKey: "key",
    thumbnailUrl: null,
    assetName: overrides.assetName ?? "Sergio",
    promptSummary: overrides.promptSummary ?? "hero",
    projectId: overrides.projectId ?? null,
    projectTitle: null,
    sourceModule: "studio",
    sourceRoute: null,
    assetType: "character",
    workflow: "character_new",
    characterCompleteness: "complete",
    motionReadinessScore: 0.9,
    motionReady: true,
    missingParts: [],
    characterType: "humanoid",
    fusionIntent: null,
    fusionArchetype: null,
    fusionMetadata: null,
    motionMetadata: null,
    publishMetadata: null,
    usedInModules: ["studio"],
    status: "completed",
    ...overrides,
  };
}

function snapshot(records: LibraryConsistencyRecord[] = []) {
  return buildAssistantContextSnapshot({ projects: [], libraryRecords: records });
}

const STATUS_KEYS = [
  "assistant.recommendation.status.readyToStart",
  "assistant.recommendation.status.characterMissing",
  "assistant.recommendation.status.motionReadyMissing",
  "assistant.recommendation.status.familyPhotosMissing",
  "assistant.recommendation.status.onlyStadiumMissing",
] as const;

function catalogTranslationKeys(): string[] {
  const keys = new Set<string>();
  for (const entry of ASSISTANT_RECOMMENDATION_CATALOG) {
    keys.add(entry.titleKey);
    keys.add(entry.descriptionKey);
    keys.add(entry.whyKey);
    if (entry.statusReadyKey) keys.add(entry.statusReadyKey);
    if (entry.statusMissingKey) keys.add(entry.statusMissingKey);
  }
  for (const key of STATUS_KEYS) {
    keys.add(key);
  }
  return [...keys].sort();
}

describe("i18n safe interpolation", () => {
  it("interpolate(undefined) returns empty string", () => {
    assert.equal(interpolate(undefined), "");
  });

  it("interpolate(null) returns empty string", () => {
    assert.equal(interpolate(null), "");
  });

  it("getTranslator returns key when translation is missing", () => {
    const t = getTranslator("en");
    const missingKey = "assistant.recommendation.__missing_test_key__" as never;
    assert.equal(t(missingKey), missingKey);
  });

  it("getTranslator uses defaultValue when translation is missing", () => {
    const t = getTranslator("nl");
    const missingKey = "assistant.recommendation.__missing_fallback__" as never;
    assert.equal(
      t(missingKey, { defaultValue: "Fallback prompt" }),
      "Fallback prompt"
    );
  });
});

describe("assistant recommendation i18n parity", () => {
  it("has every catalog recommendation key in nl and en", () => {
    const keys = catalogTranslationKeys();
    const missingEn = keys.filter((key) => !(key in en));
    const missingNl = keys.filter((key) => !(key in nl));
    assert.deepEqual(missingEn, [], `missing en keys: ${missingEn.join(", ")}`);
    assert.deepEqual(missingNl, [], `missing nl keys: ${missingNl.join(", ")}`);
  });

  it("formats card copy for all home recommendations without empty strings", () => {
    const { recommendations } = buildAssistantRecommendations({
      pathname: "/",
      snapshot: snapshot([sampleRecord()]),
      sessionSeed: "i18n-test",
    });
    const tNl = getTranslator("nl");
    const tEn = getTranslator("en");

    for (const item of recommendations) {
      for (const t of [tNl, tEn]) {
        const copy = formatAssistantRecommendationCardCopy(t, item);
        assert.equal(typeof copy.title, "string");
        assert.equal(typeof copy.description, "string");
        assert.ok(copy.title.length > 0, `empty title for ${item.id}`);
        assert.ok(copy.description.length > 0, `empty description for ${item.id}`);
      }
    }
  });

  it("formats card copy when a key is missing without throwing", () => {
    const t = getTranslator("en");
    const copy = formatAssistantRecommendationCardCopy(t, {
      id: "broken",
      category: "for_you",
      emoji: "⚽",
      titleKey: "assistant.recommendation.__missing_card_title__" as never,
      descriptionKey: "assistant.recommendation.__missing_card_description__" as never,
      whyKey: "assistant.recommendation.goalCelebration.why",
      promptMessage: "Safe fallback prompt",
      status: "ready",
      score: 1,
    });
    assert.equal(copy.title, "Safe fallback prompt");
    assert.equal(copy.description, "Safe fallback prompt");
  });

  it("has growth sidebar CTA keys in nl and en", () => {
    for (const block of GROWTH_SIDEBAR_CTA_BLOCKS) {
      for (const key of [block.badgeKey, block.titleKey, block.descriptionKey, block.actionKey]) {
        assert.ok(key in en, `missing en: ${key}`);
        assert.ok(key in nl, `missing nl: ${key}`);
      }
    }
  });
});
