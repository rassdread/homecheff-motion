import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  mergeCharacterIdentityForm,
  emptyCharacterIdentityForm,
} from "@/lib/studio-character-identity-fields";
import { buildCharacterIdentityPrefillFromImages } from "@/lib/studio-character-identity-image-prefill";
import { diffCharacterIdentityForm } from "@/lib/studio-character-identity-suggestion";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";
import type { CharacterReferenceImageAnalysis } from "@/types/studio-character-identity-image-prefill";

const singleImageAnalysis: CharacterReferenceImageAnalysis = {
  name: "Chef Marco",
  characterType: "mascot",
  visualStyle: "3d cartoon",
  shapeLanguage: "rounded",
  energy: "friendly",
  personality: "warm and welcoming",
  clothing: "green chef apron and white hat",
  accessories: "wooden spoon",
  colorTheme: "warm green tones",
  appearanceMemory: "Round face, big smile, green apron",
  usageContext: "Kitchen tutorials",
  voiceDirection: "Warm male narrator, mid 30s",
  confidence: 0.82,
  safetyNotes: [],
};

describe("character identity image prefill", () => {
  it("buildCharacterIdentityPrefillFromImages maps single image analysis to presets", () => {
    const result = buildCharacterIdentityPrefillFromImages({
      analysis: singleImageAnalysis,
      input: {
        imageUrls: ["https://example.com/chef.jpg"],
        userDescription: "Our kitchen mascot",
        intendedUsage: "Recipe videos",
      },
      locale: "en",
    });

    assert.equal(result.prefill.name, "Chef Marco");
    assert.equal(result.prefill.characterType, "mascot");
    assert.equal(result.prefill.visualStyle, "3d_cartoon");
    assert.equal(result.prefill.shapeLanguage, "rounded");
    assert.equal(result.prefill.energy, "friendly");
    assert.ok(result.prefill.clothing?.toLowerCase().includes("apron"));
    assert.ok(result.confidence > 0.5);
    assert.ok(!result.missingFields.includes("name"));
  });

  it("merges multi-image context and user description", () => {
    const result = buildCharacterIdentityPrefillFromImages({
      analysis: {
        ...singleImageAnalysis,
        appearanceMemory: "Striped scarf detail",
      },
      input: {
        imageUrls: [
          "https://example.com/main.jpg",
          "https://example.com/outfit.jpg",
          "https://example.com/closeup.jpg",
        ],
        imageRoles: ["primary", "outfit", "closeup"],
        userDescription: "Friendly street food guide",
        intendedUsage: "Travel food series",
      },
      locale: "nl",
    });

    assert.match(result.prefill.description ?? "", /Friendly street food guide/);
    assert.match(result.prefill.description ?? "", /3 reference images/);
    assert.match(result.prefill.usageContext ?? "", /Travel food series/);
  });

  it("matches outfit and accessory presets from vision text", () => {
    const result = buildCharacterIdentityPrefillFromImages({
      analysis: {
        clothing: "chef uniform with apron",
        accessories: "holding a spoon",
        personality: "professional",
        visualStyle: "flat cartoon",
        characterType: "mascot",
        confidence: 0.7,
      },
      input: { imageUrls: ["https://example.com/x.jpg"] },
      locale: "en",
    });

    assert.equal(result.prefill.visualStyle, "2d_cartoon");
    assert.ok(result.prefill.clothing?.length);
    assert.ok(result.prefill.accessories?.length);
  });

  it("use proposal merges into form without auto-save (explicit merge only)", () => {
    const empty = emptyCharacterIdentityForm();
    const result = buildCharacterIdentityPrefillFromImages({
      analysis: singleImageAnalysis,
      input: { imageUrls: ["https://example.com/chef.jpg"] },
    });
    assert.deepEqual(empty.name, "");
    const merged = mergeCharacterIdentityForm(empty, result.prefill);
    assert.equal(merged.name, "Chef Marco");
    assert.notEqual(empty.name, merged.name);
  });

  it("edit before save keeps user overrides after partial merge", () => {
    const base = { ...emptyCharacterIdentityForm(), name: "Custom Name" };
    const result = buildCharacterIdentityPrefillFromImages({
      analysis: singleImageAnalysis,
      input: { imageUrls: ["https://example.com/chef.jpg"] },
    });
    const merged = mergeCharacterIdentityForm(base, result.prefill);
    merged.name = "User Edited Name";
    assert.equal(merged.name, "User Edited Name");
    assert.equal(merged.visualStyle, "3d_cartoon");
  });

  it("diff detects proposal differs from empty form", () => {
    const result = buildCharacterIdentityPrefillFromImages({
      analysis: singleImageAnalysis,
      input: { imageUrls: ["https://example.com/chef.jpg"] },
    });
    const diff = diffCharacterIdentityForm(emptyCharacterIdentityForm(), result.prefill);
    assert.ok(diff.includes("name"));
    assert.ok(diff.includes("visualStyle"));
  });

  it("character form exposes image_prefill entry path and panel", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/studio/studio-character-form.tsx"),
      "utf8"
    );
    assert.match(src, /image_prefill/);
    assert.match(src, /StudioCharacterImagePrefillPanel/);
    assert.match(src, /handleApplyPrefillProposal/);
    assert.doesNotMatch(src, /onAnalysisResult\(res\.data\)[\s\S]{0,80}mergeCharacterIdentityForm/);
  });

  it("identity builder does not auto-apply image suggestions", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/studio/studio-character-identity-builder.tsx"),
      "utf8"
    );
    assert.match(src, /applyAiSuggestion/);
    assert.match(src, /availableFromImage/);
  });

  it("has nl/en i18n parity for image prefill keys", () => {
    const keys = [
      "studio.characters.createEntryImagePrefillTitle",
      "studio.characters.createEntryImagePrefillDescription",
      "studio.characters.imagePrefill.title",
      "studio.characters.imagePrefill.recognizedTitle",
      "studio.characters.imagePrefill.useProposal",
      "studio.characters.imagePrefill.role.primary",
      "studio.characters.imagePrefill.role.outfit",
      "studio.characterIdentity.suggestion.availableFromImage",
    ] as const;
    for (const key of keys) {
      assert.ok(nl[key], `missing nl ${key}`);
      assert.ok(en[key], `missing en ${key}`);
    }
  });
});
