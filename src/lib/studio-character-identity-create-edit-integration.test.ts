import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  characterIdentityFormFromCharacter,
  emptyCharacterIdentityForm,
} from "@/lib/studio-character-identity-fields";
import { buildCharacterIdentitySuggestionFromPrefill } from "@/lib/studio-character-identity-suggestion";
import { buildCharacterDetailFromPrefill } from "@/lib/studio-identity-builder-prefill-detail";
import {
  studioCharacterFormToCreatePayload,
  studioCharacterFormToUpdatePayload,
} from "@/components/studio/studio-character-form";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";
import { studioCharacterListItem } from "@/test/studio-api-fixtures";
import type { IdentityBuilderPrefill } from "@/types/studio-asset-decision";

describe("character identity builder create/edit integration", () => {
  it("create form mounts shared identity builder", () => {
    const formPath = join(process.cwd(), "src/components/studio/studio-character-form.tsx");
    const src = readFileSync(formPath, "utf8");
    assert.match(src, /StudioCharacterIdentityBuilder/);
    assert.match(src, /mode=\{mode\}/);
    assert.match(src, /fetchStudioWorlds/);
  });

  it("workspace wrapper delegates to shared identity builder", () => {
    const workspacePath = join(
      process.cwd(),
      "src/components/studio/studio-workspace-character-identity-builder.tsx"
    );
    const src = readFileSync(workspacePath, "utf8");
    assert.match(src, /StudioCharacterIdentityBuilder/);
    assert.match(src, /mode="workspace"/);
    assert.match(src, /StudioWorkspaceCharacterVoiceInline/);
  });

  it("create page sends identity fields via payload helper", () => {
    const pagePath = join(process.cwd(), "src/app/studio/characters/new/page.tsx");
    const src = readFileSync(pagePath, "utf8");
    assert.match(src, /studioCharacterFormToCreatePayload/);
  });

  it("edit page sends identity fields via payload helper", () => {
    const pagePath = join(process.cwd(), "src/app/studio/characters/[id]/edit/page.tsx");
    const src = readFileSync(pagePath, "utf8");
    assert.match(src, /studioCharacterFormToUpdatePayload/);
  });

  it("create payload includes structured visual keywords", () => {
    const payload = studioCharacterFormToCreatePayload({
      identity: {
        ...emptyCharacterIdentityForm(),
        name: "Chef Marco",
        characterType: "mascot",
        visualStyle: "3d_cartoon",
        shapeLanguage: "rounded",
        energy: "friendly",
        colorTheme: "homecheff",
        personality: "Warm and welcoming",
        clothing: "Green apron",
        usageContext: "Kitchen promos",
      },
      referenceImageUrl: "https://example.com/ref.jpg",
      referenceStorageKey: "key/ref",
      voice: {
        voiceEnabled: false,
        voiceProvider: "elevenlabs",
        voiceProfile: "warm_narrator",
        voiceLanguage: "en",
        voiceGender: "",
        voiceDescription: "",
        voiceNotes: "",
        voiceLock: false,
        voiceProfilesByLanguage: {},
      },
      performance: {
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
      },
    });

    assert.equal(payload.name, "Chef Marco");
    assert.ok(payload.visualKeywords?.includes("hc:style=3d_cartoon"));
    assert.ok(payload.visualKeywords?.includes("hc:type=mascot"));
    assert.equal(payload.defaultClothing, "Green apron");
    assert.ok(payload.continuityNotes?.includes("Kitchen promos"));
  });

  it("update payload merges identity patch with voice and performance", () => {
    const previous = studioCharacterListItem({
      id: "c1",
      name: "Old",
      referenceImageUrl: "https://example.com/old.jpg",
    });
    const payload = studioCharacterFormToUpdatePayload(
      {
        identity: {
          ...emptyCharacterIdentityForm({ name: "New Name" }),
          characterType: "human",
        },
        referenceImageUrl: "https://example.com/old.jpg",
        referenceStorageKey: "key/old",
        voice: {
          voiceEnabled: true,
          voiceProvider: "elevenlabs",
          voiceProfile: "warm_narrator",
          voiceLanguage: "nl",
          voiceGender: "",
          voiceDescription: "",
          voiceNotes: "",
          voiceLock: false,
          voiceProfilesByLanguage: {},
        },
        performance: {
          performanceEnabled: true,
          defaultSmileStrength: 80,
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
        },
      },
      previous
    );

    assert.equal(payload.name, "New Name");
    assert.equal(payload.voiceEnabled, true);
    assert.equal(payload.performanceEnabled, true);
    assert.equal(payload.referenceImageUrl, undefined);
  });

  it("build-new prefill enriches identity fields", () => {
    const prefill: IdentityBuilderPrefill = {
      version: 1,
      kind: "character",
      name: "Promo Mascot",
      role: "mascot",
      characterType: "mascot",
      description: "Friendly brand face",
      personality: "Cheerful",
      usageContext: "Social ads",
      visualStyle: "flat_cartoon",
      colorTheme: "homecheff",
      decisionId: "d1",
    };

    const detail = buildCharacterDetailFromPrefill(prefill);
    const form = characterIdentityFormFromCharacter(detail);

    assert.equal(form.name, "Promo Mascot");
    assert.equal(form.characterType, "mascot");
    assert.equal(form.visualStyle, "flat_cartoon");
    assert.equal(form.colorTheme, "homecheff");
    assert.equal(form.usageContext, "Social ads");
  });

  it("prefill suggestion can differ from empty form for AI compare", () => {
    const prefill: IdentityBuilderPrefill = {
      version: 1,
      kind: "character",
      name: "Hero",
      role: "mascot",
      characterType: "mascot",
      visualStyle: "3d_cartoon",
      decisionId: "d2",
    };
    const suggestion = buildCharacterIdentitySuggestionFromPrefill(prefill);
    assert.equal(suggestion.name, "Hero");
    assert.equal(suggestion.visualStyle, "3d_cartoon");
  });

  it("shared builder renders style preview cards", () => {
    const builderPath = join(
      process.cwd(),
      "src/components/studio/studio-character-identity-builder.tsx"
    );
    const src = readFileSync(builderPath, "utf8");
    assert.match(src, /StudioCharacterIdentityStylePreviewCard/);
    assert.match(src, /listVisibleCharacterStyles/);
    assert.match(src, /useStudioAdvancedFeatures/);
  });

  it("create/edit i18n parity for identity headings", () => {
    assert.ok(nl["studio.characters.createIdentityHeading"]);
    assert.ok(en["studio.characters.createIdentityHeading"]);
    assert.ok(nl["studio.characters.createIdentityLead"]);
    assert.ok(en["studio.characters.createIdentityLead"]);
    assert.ok(nl["studio.characters.createEntryQuestion"]);
    assert.ok(en["studio.characters.createEntryQuestion"]);
    assert.ok(nl["studio.characters.createPrefillBanner"]);
    assert.ok(en["studio.characters.createPrefillBanner"]);
  });

  it("create form presents entry choice and reorders sections by path", () => {
    const formPath = join(process.cwd(), "src/components/studio/studio-character-form.tsx");
    const src = readFileSync(formPath, "utf8");
    assert.match(src, /CharacterCreateEntryChoice/);
    assert.match(src, /createEntryPath === "design"/);
    assert.match(src, /createEntryPath === "existing_image"/);
    assert.match(src, /CHARACTER_CREATE_DESIGN_EXPANDED_SECTIONS/);
    assert.match(src, /createPrefillBanner/);
  });

  it("identity builder supports multi-expand sections for create discovery", () => {
    const builderPath = join(
      process.cwd(),
      "src/components/studio/studio-character-identity-builder.tsx"
    );
    const src = readFileSync(builderPath, "utf8");
    assert.match(src, /initialExpandedSections/);
    assert.match(src, /expandedSections/);
    assert.match(src, /createEntryPath/);
    assert.match(src, /highlightStoryPrefill/);
  });

  it("workspace character create links to full create flow", () => {
    const sheetPath = join(
      process.cwd(),
      "src/components/studio/studio-workspace-asset-create-sheet.tsx"
    );
    const panelPath = join(
      process.cwd(),
      "src/components/studio/studio-workspace-scene-assets-panel.tsx"
    );
    const sheetSrc = readFileSync(sheetPath, "utf8");
    const panelSrc = readFileSync(panelPath, "utf8");
    assert.match(sheetSrc, /\/studio\/characters\/new/);
    assert.match(sheetSrc, /fullCharacterCreateLink/);
    assert.match(panelSrc, /href="\/studio\/characters\/new"/);
  });
});
