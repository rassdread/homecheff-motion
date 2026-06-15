import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAssistantContextSnapshot,
  validateAssistantProjectLifecycleCoverage,
  validateLibraryRecordsLinkedToProjects,
} from "@/lib/assistant-context-layer";
import { createHcProjectForModule, transitionHcProjectWorkflowStatus } from "@/lib/hc-project-lifecycle";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";

function mockLibraryRecord(
  partial: Partial<LibraryConsistencyRecord> & Pick<LibraryConsistencyRecord, "registryAssetId">
): LibraryConsistencyRecord {
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
  };
}

describe("assistant context layer", () => {
  it("builds project, storyboard, and library slices from existing indexes", () => {
    const project = createHcProjectForModule({
      sourceModule: "studio",
      title: "Story Alpha",
      workflowStatus: "motion_ready",
    });
    project.servicePayload = {
      ...project.servicePayload,
      studio: { storyboardId: "sb-1" },
    };

    const records: LibraryConsistencyRecord[] = [
      mockLibraryRecord({
        registryAssetId: "char-1",
        generationType: "character",
        category: "characters",
        projectId: project.id,
      }),
      mockLibraryRecord({
        registryAssetId: "vid-1",
        generationType: "motion_output",
        category: "video",
        projectId: project.id,
      }),
      mockLibraryRecord({
        registryAssetId: "exp-1",
        generationType: "publish_export",
        category: "exports",
        projectId: project.id,
      }),
      mockLibraryRecord({
        registryAssetId: "fus-1",
        generationType: "editor_variant",
        category: "images",
        fusionArchetype: "campaign_variant",
        projectId: project.id,
      }),
    ];

    const snapshot = buildAssistantContextSnapshot({
      projects: [project],
      libraryRecords: records,
    });

    assert.equal(snapshot.projects.length, 1);
    assert.equal(snapshot.projects[0]?.workflowStatus, "motion_ready");
    assert.equal(snapshot.storyboards.length, 1);
    assert.equal(snapshot.storyboards[0]?.storyboardId, "sb-1");
    assert.equal(snapshot.library.characters.length, 1);
    assert.equal(snapshot.library.motionVideos.length, 1);
    assert.equal(snapshot.library.publishExports.length, 1);
    assert.equal(snapshot.library.fusionOutputs.length, 1);
    assert.equal(snapshot.library.assets.length, 4);
  });

  it("filters context by project id and text search", () => {
    const alpha = createHcProjectForModule({ sourceModule: "studio", title: "Alpha" });
    const beta = createHcProjectForModule({ sourceModule: "motion", title: "Beta Motion" });

    const snapshot = buildAssistantContextSnapshot({
      projects: [alpha, beta],
      libraryRecords: [],
      query: { textSearch: "alpha", limit: 10 },
    });

    assert.equal(snapshot.projects.length, 1);
    assert.equal(snapshot.projects[0]?.title, "Alpha");
  });

  it("validates workflow status coverage", () => {
    const project = createHcProjectForModule({ sourceModule: "editor", title: "Editor" });
    const exported = transitionHcProjectWorkflowStatus(project, "exported");
    const result = validateAssistantProjectLifecycleCoverage([exported]);
    assert.equal(result.ok, true);
  });

  it("flags library records without matching projects", () => {
    const project = createHcProjectForModule({ sourceModule: "studio", title: "Linked" });
    const records = [
      mockLibraryRecord({ registryAssetId: "ok-1", projectId: project.id }),
      mockLibraryRecord({ registryAssetId: "orphan-1", projectId: "missing-project" }),
    ];
    const result = validateLibraryRecordsLinkedToProjects(records, new Set([project.id]));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.deepEqual(result.orphanAssetIds, ["orphan-1"]);
    }
  });
});
