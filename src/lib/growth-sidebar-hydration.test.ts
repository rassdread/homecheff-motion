import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { listAssistantHistory } from "@/lib/assistant-history";

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("growth sidebar hydration", () => {
  it("listAssistantHistory returns empty on server (no localStorage)", () => {
    assert.deepEqual(listAssistantHistory(), []);
  });

  it("AssistantHistoryPanel defers localStorage reads until mounted", () => {
    const panel = read("src/components/assistant/assistant-history-panel.tsx");
    assert.match(panel, /useMounted\(\)/);
    assert.match(panel, /if \(!mounted\)/);
    assert.match(panel, /if \(!mounted \|\| items\.length === 0\)/);
    assert.doesNotMatch(panel, /useState\(readAssistantEditorContext/);
    assert.match(panel, /listAssistantHistory/);
  });

  it("GrowthSidebar gates auth branches on mounted for SSR parity", () => {
    const sidebar = read("src/components/growth/growth-sidebar.tsx");
    assert.match(sidebar, /useMounted\(\)/);
    assert.match(sidebar, /showPublicUi/);
    assert.match(sidebar, /showAuthenticatedUi/);
    assert.match(sidebar, /growth-sidebar-public-discovery/);
    assert.match(sidebar, /!mounted \|\| !isAuthenticated/);
    assert.match(sidebar, /mounted && isAuthenticated/);
    assert.doesNotMatch(sidebar, /\{!isAuthenticated \? \(/);
  });

  it("history panel and public discovery coexist without pre-hydration swap", () => {
    const sidebar = read("src/components/growth/growth-sidebar.tsx");
    const panel = read("src/components/assistant/assistant-history-panel.tsx");
    assert.match(sidebar, /<AssistantHistoryPanel/);
    assert.match(sidebar, /growth-sidebar-public-discovery/);
    assert.match(panel, /if \(!mounted \|\| items\.length === 0\)/);
    assert.match(sidebar, /showPublicUi/);
  });

  it("StudioCopilotContextBar defers sessionStorage editor context", () => {
    const bar = read("src/components/assistant/studio-copilot-context-bar.tsx");
    assert.match(bar, /useMounted\(\)/);
    assert.match(bar, /useState<AssistantEditorContextHint \| null>\(null\)/);
    assert.doesNotMatch(bar, /useState\(readAssistantEditorContext/);
  });

  it("StudioCopilotQuickActions defers sessionStorage editor context", () => {
    const actions = read("src/components/assistant/studio-copilot-quick-actions.tsx");
    assert.match(actions, /useMounted\(\)/);
    assert.match(actions, /useState<AssistantEditorContextHint \| null>\(null\)/);
    assert.doesNotMatch(actions, /useState\(readAssistantEditorContext/);
  });

  it("HomeCheffAssistantProvider gates copilot layout on mounted", () => {
    const provider = read("src/components/assistant/homecheff-assistant-provider.tsx");
    assert.match(provider, /copilotLayoutHydrated = useMounted\(\)/);
    assert.match(provider, /effectiveCopilotLayout = copilotLayoutHydrated/);
    assert.match(provider, /DEFAULT_STUDIO_COPILOT_LAYOUT/);
  });

  it("GrowthSidebar uses hydrated layout for history collapsedDefault only after mount", () => {
    const sidebar = read("src/components/growth/growth-sidebar.tsx");
    assert.match(
      sidebar,
      /collapsedDefault=\{copilotLayoutHydrated \? copilotLayout\.collapsedRecent : true\}/
    );
  });
});
