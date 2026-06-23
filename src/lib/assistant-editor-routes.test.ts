import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAssistantEditorWorkflowRoute,
  buildMascotTransformWizardRoute,
  normalizeAssistantEditorRoute,
} from "@/lib/assistant-editor-routes";
import { editorLandingHasDeepLink } from "@/lib/studio-product-landing-routes";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";

describe("assistant editor routes", () => {
  it("normalizes bare /editor workflow links to /editor/start", () => {
    assert.equal(
      normalizeAssistantEditorRoute("/editor?workflow=combine&prefillId=abc"),
      "/editor/start?workflow=combine&prefillId=abc"
    );
    assert.equal(normalizeAssistantEditorRoute("/editor/start?workflow=combine"), "/editor/start?workflow=combine");
    assert.equal(normalizeAssistantEditorRoute("/studio/start"), "/studio/start");
  });

  it("builds mascot transform wizard route on character studio path", () => {
    assert.equal(buildMascotTransformWizardRoute(), "/studio/characters/prepare?flow=mascot_transform");
    assert.equal(
      buildAssistantEditorWorkflowRoute("combine", { prefillId: "x" }),
      "/editor/start?workflow=combine&prefillId=x"
    );
  });

  it("workflow query param bypasses editor marketing landing", () => {
    assert.equal(editorLandingHasDeepLink(new URLSearchParams("workflow=mascot_transform")), true);
    assert.equal(editorLandingHasDeepLink(new URLSearchParams("prefillId=abc")), true);
    assert.equal(editorLandingHasDeepLink(new URLSearchParams("morph=human_to_mascot")), true);
  });
});

describe("mascot transform i18n parity", () => {
  const keys = [
    "editor.mascotTransform.title",
    "editor.mascotTransform.step.chooseTarget",
    "editor.mascotTransform.renderAction",
    "editor.mascotTransform.target.humanVersion",
    "editor.mascotTransform.preserve.colors",
  ];

  for (const key of keys) {
    it(`has EN/NL for ${key}`, () => {
      assert.ok(en[key as keyof typeof en]?.length, `missing EN ${key}`);
      assert.ok(nl[key as keyof typeof nl]?.length, `missing NL ${key}`);
    });
  }
});
