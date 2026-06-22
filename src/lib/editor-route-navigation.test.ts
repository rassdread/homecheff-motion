import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildEditorRouteHref,
  editorRouteQueryNeedsSync,
  editorRouteSearchEquals,
  normalizeEditorRouteUrl,
  replaceEditorRouteIfNeeded,
  resetEditorRouteReplaceGuardForTests,
  safeReplaceEditorRoute,
  shouldReplaceEditorRoute,
} from "@/lib/editor-route-navigation";

describe("editor-route-navigation", () => {
  it("builds canonical editor deep links", () => {
    assert.equal(buildEditorRouteHref({ session: "sess-1" }), "/editor?session=sess-1");
    assert.equal(
      buildEditorRouteHref({ session: "sess-1", hcProject: "hc-1" }),
      "/editor?session=sess-1&hcProject=hc-1"
    );
    assert.equal(buildEditorRouteHref({}), "/editor");
  });

  it("normalizeEditorRouteUrl ignores restoreServer and param order", () => {
    assert.equal(
      normalizeEditorRouteUrl("/editor?restoreServer=1&session=sess-1"),
      "/editor?session=sess-1"
    );
    assert.equal(
      normalizeEditorRouteUrl("/editor?hcProject=hc-1&session=sess-1"),
      "/editor?session=sess-1&hcProject=hc-1"
    );
  });

  it("detects equivalent search params", () => {
    const current = new URLSearchParams("session=sess-1&hcProject=hc-1");
    assert.equal(editorRouteSearchEquals(current, { session: "sess-1", hcProject: "hc-1" }), true);
    assert.equal(editorRouteSearchEquals(current, { session: "other" }), false);
  });

  it("replaceEditorRouteIfNeeded is idempotent for same target", () => {
    resetEditorRouteReplaceGuardForTests();
    const current = new URLSearchParams("session=sess-1");
    let replaceCount = 0;
    const router = {
      replace: () => {
        replaceCount += 1;
      },
    };

    assert.equal(shouldReplaceEditorRoute(current, { session: "sess-1" }), false);
    assert.equal(replaceEditorRouteIfNeeded(router, current, { session: "sess-1" }), false);
    assert.equal(replaceCount, 0);

    assert.equal(replaceEditorRouteIfNeeded(router, current, { session: "sess-1" }), false);
    assert.equal(replaceCount, 0);
  });

  it("same URL does not call replace", () => {
    resetEditorRouteReplaceGuardForTests();
    const router = { replace: () => assert.fail("replace should not run") };
    const current = new URLSearchParams("session=sess-1&hcProject=hc-1");
    assert.equal(
      editorRouteQueryNeedsSync(current, { session: "sess-1", hcProject: "hc-1" }),
      false
    );
    assert.equal(
      replaceEditorRouteIfNeeded(router, current, {
        session: "sess-1",
        hcProject: "hc-1",
      }),
      false
    );
  });

  it("stale hcProject strip target syncs once", () => {
    resetEditorRouteReplaceGuardForTests();
    const current = new URLSearchParams("session=sess-1&hcProject=stale-hc&restoreServer=1");
    assert.equal(
      editorRouteQueryNeedsSync(current, { session: "sess-1", stripRestoreServer: true }),
      true
    );
    const built = buildEditorRouteHref({ session: "sess-1", stripRestoreServer: true }, current);
    assert.equal(built, "/editor?session=sess-1");
    assert.equal(
      editorRouteSearchEquals(new URLSearchParams("session=sess-1"), {
        session: "sess-1",
        stripRestoreServer: true,
      }),
      true
    );
  });

  it("restoreServer cleanup does not loop once stripped", () => {
    resetEditorRouteReplaceGuardForTests();
    const stripped = new URLSearchParams("session=sess-1");
    assert.equal(
      editorRouteQueryNeedsSync(stripped, {
        session: "sess-1",
        stripRestoreServer: true,
      }),
      false
    );
  });

  it("safeReplaceEditorRoute deduplicates rapid identical replaces", () => {
    resetEditorRouteReplaceGuardForTests();
    let replaceCount = 0;
    const router = {
      replace: () => {
        replaceCount += 1;
      },
    };
    const current = new URLSearchParams("session=old");

    assert.equal(
      safeReplaceEditorRoute(
        router,
        { session: "sess-1", stripRestoreServer: true },
        { currentSearch: current, reason: "session_synced" }
      ),
      true
    );
    assert.equal(
      safeReplaceEditorRoute(
        router,
        { session: "sess-1", stripRestoreServer: true },
        { currentSearch: current, reason: "session_synced" }
      ),
      false
    );
    assert.equal(replaceCount, 1);
  });

  it("EditorProductPage guards URL sync on document changes", () => {
    const page = readFileSync(
      join(process.cwd(), "src/components/editor/editor-product-page.tsx"),
      "utf8"
    );
    assert.match(page, /syncEditorRoute/);
    assert.match(page, /lastSyncedRouteRef/);
    assert.match(page, /urlSession === next\.sessionId/);
    assert.match(page, /stale_hc_removed/);
    assert.match(page, /restore_server_removed/);
    assert.doesNotMatch(page, /onDocumentChange[\s\S]*replaceEditorRouteIfNeeded/);
  });

  it("New Project clears route without direct router.replace", () => {
    const page = readFileSync(
      join(process.cwd(), "src/components/editor/editor-product-page.tsx"),
      "utf8"
    );
    assert.match(page, /handleNewProject/);
    assert.match(page, /route_cleared/);
    assert.doesNotMatch(page, /router\.replace\(/);
  });

  it("local-first restore does not re-add hcProject without local HC package", () => {
    const page = readFileSync(
      join(process.cwd(), "src/components/editor/editor-product-page.tsx"),
      "utf8"
    );
    assert.match(page, /const hcLocal = docHc \? loadHomeCheffProject\(docHc\) : null/);
    assert.match(page, /const targetHc = hcLocal \? docHc : undefined/);
  });

  it("hc-project-lifecycle uses safe URL replace", () => {
    const lifecycle = readFileSync(
      join(process.cwd(), "src/lib/hc-project-lifecycle.ts"),
      "utf8"
    );
    assert.match(lifecycle, /safeReplaceEditorUrlString/);
    assert.doesNotMatch(lifecycle, /window\.history\.replaceState/);
  });
});
