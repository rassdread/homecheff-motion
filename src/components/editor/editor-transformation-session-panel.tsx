"use client";

import { patchFusionPlan } from "@/lib/editor-fusion-plan";
import { patchFusionGenerationSettings } from "@/lib/editor-fusion-generation-settings";
import {
  createTransformationSession,
  DEFAULT_TRANSFORMATION_PRESERVE,
  fusionIntentToTransformationType,
} from "@/lib/editor-transformation-session";
import { editorTransformationMotionUrl } from "@/lib/editor-transformation-handoff";
import { resolveCompositionBaseImageUrl } from "@/lib/editor-composition-plan";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorTransformationStepCount } from "@/types/editor-generation-access";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
};

const STEP_OPTIONS: EditorTransformationStepCount[] = [1, 3, 4, 6];

export function EditorTransformationSessionPanel({ document, onDocumentChange }: Props) {
  const t = useActiveTranslator();
  const plan = document.instructionStudioState?.fusionPlan;
  const session = document.instructionStudioState?.transformationSession;
  const intent = plan?.intent;

  if (!plan || !intent) {
    return null;
  }

  const txType = fusionIntentToTransformationType(intent);
  if (!txType) {
    return null;
  }

  const outputMode = plan.generationSettings.outputMode === "sequence" ? "sequence" : "single";
  const stepCount = (typeof plan.generationSettings.stepCount === "number"
    ? plan.generationSettings.stepCount
    : 3) as EditorTransformationStepCount;

  const setOutputMode = (mode: "single" | "sequence") => {
    let next = patchFusionPlan(
      document,
      patchFusionGenerationSettings(plan, { outputMode: mode, stepCount: mode === "sequence" ? stepCount : 1 })
    );
    if (mode === "sequence") {
      const base = resolveCompositionBaseImageUrl(document);
      const created = createTransformationSession({
        type: txType,
        sourceImageUrl: base.url,
        targetReferenceUrls: plan.references.map((ref) => ref.url),
        stepCount,
        targetDescription: plan.userInstructions || intent,
      });
      next = {
        ...next,
        instructionStudioState: {
          ...next.instructionStudioState,
          transformationSession: created,
        },
      };
    }
    onDocumentChange(next);
  };

  const setStepCount = (count: EditorTransformationStepCount) => {
    const base = resolveCompositionBaseImageUrl(document);
    const created = createTransformationSession({
      type: txType,
      sourceImageUrl: base.url,
      targetReferenceUrls: plan.references.map((ref) => ref.url),
      stepCount: count,
      targetDescription: plan.userInstructions || intent,
    });
    onDocumentChange({
      ...document,
      instructionStudioState: {
        ...document.instructionStudioState,
        fusionPlan: patchFusionGenerationSettings(plan, { stepCount: count, outputMode: "sequence" }),
        transformationSession: created,
      },
    });
  };

  const motionUrl =
    session ?
      editorTransformationMotionUrl({ session, editorSessionId: document.sessionId })
    : null;

  return (
    <section className={`space-y-4 p-4 ${studioVisual.editorSurface}`} data-testid="editor-transformation-session-panel">
      <div>
        <h3 className="text-sm font-bold text-zinc-900">
          {t("editor.generation.transformation.title" as never)}
        </h3>
        <p className="mt-1 text-xs text-zinc-600">
          {t("editor.generation.transformation.lead" as never)}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="output-mode"
            checked={outputMode === "single"}
            onChange={() => setOutputMode("single")}
          />
          {t("editor.generation.transformation.single" as never)}
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="output-mode"
            checked={outputMode === "sequence"}
            onChange={() => setOutputMode("sequence")}
          />
          {t("editor.generation.transformation.sequence" as never)}
        </label>
      </div>

      {outputMode === "sequence" ?
        <>
          <div className="flex flex-wrap gap-2">
            {STEP_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setStepCount(count)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  stepCount === count ? "border-[#0067B1] bg-[#0067B1]/10" : "border-zinc-200"
                }`}
              >
                {count}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {session?.steps.map((step) => (
              <div key={step.id} className="rounded-lg border border-zinc-200 p-2 text-xs">
                <p className="font-semibold">
                  {step.index + 1}. {step.strength}%
                </p>
                <p className="mt-1 text-zinc-600">{step.instruction.slice(0, 80)}…</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            {t("editor.generation.transformation.preserveDefault" as never)}:{" "}
            {DEFAULT_TRANSFORMATION_PRESERVE.join(", ")}
          </p>
          {motionUrl ?
            <a
              href={motionUrl}
              className="inline-flex rounded-lg bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white"
              data-testid="editor-transformation-motion-handoff"
            >
              {t("editor.generation.transformation.sendToMotion" as never)}
            </a>
          : null}
        </>
      : null}
    </section>
  );
}
