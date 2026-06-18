import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAssistantContextSnapshot } from "@/lib/assistant-context-layer";
import { ASSISTANT_TOOL_CAPABILITIES } from "@/lib/assistant-tool-capability-registry";
import { matchAssistantTool, explainNoToolAvailable } from "@/lib/assistant-tool-matcher";
import { buildAssistantStudioContext } from "@/lib/assistant-studio-brain";
import { createAssistantSessionMemory } from "@/lib/assistant-session-memory";
import { processAssistantTurn } from "@/lib/assistant-orchestrator";
import {
  enhanceAssistantV4Response,
  processAssistantV4Turn,
} from "@/lib/assistant-v4-intelligence";
import { buildAssistantV3CopilotResponse } from "@/lib/assistant-v3-intelligence";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";

function libraryRecord(
  partial: Partial<LibraryConsistencyRecord> & { id: string; generationType: LibraryConsistencyRecord["generationType"] }
): LibraryConsistencyRecord {
  return {
    ownerId: "u1",
    createdBy: "u1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: "characters",
    registryAssetId: partial.id,
    backingStore: "prisma_character",
    backingId: partial.id,
    assetUrl: "https://example.com/a.png",
    storageKey: "k",
    thumbnailUrl: null,
    assetName: partial.assetName ?? partial.id,
    promptSummary: null,
    projectId: "proj-v4",
    projectTitle: "Test Video",
    sourceModule: "studio",
    sourceRoute: null,
    assetType: "character",
    workflow: null,
    ...partial,
  } as LibraryConsistencyRecord;
}

function projectLibraryRecords(): LibraryConsistencyRecord[] {
  const chars = Array.from({ length: 3 }, (_, i) =>
    libraryRecord({ id: `char-${i}`, generationType: "character", category: "characters", assetName: `Char ${i}` })
  );
  const videos = Array.from({ length: 8 }, (_, i) =>
    libraryRecord({
      id: `vid-${i}`,
      generationType: "motion_output",
      category: "video",
      assetName: `Scene ${i}`,
      assetType: "video",
    })
  );
  return [...chars, ...videos];
}

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

function projectFixture(): HomeCheffProjectPackage {
  return {
    id: "proj-v4",
    title: "Test Video",
    projectType: "hc",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    servicePayload: {},
    assetStats: { characterCount: 3, videoCount: 8, exportCount: 0 },
  } as unknown as HomeCheffProjectPackage;
}

describe("homecheff assistant v4 production director", () => {
  it("registry includes editor, morph, studio, motion, audio, and publish tools", () => {
    const categories = new Set(ASSISTANT_TOOL_CAPABILITIES.map((t) => t.category));
    assert.ok(categories.has("editor"));
    assert.ok(categories.has("morph"));
    assert.ok(categories.has("studio"));
    assert.ok(categories.has("motion"));
    assert.ok(categories.has("audio"));
    assert.ok(categories.has("publish"));
    assert.ok(ASSISTANT_TOOL_CAPABILITIES.length >= 40);
  });

  it("eyes selected → masked edit tool with enlarge settings and preserve constraints", () => {
    const input = editorTurnInput("maak zijn ogen groter", {
      selectedAssetName: "Globe Man",
      selectedAssetType: "mascot",
      taxonomyType: "mascot",
      selectedPartName: "Ogen",
      selectedPartGroup: "eyes",
    });
    const match = matchAssistantTool({
      message: input.message,
      locale: "nl",
      turnInput: input,
      availableCredits: 500,
    });
    assert.ok(match);
    assert.equal(match!.bestTool.toolId, "editor_masked_edit");
    assert.equal(match!.recommendedSettings.targetPart, "eyes");
    assert.equal(match!.recommendedSettings.operation, "enlarge");
    assert.ok(match!.preserveConstraints.includes("outfit"));
    assert.ok(match!.route.includes("mode=masked"));
  });

  it("outfit selected → outfit change with preserve identity settings", () => {
    const input = editorTurnInput("geef hem een chef outfit", {
      selectedAssetName: "Globe Man",
      selectedAssetType: "mascot",
      selectedPartName: "Outfit",
      selectedPartGroup: "outfit",
    });
    const match = matchAssistantTool({
      message: input.message,
      locale: "nl",
      turnInput: input,
    });
    assert.ok(match);
    assert.equal(match!.bestTool.toolId, "editor_outfit_change");
    assert.equal(match!.recommendedSettings.preserveIdentity, true);
    assert.equal(match!.recommendedSettings.preserveFace, true);
    assert.equal(match!.morphActionId, "outfit_change");
  });

  it("dog mascot request → pet_to_mascot with fur and breed preservation", () => {
    const input = editorTurnInput("maak mijn hond een mascotte", {
      selectedAssetName: "Hond",
      selectedAssetType: "animal",
      taxonomyType: "animal",
    });
    const match = matchAssistantTool({
      message: input.message,
      locale: "nl",
      turnInput: input,
    });
    assert.ok(match);
    assert.equal(match!.bestTool.toolId, "pet_to_mascot");
    assert.equal(match!.recommendedSettings.preserveBreedShape, true);
    assert.equal(match!.recommendedSettings.preserveFurPattern, true);
    assert.equal(match!.recommendedSettings.preserveEyeColor, true);
    assert.ok(match!.route.includes("morph=pet_to_mascot"));
  });

  it("human cartoon with sensitive trait request is blocked", () => {
    const input = editorTurnInput("verander zijn etniciteit naar cartoon", {
      selectedAssetName: "Jan",
      selectedAssetType: "human",
      taxonomyType: "human",
    });
    const match = matchAssistantTool({
      message: input.message,
      locale: "nl",
      turnInput: input,
    });
    assert.ok(match);
    assert.equal(match!.blocked, true);
    assert.match(match!.blockedReason ?? "", /gevoelige|sensitive/i);
  });

  it("Globe Man vrolijker → mascot_expression_morph preserving globe", () => {
    const input = editorTurnInput("maak hem vrolijker", {
      selectedAssetName: "Globe Man",
      selectedAssetType: "mascot",
      taxonomyType: "mascot",
    });
    const turn = processAssistantV4Turn(input);
    assert.equal(turn.handled, true);
    assert.equal(turn.v3Response?.version, 4);
    assert.equal(turn.v3Response?.toolMatch?.bestTool.toolId, "mascot_expression_morph");
    assert.equal(turn.v3Response?.toolMatch?.recommendedSettings.preserveGlobe, true);
    assert.match(turn.v3Response?.openingLine ?? "", /wereldbol|globe|expressie|vrolijker/i);
  });

  it("insufficient credits → preview shows buy and upgrade CTAs", () => {
    const input = editorTurnInput("maak mijn hond een mascotte", {
      selectedAssetName: "Hond",
      selectedAssetType: "animal",
    });
    input.billingContext = { walletAvailableCredits: 12 };
    const turn = processAssistantV4Turn(input);
    const preview = turn.v3Response?.executionPreview;
    assert.ok(preview);
    assert.equal(preview!.sufficientCredits, false);
    assert.ok(preview!.ctas.some((c) => c.id === "buy_credits"));
    assert.ok(preview!.ctas.some((c) => c.id === "upgrade"));
    const warning = turn.v3Response?.clarityPresentation?.decision.defaultWarningNl ?? "";
    assert.match(warning, /12 credits/i);
  });

  it("incomplete project → readiness score and voice-over next step", () => {
    const project = projectFixture();
    const libraryRecords = projectLibraryRecords();
    const snapshot = buildAssistantContextSnapshot({
      projects: [project],
      libraryRecords,
    });
    const studio = buildAssistantStudioContext({ pathname: "/projects", snapshot, projectId: project.id });
    const input = {
      message: "help me finish this project",
      locale: "nl" as const,
      memory: createAssistantSessionMemory({ selectedProjectId: project.id }),
      snapshot,
      studio,
      activeProject: snapshot.projects[0],
      pathname: "/projects",
      billingContext: { walletAvailableCredits: 200 },
    };
    const v3 = buildAssistantV3CopilotResponse({ ...input, message: "finish my video project" });
    const v4 = enhanceAssistantV4Response(v3, input);
    assert.ok(v4.readinessScore);
    assert.ok(v4.readinessScore!.scorePercent > 0);
    assert.ok(v4.readinessScore!.missing.some((m) => m.id === "voice" || m.id === "export"));
    assert.match(v4.readinessScore!.recommendedNextStepNl, /voice|export|Genereer/i);
  });

  it("motion render request → story render settings with preserveCharacters", () => {
    const input = editorTurnInput("render motion video", {
      selectedAssetName: "Scene",
      selectedAssetType: "video",
    });
    input.pathname = "/animate/instant";
    input.activeProject = null;
    const match = matchAssistantTool({
      message: "render my story motion video",
      locale: "en",
      turnInput: { ...input, locale: "en", message: "render my story motion video" },
    });
    assert.ok(match);
    assert.equal(match!.bestTool.toolId, "motion_story_render");
    assert.equal(match!.recommendedSettings.preserveCharacters, true);
    assert.equal(match!.recommendedSettings.mode, "story");
  });

  it("voice missing project insight recommends voice-over through v4 turn", () => {
    const project = projectFixture();
    const libraryRecords = projectLibraryRecords();
    const snapshot = buildAssistantContextSnapshot({ projects: [project], libraryRecords });
    const studio = buildAssistantStudioContext({ pathname: "/projects", snapshot, projectId: project.id });
    const turn = processAssistantV4Turn({
      message: "finish my video project",
      locale: "nl",
      memory: createAssistantSessionMemory({ selectedProjectId: project.id }),
      snapshot,
      studio,
      activeProject: snapshot.projects[0],
      pathname: "/projects",
      billingContext: { walletAvailableCredits: 100 },
    });
    assert.equal(turn.handled, true);
    assert.ok(
      turn.v3Response?.projectInsight?.missing.includes("voice") ||
        turn.v3Response?.readinessScore?.missing.some((m) => m.id === "voice")
    );
    assert.match(
      turn.v3Response?.projectInsight?.recommendedNextStep ??
        turn.v3Response?.readinessScore?.recommendedNextStepNl ??
        "",
      /voice|Voice/i
    );
  });

  it("human cartoon request → human_to_cartoon with identity preservation", () => {
    const input = editorTurnInput("maak een cartoon versie", {
      selectedAssetName: "Jan",
      selectedAssetType: "human",
      taxonomyType: "human",
    });
    const match = matchAssistantTool({
      message: input.message,
      locale: "nl",
      turnInput: input,
    });
    assert.ok(match);
    assert.equal(match!.bestTool.toolId, "human_to_cartoon");
    assert.equal(match!.recommendedSettings.preserveIdentity, true);
    assert.equal(match!.blocked, false);
  });

  it("no tool available → clear explanation", () => {
    const match = matchAssistantTool({
      message: "xyzqwerty unknown nonsense request",
      locale: "nl",
      turnInput: editorTurnInput("xyzqwerty unknown nonsense request", {
        selectedAssetName: "Thing",
        selectedAssetType: "image",
      }),
    });
    assert.equal(match, null);
    assert.match(explainNoToolAvailable("nl", "image"), /geen geschikte tool/i);
  });

  it("orchestrator routes v4 eyes edit with memory and version 4", () => {
    const snapshot = buildAssistantContextSnapshot({ projects: [], libraryRecords: [] });
    const result = processAssistantTurn({
      message: "maak deze blauw",
      memory: createAssistantSessionMemory(),
      snapshot,
      pathname: "/editor",
      editorContext: {
        module: "editor",
        selectedAssetName: "Globe Man",
        selectedAssetType: "mascot",
        selectedPartName: "Ogen",
        selectedPartGroup: "eyes",
      },
      billingContext: { walletAvailableCredits: 300 },
    });
    const v4 = result.messages.find((m) => m.v3Response)?.v3Response;
    assert.ok(v4);
    assert.equal(v4!.version, 4);
    assert.equal(result.memory.v3?.selectedPartName, "Ogen");
  });
});
