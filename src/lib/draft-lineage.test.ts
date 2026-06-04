import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDraftLineage,
  formatDraftLineageShort,
} from "@/lib/draft-lineage";
import { formatMotionVersionLabel, parseVersionQueryParam } from "@/lib/motion-version-display";
import { resolveProjectBundleGroupKey } from "@/lib/project-display-title";
import { appendBundleAuditEntry, parseBundleAuditJson } from "@/lib/bundle-audit";

describe("draft-lineage", () => {
  it("builds lineage metadata for concept cards", () => {
    const lineage = buildDraftLineage({
      sourceProjectId: "src-1",
      sourceProjectTitle: "HomeCheff Affiliate",
      sourceLanguage: "nl",
      sourceVersion: 2,
      sourceVersionNote: "Better intro",
      copiedAt: "2026-06-01T12:00:00.000Z",
      locale: "en",
    });
    assert.ok(lineage);
    assert.equal(lineage!.sourceProjectTitle, "HomeCheff Affiliate");
    assert.equal(lineage!.sourceLanguageLabel, "NL");
    assert.equal(lineage!.sourceVersion, 2);
    assert.equal(lineage!.nextVersionNumber, 3);
    assert.match(formatDraftLineageShort(lineage!, "en"), /Based on: NL v2/);
  });
});

describe("bundle grouping", () => {
  it("groups by bundleKey when set", () => {
    const a = resolveProjectBundleGroupKey({
      ownerId: "u1",
      projectType: "instant_premium",
      title: "Other Title",
      bundleKey: "campaign-a",
    });
    const b = resolveProjectBundleGroupKey({
      ownerId: "u1",
      projectType: "instant_premium",
      title: "Different",
      bundleKey: "campaign-a",
    });
    assert.equal(a, b);
  });

  it("falls back to bundleName then title", () => {
    const byName = resolveProjectBundleGroupKey({
      ownerId: "u1",
      projectType: "instant_premium",
      title: "X",
      bundleName: "Affiliate Campaign",
    });
    const sameName = resolveProjectBundleGroupKey({
      ownerId: "u1",
      projectType: "instant_premium",
      title: "Y",
      bundleName: "affiliate   campaign",
    });
    assert.equal(byName, sameName);
  });
});

describe("version display and deep links", () => {
  it("shows VN when no note exists", () => {
    assert.equal(formatMotionVersionLabel(3, null, "en"), "V3");
    assert.equal(formatMotionVersionLabel(3, "Better intro", "en"), "V3 — Better intro");
  });

  it("parses ver=v3 from URL params", () => {
    assert.deepEqual(parseVersionQueryParam("v3"), { versionNumber: 3, selectionKey: null });
    assert.deepEqual(parseVersionQueryParam("render:abc"), {
      versionNumber: null,
      selectionKey: "render:abc",
    });
  });
});

describe("bundle audit", () => {
  it("stores version note edit events", () => {
    const rows = appendBundleAuditEntry(null, {
      type: "version_note",
      userId: "user-1",
      before: "old",
      after: "new note",
    });
    assert.equal(rows.length, 1);
    assert.equal(parseBundleAuditJson(rows)[0]?.type, "version_note");
  });
});
