import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  attachStoryboardToHcProject,
  createHcProjectForModule,
  ensureHcProjectOnMotionStart,
  ensureHcProjectOnPublishStart,
  ensureHcProjectOnStudioStart,
  markHcProjectExported,
  readHcProjectWorkflowStatus,
  reuseHcProjectForService,
  saveHcProjectAsNewCopy,
  transitionHcProjectWorkflowStatus,
} from "@/lib/hc-project-lifecycle";
import { prepareHcProjectForMotion, prepareHcProjectForPublish } from "@/lib/homecheff-project-prepare";
import { buildHomeCheffProjectFromEditorDocument } from "@/lib/homecheff-project-build";
import { syncPublishExportToHc } from "@/lib/publish-hc-sync";

function editorProject() {
  const document = {
    sessionId: "sess-editor",
    name: "HomeCheff Community Video",
    backgroundUrl: "https://example.com/a.png",
    objects: [],
    instructionStudioState: {},
    updatedAt: new Date().toISOString(),
  } as never;
  return buildHomeCheffProjectFromEditorDocument({ document });
}

describe("hc-project-lifecycle v2 studio motion publish", () => {
  it("studio start creates HC project", () => {
    const { project, created } = ensureHcProjectOnStudioStart({});
    assert.equal(created, true);
    assert.equal(project.projectType, "studio");
    assert.equal(project.title, "Nieuw Studio-verhaal");
    assert.equal(readHcProjectWorkflowStatus(project), "concept");
  });

  it("motion start creates HC project", () => {
    const { project, created } = ensureHcProjectOnMotionStart({});
    assert.equal(created, true);
    assert.equal(project.projectType, "motion");
    assert.equal(project.title, "Nieuw Motion-project");
  });

  it("publish start creates HC project", () => {
    const { project, created } = ensureHcProjectOnPublishStart({});
    assert.equal(created, true);
    assert.equal(project.projectType, "publish");
    assert.equal(project.title, "Nieuw Publish-project");
  });

  it("project title persists between module reuse", () => {
    const studio = createHcProjectForModule({
      sourceModule: "studio",
      title: "HomeCheff Community Video",
    });
    const motion = reuseHcProjectForService(studio, "motion");
    assert.equal(motion.id, studio.id);
    assert.equal(motion.title, "HomeCheff Community Video");
    assert.equal(readHcProjectWorkflowStatus(motion), "motion_ready");
  });

  it("studio to motion prepare reuses same project id", () => {
    const studio = attachStoryboardToHcProject(
      createHcProjectForModule({ sourceModule: "studio", title: "Story A" }),
      "sb-123"
    );
    const prepared = prepareHcProjectForMotion(studio);
    assert.equal(prepared.project.id, studio.id);
    assert.ok(prepared.project.servicePayload.motion);
    assert.equal(readHcProjectWorkflowStatus(prepared.project), "motion_ready");
  });

  it("motion to publish prepare reuses same project id", () => {
    const editor = editorProject();
    const motion = prepareHcProjectForMotion(editor).project;
    const publish = prepareHcProjectForPublish(motion).project;
    assert.equal(publish.id, editor.id);
    assert.ok(publish.servicePayload.publish);
    assert.equal(readHcProjectWorkflowStatus(publish), "publish_ready");
  });

  it("save as new copy creates separate project", () => {
    const original = ensureHcProjectOnStudioStart({}).project;
    const copy = saveHcProjectAsNewCopy({ project: original, title: "Copy project" });
    assert.notEqual(copy.id, original.id);
    assert.equal(copy.title, "Copy project");
  });

  it("export sets exported status", () => {
    const publishProject = createHcProjectForModule({
      sourceModule: "publish",
      workflowStatus: "publish_ready",
    });
    const exported = syncPublishExportToHc(publishProject, {
      id: "pub-1",
      name: "Export test",
      publishIntent: "social",
      mediaKind: "video",
      overlays: [],
      subtitles: [],
      updatedAt: new Date().toISOString(),
    } as never, "https://example.com/out.mp4");
    assert.equal(readHcProjectWorkflowStatus(exported), "exported");
  });

  it("storyboard attach moves studio project to motion_ready", () => {
    const project = attachStoryboardToHcProject(
      createHcProjectForModule({ sourceModule: "studio" }),
      "sb-99"
    );
    assert.equal(project.servicePayload.studio?.storyboardId, "sb-99");
    assert.equal(readHcProjectWorkflowStatus(project), "motion_ready");
  });

  it("in_progress transition on studio approval", () => {
    const project = transitionHcProjectWorkflowStatus(
      createHcProjectForModule({ sourceModule: "studio" }),
      "in_progress"
    );
    assert.equal(readHcProjectWorkflowStatus(project), "in_progress");
  });
});

describe("hc project menu audit v2", () => {
  it("shared hc project menu exposes project-first actions", () => {
    const menu = readFileSync(join(process.cwd(), "src/components/projects/hc-project-menu.tsx"), "utf8");
    assert.match(menu, /onSaveProject/);
    assert.match(menu, /onRenameProject/);
    assert.match(menu, /onOpenInProjects/);
    assert.doesNotMatch(menu, /saveDraft/);
  });

  it("studio wizard wires auto-create and workspace controls", () => {
    const flow = readFileSync(
      join(process.cwd(), "src/components/studio/studio-production-brief-flow.tsx"),
      "utf8"
    );
    assert.match(flow, /ensureHcProjectOnStudioStart/);
    assert.match(flow, /HcProjectWorkspaceControls/);
    assert.match(flow, /attachStoryboardToHcProject/);
  });

  it("motion instant bar wires auto-create and menu", () => {
    const bar = readFileSync(join(process.cwd(), "src/components/projects/hc-instant-project-bar.tsx"), "utf8");
    assert.match(bar, /HcProjectAutoCreateBridge/);
    assert.match(bar, /HcProjectWorkspaceControls/);
  });

  it("publish page wires auto-create and menu", () => {
    const page = readFileSync(join(process.cwd(), "src/components/publish/publish-product-page.tsx"), "utf8");
    assert.match(page, /HcProjectAutoCreateBridge/);
    assert.match(page, /HcProjectWorkspaceControls/);
  });
});
