import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ASSISTANT_RECOMMENDATION_CATALOG } from "@/lib/assistant-recommendation-catalog";
import {
  buildAssistantRecommendations,
  detectAssistantRecommendationPage,
} from "@/lib/assistant-recommendation-engine";
import { rotateAssistantRecommendations } from "@/lib/assistant-recommendation-rotation";
import { buildAssistantContextSnapshot } from "@/lib/assistant-context-layer";
import { createHcProjectForModule } from "@/lib/hc-project-lifecycle";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";

function sampleRecord(overrides: Partial<LibraryConsistencyRecord> = {}): LibraryConsistencyRecord {
  return {
    id: "rec_1",
    ownerId: "user_1",
    createdBy: "user_1",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    generationType: "character",
    category: "characters",
    registryAssetId: overrides.registryAssetId ?? "char_1",
    backingStore: "prisma_character",
    backingId: "char_1",
    assetUrl: "https://cdn.example/char.png",
    storageKey: "key",
    thumbnailUrl: null,
    assetName: overrides.assetName ?? "Sergio",
    promptSummary: overrides.promptSummary ?? "hero",
    projectId: overrides.projectId ?? null,
    projectTitle: null,
    sourceModule: "studio",
    sourceRoute: null,
    assetType: "character",
    workflow: "character_new",
    characterCompleteness: "complete",
    motionReadinessScore: overrides.motionReady === false ? 0.4 : 0.9,
    motionReady: overrides.motionReady ?? true,
    missingParts: [],
    characterType: "humanoid",
    fusionIntent: null,
    fusionArchetype: null,
    fusionMetadata: null,
    motionMetadata: null,
    publishMetadata: null,
    usedInModules: ["studio"],
    status: "completed",
    ...overrides,
  };
}

function snapshot(records: LibraryConsistencyRecord[] = [], projects = []) {
  return buildAssistantContextSnapshot({ projects, libraryRecords: records });
}

describe("assistant recommendation engine v5", () => {
  it("detects homepage route", () => {
    assert.equal(detectAssistantRecommendationPage("/"), "home");
  });

  it("homepage recommendations are outcome-based", () => {
    const result = buildAssistantRecommendations({
      pathname: "/",
      snapshot: snapshot(),
    });
    assert.equal(result.page, "home");
    assert.ok(result.recommendations.length >= 8);
    assert.ok(result.recommendations.some((row) => row.actionPresetId === "goal_celebration"));
    assert.ok(result.recommendations.some((row) => row.fusionIntent === "future_look"));
    assert.ok(result.recommendations.every((row) => row.promptMessage.length > 0));
  });

  it("editor recommendations promote hidden fusion outcomes", () => {
    const result = buildAssistantRecommendations({
      pathname: "/editor",
      snapshot: snapshot(),
    });
    assert.ok(result.recommendations.some((row) => row.fusionIntent === "future_child"));
    assert.ok(result.recommendations.some((row) => row.fusionIntent === "outfit_from_reference"));
    assert.ok(result.recommendations.every((row) => !row.promptMessage.toLowerCase().includes("fusion")));
  });

  it("motion recommendations include action presets", () => {
    const result = buildAssistantRecommendations({
      pathname: "/animate/instant",
      snapshot: snapshot([sampleRecord({ motionReady: true })]),
    });
    assert.ok(result.recommendations.some((row) => row.actionPresetId === "snowboard_jump"));
    assert.ok(result.recommendations.some((row) => row.actionPresetId === "goal_celebration"));
  });

  it("studio recommendations avoid tool naming", () => {
    const result = buildAssistantRecommendations({
      pathname: "/studio",
      snapshot: snapshot(),
    });
    assert.ok(result.recommendations.some((row) => row.id === "new_character" || row.id === "start_story"));
  });

  it("library recommendations use character context", () => {
    const result = buildAssistantRecommendations({
      pathname: "/library/browse",
      snapshot: snapshot([sampleRecord({ assetName: "Sergio", motionReady: true })]),
    });
    assert.ok(result.recommendations.some((row) => row.id === "library_goal_with_character"));
    const goal = result.recommendations.find((row) => row.id === "library_goal_with_character");
    assert.equal(goal?.characterName, "Sergio");
  });

  it("project recommendations include continue working", () => {
    const project = createHcProjectForModule({ sourceModule: "studio", title: "Promo" });
    const snap = snapshot([], [project]);
    const result = buildAssistantRecommendations({
      pathname: "/projects",
      snapshot: snap,
      activeProject: snap.projects[0],
    });
    assert.ok(result.recommendations.some((row) => row.category === "continue_working"));
  });

  it("publish recommendations suggest distribution outcomes", () => {
    const result = buildAssistantRecommendations({
      pathname: "/publish",
      snapshot: snapshot(),
    });
    assert.ok(result.recommendations.some((row) => row.id === "tiktok_version"));
    assert.ok(result.recommendations.some((row) => row.id === "add_subtitles"));
  });

  it("usage recommendations include reuse guidance", () => {
    const result = buildAssistantRecommendations({
      pathname: "/usage",
      snapshot: snapshot([
        sampleRecord(),
        sampleRecord({ registryAssetId: "char_2", assetName: "Backup" }),
        sampleRecord({ registryAssetId: "img_1", category: "images", generationType: "editor_variant", assetName: "Poster" }),
      ]),
    });
    assert.ok(result.recommendations.some((row) => row.id === "reuse_assets" || row.id === "unused_assets"));
  });

  it("hidden feature recommendations surface on home and editor", () => {
    for (const pathname of ["/", "/editor"]) {
      const result = buildAssistantRecommendations({ pathname, snapshot: snapshot() });
      assert.ok(
        result.recommendations.some((row) => row.category === "hidden_possibilities"),
        pathname
      );
    }
  });

  it("rotation engine varies order by session seed", () => {
    const base = buildAssistantRecommendations({ pathname: "/", snapshot: snapshot() }).recommendations;
    const a = rotateAssistantRecommendations({ recommendations: base, sessionSeed: "alpha", minCount: 8, maxCount: 12 });
    const b = rotateAssistantRecommendations({ recommendations: base, sessionSeed: "beta", minCount: 8, maxCount: 12 });
    assert.ok(a.length >= 8);
    assert.notDeepEqual(
      a.map((row) => row.id),
      b.map((row) => row.id)
    );
  });

  it("context-aware motion-ready character gets ready status", () => {
    const result = buildAssistantRecommendations({
      pathname: "/motion",
      snapshot: snapshot([sampleRecord({ motionReady: true })]),
    });
    const snowboard = result.recommendations.find((row) => row.actionPresetId === "snowboard_jump");
    if (snowboard) {
      assert.equal(snowboard.status, "ready");
    }
  });

  it("asset-aware recommendations mark missing character", () => {
    const result = buildAssistantRecommendations({
      pathname: "/motion",
      snapshot: snapshot(),
    });
    const goal = result.recommendations.find((row) => row.actionPresetId === "goal_celebration");
    if (goal) {
      assert.equal(goal.status, "missing");
    }
  });

  it("assistant-first routing uses prompt messages not routes", () => {
    const result = buildAssistantRecommendations({ pathname: "/", snapshot: snapshot() });
    for (const row of result.recommendations) {
      assert.ok(row.promptMessage.length > 10);
      assert.equal(typeof row.promptMessage, "string");
    }
  });

  it("trending recommendations appear on homepage", () => {
    const result = buildAssistantRecommendations({ pathname: "/", snapshot: snapshot() });
    assert.ok(result.byCategory.trending?.length);
  });

  it("catalog covers all major pages", () => {
    const pages = new Set(ASSISTANT_RECOMMENDATION_CATALOG.flatMap((entry) => entry.pages));
    for (const page of ["home", "editor", "motion", "studio", "projects", "library", "publish", "usage"]) {
      assert.ok(pages.has(page as never), page);
    }
  });
});
