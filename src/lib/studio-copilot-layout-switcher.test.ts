import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_STUDIO_COPILOT_LAYOUT,
  STUDIO_COPILOT_WIDTH_DEFAULT,
  STUDIO_COPILOT_WIDTH_WIDE,
} from "@/types/studio-copilot-layout";
import {
  isDockPlacementSupported,
  isEditorCopilotDockRoute,
  patchStudioCopilotLayout,
  readStudioCopilotLayout,
  resetStudioCopilotLayoutCacheForTests,
  resolveRestorePlacement,
  shouldHideSideCopilotOnEditor,
  shouldShowCopilotDock,
  shouldShowSideCopilotPanel,
  writeStudioCopilotLayout,
} from "@/lib/studio-copilot-layout-storage";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";

describe("studio copilot layout switcher", () => {
  it("side → wide → side updates placement each time", () => {
    resetStudioCopilotLayoutCacheForTests();
    writeStudioCopilotLayout({ ...DEFAULT_STUDIO_COPILOT_LAYOUT, placement: "side" });
    assert.equal(readStudioCopilotLayout().placement, "side");

    patchStudioCopilotLayout({ placement: "wide" });
    assert.equal(readStudioCopilotLayout().placement, "wide");
    assert.equal(readStudioCopilotLayout().width, STUDIO_COPILOT_WIDTH_WIDE);

    patchStudioCopilotLayout({ placement: "side" });
    assert.equal(readStudioCopilotLayout().placement, "side");
    assert.equal(readStudioCopilotLayout().width, STUDIO_COPILOT_WIDTH_DEFAULT);
  });

  it("side → dock → side on editor/start route", () => {
    resetStudioCopilotLayoutCacheForTests();
    patchStudioCopilotLayout({ placement: "side" });
    patchStudioCopilotLayout({ placement: "dock" });
    assert.equal(readStudioCopilotLayout().placement, "dock");
    assert.equal(shouldHideSideCopilotOnEditor("dock", "/editor/start"), true);

    patchStudioCopilotLayout({ placement: "side" });
    assert.equal(readStudioCopilotLayout().placement, "side");
    assert.equal(shouldShowSideCopilotPanel(readStudioCopilotLayout(), "/editor/start"), true);
  });

  it("dock hides side panel and shows dock slot on editor/start", () => {
    resetStudioCopilotLayoutCacheForTests();
    const layout = { ...DEFAULT_STUDIO_COPILOT_LAYOUT, placement: "dock" as const };
    assert.equal(isEditorCopilotDockRoute("/editor/start"), true);
    assert.equal(isEditorCopilotDockRoute("/editor/start?session=abc"), true);
    assert.equal(isEditorCopilotDockRoute("/editor"), false);
    assert.equal(isEditorCopilotDockRoute("/studio"), false);
    assert.equal(shouldShowSideCopilotPanel(layout, "/editor/start"), false);
    assert.equal(shouldShowCopilotDock(layout, "/editor/start"), true);
  });

  it("dock is unsupported on /editor landing — side panel stays visible", () => {
    resetStudioCopilotLayoutCacheForTests();
    const layout = { ...DEFAULT_STUDIO_COPILOT_LAYOUT, placement: "dock" as const };
    assert.equal(isDockPlacementSupported("/editor"), false);
    assert.equal(shouldShowSideCopilotPanel(layout, "/editor"), true);
    assert.equal(shouldShowCopilotDock(layout, "/editor"), false);
  });

  it("dock is unsupported off editor — restore falls back to side", () => {
    assert.equal(isDockPlacementSupported("/studio"), false);
    assert.equal(resolveRestorePlacement("dock", "/studio"), "side");
    const layout = { ...DEFAULT_STUDIO_COPILOT_LAYOUT, placement: "dock" as const };
    assert.equal(shouldShowCopilotDock(layout, "/studio"), false);
    assert.equal(shouldShowSideCopilotPanel(layout, "/studio"), true);
  });

  it("clicking dock placement updates localStorage", () => {
    resetStudioCopilotLayoutCacheForTests();
    patchStudioCopilotLayout({ placement: "dock", collapsed: false });
    const layout = readStudioCopilotLayout();
    assert.equal(layout.placement, "dock");
    assert.equal(layout.collapsed, false);
  });

  it("cached snapshot updates after every placement switch", () => {
    resetStudioCopilotLayoutCacheForTests();
    const initial = readStudioCopilotLayout();
    patchStudioCopilotLayout({ placement: "wide" });
    const wide = readStudioCopilotLayout();
    assert.notEqual(wide.placement, initial.placement);
    patchStudioCopilotLayout({ placement: "side" });
    const side = readStudioCopilotLayout();
    assert.equal(side.placement, "side");
    assert.notEqual(side.placement, wide.placement);
  });

  it("minimize and restore preserve restorePlacement", () => {
    resetStudioCopilotLayoutCacheForTests();
    patchStudioCopilotLayout({ placement: "wide" });
    patchStudioCopilotLayout({ collapsed: true, restorePlacement: "wide" });
    const minimized = readStudioCopilotLayout();
    assert.equal(minimized.collapsed, true);
    assert.equal(minimized.restorePlacement, "wide");

    patchStudioCopilotLayout({ collapsed: false });
    const restored = readStudioCopilotLayout();
    assert.equal(restored.collapsed, false);
    assert.equal(restored.placement, "wide");
  });

  it("collapsed hides side panel and dock", () => {
    const collapsed = { ...DEFAULT_STUDIO_COPILOT_LAYOUT, placement: "dock" as const, collapsed: true };
    assert.equal(shouldShowSideCopilotPanel(collapsed, "/editor"), false);
    assert.equal(shouldShowCopilotDock(collapsed, "/editor/start"), false);
  });

  it("default layout is open (not collapsed) for SSR", () => {
    assert.equal(DEFAULT_STUDIO_COPILOT_LAYOUT.collapsed, false);
    assert.equal(DEFAULT_STUDIO_COPILOT_LAYOUT.placement, "side");
  });

  it("layout switcher i18n keys exist", () => {
    const keys = [
      "studioCopilot.placement.side",
      "studioCopilot.placement.wide",
      "studioCopilot.placement.dock",
      "studioCopilot.placement.focus",
      "studioCopilot.placement.dockDisabledHint",
      "studioCopilot.minimize",
      "studioCopilot.restore",
      "studioCopilot.restoreShort",
    ] as const;
    for (const key of keys) {
      assert.ok(nl[key], `missing nl ${key}`);
      assert.ok(en[key], `missing en ${key}`);
    }
  });
});
