import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";
import { STUDIO_TOOL_IDS } from "@/lib/studio-tool-id";
import { pickPrimaryMotionProject } from "@/hooks/use-studio-workspace-motion";
import { resolveMotionProjectFinalVideoUrl } from "@/lib/studio-motion-project-display";

const PRODUCTION_KEYS = [
  "studio.tools.render",
  "studio.tools.versions",
  "studio.workspace.render.hint",
  "studio.workspace.versions.hint",
  "studio.workspace.production.currentVideo",
  "studio.workspace.production.editText",
  "studio.workspace.production.rebuildTitle",
  "studio.workspace.export.embeddedHint",
] as const;

describe("studio-unified-production", () => {
  it("includes render and versions tool tabs", () => {
    assert.ok(STUDIO_TOOL_IDS.includes("render"));
    assert.ok(STUDIO_TOOL_IDS.includes("versions"));
    assert.equal(STUDIO_TOOL_IDS.indexOf("render") < STUDIO_TOOL_IDS.indexOf("translate"), true);
  });

  it("has NL/EN parity for production workspace keys", () => {
    for (const key of PRODUCTION_KEYS) {
      assert.ok(nl[key], `missing nl ${key}`);
      assert.ok(en[key], `missing en ${key}`);
    }
  });

  it("embeds Motion production panels without redirect-only export list", () => {
    const panelPath = join(process.cwd(), "src/components/studio/studio-workspace-tool-panel.tsx");
    const productionPath = join(
      process.cwd(),
      "src/components/studio/studio-workspace-production-panels.tsx"
    );
    const toolSrc = readFileSync(panelPath, "utf8");
    const productionSrc = readFileSync(productionPath, "utf8");
    assert.match(toolSrc, /StudioWorkspaceRenderPanel/);
    assert.match(toolSrc, /StudioWorkspaceVersionsPanel/);
    assert.match(productionSrc, /VideoVersionsPanel/);
    assert.match(productionSrc, /RenderActivityStatusCard/);
    assert.doesNotMatch(toolSrc, /MotionProjectList/);
  });

  it("shows production banner in workspace shell", () => {
    const shellPath = join(process.cwd(), "src/components/studio/studio-workspace-shell.tsx");
    const src = readFileSync(shellPath, "utf8");
    assert.match(src, /StudioWorkspaceProductionBanner/);
    assert.match(src, /useStoryboardMotionProjects/);
  });

  it("pickPrimaryMotionProject prefers completed final", () => {
    const picked = pickPrimaryMotionProject([
      {
        id: "a",
        title: "In progress",
        status: "rendering",
        projectType: "instant_premium",
        updatedAt: new Date().toISOString(),
        latestExportStatus: "rendering",
        hasCompletedFinal: false,
      },
      {
        id: "b",
        title: "Ready",
        status: "completed",
        projectType: "instant_premium",
        updatedAt: new Date().toISOString(),
        latestExportStatus: "completed",
        hasCompletedFinal: true,
      },
    ]);
    assert.equal(picked?.id, "b");
  });

  it("resolveMotionProjectFinalVideoUrl reads completed export url", () => {
    const url = resolveMotionProjectFinalVideoUrl({
      id: "p1",
      status: "completed",
      exports: [{ status: "completed", outputVideoUrl: "https://example.com/final.mp4" }],
      images: [],
      transitions: [],
    } as never);
    assert.equal(url, "https://example.com/final.mp4");
  });
});
