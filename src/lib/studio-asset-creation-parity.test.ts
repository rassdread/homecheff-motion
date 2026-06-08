import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldShowAssetCreationWizard } from "@/lib/studio-asset-creation-preference";
import { buildAssetIdentityPrefillFromPrompt } from "@/lib/studio-asset-identity-prefill";
import { mapEntryPathToCharacter } from "@/lib/studio-asset-prompt-prefill";
import { buildPropReadinessView } from "@/lib/studio-prop-readiness";
import { buildLocationReadinessView } from "@/lib/studio-location-readiness";
import { buildWorldReadinessView } from "@/lib/studio-world-readiness";

describe("studio-asset-creation-parity", () => {
  it("builds prop prompt prefill from street food description", () => {
    const proposal = buildAssetIdentityPrefillFromPrompt({
      kind: "prop",
      prompt: "Jamaican street food cart with steel pots",
      usageContext: "promo",
    });
    assert.equal(proposal.kind, "prop");
    assert.ok(proposal.confidence > 0);
    assert.ok(proposal.reasons.includes("source:prompt"));
  });

  it("builds location prompt prefill for market scene", () => {
    const proposal = buildAssetIdentityPrefillFromPrompt({
      kind: "location",
      prompt: "Busy outdoor market in Kingston street",
    });
    assert.equal(proposal.kind, "location");
    assert.ok(String(proposal.prefill.description).includes("market"));
  });

  it("builds world prompt prefill for cyberpunk", () => {
    const proposal = buildAssetIdentityPrefillFromPrompt({
      kind: "world",
      prompt: "Futuristic cyberpunk market universe",
    });
    assert.equal(proposal.kind, "world");
    assert.equal(proposal.prefill.worldType, "cyberpunk");
  });

  it("maps universal entry paths to character paths", () => {
    assert.equal(mapEntryPathToCharacter("prompt_only"), "prompt_prefill");
    assert.equal(mapEntryPathToCharacter("image_only"), "image_prefill");
    assert.equal(mapEntryPathToCharacter("design"), "design");
  });

  it("respects skip wizard preference logic", () => {
    assert.equal(
      shouldShowAssetCreationWizard({
        skipWizardPreference: true,
        guidedQueryParam: false,
        hasDecisionPrefill: false,
      }),
      false
    );
    assert.equal(
      shouldShowAssetCreationWizard({
        skipWizardPreference: false,
        guidedQueryParam: true,
        hasDecisionPrefill: false,
      }),
      true
    );
    assert.equal(
      shouldShowAssetCreationWizard({
        skipWizardPreference: false,
        guidedQueryParam: false,
        hasDecisionPrefill: true,
      }),
      false
    );
  });

  it("builds prop readiness domains", () => {
    const view = buildPropReadinessView({
      identity: {
        name: "Cart",
        description: "Street cart",
        propType: "food",
        propFunction: "",
        shapeLanguage: "",
        material: "",
        colorTheme: "",
        sizeImpression: "",
        styleId: "realistic",
        appearanceMemory: "",
        forbiddenElements: "",
        usageContext: "promo",
        linkedCharacterIds: [],
        worldProfileId: null,
      },
      referenceImageUrl: "https://example.com/cart.jpg",
      worlds: [],
      mode: "create",
    });
    assert.ok(view.domains.length >= 5);
    assert.ok(view.overallScore >= 0);
  });

  it("builds location and world readiness views", () => {
    const location = buildLocationReadinessView({
      identity: {
        name: "Market",
        description: "Outdoor market",
        locationType: "market",
        visualStyle: "realistic",
        mood: "",
        architecture: "",
        materials: "",
        colorTheme: "",
        lighting: "",
        crowdLevel: "",
        visualIdentity: "",
        worldMemory: "",
        forbiddenElements: "",
        usageContext: "",
        worldProfileId: null,
      },
      referenceImageUrl: "",
      worlds: [],
      mode: "create",
    });
    assert.ok(location.nextStepKey);

    const world = buildWorldReadinessView({
      identity: {
        name: "Cyber World",
        description: "Neon city",
        worldType: "cyberpunk",
        visualStyle: "cinematic",
        shapeLanguage: "",
        colorTheme: "",
        colorRules: "",
        lighting: "",
        mood: "",
        environmentFeel: "",
        visualDetails: "",
        musicStyle: "",
        ambience: "",
        audioEnergy: "",
        voiceDirection: "",
        soundFeel: "",
        audioDetails: "",
        cameraStyle: "",
        motionStyle: "",
        pacing: "",
        preferredShots: "",
        forbiddenShotStyles: "",
        renderStrategies: [],
        usageContext: "",
        forbiddenElements: "",
        audioForbiddenElements: "",
        brandRules: "",
      },
      mode: "create",
    });
    assert.ok(world.domains.some((d) => d.id === "references"));
  });
});
