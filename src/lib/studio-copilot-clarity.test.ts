import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCopilotClarityDecision,
  COPILOT_CLARITY_LIMITS,
  userRequestedAllOptions,
} from "@/lib/assistant-copilot-decision-engine";
import { buildAssistantV3CopilotResponse } from "@/lib/assistant-v3-intelligence";
import { enhanceAssistantV4Response, processAssistantV4Turn } from "@/lib/assistant-v4-intelligence";
import { buildAssistantContextSnapshot } from "@/lib/assistant-context-layer";
import { buildAssistantStudioContext } from "@/lib/assistant-studio-brain";
import { createAssistantSessionMemory } from "@/lib/assistant-session-memory";
import {
  readStudioCopilotExpertMode,
  writeStudioCopilotExpertMode,
  STUDIO_COPILOT_EXPERT_MODE_KEY,
} from "@/lib/studio-copilot-expert-mode-storage";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";

function editorTurnInput(message: string, editorContext: Record<string, unknown> = {}) {
  const snapshot = buildAssistantContextSnapshot({ projects: [], libraryRecords: [] });
  const studio = buildAssistantStudioContext({ pathname: "/editor", snapshot });
  return {
    message,
    locale: "nl" as const,
    memory: createAssistantSessionMemory(),
    snapshot,
    studio,
    activeProject: null,
    pathname: "/editor",
    editorContext: { module: "editor" as const, ...editorContext },
    billingContext: { walletAvailableCredits: 500 },
  };
}

describe("studio copilot clarity mode", () => {
  it("default response shows max 3 primary actions", () => {
    const input = editorTurnInput("maak zijn ogen groter", {
      selectedAssetName: "Globe Man",
      selectedAssetType: "mascot",
      selectedPartName: "Ogen",
      selectedPartGroup: "eyes",
    });
    const turn = processAssistantV4Turn(input);
    const clarity = turn.v3Response?.clarityPresentation?.decision;
    assert.ok(clarity);
    assert.ok(clarity!.primaryActions.length <= COPILOT_CLARITY_LIMITS.maxPrimary);
  });

  it("default response shows max 1 warning in insights slice", () => {
    const input = editorTurnInput("maak hem vrolijker", {
      selectedAssetName: "Globe Man",
      selectedAssetType: "mascot",
    });
    const turn = processAssistantV4Turn(input);
    assert.ok(turn.v3Response?.clarityPresentation);
    const warnings = turn.v3Response!.insights.filter((i) => i.severity === "warning");
    assert.ok(warnings.length <= COPILOT_CLARITY_LIMITS.maxWarningsDefault);
  });

  it("more options expands when user asks alle opties", () => {
    assert.equal(userRequestedAllOptions("toon alle opties"), true);
    const input = editorTurnInput("toon alle opties voor Globe Man", {
      selectedAssetName: "Globe Man",
      selectedAssetType: "mascot",
    });
    const v3 = buildAssistantV3CopilotResponse(input);
    const v4 = enhanceAssistantV4Response(v3, input);
    assert.equal(v4.clarityPresentation?.decision.showAllOptions, true);
  });

  it("expert mode storage defaults off and persists", () => {
    writeStudioCopilotExpertMode(false);
    assert.equal(readStudioCopilotExpertMode(), false);
    writeStudioCopilotExpertMode(true);
    assert.equal(readStudioCopilotExpertMode(), true);
    writeStudioCopilotExpertMode(false);
    assert.equal(STUDIO_COPILOT_EXPERT_MODE_KEY, "homecheff:studio-copilot-expert-mode");
  });

  it("editor mode prioritizes selected part in context header", () => {
    const input = editorTurnInput("maak ogen groter", {
      selectedAssetName: "Globe Man",
      selectedPartName: "Ogen",
    });
    const v3 = buildAssistantV3CopilotResponse(input);
    const v4 = enhanceAssistantV4Response(v3, input);
    const header = v4.clarityPresentation?.decision.contextHeaderNl ?? "";
    assert.match(header, /Globe Man/);
    assert.match(header, /Ogen actief/);
    assert.equal(v4.clarityPresentation?.decision.mode, "editor");
  });

  it("producer mode prioritizes readiness next step", () => {
    const snapshot = buildAssistantContextSnapshot({
      projects: [
        {
          id: "p1",
          title: "Demo",
          workflowStatus: "draft",
          assetStats: { characterCount: 1, videoCount: 2, exportCount: 0 },
        } as never,
      ],
      libraryRecords: [],
    });
    const input = {
      ...editorTurnInput("help finish project"),
      pathname: "/projects/p1",
      activeProject: snapshot.projects[0],
      snapshot,
      studio: buildAssistantStudioContext({ pathname: "/projects/p1", snapshot, projectId: "p1" }),
    };
    const v3 = buildAssistantV3CopilotResponse({ ...input, message: "finish my video project" });
    const v4 = enhanceAssistantV4Response(v3, input);
    const rec = v4.clarityPresentation?.decision.recommendationNl ?? "";
    assert.match(rec, /Ik raad aan|beste volgende actie/i);
  });

  it("clarity recommendation uses direct language not robotic phrases", () => {
    const input = editorTurnInput("maak hem vrolijker", {
      selectedAssetName: "Globe Man",
      selectedAssetType: "mascot",
    });
    const turn = processAssistantV4Turn(input);
    const text = `${turn.v3Response?.openingLine ?? ""} ${turn.v3Response?.body ?? ""}`;
    assert.doesNotMatch(text, /help with that|select a workflow|what direction|Ik kan je helpen/i);
    assert.match(text, /Ik raad aan/i);
  });

  it("secondary groups capped at 6", () => {
    const input = editorTurnInput("Globe Man", {
      selectedAssetName: "Globe Man",
      selectedAssetType: "mascot",
      taxonomyType: "mascot",
    });
    const v3 = buildAssistantV3CopilotResponse(input);
    const v4 = enhanceAssistantV4Response(v3, input);
    const groups = v4.clarityPresentation?.decision.secondaryGroups ?? [];
    assert.ok(groups.length <= COPILOT_CLARITY_LIMITS.maxSecondaryGroups);
  });

  it("buildCopilotClarityDecision includes expert details", () => {
    const input = editorTurnInput("maak ogen groter", {
      selectedAssetName: "Globe Man",
      selectedPartName: "Ogen",
    });
    const v3 = buildAssistantV3CopilotResponse(input);
    const v4 = enhanceAssistantV4Response(v3, input);
    const decision = buildCopilotClarityDecision(v4, input);
    assert.ok(decision.expertDetails);
    assert.ok(Array.isArray(decision.expertDetails.fullActionGroups));
  });

  it("mascot editor mode exposes grouped secondary options", () => {
    const input = editorTurnInput("Globe Man garden outfit", {
      selectedAssetName: "Globe Man",
      selectedAssetType: "mascot",
      taxonomyType: "mascot",
    });
    const v3 = buildAssistantV3CopilotResponse(input);
    const v4 = enhanceAssistantV4Response(v3, input);
    const groups = v4.clarityPresentation?.decision.secondaryGroups ?? [];
    const labels = groups.map((g) => g.labelNl);
    assert.ok(labels.some((l) => /Expressie|Outfit|Pose/i.test(l)));
  });

  it("clarity i18n keys exist in nl and en", () => {
    const keys = [
      "assistant.clarity.moreOptions",
      "assistant.clarity.expertMode",
      "assistant.clarity.expertTitle",
      "assistant.clarity.toolMatch",
      "assistant.clarity.parts",
      "assistant.clarity.preserve",
      "assistant.clarity.alternatives",
      "assistant.clarity.productionSteps",
    ] as const;
    for (const key of keys) {
      assert.ok(nl[key], `missing nl key ${key}`);
      assert.ok(en[key], `missing en key ${key}`);
    }
  });
});
