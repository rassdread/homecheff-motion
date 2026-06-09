import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnimationPreparationSuggestions } from "@/lib/studio-asset-animation-suggestions";
import {
  CHARACTER_STYLE_CARDS,
  shouldShowCharacterStyleStep,
  suggestCharacterStyleFromVision,
} from "@/lib/studio-asset-character-style-cards";
import { buildCompositionGraphFromDraft } from "@/lib/studio-asset-composition-graph";
import { extractDynamicAccessoriesFromVision } from "@/lib/studio-asset-dynamic-accessories";
import { auditReferencePlacements, mergePlacementQaIntoVariantAudit } from "@/lib/studio-asset-placement-qa";
import {
  buildPlacementPromptBlock,
  buildSmartPlacementSuggestions,
  createEmptyReferencePlacement,
  semanticRecordUsesPlacementSource,
} from "@/lib/studio-asset-reference-placement";
import { injectWorkbenchWizardSteps } from "@/lib/studio-asset-wizard-workbench-flow";
import { emptyAssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { buildAssetSemanticRecordFromWizardDraft } from "@/lib/studio-asset-semantic-record";
import { buildAssetSemanticGenerationContext } from "@/lib/studio-asset-semantic-generation-context";
import { mapVisionJsonToAnalysis } from "@/lib/studio-asset-vision-analysis";

const VISION = mapVisionJsonToAnalysis(
  {
    objectType: "Mascot",
    visualStyle: "Flat vector cartoon",
    brandIdentity: "Acme Brand",
    assetFamily: "Acme Characters",
    keyFeatures: ["globe head", "chef hat", "apron"],
    suggestedPreserve: ["round face"],
    suggestedChange: ["outfit"],
    suggestedForbidden: ["style break"],
    confidence: 0.9,
  },
  { sourceName: "Mascot" }
);

describe("studio-asset-generation-workbench", () => {
  it("renders character style cards config", () => {
    assert.equal(CHARACTER_STYLE_CARDS.length, 7);
    assert.ok(CHARACTER_STYLE_CARDS.some((c) => c.id === "flat_vector"));
  });

  it("suggests style from vision", () => {
    let draft = emptyAssetWizardDraft("character", "image_only");
    draft = {
      ...draft,
      identityAssetType: "mascot",
      sourceVisionAnalysis: VISION,
    };
    assert.equal(shouldShowCharacterStyleStep(draft), true);
    assert.equal(suggestCharacterStyleFromVision(draft), "flat_vector");
  });

  it("extracts dynamic accessories without HomeCheff-only defaults for other brands", () => {
    const items = extractDynamicAccessoriesFromVision({ vision: VISION });
    assert.ok(items.some((i) => i.label === "hat"));
    assert.equal(items.some((i) => i.label === "chef attributes"), false);
  });

  it("builds AI animation suggestions with confidence", () => {
    const suggestions = buildAnimationPreparationSuggestions({ vision: VISION });
    assert.ok(suggestions.length >= 10);
    assert.ok(suggestions.some((s) => s.recommended && s.confidence > 0.5));
  });

  it("builds placement prompt block with exactness instruction", () => {
    const placement = {
      ...createEmptyReferencePlacement(),
      sourceName: "Home Logo",
      placementType: "logo" as const,
      placementTarget: "apron_center" as const,
      importance: "exact" as const,
      previewUrl: "https://example.com/logo.png",
      storageKey: "logo",
    };
    const block = buildPlacementPromptBlock([placement]);
    assert.match(block, /exact placement reference/i);
    assert.match(block, /Do not invent/i);
  });

  it("persists reference placements in semantic record", () => {
    let draft = emptyAssetWizardDraft("character", "image_only");
    draft = {
      ...draft,
      sourceVisionAnalysis: VISION,
      identityAssetType: "mascot",
      identityProfileLevel: "strict",
      identityProfileConfirmed: true,
      referencePlacements: [
        {
          ...createEmptyReferencePlacement(),
          sourceName: "Badge",
          previewUrl: "https://example.com/badge.png",
          storageKey: "badge",
        },
      ],
      summaryPrompt: "Badge on apron",
    };
    const record = buildAssetSemanticRecordFromWizardDraft(draft);
    assert.equal(record?.referencePlacements?.length, 1);
    const context = buildAssetSemanticGenerationContext({
      semanticRecord: record,
      visionAnalysis: VISION,
    });
    assert.match(context, /Badge/i);
  });

  it("builds composition graph from placements", () => {
    const draft = {
      ...emptyAssetWizardDraft("character", "image_only"),
      sourceReferenceName: "Garden Character",
      referencePlacements: [
        {
          ...createEmptyReferencePlacement(),
          sourceName: "Garden Logo",
          placementTarget: "apron_center",
        },
      ],
    };
    const graph = buildCompositionGraphFromDraft(draft);
    assert.equal(graph[0]?.label, "Garden Character");
    assert.ok(graph[0]?.children.length > 0);
  });

  it("injects workbench wizard steps", () => {
    const draft = {
      ...emptyAssetWizardDraft("character", "image_only"),
      identityAssetType: "mascot" as const,
      sourceVisionAnalysis: VISION,
    };
    const steps = injectWorkbenchWizardSteps(["asset_vision", "identity_profile", "reference"], draft);
    assert.ok(steps.includes("character_style"));
    assert.ok(steps.includes("reference_placement"));
  });

  it("audits placement QA and merges into variant audit", () => {
    const placementQa = auditReferencePlacements({
      placements: [
        {
          ...createEmptyReferencePlacement(),
          sourceName: "Plant Icon",
          importance: "required",
        },
      ],
      generatedPrompt: "Use Plant Icon on hat",
      variantAudit: {
        identityScore: 80,
        familyScore: 80,
        brandScore: 70,
        shapeMarkerScore: 80,
        preserved: [],
        lost: [],
        warningItems: [],
        recoveryRequired: false,
        recoveryTier: "ok",
        recommendations: [],
        identityProfile: "strict",
      },
    });
    assert.ok(placementQa.items.length === 1);
    const merged = mergePlacementQaIntoVariantAudit(
      {
        identityScore: 80,
        familyScore: 80,
        brandScore: 70,
        shapeMarkerScore: 80,
        preserved: [],
        lost: [],
        warningItems: [],
        recoveryRequired: false,
        recoveryTier: "ok",
        recommendations: [],
        identityProfile: "strict",
      },
      placementQa
    );
    assert.ok(merged.warningItems.length >= 0);
  });

  it("suggests smart placements from vision", () => {
    const suggestions = buildSmartPlacementSuggestions(VISION);
    assert.ok(suggestions.length > 0);
  });

  it("detects placement source usage in semantic records", () => {
    assert.equal(
      semanticRecordUsesPlacementSource(
        {
          referencePlacements: [
            {
              ...createEmptyReferencePlacement(),
              assetId: "logo-asset-1",
              sourceName: "Brand Logo",
            },
          ],
        },
        { assetId: "logo-asset-1" }
      ),
      true
    );
    assert.equal(semanticRecordUsesPlacementSource(null, { assetId: "logo-asset-1" }), false);
  });
});
