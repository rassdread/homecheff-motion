import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { buildOpenAiImageEditFormData } from "@/lib/openai-image-generation";
import {
  classifyClothingMaskCoverage,
  excludeHeadFromClothingMask,
} from "@/server/editor/editor-clothing-region-mask";
import {
  assessClothingTransformationQa,
  buildClothingExecutionPrompt,
  downgradePlanForMaskFailure,
  isClothingFusionWorkflow,
  mapFusionRenderPayloadToTransformationIntent,
  resolveClothingTransformationRoute,
} from "@/lib/studio-clothing-transformation-runtime";
import {
  buildClothingTransformationPrompt,
  clothingPromptContainsNegativeTransferGuard,
  clothingPromptPreservesIdentity,
} from "@/lib/studio-clothing-transformation-prompt";
import { mapMotionPresetToTransformationIntent } from "@/lib/studio-image-transformation-map";
import { routeImageTransformation } from "@/lib/studio-image-transformation-router";
import { routeClothingWithMaskPointer, shouldUseClothingTransformationRuntime } from "@/server/editor/studio-clothing-transformation-execute";
import type { FusionRenderPayload } from "@/types/editor-fusion-intelligence";
import type { TransformationRuntimeCapabilities } from "@/types/studio-image-transformation";

const CAPS: TransformationRuntimeCapabilities = {
  supportsBaseEdit: true,
  supportsMultiReference: true,
  supportsMask: true,
  supportsPixelComposite: true,
  supportsCommercialInject: true,
  stillReferenceEditEnabled: true,
  maxReferenceImages: 4,
};

function outfitPayload(): FusionRenderPayload {
  return {
    blueprint: {
      id: "bp-outfit",
      workflowType: "outfit_from_reference",
      createdAt: new Date().toISOString(),
      references: [],
      traitAssignments: {},
      renderInstructions: [],
      preservationRules: ["face", "identity"],
      styleNotes: [],
    },
    styleDNA: [],
    referenceAnalysis: [
      {
        referenceId: "ref-outfit",
        assetId: "asset-outfit",
        imageUrl: "https://cdn.example/outfit.jpg",
        role: "outfit",
        roleId: "outfit",
        name: "Outfit",
        analysisVersion: 1,
        analyzedAt: new Date().toISOString(),
        parts: [],
        clothing: ["jacket"],
        accessories: [],
        colors: [],
        identityTraits: [],
        confidence: 0.9,
        premiumCached: true,
      },
      {
        referenceId: "ref-person",
        assetId: "asset-person",
        imageUrl: "https://cdn.example/person.jpg",
        role: "person",
        roleId: "person",
        name: "Person",
        analysisVersion: 1,
        analyzedAt: new Date().toISOString(),
        parts: [],
        clothing: [],
        accessories: [],
        colors: [],
        identityTraits: [],
        confidence: 0.9,
        premiumCached: true,
      },
    ],
    renderInstructions: ["Transfer outfit"],
    references: [
      {
        referenceId: "ref-outfit",
        role: "outfit",
        url: "https://cdn.example/outfit.jpg",
        name: "Outfit",
      },
    ],
    logoAssets: [],
    primaryImageUrl: "https://cdn.example/person.jpg",
  };
}

describe("S2B.2 clothing workflow detection", () => {
  it("detects outfit fusion workflows", () => {
    assert.equal(isClothingFusionWorkflow("outfit_from_reference"), true);
    assert.equal(isClothingFusionWorkflow("person_outfit"), true);
    assert.equal(isClothingFusionWorkflow("person_background"), false);
  });

  it("shouldUseClothingTransformationRuntime for outfit payload", () => {
    assert.equal(
      shouldUseClothingTransformationRuntime({
        workflowType: "outfit_from_reference",
        payload: outfitPayload(),
      }),
      true
    );
    assert.equal(
      shouldUseClothingTransformationRuntime({
        workflowType: "person_background",
        payload: outfitPayload(),
      }),
      false
    );
  });
});

describe("S2B.2 fusion payload intent mapping", () => {
  it("maps person as BASE and outfit as CLOTHING_REFERENCE", () => {
    const intent = mapFusionRenderPayloadToTransformationIntent({
      workflowType: "outfit_from_reference",
      primaryImageUrl: "https://cdn.example/person.jpg",
      payload: outfitPayload(),
    });
    assert.equal(intent.operation, "CLOTHING_TRANSFER");
    assert.equal(intent.baseAsset?.role, "BASE");
    assert.equal(intent.baseAsset?.sourceSlotId, "person");
    assert.ok(intent.references.some((r) => r.role === "CLOTHING_REFERENCE"));
  });

  it("routes masked multi-ref when clothing mask pointer exists", () => {
    const routed = routeClothingWithMaskPointer({
      workflowType: "outfit_from_reference",
      primaryImageUrl: "https://cdn.example/person.jpg",
      payload: outfitPayload(),
      maskUrl: "https://cdn.example/clothing-mask.png",
    });
    assert.equal(routed.plan.requestedRoute, "MASKED_MULTI_REFERENCE_EDIT");
    assert.equal(routed.plan.actualRoute, "MASKED_MULTI_REFERENCE_EDIT");
  });
});

describe("S2B.2 clothing prompt policy", () => {
  it("builds delta-first prompt with negative-transfer guards", () => {
    const { intent, plan } = resolveClothingTransformationRoute({
      workflowType: "outfit_from_reference",
      primaryImageUrl: "https://cdn.example/person.jpg",
      payload: outfitPayload(),
    });
    const prompt = buildClothingExecutionPrompt({
      intent,
      plan,
      fusionIntelligencePrompt: "FUSION OUTFIT CONTEXT",
    });
    assert.ok(clothingPromptPreservesIdentity(prompt));
    assert.ok(clothingPromptContainsNegativeTransferGuard(prompt));
    assert.match(prompt, /Replace only the base person/i);
    assert.match(prompt, /FUSION OUTFIT CONTEXT/);
    assert.doesNotMatch(prompt.toLowerCase(), /recreate face from reference/);
  });

  it("includes negative-transfer in buildClothingTransformationPrompt", () => {
    const { intent, plan } = resolveClothingTransformationRoute({
      workflowType: "outfit_from_reference",
      primaryImageUrl: "https://cdn.example/person.jpg",
      payload: outfitPayload(),
    });
    const prompt = buildClothingTransformationPrompt({ intent, plan });
    assert.ok(prompt.includes("Do not copy the reference person"));
  });
});

describe("S2B.2 mask validation", () => {
  it("classifies coverage ratios", () => {
    assert.equal(classifyClothingMaskCoverage(0.01, 0.9), "MASK_INVALID");
    assert.equal(classifyClothingMaskCoverage(0.8, 0.9), "MASK_INVALID");
    assert.equal(classifyClothingMaskCoverage(0.25, 0.2), "MASK_LOW_CONFIDENCE");
    assert.equal(classifyClothingMaskCoverage(0.25, 0.8), "MASK_VALID");
  });

  it("excludes head region from clothing mask alpha", async () => {
    const w = 32;
    const h = 32;
    const clothing = await sharp({
      create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 20, height: 20, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 255 } },
          })
            .png()
            .toBuffer(),
          left: 6,
          top: 10,
        },
      ])
      .png()
      .toBuffer();
    const head = await sharp({
      create: { width: 12, height: 12, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 255 } },
    })
      .png()
      .toBuffer();
    const refined = await excludeHeadFromClothingMask(clothing, head);
    const { data, info } = await sharp(refined).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alphaIdx = info.channels - 1;
    let topLeftAlpha = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      const y = Math.floor(i / info.channels / info.width);
      const x = (i / info.channels) % info.width;
      if (x < 12 && y < 12) {
        topLeftAlpha = Math.max(topLeftAlpha, data[i + alphaIdx] ?? 0);
      }
    }
    assert.equal(topLeftAlpha, 0);
  });
});

describe("S2B.2 downgrade tracing", () => {
  it("downgrades to Fusion with explicit protection loss", () => {
    const { intent, plan, trace } = resolveClothingTransformationRoute({
      workflowType: "outfit_from_reference",
      primaryImageUrl: "https://cdn.example/person.jpg",
      payload: outfitPayload(),
    });
    const downgraded = downgradePlanForMaskFailure(plan, trace, "CLOTHING_MASK_UNAVAILABLE");
    assert.equal(downgraded.plan.actualRoute, "FUSION");
    assert.equal(downgraded.plan.downgradeReason, "CLOTHING_MASK_UNAVAILABLE");
    assert.ok(downgraded.plan.protectionLost.includes("region-level clothing isolation"));
  });

  it("does not silent T2I for clothing transfer", () => {
    const intent = mapFusionRenderPayloadToTransformationIntent({
      workflowType: "outfit_from_reference",
      primaryImageUrl: "https://cdn.example/person.jpg",
      payload: outfitPayload(),
    });
    const { plan } = routeImageTransformation(intent, CAPS);
    assert.notEqual(plan.actualRoute, "TEXT_TO_IMAGE");
  });
});

describe("S2B.2 OpenAI edit input ordering", () => {
  it("appends base image first, references second, mask last", () => {
    const base = Buffer.from("base-image");
    const ref = Buffer.from("clothing-ref");
    const mask = Buffer.from("mask");
    const form = buildOpenAiImageEditFormData({
      model: "gpt-image-1",
      prompt: "test",
      size: "1024x1024",
      imageBuffer: base,
      imageFilename: "person.png",
      additionalImages: [
        {
          buffer: ref,
          filename: "outfit.png",
          role: "reference",
        },
      ],
      maskBuffer: mask,
      inputFidelity: "high",
    });
    const entries: string[] = [];
    for (const [key, value] of form.entries()) {
      if (value instanceof Blob) {
        entries.push(`${key}:blob`);
      } else {
        entries.push(`${key}:${value}`);
      }
    }
    const imageIndices = entries
      .map((e, i) => (e.startsWith("image[]:") || e.startsWith("image:") ? i : -1))
      .filter((i) => i >= 0);
    const maskIndex = entries.findIndex((e) => e.startsWith("mask:"));
    assert.ok(imageIndices.length >= 2);
    assert.equal(entries.filter((e) => e.startsWith("image[]:")).length, 2);
    assert.ok(maskIndex > imageIndices[imageIndices.length - 1]!);
    assert.ok(entries.some((e) => e === "input_fidelity:high"));
  });
});

describe("S2B.2 red carpet outfit semantics", () => {
  it("with luxury outfit reference maps clothing reference role", () => {
    const intent = mapMotionPresetToTransformationIntent({
      presetId: "red_carpet_moment",
      slots: [
        {
          slotId: "person_character",
          role: "character",
          url: "https://cdn.example/person.jpg",
          required: true,
        },
        {
          slotId: "luxury_outfit",
          role: "outfit",
          url: "https://cdn.example/gown.jpg",
          required: false,
        },
      ],
    });
    assert.equal(intent.family, "RED_CARPET_CELEBRITY");
    assert.equal(intent.operation, "LOCATION_TRANSFER");
    assert.ok(intent.references.some((r) => r.role === "CLOTHING_REFERENCE"));
    const { plan } = routeImageTransformation(intent, CAPS);
    assert.notEqual(plan.actualRoute, "TEXT_TO_IMAGE");
    assert.notEqual(plan.status, "missing_required_reference");
  });

  it("without outfit reference does not require CLOTHING_REFERENCE", () => {
    const intent = mapMotionPresetToTransformationIntent({
      presetId: "red_carpet_moment",
      slots: [
        {
          slotId: "person_character",
          role: "character",
          url: "https://cdn.example/person.jpg",
          required: true,
        },
      ],
    });
    const { plan } = routeImageTransformation(intent, CAPS);
    assert.notEqual(plan.status, "missing_required_reference");
    assert.ok(!plan.missingRequired.includes("CLOTHING_REFERENCE"));
  });
});

describe("S2B.2 QA hooks", () => {
  it("assesses QA bands from mask and provider outcome", () => {
    const { plan } = resolveClothingTransformationRoute({
      workflowType: "outfit_from_reference",
      primaryImageUrl: "https://cdn.example/person.jpg",
      payload: outfitPayload(),
    });
    const pass = assessClothingTransformationQa({
      maskStatus: "MASK_VALID",
      providerSucceeded: true,
      plan: { ...plan, actualRoute: "MASKED_MULTI_REFERENCE_EDIT" },
    });
    assert.equal(pass.identityPreservation, "PASS");
    const warn = assessClothingTransformationQa({
      maskStatus: "MASK_UNAVAILABLE",
      providerSucceeded: true,
      plan,
    });
    assert.equal(warn.maskIntegrity, "UNKNOWN");
  });
});

describe("S2B.2 coverage inventory", () => {
  it("marks outfit fusion rows as masked execution active", async () => {
    const { inventoryFusionWizards } = await import("@/lib/studio-image-transformation-inventory");
    const rows = inventoryFusionWizards();
    const outfit = rows.find((r) => r.id === "fusion:outfit_from_reference");
    assert.ok(outfit);
    assert.equal(outfit?.currentExecutionMatchesPlan, true);
    assert.ok(
      outfit?.status === "MASKED_EXECUTION_ACTIVE" || outfit?.status === "FUSION_FALLBACK_ACTIVE"
    );
  });
});

describe("S2B.2 fusion render wiring", () => {
  it("executeFusionWizardRender imports clothing execution path", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../server/editor/editor-fusion-render-service.ts", import.meta.url),
      "utf8"
    );
    assert.match(src, /executeClothingFusionTransformation/);
    assert.match(src, /shouldUseClothingTransformationRuntime/);
  });
});
