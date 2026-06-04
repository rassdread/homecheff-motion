import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { scanBundleIntegrity, type BundleIntegrityRow } from "@/lib/bundle-integrity-scan";
import { buildDraftLineage } from "@/lib/draft-lineage";
import {
  formatBundleLanguagesLabel,
  isExplicitMotionUrlSelectionInvalid,
  resolveMotionSelectionFromUrl,
} from "@/lib/motion-version-catalog";
import { groupProjectsIntoBundles } from "@/lib/project-bundles";
import { resolveProjectBundleGroupKey } from "@/lib/project-display-title";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");

describe("Motion V22.2 — bundle finalization", () => {
  it("copy-as-draft copies bundleKey and bundleName", () => {
    const src = readFileSync(
      join(repoRoot, "src/server/instant-premium/copy-project-as-draft.ts"),
      "utf8"
    );
    assert.match(src, /bundleKey: source\.bundleKey/);
    assert.match(src, /bundleName: source\.bundleName/);
  });

  it("formats gallery language counts NL (3) · EN (2)", () => {
    const catalog = {
      languages: [
        { code: "nl", label: "NL" },
        { code: "en", label: "EN" },
      ],
      slotsByLanguage: {
        nl: [
          { versionNumber: 1 },
          { versionNumber: 2 },
          { versionNumber: 3 },
        ],
        en: [{ versionNumber: 1 }, { versionNumber: 2 }],
      },
      defaultLanguageCode: "nl",
      defaultSelectionKey: null,
    } as never;
    assert.equal(formatBundleLanguagesLabel(catalog), "NL (3) · EN (2)");
  });

  it("draft lineage includes next version NL v4", () => {
    const lineage = buildDraftLineage({
      sourceProjectId: "src",
      sourceProjectTitle: "HomeCheff Affiliate",
      sourceLanguage: "nl",
      sourceVersion: 3,
      bundleDisplayName: "Affiliate Campaign",
      copiedAt: null,
      locale: "en",
    });
    assert.equal(lineage?.nextVersionNumber, 4);
    assert.equal(lineage?.nextVersionDisplay, "V4");
    assert.equal(lineage?.bundleDisplayName, "Affiliate Campaign");
  });

  it("flags invalid deep link without resolving another version", () => {
    const catalog = {
      languages: [{ code: "nl", label: "NL" }],
      slotsByLanguage: {
        nl: [
          {
            selectionKey: "render:1",
            projectId: "p",
            languageCode: "nl",
            languageLabel: "NL",
            versionNumber: 1,
            versionNote: null,
            displayLabel: "Version 1",
            status: "completed",
            finalVideoUrl: "https://cdn.example/final-v1.mp4",
            cleanVideoUrl: null,
            createdAt: null,
            kind: "render",
          },
        ],
      },
      defaultLanguageCode: "nl",
      defaultSelectionKey: "render:1",
    } as never;
    assert.equal(isExplicitMotionUrlSelectionInvalid(catalog, "nl", "v99"), true);
    assert.equal(resolveMotionSelectionFromUrl(catalog, "nl", "v99"), null);
  });

  it("draft with same bundleKey groups with source", () => {
    const key = resolveProjectBundleGroupKey({
      ownerId: "u1",
      projectType: "instant_premium",
      title: "Draft copy",
      bundleKey: "campaign-2026",
    });
    const sourceKey = resolveProjectBundleGroupKey({
      ownerId: "u1",
      projectType: "instant_premium",
      title: "Original",
      bundleKey: "campaign-2026",
    });
    assert.equal(key, sourceKey);
  });

  it("bundle integrity scan warns on bundleKey mismatch", () => {
    const rows: BundleIntegrityRow[] = [
      {
        id: "src",
        ownerId: "u1",
        projectType: "instant_premium",
        status: "completed",
        title: "Source",
        bundleName: "Campaign",
        bundleKey: "key-a",
        sourceProjectId: null,
      },
      {
        id: "draft",
        ownerId: "u1",
        projectType: "instant_premium",
        status: "draft",
        title: "Draft",
        bundleName: "Campaign",
        bundleKey: "key-b",
        sourceProjectId: "src",
      },
    ];
    const warnings = scanBundleIntegrity(rows);
    assert.ok(warnings.some((w) => w.code === "bundle_key_mismatch"));
  });
});
