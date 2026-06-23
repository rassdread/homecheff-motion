import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import {
  buildMascotTransformIntake,
  buildTransformationBlueprint,
  mascotTransformCreditPreview,
  morphActionToMascotTarget,
  resolveMascotTransformFusionIntent,
} from "@/lib/editor-mascot-transformation";
import { fusionWorkflowRenderCredits } from "@/lib/editor-fusion-workflow-credits";
import { morphUsesMascotTransformWizard } from "@/lib/editor-morph-actions";

describe("editor mascot transformation", () => {
  it("maps target types to fusion intents and credits", () => {
    assert.equal(resolveMascotTransformFusionIntent("human_version", "mascot"), "mascot_into_human");
    assert.equal(fusionWorkflowRenderCredits("mascot_into_human"), 20);

    assert.equal(resolveMascotTransformFusionIntent("chef_mascot", "human"), "human_into_mascot");
    assert.equal(fusionWorkflowRenderCredits("human_into_mascot"), 20);

    assert.equal(resolveMascotTransformFusionIntent("cinematic", "mascot"), "character_upgrade");
    assert.equal(fusionWorkflowRenderCredits("character_upgrade"), 15);
  });

  it("builds TransformationBlueprint with preserve and user intent", () => {
    const blueprint = buildTransformationBlueprint({
      targetType: "human_version",
      preserve: ["colors", "eyes", "logo"],
      userIntent: "friendlier chef without glasses",
      sourceType: "mascot",
    });

    assert.equal(blueprint.sourceType, "mascot");
    assert.equal(blueprint.targetType, "human_version");
    assert.equal(blueprint.fusionIntent, "mascot_into_human");
    assert.deepEqual(blueprint.preserve, ["colors", "eyes", "logo"]);
    assert.ok(blueprint.renderInstructions.some((line) => line.includes("friendlier chef")));
  });

  it("bootstraps reference intake for primary upload role", () => {
    const document = createEditorDocumentFromUpload({
      name: "Globe Man",
      backgroundUrl: "https://cdn.example/globe.png",
    });
    const intake = buildMascotTransformIntake({
      targetType: "human_version",
      document,
      sourceType: "mascot",
    });

    assert.equal(intake.config.intent, "mascot_into_human");
    assert.equal(intake.slots.some((slot) => slot.instances.length > 0), true);
  });

  it("previews analysis and render credits", () => {
    const document = createEditorDocumentFromUpload({
      name: "Mascot",
      backgroundUrl: "https://cdn.example/mascot.png",
    });
    const intake = buildMascotTransformIntake({
      targetType: "cartoon_sticker",
      document,
    });
    const preview = mascotTransformCreditPreview({
      intake,
      targetType: "cartoon_sticker",
      isAdmin: false,
    });

    assert.equal(preview.renderCredits, 15);
    assert.ok(preview.totalCredits >= 15);
  });

  it("routes morph actions that use mascot wizard", () => {
    assert.equal(morphUsesMascotTransformWizard("human_to_mascot"), true);
    assert.equal(morphUsesMascotTransformWizard("outfit_change"), false);
    assert.equal(morphActionToMascotTarget("human_to_cinematic_character"), "cinematic");
  });
});
