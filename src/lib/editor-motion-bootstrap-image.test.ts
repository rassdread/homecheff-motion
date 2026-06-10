import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapEditorMotionBootstrapToWizardImage } from "@/lib/editor-motion-bootstrap-image";

describe("editor-motion-bootstrap-image", () => {
  it("maps bootstrap payload to wizard remote image", () => {
    const image = mapEditorMotionBootstrapToWizardImage({
      imageUrl: "https://example.com/editor-export.png",
      label: "Mascot edit",
      sessionId: "sess-1",
      source: "editor_session",
    });
    assert.ok(image);
    assert.equal(image?.remoteWorkingUrl, "https://example.com/editor-export.png");
    assert.equal(image?.id, "editor-sess-1-main");
  });

  it("returns null for invalid url", () => {
    assert.equal(
      mapEditorMotionBootstrapToWizardImage({
        imageUrl: "not-a-url",
        label: "Bad",
        sessionId: "sess-1",
        source: "editor_session",
      }),
      null
    );
  });
});
