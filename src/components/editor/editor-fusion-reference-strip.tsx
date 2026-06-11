"use client";

import { useActiveTranslator } from "@/i18n/client";
import { buildFriendlyFileDisplay } from "@/lib/editor-friendly-file-name";
import { resolveCompositionBaseImageUrl } from "@/lib/editor-composition-plan";
import { combineIntentOption } from "@/lib/editor-workflow-product";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
};

export function EditorFusionReferenceStrip({ document }: Props) {
  const t = useActiveTranslator();
  const base = resolveCompositionBaseImageUrl(document);
  const intake = document.instructionStudioState?.referenceIntake;
  const intent = document.instructionStudioState?.combineIntent;
  const assignments = intake?.roleAssignments ?? [];
  const fusionRefs = document.instructionStudioState?.fusionPlan?.references ?? [];

  const cards = [
    {
      key: "base",
      label: t("editor.planSummary.base" as never),
      url: base.url,
      name: document.name,
    },
    ...assignments
      .filter((a) => a.url && a.url !== base.url)
      .map((a) => ({
        key: a.instanceId ?? a.roleId,
        label: a.role,
        url: a.url!,
        name: a.friendlyName ?? a.name ?? a.role,
        role: a.role,
      })),
    ...fusionRefs
      .filter((ref) => !assignments.some((a) => a.url === ref.url))
      .map((ref) => ({
        key: ref.id,
        label: ref.type,
        url: ref.url,
        name: ref.name,
      })),
  ];

  return (
    <section
      className={`space-y-3 rounded-2xl border border-zinc-200 p-4 ${studioVisual.editorSurface}`}
      data-testid="editor-fusion-reference-strip"
    >
      <div>
        <h2 className="text-sm font-bold text-zinc-900">{t("editor.referenceStrip.title" as never)}</h2>
        {intent ?
          <p className="mt-0.5 text-xs text-zinc-600">
            {t(combineIntentOption(intent).hintKey as never)}
          </p>
        : null}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {cards.map((card) => {
          const friendly = buildFriendlyFileDisplay({
            name: card.name,
            role: "role" in card ? card.role : undefined,
          });
          return (
            <article
              key={card.key}
              className="w-36 shrink-0 rounded-xl border border-zinc-100 bg-zinc-50/80 p-2 sm:w-44"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.url} alt="" className="h-24 w-full rounded-lg object-cover" />
              <p className="mt-2 truncate text-xs font-semibold text-zinc-900">{card.label}</p>
              <p className="truncate text-[10px] text-zinc-600">{friendly.title}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
