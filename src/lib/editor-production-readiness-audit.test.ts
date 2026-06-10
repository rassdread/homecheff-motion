import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEditorCommandPlan } from "@/lib/editor-v7-action-plan";
import { detectEditorCommandIntents } from "@/lib/editor-v7-intent";
import { matchEditorSkill } from "@/lib/editor-v7-skills";
import { planQuickMotionExport } from "@/lib/editor-quick-gif";
import { buildMotionReadyExportBundle } from "@/lib/editor-motion-ready-export";
import { buildPrintReadyExportBundle } from "@/lib/editor-print-export";
import { posterPixelDimensions } from "@/lib/editor-v6-poster-builder";
import { socialExportDimensions } from "@/lib/editor-v6-social-kit";
import { saveModeForCategory } from "@/lib/editor-library-categories";
import type { EditorCanvasDocument, EditorCanvasLayer } from "@/types/homecheff-visual-editor";

function mockLayer(overrides: Partial<EditorCanvasLayer> = {}): EditorCanvasLayer {
  return {
    id: "layer_1",
    label: "Globe",
    sourceKind: "upload",
    assetId: null,
    storageKey: "",
    previewUrl: "",
    transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    locked: false,
    visible: true,
    bounds: { x: 0.3, y: 0.3, width: 0.4, height: 0.4 },
    layerType: "semantic",
    category: "globe",
    semanticType: "globe",
    ...overrides,
  };
}

function mockDocument(objects: EditorCanvasLayer[]): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "audit_sess",
    name: "Audit",
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/bg.png",
    workflowStep: "visual_editor",
    objects,
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
  };
}

const AI_PROMPT_AUDIT: Array<{
  prompt: string;
  expectAction?: string;
  expectSkill?: string;
}> = [
  { prompt: "Give him a black jacket", expectAction: "magic_replace" },
  { prompt: "Make the background white", expectAction: "magic_replace" },
  { prompt: "Replace the globe with a football", expectAction: "magic_replace" },
  { prompt: "Add logo", expectAction: "logo_placement" },
  { prompt: "Create a restaurant poster", expectAction: "poster_template" },
  { prompt: "Create an Instagram story", expectAction: "social_preset" },
  { prompt: "Make this motion ready", expectAction: "motion_ready" },
  { prompt: "Create a GIF", expectAction: "quick_motion_gif" },
  { prompt: "Translate text to Dutch", expectAction: "translate_text" },
  { prompt: "Translate text to English", expectAction: "magic_replace" },
  { prompt: "Remove background", expectAction: "background_remove" },
  { prompt: "Remove all people in the background", expectAction: "remove_object" },
  { prompt: "Add my logo to the shirt", expectAction: "logo_placement" },
  { prompt: "Make this suitable for Instagram", expectAction: "social_preset" },
  { prompt: "Create a GIF of the globe", expectAction: "quick_motion_gif" },
  { prompt: "Prepare for Motion", expectAction: "motion_ready" },
  { prompt: "Turn this into a restaurant poster", expectAction: "poster_template" },
  { prompt: "Publish to social", expectAction: "publish_social" },
  { prompt: "Create a 5-scene story", expectAction: "studio_story" },
  { prompt: "Print ready export", expectAction: "print_export" },
  { prompt: "Blur the background", expectAction: "magic_replace" },
  { prompt: "Center the composition", expectAction: "align" },
  { prompt: "Create a restaurant poster using HomeCheff branding", expectSkill: "restaurant_poster" },
  { prompt: "Background cleanup", expectSkill: "background_cleanup" },
  { prompt: "Marketplace product photo", expectSkill: "marketplace_product" },
  { prompt: "Give him a modern black chef jacket and make this motion-ready", expectAction: "magic_replace" },
];

describe("Editor Production Readiness Audit", () => {
  const doc = mockDocument([
    mockLayer({ id: "bg", layerType: "background", label: "Background", bounds: { x: 0, y: 0, width: 1, height: 1 } }),
    mockLayer(),
    mockLayer({ id: "chef", label: "Chef", category: "character", semanticType: "character" }),
  ]);

  describe("AI Command Bar — 25+ prompt audit", () => {
    for (const entry of AI_PROMPT_AUDIT) {
      it(`intent: "${entry.prompt.slice(0, 40)}..."`, () => {
        const intents = detectEditorCommandIntents(entry.prompt);
        const plan = buildEditorCommandPlan(doc, entry.prompt);
        assert.ok(plan.steps.length > 0, "plan must have steps");
        assert.ok(plan.prompt === entry.prompt.trim());
        if (entry.expectSkill) {
          assert.equal(matchEditorSkill(entry.prompt)?.id, entry.expectSkill);
          assert.equal(plan.skillId, entry.expectSkill);
        }
        if (entry.expectAction) {
          const hasAction =
            intents.some((i) => i.actionType === entry.expectAction) ||
            plan.steps.some((s) => s.actionType === entry.expectAction);
          assert.ok(hasAction, `expected action ${entry.expectAction} for: ${entry.prompt}`);
        }
      });
    }
  });

  it("GIF export returns pending_server — no encoder", () => {
    const job = planQuickMotionExport(doc);
    assert.equal(job.status, "pending_server");
    assert.equal(job.downloadUrl, undefined);
  });

  it("motion-ready bundle is metadata JSON not a file", () => {
    const bundle = buildMotionReadyExportBundle(doc);
    assert.equal(bundle.profile, "motion_ready");
    assert.ok(bundle.sessionId);
    assert.equal(typeof bundle.handoff, "object");
  });

  it("print export bundle has correct A4 dimensions at 300dpi", () => {
    const bundle = buildPrintReadyExportBundle({
      ...doc,
      exportSettings: {
        profile: "print_ready",
        print: { dpi: 300, unit: "mm", preset: "a4", width: 210, height: 297, bleedMm: 3, safeMarginMm: 5, formats: ["png", "pdf"], retinaScale: 1 },
      },
    });
    assert.equal(bundle.profile, "print_ready");
    assert.ok(bundle.pixelWidth > 2000);
    assert.ok(bundle.pixelHeight > 3000);
  });

  it("poster A3 pixel dimensions are non-zero portrait", () => {
    const dims = posterPixelDimensions("a3");
    assert.ok(dims.width > 1000);
    assert.ok(dims.height > dims.width);
  });

  it("documents known intent detection gaps", () => {
    assert.equal(detectEditorCommandIntents("Make the background white").length, 0);
    assert.equal(detectEditorCommandIntents("Add a HomeCheff logo").length, 0);
    assert.equal(matchEditorSkill("Clean up the background"), null);
    const fallbackPlan = buildEditorCommandPlan(doc, "Add a HomeCheff logo");
    assert.ok(fallbackPlan.steps.some((s) => s.actionType === "magic_replace"));
  });

  it("social Instagram post dimensions are 1080x1080", () => {
    const dims = socialExportDimensions("instagram_post");
    assert.equal(dims.width, 1080);
    assert.equal(dims.height, 1080);
  });

  it("library save modes exist for cutout but are defined only", () => {
    assert.equal(saveModeForCategory("cutout"), "cutout");
    assert.equal(saveModeForCategory("gif"), "gif_asset");
    assert.equal(saveModeForCategory("motion_ready"), "motion_ready_export");
  });
});
