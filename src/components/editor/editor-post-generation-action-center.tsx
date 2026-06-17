"use client";

import { useMemo, useState } from "react";
import { useEditorUserAccess } from "@/hooks/use-editor-user-access";
import { useActiveTranslator } from "@/i18n/client";
import {
  isFreePostGenerationAction,
  motionAnimationCreditCost,
  resolveEditorNextBestActions,
} from "@/lib/editor-next-best-actions";
import { executePostGenerationAction } from "@/lib/editor-post-generation-actions";
import { buildMotionAnimateUrl } from "@/lib/editor-studio-scene-handoff";
import { resolveEditorToMotionHandoffUrl } from "@/lib/homecheff-project-handoff-routes";
import { activeApprovedVariant } from "@/lib/editor-instruction-approval";
import { HomeCheffProjectFileActions } from "@/components/projects/homecheff-project-file-actions";
import { HcProjectStateBadge } from "@/components/projects/hc-project-state-badge";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorGenerationResultType } from "@/types/editor-generation-package";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  resultType?: EditorGenerationResultType;
  lastAccessPath?: "free" | "ad" | "credits" | "subscription" | "premium";
};

function costLabelKey(cost: string): string {
  switch (cost) {
    case "free":
      return "editor.postGen.cost.free";
    case "ad_eligible":
      return "editor.postGen.cost.ad";
    case "credits":
      return "editor.postGen.cost.credits";
    case "premium":
      return "editor.postGen.cost.premium";
    case "motion_credits":
      return "editor.postGen.cost.motion";
    default:
      return "editor.postGen.cost.free";
  }
}

const HANDLER_ACTIONS = new Set([
  "download",
  "save_library",
  "download_frames",
  "download_package",
  "export_hc",
]);

export function EditorPostGenerationActionCenter({
  document,
  resultType = "image",
  lastAccessPath,
}: Props) {
  const t = useActiveTranslator();
  const { access } = useEditorUserAccess();
  const approved = activeApprovedVariant(document);
  const pkg = document.instructionStudioState?.generationPackage;
  const primaryUrl = approved?.resultUrl ?? pkg?.generatedImages[0]?.url ?? pkg?.motionOutputs[0]?.url;
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusKey, setStatusKey] = useState<string | null>(null);

  const hcProject = document.instructionStudioState?.hcProjectId
    ? loadHomeCheffProject(document.instructionStudioState.hcProjectId)
    : null;

  const actions = useMemo(
    () =>
      resolveEditorNextBestActions({
        resultType,
        workflow: document.instructionStudioState?.combineIntent ?? document.instructionStudioState?.fusionPlan?.intent,
        userTier: access.tier,
        credits: access.credits,
        hasSequence: (pkg?.sequenceFrames.length ?? 0) > 1,
        editorSessionId: document.sessionId,
        primaryResultUrl: primaryUrl,
        packageId: pkg?.id,
        document,
        hcProjectId: document.instructionStudioState?.hcProjectId,
        syncHcToServer: true,
        lastAccessPath,
        motionDurationSec: document.instructionStudioState?.referenceIntake?.motionDurationSec,
      }),
    [access.credits, access.tier, document, lastAccessPath, pkg, primaryUrl, resultType]
  );

  if (!primaryUrl && actions.length === 0) {
    return null;
  }

  const storyKey =
    resultType === "animation"
      ? "editor.postGen.story.animation"
      : resultType === "sequence"
        ? "editor.postGen.story.sequence"
        : "editor.postGen.story.image";

  const runHandler = async (actionId: string) => {
    setBusyAction(actionId);
    setStatusKey(null);
    const result = await executePostGenerationAction({
      actionId,
      document,
      resultType,
      primaryUrl,
    });
    setStatusKey(result.messageKey);
    setBusyAction(null);
  };

  return (
    <section
      className={`space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 ${studioVisual.editorSurface}`}
      data-testid="editor-post-generation-action-center"
    >
      <div>
        <h2 className="text-sm font-bold text-zinc-900">{t("editor.postGen.title" as never)}</h2>
        <p className="mt-1 text-sm text-zinc-700">{t("editor.postGen.lead" as never)}</p>
        <p className="mt-2 text-xs text-zinc-600">{t(storyKey as never)}</p>
      </div>

      {primaryUrl ?
        // eslint-disable-next-line @next/next/no-img-element
        <img src={primaryUrl} alt="" className="max-h-48 w-full rounded-xl object-contain" />
      : null}

      {statusKey ?
        <p className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-900">{t(statusKey as never)}</p>
      : null}

      {hcProject ? <HcProjectStateBadge project={hcProject} compact /> : null}

      <ul className="grid gap-2 sm:grid-cols-2">
        {actions.slice(0, 10).map((action) => {
          const isAnimate = action.id.startsWith("animate_");
          const duration = isAnimate ? Number(action.id.replace("animate_", "").replace("s", "")) : 0;
          const href =
            action.href ??
            (isAnimate && duration
              ? resolveEditorToMotionHandoffUrl({
                  document,
                  editorSessionId: document.sessionId,
                  durationSec: duration as 3 | 5 | 8,
                  primaryResultUrl: primaryUrl,
                  orderedFrameUrls: pkg?.orderedFrameUrls,
                  packageId: pkg?.id,
                  syncToServer: true,
                })
              : undefined);

          const creditCost =
            action.creditCost ??
            (action.cost === "motion_credits" && duration ? motionAnimationCreditCost(duration) : undefined);

          const isHandler = HANDLER_ACTIONS.has(action.id);
          const isBusy = busyAction === action.id;

          const inner = (
            <>
              <p className="text-sm font-semibold text-zinc-900">{t(action.labelKey as never)}</p>
              <p className="mt-0.5 text-xs text-zinc-600">{t(action.descriptionKey as never)}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                {t(costLabelKey(action.cost) as never, { count: creditCost ?? 0 } as never)}
                {isFreePostGenerationAction(action.id) ? ` · ${t("editor.postGen.cost.free" as never)}` : ""}
              </p>
            </>
          );

          return (
            <li key={action.id}>
              {href ?
                <a
                  href={href}
                  className="block rounded-xl border border-zinc-200 bg-white px-3 py-3 hover:border-[#0067B1]"
                  data-testid={`post-gen-action-${action.id}`}
                >
                  {inner}
                </a>
              : isHandler ?
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void runHandler(action.id)}
                  className="block w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-left hover:border-[#0067B1] disabled:opacity-60"
                  data-testid={`post-gen-action-${action.id}`}
                >
                  {inner}
                </button>
              : <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3">{inner}</div>}
            </li>
          );
        })}
      </ul>

      {access.tier === "free" ?
        <p className="text-xs text-zinc-600">{t("studio.billing.officialModel" as never)}</p>
      : null}

      <HomeCheffProjectFileActions document={document} compact />
    </section>
  );
}
