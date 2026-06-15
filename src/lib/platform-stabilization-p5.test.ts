import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { describe, it } from "node:test";
import {
  CHARACTER_CLUSTER_PATHS,
  resolveDeprecatedCharacterEntry,
} from "@/lib/character-cluster-routes";
import { HOMECHEFF_PRODUCT_DEFINITIONS } from "@/lib/homecheff-product-suite";
import {
  HC_PROJECT_WORKFLOW_STATUSES,
  createHcProjectForModule,
  readHcProjectWorkflowStatus,
  transitionHcProjectWorkflowStatus,
} from "@/lib/hc-project-lifecycle";
import { LIBRARY_CONSISTENCY_AUDIT_ENDPOINTS } from "@/lib/library-consistency";
import { listAssistantActions } from "@/lib/assistant-action-registry";
import { buildAssistantContextSnapshot } from "@/lib/assistant-context-layer";

const ROOT = process.cwd();

describe("platform stabilization P5", () => {
  it("lint recovery — previously failing P5 files have zero eslint errors", () => {
    const targets = [
      "src/components/editor/editor-canvas-workspace.tsx",
      "src/components/editor/editor-instruction-studio-workspace.tsx",
      "src/components/editor/editor-product-page.tsx",
      "src/components/editor/editor-reference-role-flow.tsx",
      "src/components/editor/editor-start-screen.tsx",
      "src/components/projects/hc-project-file-import-flow.tsx",
      "src/components/projects/hc-project-import-button.tsx",
      "src/components/projects/hc-project-inline-title.tsx",
      "src/components/projects/hc-project-workspace-controls.tsx",
      "src/components/studio/studio-library-consistency-browse.tsx",
      "src/components/studio/studio-production-brief-flow.tsx",
      "src/components/studio/studio-root-page.tsx",
      "src/components/studio/studio-character-from-reference-wizard.tsx",
      "src/hooks/use-hc-project-workspace.ts",
      "src/hooks/use-hc-project-import-flow.ts",
      "src/lib/hc-project-file-io.ts",
      "src/lib/library-consistency-browse.ts",
      "src/lib/editor-fusion-archetype-v2.test.ts",
    ];
    const output = execSync(`npx eslint ${targets.join(" ")} 2>&1`, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const match = output.match(/(\d+) errors?/);
    const errors = match ? Number(match[1]) : 0;
    assert.equal(errors, 0, output);
  });

  it("dead code audit — deprecated extraction and fusion plan panel removed", () => {
    assert.equal(existsSync(join(ROOT, "src/components/studio/studio-character-extraction-flow.tsx")), false);
    assert.equal(existsSync(join(ROOT, "src/components/editor/editor-fusion-plan-panel.tsx")), false);
    const fusionPlan = readFileSync(join(ROOT, "src/lib/editor-fusion-plan.ts"), "utf8");
    assert.doesNotMatch(fusionPlan, /applyFusionIntakeDocuments/);
  });

  it("route consistency — suite products use canonical module entry paths", () => {
    const hrefs = new Set(HOMECHEFF_PRODUCT_DEFINITIONS.map((product) => product.href));
    assert.ok(hrefs.has("/editor"));
    assert.ok(hrefs.has("/studio"));
    assert.ok(hrefs.has("/animate/instant"));
    assert.ok(hrefs.has("/publish"));
    assert.ok(hrefs.has("/library") || hrefs.has("/studio/assets"));
  });

  it("route consistency — character cluster has one path per intent", () => {
    assert.equal(CHARACTER_CLUSTER_PATHS.new, "/studio/characters/new");
    assert.equal(CHARACTER_CLUSTER_PATHS["from-reference"], "/studio/characters/from-reference");
    assert.equal(CHARACTER_CLUSTER_PATHS["motion-ready"], "/studio/characters/motion-ready");
    const resolved = resolveDeprecatedCharacterEntry({
      entry: "derive_from_reference",
      characterId: "char-1",
    });
    assert.ok(resolved.redirectTo.startsWith("/studio/characters/from-reference"));
  });

  it("project lifecycle — supports full workflow status chain", () => {
    assert.deepEqual(HC_PROJECT_WORKFLOW_STATUSES, [
      "concept",
      "in_progress",
      "motion_ready",
      "publish_ready",
      "exported",
      "archived",
    ]);
    let project = createHcProjectForModule({ sourceModule: "studio", title: "Lifecycle" });
    assert.equal(readHcProjectWorkflowStatus(project), "concept");
    for (const status of [
      "in_progress",
      "motion_ready",
      "publish_ready",
      "exported",
      "archived",
    ] as const) {
      project = transitionHcProjectWorkflowStatus(project, status);
      assert.equal(readHcProjectWorkflowStatus(project), status);
    }
  });

  it("library consistency — motion and publish audit endpoints are wired", () => {
    const motion = LIBRARY_CONSISTENCY_AUDIT_ENDPOINTS.find(
      (row) => row.generationType === "motion_output"
    );
    const publish = LIBRARY_CONSISTENCY_AUDIT_ENDPOINTS.find(
      (row) => row.generationType === "publish_export"
    );
    assert.equal(motion?.wired, true);
    assert.equal(publish?.wired, true);
  });

  it("assistant foundation — context layer and action registry are present", () => {
    assert.equal(listAssistantActions().length, 9);
    const snapshot = buildAssistantContextSnapshot({
      projects: [createHcProjectForModule({ sourceModule: "editor", title: "Assistant" })],
      libraryRecords: [],
    });
    assert.equal(snapshot.projects.length, 1);
    assert.ok(snapshot.library);
  });
});
