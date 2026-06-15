import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";

describe("editor landing hydration", () => {
  it("does not read localStorage during EditorLandingContent render", () => {
    const route = readFileSync(
      join(process.cwd(), "src/components/suite/editor-landing-route.tsx"),
      "utf8"
    );
    assert.doesNotMatch(route, /listRecentEditorDocuments/);
    assert.match(route, /EditorLandingContinueCard/);
    assert.match(route, /continueSlot/);
  });

  it("defers continue card until after mount", () => {
    const card = readFileSync(
      join(process.cwd(), "src/components/suite/editor-landing-continue-card.tsx"),
      "utf8"
    );
    assert.match(card, /useState\(false\)/);
    assert.match(card, /queueMicrotask/);
    assert.match(card, /listRecentEditorDocuments/);
    assert.match(card, /if \(!mounted \|\| !recent\)/);
    assert.match(card, /data-testid="editor-landing-continue-card"/);
  });

  it("keeps stable primary CTA in landing SSR output", () => {
    const landing = readFileSync(
      join(process.cwd(), "src/components/suite/studio-product-landing-page.tsx"),
      "utf8"
    );
    assert.match(landing, /data-testid="landing-primary-cta"/);
    assert.match(landing, /mt-8 flex flex-wrap gap-3/);
  });

  it("has continue + CTA i18n keys", () => {
    assert.ok(nl["landing.continue.title"]);
    assert.ok(en["landing.continue.title"]);
  });
});
