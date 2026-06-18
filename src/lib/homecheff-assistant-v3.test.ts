import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAssistantContextSnapshot } from "@/lib/assistant-context-layer";
import { processAssistantTurn } from "@/lib/assistant-orchestrator";
import { createAssistantSessionMemory } from "@/lib/assistant-session-memory";
import { buildAssistantStudioContext } from "@/lib/assistant-studio-brain";
import {
  auditAssistantV3Response,
  buildAssistantV3CopilotResponse,
  buildDynamicActionGroups,
  processAssistantV3Turn,
  resolveAssistantV3AssetContext,
} from "@/lib/assistant-v3-intelligence";
import { createHcProjectForModule } from "@/lib/hc-project-lifecycle";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";

function record(partial: Partial<LibraryConsistencyRecord> & Pick<LibraryConsistencyRecord, "registryAssetId">) {
  return {
    registryAssetId: partial.registryAssetId,
    assetName: partial.assetName ?? "Asset",
    assetUrl: partial.assetUrl ?? "https://example.com/a.png",
    storageKey: partial.storageKey ?? "key",
    generationType: partial.generationType ?? "character",
    category: partial.category ?? "characters",
    sourceModule: partial.sourceModule ?? "studio",
    projectId: partial.projectId ?? null,
    projectTitle: partial.projectTitle ?? null,
    createdAt: partial.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-01-01T00:00:00.000Z",
    ...partial,
  } satisfies LibraryConsistencyRecord;
}

describe("homecheff assistant v3 intelligence", () => {
  it("resolves Globe Man asset context from editor hint", () => {
    const snapshot = buildAssistantContextSnapshot({ projects: [], libraryRecords: [] });
    const studio = buildAssistantStudioContext({ pathname: "/editor", snapshot, activeProjectId: null });
    const asset = resolveAssistantV3AssetContext({
      message: "wat kan ik aanpassen",
      locale: "nl",
      memory: createAssistantSessionMemory(),
      snapshot,
      studio,
      activeProject: null,
      editorContext: {
        documentName: "Globe Man.png",
        selectedAssetName: "Globe Man",
        selectedAssetType: "mascot",
        taxonomyType: "mascot",
        module: "editor",
      },
    });
    assert.ok(asset);
    assert.equal(asset?.assetName, "Globe Man");
    assert.equal(asset?.taxonomyType, "mascot");
  });

  it("builds grouped mascot actions for Globe Man", () => {
    const groups = buildDynamicActionGroups(
      {
        assetId: null,
        assetName: "Globe Man",
        assetType: "mascot",
        assetState: "existing",
        taxonomyType: "mascot",
        selectedParts: [],
        partContext: null,
      },
      "nl"
    );
    const labels = groups.flatMap((g) => g.actions.map((a) => a.label));
    assert.ok(labels.some((l) => /gezicht/i.test(l)));
    assert.ok(labels.some((l) => /ogen/i.test(l)));
    assert.ok(labels.some((l) => /blij/i.test(l)));
    assert.ok(labels.some((l) => /chef-variant/i.test(l)));
  });

  it("handles project finish request with recommended next step", () => {
    const project = createHcProjectForModule("studio", { title: "Promo video" });
    const records = [
      record({
        registryAssetId: "char_1",
        assetName: "Globe Man",
        generationType: "character",
        projectId: project.id,
      }),
    ];
    const snapshot = buildAssistantContextSnapshot({ projects: [project], libraryRecords: records });
    const activeProject = snapshot.projects[0]!;
    const studio = buildAssistantStudioContext({
      pathname: "/projects",
      snapshot,
      activeProjectId: project.id,
    });
    const turn = processAssistantV3Turn({
      message: "ik wil deze video afmaken",
      locale: "nl",
      memory: createAssistantSessionMemory({ selectedProjectId: project.id }),
      snapshot,
      studio,
      activeProject,
      libraryRecords: records,
    });
    assert.equal(turn.handled, true);
    assert.ok(turn.v3Response?.projectInsight);
    assert.ok(turn.v3Response?.projectInsight?.recommendedNextStep.length > 0);
  });

  it("routes vrolijker pronoun follow-up through orchestrator v3 copilot", () => {
    const snapshot = buildAssistantContextSnapshot({ projects: [], libraryRecords: [] });
    const memory = createAssistantSessionMemory({
      v3: { selectedAssetName: "Globe Man", selectedAssetType: "mascot", taxonomyType: "mascot" },
      conversationMemory: { lastEntities: [], lastCharacter: "Globe Man" },
    });
    const result = processAssistantTurn({
      message: "maak hem vrolijker",
      memory,
      snapshot,
      pathname: "/editor",
      editorContext: {
        selectedAssetName: "Globe Man",
        selectedAssetType: "mascot",
        taxonomyType: "mascot",
        module: "editor",
      },
    });
    const v3 = result.messages.find((m) => m.v3Response)?.v3Response;
    assert.ok(v3);
    assert.match(v3?.openingLine ?? "", /Globe Man/i);
  });

  it("explains Motion vs Studio via studio knowledge", () => {
    const snapshot = buildAssistantContextSnapshot({ projects: [], libraryRecords: [] });
    const studio = buildAssistantStudioContext({ pathname: "/", snapshot });
    const response = buildAssistantV3CopilotResponse({
      message: "Wat is het verschil tussen Motion en Studio?",
      locale: "nl",
      memory: createAssistantSessionMemory(),
      snapshot,
      studio,
      activeProject: null,
    });
    assert.match(response.openingLine, /Studio/i);
    assert.match(response.openingLine, /Motion/i);
  });

  it("builds multi-step plan for animation series", () => {
    const snapshot = buildAssistantContextSnapshot({ projects: [], libraryRecords: [] });
    const studio = buildAssistantStudioContext({ pathname: "/", snapshot });
    const response = buildAssistantV3CopilotResponse({
      message: "ik wil een animatieserie maken",
      locale: "nl",
      memory: createAssistantSessionMemory(),
      snapshot,
      studio,
      activeProject: null,
    });
    assert.ok(response.productionPlan);
    assert.ok((response.productionPlan?.length ?? 0) >= 5);
  });

  it("audit scores asset-aware responses higher than generic", () => {
    const snapshot = buildAssistantContextSnapshot({ projects: [], libraryRecords: [] });
    const studio = buildAssistantStudioContext({ pathname: "/editor", snapshot });
    const rich = buildAssistantV3CopilotResponse({
      message: "help",
      locale: "nl",
      memory: createAssistantSessionMemory(),
      snapshot,
      studio,
      activeProject: null,
      editorContext: { selectedAssetName: "Globe Man", selectedAssetType: "mascot", taxonomyType: "mascot", module: "editor" },
    });
    const audit = auditAssistantV3Response(rich, {
      message: "help",
      locale: "nl",
      memory: createAssistantSessionMemory(),
      snapshot,
      studio,
      activeProject: null,
      editorContext: { selectedAssetName: "Globe Man", selectedAssetType: "mascot", taxonomyType: "mascot", module: "editor" },
    });
    assert.ok(audit.assetAwareness > 0.8);
    assert.ok(audit.languageQuality > 0.7);
    assert.ok(audit.overall > 0.55);
  });
});
