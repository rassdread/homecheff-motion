import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyPrefillAnswer,
  buildAssistantPrefillPackage,
  detectAssistantPrefillIntent,
  tryResolvePrefillAnswerFromMessage,
} from "@/lib/assistant-prefill-engine";
import { buildAssistantPrefillRoute } from "@/lib/assistant-prefill-storage";
import { processAssistantTurn } from "@/lib/assistant-orchestrator";
import { buildAssistantContextSnapshot } from "@/lib/assistant-context-layer";
import { createAssistantSessionMemory } from "@/lib/assistant-session-memory";
import { createHcProjectForModule } from "@/lib/hc-project-lifecycle";
import {
  applyAssistantPrefillToMotionWizard,
  buildFusionSettingsFromAssistantBootstrap,
} from "@/lib/assistant-wizard-prefill-apply";
import { createEmptyMotionReadyWizardState } from "@/lib/motion-ready-character-wizard";

describe("homecheff assistant v2 prefill copilot", () => {
  it("outfit prompt builds fusion prefill with clothingOnly true", () => {
    const detect = detectAssistantPrefillIntent(
      "Zet deze jas op mij maar verander mijn gezicht niet"
    );
    assert.equal(detect.kind, "prefill");
    if (detect.kind !== "prefill") {
      return;
    }
    const pkg = buildAssistantPrefillPackage({
      intent: detect.intent,
      message: "Zet deze jas op mij maar verander mijn gezicht niet",
      actionId: detect.actionId,
      understoodKey: detect.understoodKey,
      routeContext: {},
    });
    assert.ok(pkg);
    assert.equal(pkg?.outputSettings?.clothingOnly, true);
    assert.equal(pkg?.protectionSettings?.protectFace, true);
    assert.equal(pkg?.fusion?.fusionArchetype, "character_outfit");
    assert.equal(pkg?.providerCalls, 0);
    assert.equal(pkg?.creditsConsumed, 0);
  });

  it("face protection phrase sets protectFace in outfit prefill answers", () => {
    const detect = detectAssistantPrefillIntent("verander mijn gezicht niet bij deze outfit");
    assert.equal(detect.kind, "prefill");
    const pkg = buildAssistantPrefillPackage({
      intent: "fusion_outfit",
      message: "verander mijn gezicht niet bij deze outfit",
      actionId: "create_fusion",
      understoodKey: "assistant.understood.fusionOutfit",
      routeContext: {},
    });
    assert.ok(pkg);
    assert.equal(pkg?.questionAnswers?.protect_face, "yes");
    assert.equal(pkg?.outputSettings?.protectFace, true);
  });

  it("motion-ready selfie prompt routes to motion-ready wizard", () => {
    const detect = detectAssistantPrefillIntent(
      "Maak van deze selfie een personage dat ik later kan animeren"
    );
    assert.equal(detect.kind, "prefill");
    if (detect.kind !== "prefill") {
      return;
    }
    const pkg = buildAssistantPrefillPackage({
      intent: detect.intent,
      message: "Maak van deze selfie een personage dat ik later kan animeren",
      actionId: detect.actionId,
      understoodKey: detect.understoodKey,
      routeContext: {},
    });
    assert.ok(pkg);
    assert.match(pkg?.targetRoute ?? "", /\/studio\/characters\/motion-ready/);
    assert.equal(pkg?.character?.fullBodyRequired, true);
    assert.equal(pkg?.character?.transparentBackground, true);
  });

  it("studio story prompt builds story prefill package", () => {
    const detect = detectAssistantPrefillIntent("Maak een promotievideo voor HomeCheff");
    assert.equal(detect.kind, "prefill");
    const pkg = buildAssistantPrefillPackage({
      intent: "studio_story",
      message: "Maak een promotievideo voor HomeCheff",
      actionId: "create_motion_video",
      understoodKey: "assistant.understood.studioStory",
      routeContext: {},
    });
    assert.ok(pkg);
    assert.equal(pkg?.targetRoute, "/studio/storyboards/new");
    assert.equal(pkg?.studio?.storyType, "promotional");
    assert.equal(pkg?.readiness, "waiting_for_answer");
  });

  it("assistant asks missing questions before ready_to_open", () => {
    const pkg = buildAssistantPrefillPackage({
      intent: "fusion_outfit",
      message: "jas op mij",
      actionId: "create_fusion",
      understoodKey: "assistant.understood.fusionOutfit",
      routeContext: {},
    });
    assert.ok(pkg);
    assert.equal(pkg?.readiness, "waiting_for_answer");
    assert.ok(pkg?.pendingQuestions.length > 0);
    assert.ok(pkg?.activitySteps.some((step) => step.id === "questions"));
  });

  it("answers progress prefill toward ready_to_open without provider calls", () => {
    let pkg = buildAssistantPrefillPackage({
      intent: "fusion_outfit",
      message: "jas op mij",
      actionId: "create_fusion",
      understoodKey: "assistant.understood.fusionOutfit",
      routeContext: {},
    })!;
    const steps = [
      ["person_photo", "ready"],
      ["outfit_photo", "ready"],
      ["clothing_only", "yes"],
    ] as const;
    for (const [questionId, answer] of steps) {
      pkg = applyPrefillAnswer(pkg, questionId, answer);
    }
    assert.equal(pkg.readiness, "ready_to_open");
    assert.equal(pkg.providerCalls, 0);
    assert.equal(pkg.creditsConsumed, 0);
  });

  it("orchestrator opens wizard only after review via proposal readiness gate", () => {
    const snapshot = buildAssistantContextSnapshot({ projects: [], libraryRecords: [] });
    const turn = processAssistantTurn({
      message: "Zet deze jas op mij maar verander mijn gezicht niet",
      memory: createAssistantSessionMemory(),
      snapshot,
    });
    const proposal = turn.messages.find((m) => m.proposal)?.proposal;
    assert.ok(proposal?.prefillPackage);
    assert.equal(proposal.prefillPackage.readiness, "waiting_for_answer");
    assert.equal(proposal.autoExecute, false);
  });

  it("prefill route includes prefillId query param", () => {
    const route = buildAssistantPrefillRoute("/studio/characters/motion-ready", "prefill-123");
    assert.match(route, /prefillId=prefill-123/);
  });

  it("motion wizard apply reads character prefill answers", () => {
    const pkg = buildAssistantPrefillPackage({
      intent: "character_motion_ready",
      message: "selfie voor animatie",
      actionId: "prepare_motion_character",
      understoodKey: "assistant.understood.motionReadyCharacter",
      routeContext: {},
    })!;
    const answered = applyPrefillAnswer(
      applyPrefillAnswer(pkg, "body_style", "cartoon"),
      "pose",
      "friendly"
    );
    const next = applyAssistantPrefillToMotionWizard(createEmptyMotionReadyWizardState(), answered);
    assert.equal(next.answers.bodyStyle, "mascot_cartoon");
    assert.equal(next.answers.pose, "friendly");
  });

  it("activity panel steps are present on prefill package", () => {
    const pkg = buildAssistantPrefillPackage({
      intent: "fusion_outfit",
      message: "outfit",
      actionId: "create_fusion",
      understoodKey: "assistant.understood.fusionOutfit",
      routeContext: {},
    })!;
    assert.ok(pkg.activitySteps.some((step) => step.labelKey === "assistant.prefill.activity.intent"));
    assert.ok(pkg.activitySteps.some((step) => step.labelKey === "assistant.prefill.activity.review"));
  });

  it("tryResolvePrefillAnswerFromMessage maps natural answers", () => {
    const pkg = buildAssistantPrefillPackage({
      intent: "character_motion_ready",
      message: "animatie personage",
      actionId: "prepare_motion_character",
      understoodKey: "assistant.understood.motionReadyCharacter",
      routeContext: {},
    })!;
    const resolved = tryResolvePrefillAnswerFromMessage(pkg, "realistisch");
    assert.ok(resolved);
    assert.equal(resolved?.questionId, "body_style");
  });

  it("character new prompt builds ready prefill for characters/new wizard", () => {
    const detect = detectAssistantPrefillIntent("nieuw personage maken");
    assert.equal(detect.kind, "prefill");
    if (detect.kind !== "prefill") {
      return;
    }
    const pkg = buildAssistantPrefillPackage({
      intent: detect.intent,
      message: "nieuw personage maken",
      actionId: detect.actionId,
      understoodKey: detect.understoodKey,
      routeContext: {},
    });
    assert.ok(pkg);
    assert.equal(pkg?.readiness, "ready_to_open");
    assert.match(pkg?.targetRoute ?? "", /\/studio\/characters\/new/);
  });

  it("fusion bootstrap merges protection settings into fusion output", () => {
    const settings = buildFusionSettingsFromAssistantBootstrap("outfit_from_reference", {
      prefillId: "test",
      outputSettings: { protectFace: true, clothingOnly: true },
      protectionSettings: { protectFace: true },
    });
    assert.equal(settings.protectFace, true);
    assert.equal(settings.clothingOnly, true);
  });
});
