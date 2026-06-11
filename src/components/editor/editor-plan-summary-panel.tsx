"use client";

import { useMemo } from "react";
import { EditorGenerationCostPanel } from "@/components/editor/editor-generation-cost-panel";
import { useEditorUserAccess } from "@/hooks/use-editor-user-access";
import { useActiveTranslator } from "@/i18n/client";
import { activePreservationRules, fusionPlanSummaryLines, getFusionPlan } from "@/lib/editor-fusion-plan";
import { fusionPlanCostOptions } from "@/lib/editor-fusion-generation-settings";
import { buildFriendlyFileDisplay } from "@/lib/editor-friendly-file-name";
import { combineIntentOption } from "@/lib/editor-workflow-product";
import { resolveCompositionBaseImageUrl } from "@/lib/editor-composition-plan";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onEditReferences?: () => void;
  compact?: boolean;
};

export function EditorPlanSummaryPanel({ document, onEditReferences, compact }: Props) {
  const t = useActiveTranslator();
  const { access } = useEditorUserAccess();
  const fusionPlan = getFusionPlan(document);
  const intake = document.instructionStudioState?.referenceIntake;
  const base = resolveCompositionBaseImageUrl(document);

  const summaryLines = useMemo(() => {
    if (fusionPlan) {
      return fusionPlanSummaryLines(fusionPlan);
    }
    return [];
  }, [fusionPlan]);

  if (!fusionPlan && !intake) {
    return null;
  }

  const outputMode = intake?.outputMode ?? fusionPlan?.generationSettings.outputMode ?? "single";
  const intent = fusionPlan?.intent ?? document.instructionStudioState?.combineIntent;

  return (
    <section
      className={`space-y-4 rounded-2xl border border-zinc-200 p-4 ${studioVisual.editorSurface}`}
      data-testid="editor-plan-summary-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-zinc-900">{t("editor.planSummary.title" as never)}</h2>
          <p className="mt-1 text-xs text-zinc-600">{t("editor.planSummary.lead" as never)}</p>
        </div>
        {onEditReferences ?
          <button
            type="button"
            onClick={onEditReferences}
            className="text-xs font-semibold text-[#0067B1] hover:underline"
          >
            {t("editor.planSummary.editReferences" as never)}
          </button>
        : null}
      </div>

      {intent ?
        <div className="rounded-xl border border-[#0067B1]/15 bg-[#0067B1]/5 px-3 py-2">
          <p className="text-sm font-semibold text-zinc-900">
            {t(combineIntentOption(intent).labelKey as never)}
          </p>
          <p className="text-xs text-zinc-600">{t(combineIntentOption(intent).hintKey as never)}</p>
        </div>
      : null}

      {!compact ?
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("editor.planSummary.base" as never)}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={base.url} alt="" className="mt-2 h-24 w-full rounded-lg object-cover" />
          </article>
          {(intake?.roleAssignments ?? []).map((assignment) => {
            const friendly = buildFriendlyFileDisplay({
              name: assignment.name ?? "reference",
              role: assignment.role,
            });
            return (
              <article key={`${assignment.roleId}-${assignment.instanceId ?? assignment.url}`} className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  {assignment.role}
                </p>
                {assignment.url ?
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assignment.url} alt="" className="mt-2 h-24 w-full rounded-lg object-cover" />
                : null}
                <p className="mt-1 truncate text-xs font-medium text-zinc-900">
                  {assignment.friendlyName ?? friendly.title}
                </p>
                {assignment.metadata?.view ?
                  <p className="text-[10px] text-zinc-600">
                    {t(`editor.metadata.view.${assignment.metadata.view}` as never)}
                  </p>
                : null}
              </article>
            );
          })}
        </div>
      : null}

      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-zinc-700">{t("editor.planSummary.output" as never)}</dt>
          <dd className="text-zinc-900">{String(outputMode)}</dd>
        </div>
        {intake?.stepCount ?
          <div>
            <dt className="font-semibold text-zinc-700">{t("editor.planSummary.steps" as never)}</dt>
            <dd className="text-zinc-900">{intake.stepCount}</dd>
          </div>
        : null}
        {intake?.variationCount ?
          <div>
            <dt className="font-semibold text-zinc-700">{t("editor.planSummary.variations" as never)}</dt>
            <dd className="text-zinc-900">{intake.variationCount}</dd>
          </div>
        : null}
        {fusionPlan ?
          <div>
            <dt className="font-semibold text-zinc-700">{t("editor.planSummary.preservation" as never)}</dt>
            <dd className="text-zinc-900">{activePreservationRules(fusionPlan).join(", ")}</dd>
          </div>
        : null}
      </dl>

      {summaryLines.length > 0 ?
        <ul className="space-y-1 text-xs text-zinc-700">
          {summaryLines.map((line) => (
            <li key={line}>• {line}</li>
          ))}
        </ul>
      : null}

      {fusionPlan ?
        <EditorGenerationCostPanel
          document={document}
          user={access}
          options={fusionPlanCostOptions(fusionPlan, document)}
          useCredits
        />
      : null}
    </section>
  );
}
