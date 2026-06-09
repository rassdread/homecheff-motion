import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyQaAction,
  buildEditorQaItems,
  buildLibraryQaItems,
  buildPublishQaItems,
  summarizeQaItems,
} from "@/lib/professional-qa-layer";
import { createPublishProject } from "@/lib/publish-overlay-session";
import { addPublishOverlay } from "@/lib/publish-overlay-timeline";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";

describe("professional-qa-layer phase 8", () => {
  it("builds editor QA warnings", () => {
    const doc = createEditorDocumentFromUpload({ name: "Q", backgroundUrl: "https://example.com/q.png" });
    const items = buildEditorQaItems(doc);
    assert.ok(Array.isArray(items));
  });

  it("builds publish safe-area warning", () => {
    let project = createPublishProject({ name: "P", videoUrl: "x" });
    project = addPublishOverlay(project, "text");
    const o = project.overlays[0];
    project = {
      ...project,
      overlays: [{ ...o, x: 0.01, safeAreaStatus: "fail" as const }],
    };
    const items = buildPublishQaItems(project);
    assert.ok(items.some((i) => i.messageKey === "qa.publish.safeArea"));
  });

  it("warns on short duration", () => {
    const project = addPublishOverlay(createPublishProject({ name: "P", videoUrl: "x" }), "text");
    project.overlays[0].endTime = 0.3;
    const items = buildPublishQaItems(project);
    assert.ok(items.some((i) => i.messageKey === "qa.publish.shortDuration"));
  });

  it("library badge for low identity", () => {
    const items = buildLibraryQaItems({ identityScore: 45 });
    assert.ok(items.some((i) => i.domain === "library"));
  });

  it("ignore and accept action state", () => {
    const items = [{ id: "a", domain: "editor" as const, severity: "needs_attention" as const, messageKey: "qa.editor.identityLow" }];
    const ignored = applyQaAction({ ignoredIds: [], acceptedIds: [] }, "a", "ignore");
    const summary = summarizeQaItems(items, ignored);
    assert.equal(summary.items.length, 0);
    const accepted = applyQaAction({ ignoredIds: [], acceptedIds: [] }, "a", "accept");
    const summary2 = summarizeQaItems(items, accepted);
    assert.equal(summary2.needsAttentionCount, 0);
  });

  it("QA summary counts", () => {
    const summary = summarizeQaItems([
      { id: "1", domain: "publish", severity: "warning", messageKey: "qa.publish.safeAreaWarning" },
      { id: "2", domain: "publish", severity: "needs_attention", messageKey: "qa.publish.safeArea" },
    ]);
    assert.equal(summary.warningCount, 1);
    assert.equal(summary.needsAttentionCount, 1);
    assert.equal(summary.overall, "needs_attention");
  });
});

describe("suite-flow-handoffs phase 9", () => {
  it("editor save offers next actions", async () => {
    const { buildEditorSaveNextActions } = await import("@/lib/suite-flow-handoffs");
    const actions = buildEditorSaveNextActions({ sessionId: "sess-1" });
    assert.ok(actions.some((a) => a.id === "use-studio"));
    assert.ok(actions.some((a) => a.id === "open-library"));
  });

  it("motion render can open publish", async () => {
    const { buildMotionRenderNextActions } = await import("@/lib/suite-flow-handoffs");
    const actions = buildMotionRenderNextActions({ projectId: "p1", videoUrl: "https://example.com/v.mp4" });
    assert.ok(actions.some((a) => a.href.includes("/publish")));
  });

  it("breadcrumbs resolve", async () => {
    const { resolveSuiteBreadcrumbHref, SUITE_BREADCRUMB_PRODUCTS } = await import("@/lib/suite-flow-handoffs");
    assert.equal(SUITE_BREADCRUMB_PRODUCTS.length, 5);
    assert.equal(resolveSuiteBreadcrumbHref("presentation"), "/publish");
  });
});

describe("suite-productization phase 11", () => {
  it("product modules resolve", async () => {
    const { SUITE_MODULE_IDS, resolveModuleForPath } = await import("@/lib/suite-productization");
    assert.ok(SUITE_MODULE_IDS.includes("suite"));
    assert.equal(resolveModuleForPath("/editor"), "editor");
    assert.equal(resolveModuleForPath("/publish"), "presentation");
  });

  it("plan labels resolve", async () => {
    const { resolvePlanLabelKey } = await import("@/lib/suite-productization");
    assert.equal(resolvePlanLabelKey("editor"), "suite.billing.plan.editor");
  });

  it("feature flags include billing off", async () => {
    const { resolveSuiteFeatureFlags } = await import("@/lib/suite-productization");
    const flags = resolveSuiteFeatureFlags();
    assert.equal(flags.find((f) => f.id === "billing_enforcement")?.enabled, false);
  });
});

describe("suite-acceptance-flows phase 12", () => {
  it("Flow A — upload photo edit draft payload", async () => {
    const { buildEditorSavePayload } = await import("@/lib/editor-canvas-export");
    const { saveEditorCanvasDocument, createEditorDocumentFromUpload } = await import("@/lib/editor-canvas-session");
    const doc = saveEditorCanvasDocument(createEditorDocumentFromUpload({ name: "Photo", backgroundUrl: "https://example.com/p.png" }));
    const payload = buildEditorSavePayload(doc);
    assert.ok(payload.downloadableHint);
    assert.ok(payload.semanticLayers);
  });

  it("Flow D — motion to publish handoff href", async () => {
    const { buildMotionRenderNextActions } = await import("@/lib/suite-flow-handoffs");
    const actions = buildMotionRenderNextActions({ projectId: "m1", videoUrl: "https://example.com/final.mp4" });
    assert.ok(actions.find((a) => a.id === "open-publish")?.href.includes("video="));
  });

  it("Flow E — standalone publish project", () => {
    const project = createPublishProject({ name: "Standalone", videoUrl: "blob:video", source: "standalone" });
    assert.equal(project.source, "standalone");
    const withSub = addPublishOverlay(project, "subtitle");
    assert.ok(withSub.overlays.length >= 1);
  });

  it("Flow F — suite breadcrumb chain", async () => {
    const { SUITE_BREADCRUMB_PRODUCTS, resolveSuiteBreadcrumbLabelKey } = await import("@/lib/suite-flow-handoffs");
    for (const id of SUITE_BREADCRUMB_PRODUCTS) {
      assert.ok(resolveSuiteBreadcrumbLabelKey(id).startsWith("suite.nav."));
    }
  });
});
