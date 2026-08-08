/**
 * S.5 projects / asset library — pure contracts + search + source gates.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assetMatchesLibraryQuery,
  filterLibraryAssetsByQuery,
  paginateItems,
} from "@/lib/studio-library-search";
import {
  STUDIO_LIBRARY_ASSET_FAMILIES,
  STUDIO_FAVORITE_TARGET_KINDS,
  STUDIO_PROMPT_PRESET_SCOPES,
  familyForGenerationCapability,
  isStudioLibraryAssetFamily,
} from "@/lib/studio-library-types";

describe("S.5 library families", () => {
  it("covers core asset families", () => {
    for (const family of [
      "image",
      "video",
      "voice",
      "music",
      "character",
      "location",
      "brand",
      "prompt_preset",
      "upload",
    ]) {
      assert.ok(isStudioLibraryAssetFamily(family), family);
    }
    assert.ok(STUDIO_LIBRARY_ASSET_FAMILIES.length >= 12);
  });

  it("maps generation capabilities to families", () => {
    assert.equal(familyForGenerationCapability("IMAGE_GENERATE"), "image");
    assert.equal(familyForGenerationCapability("VOICE_TTS"), "voice");
    assert.equal(familyForGenerationCapability("VIDEO_GENERATE"), "video");
    assert.equal(familyForGenerationCapability("FUSION_RENDER"), "video");
    assert.equal(familyForGenerationCapability("MUSIC_GENERATE"), "music");
  });

  it("defines favorite + prompt preset scopes", () => {
    assert.ok(STUDIO_FAVORITE_TARGET_KINDS.includes("brand_kit"));
    assert.ok(STUDIO_PROMPT_PRESET_SCOPES.includes("project"));
    assert.ok(STUDIO_PROMPT_PRESET_SCOPES.includes("user"));
  });
});

describe("S.5 smart search", () => {
  const sample = [
    {
      id: "1",
      title: "Pizza hero still",
      description: "Restaurant campaign",
      family: "image",
      tags: ["tiktok", "food"],
      promptSummary: "cinematic drone over pizza",
      language: "English",
      durationSeconds: 8,
    },
    {
      id: "2",
      title: "Woman in red jacket",
      family: "character",
      tags: ["wardrobe"],
      promptSummary: "",
    },
    {
      id: "3",
      title: "Voice EN host",
      family: "voice",
      language: "English",
      tags: ["voice"],
    },
  ];

  it("matches pizza / cinematic / tiktok tokens", () => {
    assert.equal(assetMatchesLibraryQuery(sample[0]!, "pizza"), true);
    assert.equal(assetMatchesLibraryQuery(sample[0]!, "cinematic"), true);
    assert.equal(assetMatchesLibraryQuery(sample[0]!, "TikTok"), true);
    assert.equal(assetMatchesLibraryQuery(sample[0]!, "8 seconds"), true);
  });

  it("requires all tokens", () => {
    assert.equal(assetMatchesLibraryQuery(sample[0]!, "pizza voice"), false);
    assert.equal(assetMatchesLibraryQuery(sample[2]!, "voice English"), true);
  });

  it("filters + paginates without full dump", () => {
    const filtered = filterLibraryAssetsByQuery(sample, "red jacket");
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]!.id, "2");
    const page = paginateItems(sample, { offset: 0, limit: 2 });
    assert.equal(page.items.length, 2);
    assert.equal(page.hasMore, true);
    assert.equal(page.total, 3);
  });
});

describe("S.5 source gates", () => {
  const root = process.cwd();

  it("migration is additive CREATE only", () => {
    const sql = readFileSync(
      join(root, "prisma/migrations/20260809120000_studio_s5_projects_assets_library/migration.sql"),
      "utf8"
    );
    assert.match(sql, /CREATE TABLE "StudioCreativeProject"/);
    assert.match(sql, /CREATE TABLE "StudioLibraryAsset"/);
    assert.match(sql, /CREATE TABLE "StudioBrandKit"/);
    assert.match(sql, /CREATE TABLE "StudioPromptPreset"/);
    assert.doesNotMatch(sql, /\bDROP TABLE\b/i);
    assert.doesNotMatch(sql, /\bALTER TABLE "User" DROP\b/i);
  });

  it("orchestrator indexes successes without rewriting credit policy", () => {
    const orch = readFileSync(
      join(root, "src/server/studio-generation/generation-orchestrator.ts"),
      "utf8"
    );
    assert.match(orch, /registerLibraryAssetFromGeneration/);
    assert.match(orch, /indexSucceededGenerationJob/);
    assert.match(orch, /authorize → execute → capture/);
  });

  it("prompt presets are storage-only (no Prompt Matrix)", () => {
    const preset = readFileSync(
      join(root, "src/server/studio-library/prompt-preset-service.ts"),
      "utf8"
    );
    assert.match(preset, /no Prompt Matrix/);
    assert.doesNotMatch(preset, /optimizePrompt|PromptMatrix/);
  });

  it("safe delete warns on dependencies", () => {
    const svc = readFileSync(
      join(root, "src/server/studio-library/library-asset-service.ts"),
      "utf8"
    );
    assert.match(svc, /has_dependencies/);
    assert.match(svc, /inspectLibraryAssetDependencies/);
  });
});
