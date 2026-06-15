import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { nl } from "@/i18n/locales/nl";

describe("editor session restore", () => {
  const productPage = readFileSync(
    join(process.cwd(), "src/components/editor/editor-product-page.tsx"),
    "utf8"
  );
  const recoveryPanel = readFileSync(
    join(process.cwd(), "src/components/editor/editor-session-recovery-panel.tsx"),
    "utf8"
  );

  it("limits session restore to one attempt per session id", () => {
    assert.match(productPage, /sessionRestoreRef/);
    assert.match(productPage, /sessionRestoreRef\.current === sessionId/);
    assert.doesNotMatch(productPage, /documentOverride,\s*hcProjectId,\s*sessionId\]/);
  });

  it("does not replace route when href is unchanged", () => {
    assert.match(productPage, /replaceEditorRouteIfNeeded/);
    assert.doesNotMatch(productPage, /router\.replace\(`\/editor\?/);
  });

  it("shows recovery UI for missing sessions without looping", () => {
    assert.match(productPage, /EditorSessionRecoveryPanel/);
    assert.match(productPage, /hydrationState === "not_found"/);
    assert.match(recoveryPanel, /data-testid="editor-session-recovery"/);
    assert.ok(nl["editor.sessionRecovery.title"]);
  });

  it("landing deep link does not redirect loop on same session", () => {
    const landing = readFileSync(
      join(process.cwd(), "src/components/suite/editor-landing-route.tsx"),
      "utf8"
    );
    assert.match(landing, /editorLandingHasDeepLink/);
    assert.doesNotMatch(landing, /router\.(push|replace)/);
  });
});
