import assert from "node:assert/strict";
import test from "node:test";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import {
  buildGenerationPackageFromDocument,
  patchDocumentGenerationPackage,
  syncTransformationSessionFromVariants,
} from "@/lib/editor-generation-package";
import { collectEditorMetadataPipeline, metadataEnrichedGenerationPrompt } from "@/lib/editor-metadata-pipeline";
import {
  isFreePostGenerationAction,
  resolveEditorNextBestActions,
} from "@/lib/editor-next-best-actions";
import { buildPublishHandoffUrl } from "@/lib/editor-publish-handoff";
import { buildStudioSceneHandoffUrl, buildMotionAnimateUrl } from "@/lib/editor-studio-scene-handoff";
import { buildTransformationMotionHandoffQuery } from "@/lib/editor-transformation-handoff";
import { buildTransformationStepPrompt, createTransformationSession } from "@/lib/editor-transformation-session";
import { buildEditorFusionPrompt } from "@/lib/editor-fusion-prompt-builder";
import { createInitialFusionPlan } from "@/lib/editor-fusion-plan";
import { workflowReferenceConfigForIntent } from "@/lib/editor-workflow-reference-config";

test("metadata pipeline reaches prompt, motion, and export payloads", () => {
  const doc = createEditorDocumentFromUpload({
    name: "base",
    backgroundUrl: "https://example.com/base.jpg",
  });
  doc.instructionStudioState = {
    ...doc.instructionStudioState,
    referenceIntake: {
      roleAssignments: [
        {
          roleId: "person",
          role: "person",
          instanceId: "p1",
          url: "https://example.com/person.jpg",
          name: "person",
          metadata: { view: "front", role: "person" },
        },
        {
          roleId: "clothing_item",
          role: "outfit",
          instanceId: "c1",
          url: "https://example.com/jacket.jpg",
          name: "jacket",
          metadata: { clothingType: "jacket", view: "front" },
        },
      ],
    },
  };

  const pipeline = collectEditorMetadataPipeline(doc);
  assert.ok(pipeline.assignments.length === 2);
  assert.ok(pipeline.motionQueryParams.referenceMetadata);
  assert.ok(pipeline.exportMetadata["person_p1.view"] === "front");
  assert.ok(pipeline.analysisHints.some((h) => h.includes("front")));

  const prompt = metadataEnrichedGenerationPrompt("BASE PROMPT", doc);
  assert.match(prompt, /REFERENCE PIPELINE/);
  assert.match(prompt, /person: front/);

  const session = createTransformationSession({
    type: "OUTFIT_TRANSFORMATION",
    sourceImageUrl: doc.backgroundUrl,
    stepCount: 3,
  });
  session.steps[0]!.resultUrl = "https://example.com/step1.jpg";
  const motionQuery = buildTransformationMotionHandoffQuery({
    session,
    editorSessionId: doc.sessionId,
    referenceAssignments: pipeline.assignments,
    metadataQueryParams: pipeline.motionQueryParams,
  });
  assert.match(motionQuery, /stepOrder0=0/);
  assert.match(motionQuery, /referenceMetadata=/);
});

test("buildEditorFusionPrompt includes metadata from assignments", () => {
  const doc = createEditorDocumentFromUpload({ name: "b", backgroundUrl: "https://example.com/b.jpg" });
  const plan = createInitialFusionPlan(doc, "how_will_i_look");
  const prompt = buildEditorFusionPrompt({
    plan,
    referenceAssignments: [
      {
        roleId: "mother",
        role: "family",
        instanceId: "m1",
        url: "https://example.com/m.jpg",
        name: "mother",
        metadata: { familyType: "mother" },
      },
    ],
  });
  assert.match(prompt, /REFERENCE METADATA/);
});

test("resolveEditorNextBestActions prioritizes outfit workflow CTAs", () => {
  const actions = resolveEditorNextBestActions({
    resultType: "image",
    workflow: "outfit_from_reference",
    userTier: "free",
    credits: 2,
    editorSessionId: "sess_1",
  });
  assert.equal(actions[0]?.id, "create_social_post");
  assert.ok(actions.some((a) => a.id === "download"));
  assert.ok(isFreePostGenerationAction("send_studio_scene"));
  assert.ok(isFreePostGenerationAction("download"));
});

test("animation result shows subtitles voice music CTAs", () => {
  const actions = resolveEditorNextBestActions({
    resultType: "animation",
    userTier: "plus",
    credits: 10,
    editorSessionId: "sess_1",
  });
  assert.ok(actions.some((a) => a.id === "add_subtitles"));
  assert.ok(actions.some((a) => a.id === "add_voiceover"));
  assert.ok(actions.some((a) => a.id === "add_music"));
});

test("free user after ad sees monetization CTAs", () => {
  const actions = resolveEditorNextBestActions({
    resultType: "image",
    userTier: "free",
    credits: 0,
    lastAccessPath: "ad",
    editorSessionId: "sess_1",
  });
  assert.ok(actions.some((a) => a.id === "watch_ad"));
  assert.ok(actions.some((a) => a.id === "buy_credits"));
  assert.ok(actions.some((a) => a.id === "upgrade_premium"));
});

test("studio scene handoff is separate from motion animate", () => {
  const studio = buildStudioSceneHandoffUrl({ editorSessionId: "sess_1", resultUrl: "https://example.com/r.jpg" });
  const motion = buildMotionAnimateUrl({
    editorSessionId: "sess_1",
    durationSec: 5,
    resultUrl: "https://example.com/r.jpg",
  });
  assert.match(studio, /handoffMode=scene_only/);
  assert.match(motion, /handoffMode=animation/);
  assert.match(motion, /transitionDurationSec=5/);
});

test("publish handoff receives generated asset metadata", () => {
  const url = buildPublishHandoffUrl({
    editorSessionId: "sess_1",
    intent: "text_overlay",
    resultUrl: "https://example.com/result.jpg",
    packageId: "genpkg_1",
  });
  assert.match(url, /publishIntent=text_overlay/);
  assert.match(url, /generationPackage=genpkg_1/);
  assert.match(url, /resultUrl=/);
});

test("generation package stores sequence frames and ordered urls", () => {
  let doc = createEditorDocumentFromUpload({ name: "base", backgroundUrl: "https://example.com/base.jpg" });
  doc.instructionStudioState = {
    ...doc.instructionStudioState,
    transformationSession: createTransformationSession({
      type: "HUMAN_TO_MASCOT",
      sourceImageUrl: doc.backgroundUrl,
      stepCount: 3,
    }),
  };
  doc.instructionVariants = [
    {
      id: "v1",
      name: "Variant 1/3",
      status: "completed",
      resultUrl: "https://example.com/s1.jpg",
      variantType: "combined",
      sourceImageUrl: doc.backgroundUrl,
      sourceImageId: "background",
      instruction: {} as never,
      prompt: "p",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "v2",
      name: "Variant 2/3",
      status: "completed",
      resultUrl: "https://example.com/s2.jpg",
      variantType: "combined",
      sourceImageUrl: doc.backgroundUrl,
      sourceImageId: "background",
      instruction: {} as never,
      prompt: "p",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  doc = syncTransformationSessionFromVariants(doc);
  doc = patchDocumentGenerationPackage(doc);
  const pkg = doc.instructionStudioState?.generationPackage;
  assert.ok(pkg);
  assert.ok(pkg.sequenceFrames.length >= 1 || pkg.generatedImages.length >= 1);
});

test("outfit workflow supports multiple clothing items", () => {
  const config = workflowReferenceConfigForIntent("outfit_from_reference");
  const clothing = config.roles.find((r) => r.id === "clothing_item" || r.role === "outfit");
  assert.ok(clothing);
  assert.ok((clothing?.maxInstances ?? 0) >= 2);
});

test("future self supports extended family references", () => {
  const config = workflowReferenceConfigForIntent("how_will_i_look");
  assert.ok(config.roles.some((r) => r.id === "family_extra" || r.id === "mother"));
  assert.ok(config.optionalRoles.includes("father") || config.roles.some((r) => r.id === "father"));
});

test("transformation step prompt accepts reference metadata", () => {
  const session = createTransformationSession({
    type: "AGE_TIMELINE",
    sourceImageUrl: "https://example.com/src.jpg",
    stepCount: 3,
  });
  const prompt = buildTransformationStepPrompt({
    session,
    step: session.steps[0]!,
    referenceAssignments: [
      {
        roleId: "current",
        role: "person",
        instanceId: "c1",
        url: "https://example.com/current.jpg",
        name: "current",
        metadata: { view: "front" },
      },
    ],
  });
  assert.match(prompt, /REFERENCE METADATA/);
  assert.match(prompt, /front/);
});
