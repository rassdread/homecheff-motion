import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEditorRouteHref,
  editorRouteSearchEquals,
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

  it("detects equivalent search params", () => {
    const current = new URLSearchParams("session=sess-1&hcProject=hc-1");
    assert.equal(editorRouteSearchEquals(current, { session: "sess-1", hcProject: "hc-1" }), true);
    assert.equal(editorRouteSearchEquals(current, { session: "other" }), false);
  });

  it("skips replace when target matches current search", () => {
    const current = new URLSearchParams("session=sess-1");
    assert.equal(shouldReplaceEditorRoute(current, { session: "sess-1" }), false);
    assert.equal(shouldReplaceEditorRoute(current, { session: "sess-2" }), true);
  });
});
