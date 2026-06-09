"use client";

import { useMemo } from "react";
import { StudioWizardInfoButton } from "@/components/studio/studio-wizard-info-button";
import { useActiveTranslator } from "@/i18n/client";
import { buildCompositionGraphFromDraft } from "@/lib/studio-asset-composition-graph";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { CompositionGraphNode } from "@/types/studio-asset-generation-workbench";

type Props = {
  draft: AssetWizardDraft;
};

function GraphTree({ nodes, depth = 0 }: { nodes: CompositionGraphNode[]; depth?: number }) {
  return (
    <ul className={depth === 0 ? "space-y-1" : "ml-4 mt-1 space-y-1 border-l border-zinc-200 pl-3"}>
      {nodes.map((node) => (
        <li key={node.id}>
          <span className="inline-flex items-center gap-2 rounded-lg bg-zinc-50 px-2 py-1 text-sm">
            <span className="font-medium text-zinc-900">{node.label}</span>
            <span className="text-[10px] uppercase text-zinc-500">{node.kind}</span>
          </span>
          {node.children.length > 0 ? <GraphTree nodes={node.children} depth={depth + 1} /> : null}
        </li>
      ))}
    </ul>
  );
}

export function StudioWizardPlacementPreviewStep({ draft }: Props) {
  const t = useActiveTranslator();
  const graph = useMemo(() => buildCompositionGraphFromDraft(draft), [draft]);

  if (draft.referencePlacements.length === 0) {
    return (
      <p className="text-sm text-zinc-600">{t("studio.workbench.placementPreview.empty")}</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-zinc-900">{t("studio.workbench.placementPreview.title")}</h3>
        <StudioWizardInfoButton infoKey="studio.workbench.info.placementPreview" />
      </div>
      <p className="text-sm text-zinc-600">{t("studio.workbench.placementPreview.lead")}</p>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <GraphTree nodes={graph} />
      </div>
      <ul className="space-y-2 text-sm text-zinc-700">
        {draft.referencePlacements.map((p) => (
          <li key={p.id} className="rounded-lg border border-zinc-100 px-3 py-2">
            <span className="font-medium">{p.sourceName}</span>
            <span className="text-zinc-500">
              {" "}
              → {p.placementTarget.replace(/_/g, " ")} ({p.importance.replace(/_/g, " ")})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
