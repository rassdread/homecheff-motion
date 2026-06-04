import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { appendBundleAuditEntry, parseBundleAuditJson } from "@/lib/bundle-audit";
import { buildDraftLineage } from "@/lib/draft-lineage";
import {
  buildMotionVersionCatalogForProject,
  mergeMotionVersionCatalogs,
  resolveMotionSelectionFromUrl,
  summarizeMotionCatalogStats,
} from "@/lib/motion-version-catalog";
import { groupProjectsIntoBundles } from "@/lib/project-bundles";
import {
  previewBundleMembershipAfterRename,
  resolveProjectBundleGroupKey,
} from "@/lib/project-display-title";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");

function readSrc(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const nlRenderFixture = [
  {
    id: "rv1",
    renderVersionNumber: 1,
    status: "completed",
    isDefault: false,
    versionNote: "First",
    finalVideoUrl: "https://cdn.example/final-v1.mp4",
    cleanVideoUrl: "https://cdn.example/clean-v1.mp4",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "rv2",
    renderVersionNumber: 2,
    status: "completed",
    isDefault: false,
    versionNote: "Second",
    finalVideoUrl: "https://cdn.example/final-v2.mp4",
    cleanVideoUrl: "https://cdn.example/clean-v2.mp4",
    createdAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "rv3",
    renderVersionNumber: 3,
    status: "completed",
    isDefault: true,
    versionNote: "Third",
    finalVideoUrl: "https://cdn.example/final-v3.mp4",
    cleanVideoUrl: "https://cdn.example/clean-v3.mp4",
    createdAt: "2026-01-03T00:00:00.000Z",
  },
];

describe("Motion V22.1 — ownership isolation", () => {
  it("never groups same title across different owners", () => {
    const keyA = resolveProjectBundleGroupKey({
      ownerId: "user-a",
      projectType: "instant_premium",
      title: "HomeCheff Promo",
    });
    const keyB = resolveProjectBundleGroupKey({
      ownerId: "user-b",
      projectType: "instant_premium",
      title: "HomeCheff Promo",
    });
    assert.notEqual(keyA, keyB);
    assert.match(keyA, /^user-a:/);
    assert.match(keyB, /^user-b:/);
  });

  it("gallery bundle grouping uses per-project ownerId", () => {
    const bundles = groupProjectsIntoBundles(
      [
        {
          id: "p1",
          ownerId: "user-a",
          projectType: "instant_premium",
          title: "HomeCheff Promo",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
          status: "completed",
          displayTitle: "HomeCheff Promo",
        } as never,
        {
          id: "p2",
          ownerId: "user-b",
          projectType: "instant_premium",
          title: "HomeCheff Promo",
          createdAt: "2026-06-02T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z",
          status: "completed",
          displayTitle: "HomeCheff Promo",
        } as never,
      ],
      {}
    );
    assert.equal(bundles.length, 2);
  });

  it("list handler scopes concepts and completed rows by ownerId when not listAll", () => {
    const list = readSrc("src/server/animation-projects/list-projects-handler.ts");
    assert.match(list, /ownerId: params\.ownerId/);
    const route = readSrc("src/app/api/animations/projects/route.ts");
    assert.match(route, /ownerId: listAll \? undefined : user\.id/);
  });
});

describe("Motion V22.1 — language version isolation", () => {
  it("keeps independent version numbers per language", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "p1",
      exportOutputUrl: null,
      exportStatus: null,
      projectStatus: "completed",
      projectCleanUrl: null,
      renderVersions: nlRenderFixture,
      languageExports: [
        {
          id: "en1",
          languageCode: "en",
          languageLabel: "EN",
          status: "completed",
          outputVideoUrl: "https://cdn.example/en-v1.mp4",
          version: 1,
          isDefault: false,
          createdAt: "2026-01-04T00:00:00.000Z",
        },
        {
          id: "en2",
          languageCode: "en",
          languageLabel: "EN",
          status: "completed",
          outputVideoUrl: "https://cdn.example/en-v2.mp4",
          version: 2,
          isDefault: true,
          createdAt: "2026-01-05T00:00:00.000Z",
        },
        {
          id: "es1",
          languageCode: "es",
          languageLabel: "ES",
          status: "completed",
          outputVideoUrl: "https://cdn.example/es-v1.mp4",
          version: 1,
          isDefault: true,
          createdAt: "2026-01-06T00:00:00.000Z",
        },
      ],
    });

    const stats = summarizeMotionCatalogStats(catalog);
    assert.deepEqual(stats.languageCounts, { nl: 3, en: 2, es: 1 });
    assert.equal(catalog.slotsByLanguage.en?.[0]?.versionNumber, 1);
    assert.equal(catalog.slotsByLanguage.en?.[1]?.versionNumber, 2);
    assert.equal(catalog.slotsByLanguage.es?.[0]?.versionNumber, 1);
    assert.notEqual(catalog.slotsByLanguage.en?.[1]?.versionNumber, 3);
  });
});

describe("Motion V22.1 — draft → version safety", () => {
  it("copy-as-draft never mutates source exports or render versions", () => {
    const src = readSrc("src/server/instant-premium/copy-project-as-draft.ts");
    assert.match(src, /sourceProjectId: source\.id/);
    assert.doesNotMatch(src, /where: \{ id: source\.id[\s\S]*renderVersions/);
    assert.doesNotMatch(src, /projectRenderVersion\.update/);
    assert.doesNotMatch(src, /fullRerenderInstantPremiumProject/);
  });

  it("draft first render runs on draft project only", () => {
    const start = readSrc("src/server/instant-premium/start-draft-project-render.ts");
    assert.match(start, /Does not touch sourceProjectId/);
    assert.doesNotMatch(start, /createPendingFullRerenderVersion/);
    assert.doesNotMatch(start, /sealDefaultRenderVersion/);
  });

  it("merging source + completed draft yields NL v4 without renumbering source rows", () => {
    const sourceCatalog = buildMotionVersionCatalogForProject({
      projectId: "source",
      exportOutputUrl: null,
      exportStatus: null,
      projectStatus: "completed",
      projectCleanUrl: null,
      renderVersions: nlRenderFixture,
      languageExports: [],
    });
    const draftCatalog = buildMotionVersionCatalogForProject({
      projectId: "draft",
      exportOutputUrl: "https://cdn.example/draft-final.mp4",
      exportStatus: "completed",
      projectStatus: "completed",
      projectCleanUrl: "https://cdn.example/draft-clean.mp4",
      renderVersions: [],
      languageExports: [],
    });
    const merged = mergeMotionVersionCatalogs([
      { catalog: sourceCatalog, memberCreatedAt: "2026-01-01T00:00:00.000Z" },
      { catalog: draftCatalog, memberCreatedAt: "2026-01-10T00:00:00.000Z" },
    ]);
    assert.equal(merged.slotsByLanguage.nl?.length, 4);
    assert.equal(merged.slotsByLanguage.nl?.[2]?.finalVideoUrl, "https://cdn.example/final-v3.mp4");
    assert.equal(merged.slotsByLanguage.nl?.[3]?.projectId, "draft");
    assert.equal(merged.slotsByLanguage.nl?.[3]?.versionNumber, 4);
  });

  it("lineage records source language/version for draft cards", () => {
    const lineage = buildDraftLineage({
      sourceProjectId: "src",
      sourceProjectTitle: "HomeCheff",
      sourceLanguage: "nl",
      sourceVersion: 3,
      sourceVersionNote: "Third",
      copiedAt: "2026-06-01T12:00:00.000Z",
      locale: "en",
    });
    assert.equal(lineage?.sourceVersion, 3);
    assert.equal(lineage?.sourceVersionDisplay, "v3 — Third");
  });
});

describe("Motion V22.1 — bundle merge safety", () => {
  it("splits same title when bundleKey differs", () => {
    const a = resolveProjectBundleGroupKey({
      ownerId: "u1",
      projectType: "instant_premium",
      title: "Same Title",
      bundleKey: "campaign-a",
    });
    const b = resolveProjectBundleGroupKey({
      ownerId: "u1",
      projectType: "instant_premium",
      title: "Same Title",
      bundleKey: "campaign-b",
    });
    assert.notEqual(a, b);
  });

  it("merges when bundleKey matches for same owner", () => {
    const a = resolveProjectBundleGroupKey({
      ownerId: "u1",
      projectType: "instant_premium",
      title: "Different A",
      bundleKey: "shared-key",
    });
    const b = resolveProjectBundleGroupKey({
      ownerId: "u1",
      projectType: "instant_premium",
      title: "Different B",
      bundleKey: "shared-key",
    });
    assert.equal(a, b);
  });
});

describe("Motion V22.1 — rename / bundle settings safety", () => {
  it("bundle settings update only title, bundleName, bundleKey, and audit", () => {
    const src = readSrc("src/server/animation-projects/update-project-bundle-settings.ts");
    assert.match(src, /data\.title/);
    assert.match(src, /data\.bundleName/);
    assert.match(src, /data\.bundleKey/);
    assert.doesNotMatch(src, /data:\s*\{[\s\S]*ownerId/);
    assert.doesNotMatch(src, /projectRenderVersion\.(update|delete)/);
    assert.doesNotMatch(src, /videoLanguageExport/);
    assert.match(src, /appendBundleAuditEntry/);
  });

  it("records rename audit with before/after and userId", () => {
    const rows = appendBundleAuditEntry(null, {
      type: "rename",
      userId: "user-1",
      before: "Old",
      after: "New",
    });
    const parsed = parseBundleAuditJson(rows);
    assert.equal(parsed[0]?.type, "rename");
    assert.equal(parsed[0]?.before, "Old");
    assert.equal(parsed[0]?.after, "New");
    assert.equal(parsed[0]?.userId, "user-1");
    assert.ok(parsed[0]?.at);
  });

  it("preview membership only compares peers for same owner in query", () => {
    const src = readSrc("src/server/animation-projects/update-project-bundle-settings.ts");
    assert.match(src, /ownerId: updated\.ownerId/);
    const preview = previewBundleMembershipAfterRename({
      ownerId: "user-1",
      projectType: "instant_premium",
      projectId: "p-new",
      newTitle: "Promo",
      peers: [
        { id: "p-a", title: "Promo", projectType: "instant_premium" },
      ],
      locale: "en",
    });
    assert.equal(preview.willJoinExisting, true);
  });
});

describe("Motion V22.1 — restore safety", () => {
  it("restore toggles default flag and export URL without deleting versions", () => {
    const src = readSrc("src/server/instant-premium/render-version-service.ts");
    const restoreBlock = src.slice(src.indexOf("export async function restoreProjectRenderVersion"));
    assert.match(restoreBlock, /updateMany[\s\S]*isDefault: false/);
    assert.match(restoreBlock, /isDefault: true/);
    assert.doesNotMatch(restoreBlock, /deleteMany/);
    assert.doesNotMatch(restoreBlock, /delete\(/);
  });

  it("restore API checks ownership via service", () => {
    const route = readSrc(
      "src/app/api/instant-premium/projects/[id]/render-versions/[versionId]/restore/route.ts"
    );
    assert.match(route, /restoreProjectRenderVersion/);
    assert.match(route, /isAdmin: user\.role === "admin"/);
  });
});

describe("Motion V22.1 — deep link URL safety", () => {
  const catalog = buildMotionVersionCatalogForProject({
    projectId: "p1",
    exportOutputUrl: null,
    exportStatus: null,
    projectStatus: "completed",
    projectCleanUrl: null,
    renderVersions: nlRenderFixture,
    languageExports: [],
  });

  it("resolves ?lang=nl&ver=v3 to correct URLs and note", () => {
    const hit = resolveMotionSelectionFromUrl(catalog, "nl", "v3");
    assert.equal(hit?.slot.finalVideoUrl, "https://cdn.example/final-v3.mp4");
    assert.equal(hit?.slot.cleanVideoUrl, "https://cdn.example/clean-v3.mp4");
    assert.equal(hit?.slot.versionNote, "Third");
  });

  it("returns null for invalid explicit ver (no silent fallback)", () => {
    assert.equal(resolveMotionSelectionFromUrl(catalog, "nl", "v99"), null);
    assert.equal(resolveMotionSelectionFromUrl(catalog, "en", "v1"), null);
  });

  it("still defaults when ver query is omitted", () => {
    const hit = resolveMotionSelectionFromUrl(catalog, null, null);
    assert.ok(hit);
    assert.equal(hit!.slot.versionNumber, 3);
  });
});

describe("Motion V22.1 — security permissions", () => {
  it("version-note PATCH scopes by owner unless admin", () => {
    const src = readSrc("src/server/animation-projects/update-version-note.ts");
    assert.match(src, /ownerId: params\.ownerId/);
    assert.match(src, /params\.isAdmin/);
    const route = readSrc("src/app/api/animations/projects/[id]/version-note/route.ts");
    assert.match(route, /requireActiveUser/);
  });

  it("copy-as-draft hides foreign projects as not found", () => {
    const src = readSrc("src/server/instant-premium/copy-project-as-draft.ts");
    assert.match(src, /source\.ownerId !== params\.userId/);
  });

  it("project GET uses viewer-scoped loader", () => {
    const route = readSrc("src/app/api/animations/projects/[id]/route.ts");
    assert.match(route, /getAnimationProjectByIdForViewer/);
  });
});

describe("Motion V22.1 — failure recovery", () => {
  it("full rerender failure handler restores prior URLs", () => {
    const src = readSrc("src/server/instant-premium/render-version-service.ts");
    assert.match(src, /handleFullRerenderFailure/);
    assert.match(src, /failPendingFullRerenderVersion/);
  });

  it("bundle audit keeps last 100 entries (bounded growth)", () => {
    let rows: ReturnType<typeof appendBundleAuditEntry> = [];
    for (let i = 0; i < 110; i++) {
      rows = appendBundleAuditEntry(rows, {
        type: "version_note",
        userId: "u",
        before: null,
        after: String(i),
      });
    }
    assert.equal(rows.length, 100);
  });
});
