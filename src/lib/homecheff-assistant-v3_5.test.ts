import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAssistantContextSnapshot } from "@/lib/assistant-context-layer";
import { buildAssistantEditorContextFromHierarchy } from "@/lib/assistant-editor-context-builder";
import { processAssistantTurn } from "@/lib/assistant-orchestrator";
import { createAssistantSessionMemory } from "@/lib/assistant-session-memory";
import { buildAssistantStudioContext } from "@/lib/assistant-studio-brain";
import {
  auditAssistantV3Response,
  buildAssistantV3CopilotResponse,
  buildDynamicActionGroups,
  processAssistantV3Turn,
  resolveAssistantV3PartContext,
} from "@/lib/assistant-v3-intelligence";
import { buildPartSpecificActionGroups } from "@/lib/assistant-v3-part-actions";
import { resolveEditorAwareMessage } from "@/lib/assistant-v3-pronoun-resolution";
import { answerExpandedStudioKnowledge } from "@/lib/assistant-v3-studio-knowledge";
import type { EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";

function hierarchyFixture(): EditorVisionHierarchyNode[] {
  return [
    {
      id: "face",
      label: "Gezicht",
      category: "part",
      children: [
        {
          id: "eyes",
          label: "Ogen",
          category: "part",
          taxonomyTab: "eyes",
          children: [],
        },
        {
          id: "mouth",
          label: "Mond",
          category: "part",
          taxonomyTab: "mouth",
          children: [],
        },
      ],
    },
    {
      id: "outfit",
      label: "Outfit",
      category: "part",
      taxonomyTab: "outfit",
      children: [],
    },
  ];
}

describe("homecheff assistant v3.5 editor-first context", () => {
  it("builds editor context with selected part and hierarchy path", () => {
    const ctx = buildAssistantEditorContextFromHierarchy({
      document: {
        name: "Globe Man",
        editorFlowMode: "edit",
        visionV6Meta: { taxonomyType: "mascot" },
        visionHierarchy: hierarchyFixture(),
      },
      hierarchy: hierarchyFixture(),
      selectedNodeId: "eyes",
    });
    assert.equal(ctx.selectedAssetName, "Globe Man");
    assert.equal(ctx.selectedPartName, "Ogen");
    assert.equal(ctx.selectedPartGroup, "eyes");
    assert.deepEqual(ctx.selectedHierarchyPath, ["Gezicht", "Ogen"]);
    assert.ok((ctx.visibleHierarchyLabels ?? []).includes("Outfit"));
  });

  it("resolves ze pronoun to eyes when eyes part is selected", () => {
    const resolved = resolveEditorAwareMessage(
      "maak ze groter",
      {
        module: "editor",
        selectedAssetName: "Globe Man",
        selectedPartName: "Ogen",
        selectedPartGroup: "eyes",
      },
      createAssistantSessionMemory()
    );
    assert.match(resolved, /Ogen/i);
    assert.doesNotMatch(resolved, /Globe Man/i);
  });

  it("builds part-specific actions for eyes", () => {
    const groups = buildPartSpecificActionGroups(
      {
        partId: "eyes",
        partName: "Ogen",
        partGroup: "eyes",
        hierarchyPath: ["Globe Man", "Gezicht", "Ogen"],
        assetName: "Globe Man",
      },
      {
        assetId: null,
        assetName: "Globe Man",
        assetType: "mascot",
        assetState: "existing",
        taxonomyType: "mascot",
        selectedParts: ["Gezicht", "Ogen"],
        partContext: null,
      },
      "nl"
    );
    const labels = groups.flatMap((g) => g.actions.map((a) => a.label));
    assert.ok(labels.some((l) => /groter/i.test(l)));
    assert.ok(labels.some((l) => /kleur/i.test(l)));
    assert.ok(labels.some((l) => /cartoon/i.test(l)));
    assert.equal(groups.length, 1);
  });

  it("builds outfit-specific actions when outfit is selected", () => {
    const groups = buildDynamicActionGroups(
      {
        assetId: null,
        assetName: "Globe Man",
        assetType: "mascot",
        assetState: "existing",
        taxonomyType: "mascot",
        selectedParts: ["Outfit"],
        partContext: {
          partId: "outfit",
          partName: "Outfit",
          partGroup: "outfit",
          hierarchyPath: ["Globe Man", "Outfit"],
          assetName: "Globe Man",
        },
      },
      "nl",
      {
        partId: "outfit",
        partName: "Outfit",
        partGroup: "outfit",
        hierarchyPath: ["Globe Man", "Outfit"],
        assetName: "Globe Man",
      }
    );
    const labels = groups.flatMap((g) => g.actions.map((a) => a.label));
    assert.ok(labels.some((l) => /zakelijk/i.test(l)));
    assert.ok(labels.some((l) => /chef/i.test(l)));
    assert.ok(!labels.some((l) => /groter/i.test(l)));
  });

  it("answers world vs location studio knowledge", () => {
    const answer = answerExpandedStudioKnowledge({
      message: "Wat is het verschil tussen een World en een Location?",
      locale: "nl",
    });
    assert.ok(answer);
    assert.match(answer!, /World/i);
    assert.match(answer!, /Location/i);
  });

  it("handles maak ze groter through v3.5 turn with part context", () => {
    const snapshot = buildAssistantContextSnapshot({ projects: [], libraryRecords: [] });
    const studio = buildAssistantStudioContext({ pathname: "/editor", snapshot });
    const turn = processAssistantV3Turn({
      message: "maak ze groter",
      locale: "nl",
      memory: createAssistantSessionMemory(),
      snapshot,
      studio,
      activeProject: null,
      pathname: "/editor",
      editorContext: {
        module: "editor",
        selectedAssetName: "Globe Man",
        selectedAssetType: "mascot",
        taxonomyType: "mascot",
        selectedPartName: "Ogen",
        selectedPartGroup: "eyes",
        selectedHierarchyPath: ["Globe Man", "Gezicht", "Ogen"],
      },
    });
    assert.equal(turn.handled, true);
    assert.equal(turn.v3Response?.version, 3.5);
    assert.equal(turn.v3Response?.reasoningProfile, "editor");
    assert.equal(turn.v3Response?.partContext?.partName, "Ogen");
    assert.match(turn.v3Response?.openingLine ?? "", /Ogen/i);
  });

  it("v3.5 audit scores higher with part and hierarchy context than asset-only", () => {
    const snapshot = buildAssistantContextSnapshot({ projects: [], libraryRecords: [] });
    const studio = buildAssistantStudioContext({ pathname: "/editor", snapshot });
    const editorContext = {
      module: "editor" as const,
      selectedAssetName: "Globe Man",
      selectedAssetType: "mascot" as const,
      taxonomyType: "mascot" as const,
      selectedPartName: "Ogen",
      selectedPartGroup: "eyes",
      selectedHierarchyPath: ["Globe Man", "Gezicht", "Ogen"],
      visibleHierarchyLabels: ["Gezicht", "Ogen", "Outfit"],
    };
    const input = {
      message: "help",
      locale: "nl" as const,
      memory: createAssistantSessionMemory(),
      snapshot,
      studio,
      activeProject: null,
      editorContext,
      pathname: "/editor",
    };
    const v35 = buildAssistantV3CopilotResponse(input);
    const auditV35 = auditAssistantV3Response(v35, input);

    const assetOnly = buildAssistantV3CopilotResponse({
      ...input,
      editorContext: {
        module: "editor",
        selectedAssetName: "Globe Man",
        selectedAssetType: "mascot",
        taxonomyType: "mascot",
      },
    });
    const auditV3 = auditAssistantV3Response(assetOnly, {
      ...input,
      editorContext: {
        module: "editor",
        selectedAssetName: "Globe Man",
        selectedAssetType: "mascot",
        taxonomyType: "mascot",
      },
    });

    assert.ok(auditV35.partAwareness > auditV3.partAwareness);
    assert.ok(auditV35.hierarchyAwareness > auditV3.hierarchyAwareness);
    assert.ok(auditV35.overall >= auditV3.overall);
  });

  it("routes part edit through orchestrator with memory patch", () => {
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
    });
    const v3 = result.messages.find((m) => m.v3Response)?.v3Response;
    assert.ok(v3);
    assert.equal(result.memory.v3?.selectedPartName, "Ogen");
    assert.ok((result.memory.v3?.recentEdits?.length ?? 0) > 0);
  });

  it("builds fur-specific actions for animal coat part", () => {
    const groups = buildPartSpecificActionGroups(
      {
        partId: "dog_fur",
        partName: "Hondenvacht",
        partGroup: "coat",
        hierarchyPath: ["Hond", "Hondenvacht"],
        assetName: "Hond",
      },
      {
        assetId: null,
        assetName: "Hond",
        assetType: "animal",
        assetState: "existing",
        taxonomyType: "animal",
        selectedParts: ["Hondenvacht"],
        partContext: null,
      },
      "nl"
    );
    const labels = groups.flatMap((g) => g.actions.map((a) => a.label));
    assert.ok(labels.some((l) => /kleur/i.test(l)));
    assert.ok(labels.some((l) => /patroon/i.test(l)));
    assert.ok(labels.some((l) => /zachter/i.test(l)));
    assert.ok(labels.some((l) => /cartoon/i.test(l)));
  });

  it("resolveAssistantV3PartContext prefers live editor context over memory", () => {
    const snapshot = buildAssistantContextSnapshot({ projects: [], libraryRecords: [] });
    const studio = buildAssistantStudioContext({ pathname: "/editor", snapshot });
    const part = resolveAssistantV3PartContext(
      {
        message: "",
        locale: "nl",
        memory: createAssistantSessionMemory({
          v3: { selectedPartName: "Mond", selectedPartGroup: "mouth" },
        }),
        snapshot,
        studio,
        activeProject: null,
        editorContext: {
          selectedPartName: "Ogen",
          selectedPartGroup: "eyes",
          selectedHierarchyPath: ["Globe Man", "Ogen"],
        },
      },
      "Globe Man"
    );
    assert.equal(part?.partName, "Ogen");
    assert.equal(part?.partGroup, "eyes");
  });
});
