import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  scenePromptContainsLocationNegativeTransfer,
  scenePromptPreservesApprovedBase,
  buildSceneRerenderTransformationPrompt,
} from "@/lib/studio-scene-rerender-prompt";
import {
  assessSceneRerenderQa,
  buildSceneRerenderIntent,
  classifySceneRerenderOperation,
  downgradeScenePlanForMaskFailure,
  resolveApprovedSceneStillBase,
  resolveRedCarpetStillTransformation,
  resolveSceneRerenderRoute,
  shouldUseApprovedBaseEdit,
} from "@/lib/studio-scene-rerender-runtime";
import { routeImageTransformation } from "@/lib/studio-image-transformation-router";
import { isLocationFusionWorkflow } from "@/lib/studio-scene-rerender-runtime";
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

describe("S2B.3 approved BASE selection", () => {
  it("resolves selected completed still only", () => {
    const base = resolveApprovedSceneStillBase({
      selectedSceneImageId: "img-2",
      sceneImages: [
        { id: "img-1", status: "completed", imageUrl: "https://cdn.example/old.jpg", generationVersion: 1 },
        { id: "img-2", status: "completed", imageUrl: "https://cdn.example/approved.jpg", generationVersion: 2 },
        { id: "img-3", status: "failed", imageUrl: "https://cdn.example/fail.jpg", generationVersion: 3 },
      ],
    });
    assert.equal(base?.id, "img-2");
    assert.equal(base?.url, "https://cdn.example/approved.jpg");
  });

  it("returns null when no selected still (not latest row)", () => {
    const base = resolveApprovedSceneStillBase({
      selectedSceneImageId: null,
      sceneImages: [
        { id: "img-1", status: "completed", imageUrl: "https://cdn.example/latest.jpg" },
      ],
    });
    assert.equal(base, null);
  });

  it("shouldUseApprovedBaseEdit false for net-new scene", () => {
    assert.equal(
      shouldUseApprovedBaseEdit({
        approvedStill: null,
        isNetNewSceneGeneration: true,
      }),
      false
    );
  });
});

describe("S2B.3 operation classification", () => {
  it("classifies expression, location, camera, pose", () => {
    assert.equal(classifySceneRerenderOperation({ changeTargets: ["expression"] }), "EXPRESSION_CHANGE");
    assert.equal(classifySceneRerenderOperation({ changeTargets: ["location"] }), "LOCATION_TRANSFER");
    assert.equal(classifySceneRerenderOperation({ changeTargets: ["camera.crop"] }), "CAMERA_REFRAME");
    assert.equal(classifySceneRerenderOperation({ changeTargets: ["pose"] }), "POSE_CHANGE");
    assert.equal(classifySceneRerenderOperation({ forceFullGeneration: true }), "FULL_SCENE_GENERATION");
  });
});

describe("S2B.3 expression routing", () => {
  it("uses approved BASE and does not default to T2I", () => {
    const { intent, plan } = resolveSceneRerenderRoute({
      approvedStill: {
        id: "still-a",
        url: "https://cdn.example/scene5.jpg",
        generationVersion: 1,
        promptVersion: 1,
      },
      changeTargets: ["expression"],
    });
    assert.equal(intent.operation, "EXPRESSION_CHANGE");
    assert.equal(intent.baseAsset?.assetId, "still-a");
    assert.ok(intent.protectedTargets.some((p) => p.property.includes("face") || p.property.includes("identity")));
    assert.ok(intent.protectedTargets.some((p) => p.property === "location"));
    assert.ok(intent.protectedTargets.some((p) => p.property === "clothing"));
    assert.notEqual(plan.actualRoute, "TEXT_TO_IMAGE");
    assert.ok(
      plan.actualRoute === "BASE_IMAGE_EDIT" ||
        plan.actualRoute === "MASKED_EDIT" ||
        plan.actualRoute === "MULTI_REFERENCE_EDIT"
    );
  });
});

describe("S2B.3 location routing", () => {
  it("routes location transfer with LOCATION_REFERENCE and negative transfer", () => {
    const { intent, plan } = resolveSceneRerenderRoute({
      approvedStill: {
        id: "still-bakery",
        url: "https://cdn.example/bakery.jpg",
        generationVersion: 1,
        promptVersion: 1,
      },
      changeTargets: ["location"],
      extraRefs: [
        {
          slotId: "hotel",
          role: "location",
          url: "https://cdn.example/lobby.jpg",
          required: true,
        },
      ],
    });
    assert.equal(intent.operation, "LOCATION_TRANSFER");
    assert.ok(intent.references.some((r) => r.role === "LOCATION_REFERENCE"));
    assert.ok(
      intent.negativeTransferRules.some((r) => r.referenceRole === "LOCATION_REFERENCE")
    );
    assert.notEqual(plan.actualRoute, "TEXT_TO_IMAGE");
    const prompt = buildSceneRerenderTransformationPrompt({ intent, plan });
    assert.ok(scenePromptPreservesApprovedBase(prompt));
    assert.ok(scenePromptContainsLocationNegativeTransfer(prompt));
  });
});

describe("S2B.3 pose high-risk", () => {
  it("marks pose as HIGH drift", () => {
    const intent = buildSceneRerenderIntent({
      approvedStill: {
        id: "still-a",
        url: "https://cdn.example/a.jpg",
        generationVersion: 1,
        promptVersion: 1,
      },
      changeTargets: ["pose"],
    });
    assert.equal(intent.operation, "POSE_CHANGE");
    assert.equal(intent.providerDriftRisk, "HIGH");
  });
});

describe("S2B.3 downgrade + no silent T2I", () => {
  it("downgrades mask failure with protectionLost", () => {
    const { plan, trace } = resolveSceneRerenderRoute({
      approvedStill: {
        id: "still-a",
        url: "https://cdn.example/a.jpg",
        generationVersion: 1,
        promptVersion: 1,
      },
      changeTargets: ["location"],
    });
    const downgraded = downgradeScenePlanForMaskFailure(
      plan,
      trace,
      "PERSON_FOREGROUND_MASK_UNAVAILABLE"
    );
    assert.notEqual(downgraded.plan.actualRoute, "TEXT_TO_IMAGE");
    assert.ok(downgraded.plan.protectionLost.length > 0);
  });

  it("scene rerender never silently chooses T2I when base edit available", () => {
    const { plan } = routeImageTransformation(
      buildSceneRerenderIntent({
        approvedStill: {
          id: "still-a",
          url: "https://cdn.example/a.jpg",
          generationVersion: 1,
          promptVersion: 1,
        },
      }),
      CAPS
    );
    assert.notEqual(plan.actualRoute, "TEXT_TO_IMAGE");
  });
});

describe("S2B.3 red carpet still plan", () => {
  it("with outfit + location uses single-generation identity plan", () => {
    const routed = resolveRedCarpetStillTransformation({
      personUrl: "https://cdn.example/person.jpg",
      luxuryOutfitUrl: "https://cdn.example/gown.jpg",
      locationUrl: "https://cdn.example/carpet.jpg",
    });
    assert.equal(routed.singleGeneration, true);
    assert.equal(routed.intent.baseAsset?.role, "BASE");
    assert.ok(routed.intent.references.some((r) => r.role === "CLOTHING_REFERENCE"));
    assert.notEqual(routed.plan.actualRoute, "TEXT_TO_IMAGE");
  });

  it("without outfit/location does not require LOCATION_REFERENCE", () => {
    const routed = resolveRedCarpetStillTransformation({
      personUrl: "https://cdn.example/person.jpg",
    });
    assert.notEqual(routed.plan.status, "missing_required_reference");
    assert.ok(!routed.plan.missingRequired.includes("LOCATION_REFERENCE"));
    assert.ok(!routed.plan.missingRequired.includes("CLOTHING_REFERENCE"));
  });
});

describe("S2B.3 QA + location fusion detection", () => {
  it("assesses QA bands", () => {
    const { plan } = resolveSceneRerenderRoute({
      approvedStill: {
        id: "still-a",
        url: "https://cdn.example/a.jpg",
        generationVersion: 1,
        promptVersion: 1,
      },
      changeTargets: ["expression"],
    });
    const qa = assessSceneRerenderQa({
      maskStatus: "MASK_UNAVAILABLE",
      providerSucceeded: true,
      plan,
      usedApprovedBase: true,
    });
    assert.equal(qa.identityPreservation, "PASS");
  });

  it("detects person_background location workflow", () => {
    assert.equal(isLocationFusionWorkflow("person_background"), true);
    assert.equal(isLocationFusionWorkflow("outfit_from_reference"), false);
  });
});

describe("S2B.3 wiring smoke", () => {
  it("scene image service imports approved-base helpers", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../server/studio/studio-scene-image-service.ts", import.meta.url),
      "utf8"
    );
    assert.match(src, /resolveApprovedSceneStillBase/);
    assert.match(src, /TRANSFORM_EXISTING_ASSET/);
    assert.match(src, /buildSceneRerenderExecutionPrompt/);
  });

  it("fusion render wires location runtime", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../server/editor/editor-fusion-render-service.ts", import.meta.url),
      "utf8"
    );
    assert.match(src, /executeLocationFusionTransformation/);
  });

  it("openai source edit accepts additional reference images", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../server/scene-image-providers/openai-provider.ts", import.meta.url),
      "utf8"
    );
    assert.match(src, /additionalImages/);
    assert.match(src, /generateFromSourceEdit/);
  });

  it("inventory marks scene_rerender execution active", async () => {
    const { inventorySceneRerender } = await import("@/lib/studio-image-transformation-inventory");
    const row = inventorySceneRerender();
    assert.equal(row.currentExecutionMatchesPlan, true);
    assert.ok(
      row.status === "BASE_EDIT_ACTIVE" ||
        row.status === "LOCATION_REFERENCE_EDIT_ACTIVE" ||
        row.status === "ROUTER_READY"
    );
  });
});
