import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ASSISTANT_ACTION_IDS } from "@/lib/assistant-action-registry";
import { matchAssistantIntent } from "@/lib/assistant-intent-router";
import {
  buildAssistantSnapshotFromClient,
  processAssistantTurn,
} from "@/lib/assistant-orchestrator";
import { buildAssistantActionRoute } from "@/lib/assistant-route-builder";
import {
  createAssistantSessionMemory,
  rememberAssistantProject,
  resolveActiveAssistantProjectId,
} from "@/lib/assistant-session-memory";
import { buildAssistantSuggestions } from "@/lib/assistant-suggestions";
import { buildAssistantContextSnapshot } from "@/lib/assistant-context-layer";
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

describe("homecheff assistant v1", () => {
  it("registry covers all supported assistant actions", () => {
    assert.equal(ASSISTANT_ACTION_IDS.length, 17);
  });

  it("routes character-from-reference intent to canonical wizard", () => {
    const match = matchAssistantIntent("Ik wil een personage maken van deze foto");
    assert.equal(match.kind, "action");
    if (match.kind === "action") {
      assert.equal(match.actionId, "create_character_from_reference");
      assert.match(
        buildAssistantActionRoute(match.actionId),
        /\/studio\/characters\/from-reference/
      );
    }
  });

  it("asks for clarification before routing ambiguous video intent", () => {
    const match = matchAssistantIntent("Ik wil een video maken");
    assert.equal(match.kind, "clarify");
    if (match.kind === "clarify") {
      assert.equal(match.clarification, "video_type");
    }
    const resolved = matchAssistantIntent("verhaal", { pendingClarification: "video_type" });
    assert.equal(resolved.kind, "action");
    if (resolved.kind === "action") {
      assert.equal(resolved.actionId, "create_motion_video");
    }
  });

  it("answers character and motion library queries from context", () => {
    const project = createHcProjectForModule({ sourceModule: "studio", title: "Alpha" });
    const snapshot = buildAssistantContextSnapshot({
      projects: [project],
      libraryRecords: [
        record({ registryAssetId: "c1", assetName: "Chef", generationType: "character" }),
        record({ registryAssetId: "v1", assetName: "Intro", generationType: "motion_output", category: "video" }),
      ],
    });
    const characters = processAssistantTurn({
      message: "Welke personages heb ik?",
      memory: createAssistantSessionMemory(),
      snapshot,
    });
    assert.match(
      JSON.stringify(characters.messages),
      /Chef/
    );
    const videos = processAssistantTurn({
      message: "Welke motion videos heb ik?",
      memory: createAssistantSessionMemory(),
      snapshot,
    });
    assert.match(JSON.stringify(videos.messages), /Intro/);
  });

  it("reports project awareness for active project", () => {
    const project = createHcProjectForModule({
      sourceModule: "studio",
      title: "Story",
      workflowStatus: "motion_ready",
    });
    const snapshot = buildAssistantContextSnapshot({
      projects: [project],
      libraryRecords: [
        record({
          registryAssetId: "c1",
          assetName: "Hero",
          projectId: project.id,
          generationType: "character",
        }),
        record({
          registryAssetId: "f1",
          assetName: "Fusion A",
          projectId: project.id,
          generationType: "editor_variant",
          fusionArchetype: "campaign_variant",
        }),
      ],
    });
    const memory = rememberAssistantProject(createAssistantSessionMemory(), project.id);
    const turn = processAssistantTurn({
      message: "project status",
      memory,
      snapshot,
      urlProjectId: project.id,
    });
    const payload = JSON.stringify(turn.messages);
    assert.match(payload, /motion_ready/);
    assert.match(payload, /"characters":1/);
    assert.match(payload, /"fusion":1/);
  });

  it("proposes wizard launch without auto execution", () => {
    const snapshot = buildAssistantSnapshotFromClient({});
    const turn = processAssistantTurn({
      message: "maak een personage",
      memory: createAssistantSessionMemory(),
      snapshot,
    });
    const proposal = turn.messages.find((message) => message.proposal)?.proposal;
    assert.ok(proposal);
    assert.equal(proposal?.autoExecute, false);
    assert.match(proposal?.route ?? "", /\/studio\/characters\/new/);
  });

  it("keeps session memory for selected project and wizard", () => {
    let memory = createAssistantSessionMemory();
    memory = rememberAssistantProject(memory, "proj-1");
    assert.equal(resolveActiveAssistantProjectId(memory, null), "proj-1");
    assert.equal(resolveActiveAssistantProjectId(memory, "url-proj"), "proj-1");
    assert.equal(resolveActiveAssistantProjectId(createAssistantSessionMemory(), "url-proj"), "url-proj");
  });

  it("builds smart suggestions from metadata", () => {
    const project = createHcProjectForModule({ sourceModule: "studio", title: "Empty" });
    const snap = buildAssistantContextSnapshot({
      projects: [project],
      libraryRecords: [],
    });
    const active = snap.projects[0] ?? null;
    const suggestions = buildAssistantSuggestions({
      snapshot: snap,
      activeProject: active,
      pathname: "/studio",
    });
    assert.ok(suggestions.length > 0);
    assert.ok(suggestions.every((row) => row.promptMessage));
  });
});
