import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PUBLISH_WIZARD_AUTOSAVE_DEBOUNCE_MS } from "@/hooks/use-stable-text-field";
import {
  getPublishWizardTypingDiagnostics,
  recordPublishWizardAutosaveTriggered,
  recordPublishWizardRemount,
  recordPublishWizardRerender,
  recordPublishWizardScrollDelta,
  recordPublishWizardTypingStarted,
  resetPublishWizardTypingDiagnostics,
} from "@/lib/publish-wizard-typing-diagnostics";
import { hydratePublishWizardFromProject } from "@/lib/publish-wizard-flow";

describe("publish-wizard-typing-diagnostics", () => {
  it("tracks typing, autosave, rerender, remount, and scroll metrics", () => {
    resetPublishWizardTypingDiagnostics();
    recordPublishWizardTypingStarted();
    recordPublishWizardAutosaveTriggered();
    recordPublishWizardRerender();
    recordPublishWizardRemount();
    recordPublishWizardScrollDelta(12);

    const metrics = getPublishWizardTypingDiagnostics();
    assert.equal(metrics.typingStarted, 1);
    assert.equal(metrics.autosaveTriggered, 1);
    assert.equal(metrics.rerenderCount, 1);
    assert.equal(metrics.remountCount, 1);
    assert.equal(metrics.scrollDelta, 12);
  });

  it("uses a 1750ms debounce window for wizard autosave", () => {
    assert.equal(PUBLISH_WIZARD_AUTOSAVE_DEBOUNCE_MS, 1750);
  });

  it("hydrates intent step without forcing analyze until user advances", () => {
    const state = hydratePublishWizardFromProject({
      publishIntent: "Promo video for spring menu",
      hasMedia: true,
    });
    assert.equal(state.step, "analyze");
    assert.equal(state.intent, "Promo video for spring menu");

    const freshIntent = hydratePublishWizardFromProject({
      hasMedia: true,
    });
    assert.equal(freshIntent.step, "intent");
  });
});
