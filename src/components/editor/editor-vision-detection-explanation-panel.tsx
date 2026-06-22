"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { EditorVisionEvidenceAuditMeta } from "@/types/editor-vision-evidence";
import type { EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";

type Props = {
  evidenceAudit?: EditorVisionEvidenceAuditMeta;
  hierarchy?: EditorVisionHierarchyNode[];
};

function collectPartNodes(nodes: EditorVisionHierarchyNode[]): EditorVisionHierarchyNode[] {
  const out: EditorVisionHierarchyNode[] = [];
  for (const node of nodes) {
    if (node.detectionExplanation && !node.truthSection) {
      out.push(node);
    }
    if (node.children.length > 0) {
      out.push(...collectPartNodes(node.children));
    }
  }
  return out;
}

function yesNo(value: boolean, t: ReturnType<typeof useActiveTranslator>): string {
  return value ? t("editor.visionEvidence.yes") : t("editor.visionEvidence.no");
}

export function EditorVisionDetectionExplanationPanel({ evidenceAudit, hierarchy }: Props) {
  const t = useActiveTranslator();

  const partNodes = useMemo(() => (hierarchy ? collectPartNodes(hierarchy) : []), [hierarchy]);

  if (!evidenceAudit && partNodes.length === 0) {
    return null;
  }

  const explanations =
    partNodes.length > 0
      ? partNodes.map((n) => n.detectionExplanation!).filter(Boolean)
      : (evidenceAudit?.detectionExplanations ?? []);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-950">
      <p className="font-semibold">{t("editor.visionEvidence.explanationTitle")}</p>

      {evidenceAudit ? (
        <p className="mt-1 text-amber-800">
          {t("editor.visionEvidence.trustScore")}:{" "}
          <span className="font-semibold">{evidenceAudit.visionTrustScore}%</span>
        </p>
      ) : null}

      {evidenceAudit?.accessoryAudit.length ? (
        <details className="mt-2">
          <summary className="cursor-pointer font-medium">{t("editor.visionEvidence.accessoryAudit")}</summary>
          <ul className="mt-1 max-h-28 space-y-0.5 overflow-y-auto font-mono text-[10px]">
            {evidenceAudit.accessoryAudit.map((row) => (
              <li key={row.accessory}>
                {row.accessory}: {row.detected ? "✓" : "✗"} conf=
                {row.confidence !== null ? Math.round(row.confidence * 100) : "—"}% bbox=
                {row.hasBbox ? "yes" : "no"} src={row.source} → {row.decision}
                {row.reason ? ` — ${row.reason}` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">
        {explanations.map((ex) => (
          <li key={`${ex.label}-${ex.source}-${ex.decision}`} className="rounded border border-amber-100 bg-white/70 p-2">
            <p className="font-medium">{ex.label}</p>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[10px]">
              <dt className="text-amber-700">{t("editor.visionEvidence.field.source")}</dt>
              <dd>{ex.source}</dd>
              <dt className="text-amber-700">{t("editor.visionEvidence.field.confidence")}</dt>
              <dd>{Math.round(ex.confidence * 100)}%</dd>
              <dt className="text-amber-700">{t("editor.visionEvidence.field.bbox")}</dt>
              <dd>{yesNo(ex.hasBbox, t)}</dd>
              <dt className="text-amber-700">{t("editor.visionEvidence.field.mask")}</dt>
              <dd>{yesNo(ex.hasMask, t)}</dd>
              <dt className="text-amber-700">{t("editor.visionEvidence.field.decision")}</dt>
              <dd className="font-semibold">{ex.decision}</dd>
            </dl>
            <p className="mt-1 text-[10px] text-amber-800">{ex.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
