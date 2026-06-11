import { activeApprovedVariant } from "@/lib/editor-instruction-approval";
import { resolveEditorInstructionHandoff } from "@/lib/editor-instruction-handoff";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type EditorMotionReadinessCheck = {
  id: string;
  labelKey: string;
  ok: boolean;
};

export type EditorMotionReadinessReport = {
  score: number;
  labelKey: string;
  checks: EditorMotionReadinessCheck[];
  warnings: string[];
  primaryImageUrl: string;
  usesApprovedVariant: boolean;
};

export function evaluateMotionReadiness(document: EditorCanvasDocument): EditorMotionReadinessReport {
  const handoff = resolveEditorInstructionHandoff(document);
  const approved = activeApprovedVariant(document);
  const checks: EditorMotionReadinessCheck[] = [
    {
      id: "approved_variant",
      labelKey: "editor.workflow.motion.check.approvedVariant",
      ok: Boolean(approved?.resultUrl),
    },
    {
      id: "character_clarity",
      labelKey: "editor.workflow.motion.check.characterClarity",
      ok: Boolean(
        document.detectedObjects?.some((o) => /character|mascot|person/i.test(o.label)) ||
          /globe|mascot|chef/i.test(document.name)
      ),
    },
    {
      id: "background_complexity",
      labelKey: "editor.workflow.motion.check.backgroundSeparation",
      ok: (document.detectionMeta?.count ?? 0) <= 8,
    },
    {
      id: "logo_safety",
      labelKey: "editor.workflow.motion.check.logoSafety",
      ok: true,
    },
  ];
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  const warnings: string[] = [];
  if (!approved?.resultUrl) {
    warnings.push("editor.workflow.motion.warning.noApprovedVariant");
  }
  return {
    score,
    labelKey:
      score >= 75
        ? "editor.workflow.motion.score.good"
        : score >= 50
          ? "editor.workflow.motion.score.partial"
          : "editor.workflow.motion.score.low",
    checks,
    warnings,
    primaryImageUrl: handoff.activeVariantUrl,
    usesApprovedVariant: !handoff.usesOriginal,
  };
}

export function buildMotionHandoffQuery(document: EditorCanvasDocument): string {
  const report = evaluateMotionReadiness(document);
  const params = new URLSearchParams({
    editorSession: document.sessionId,
    editorMotionReady: String(report.score),
  });
  if (report.usesApprovedVariant) {
    params.set("editorActiveVariant", "1");
  }
  return params.toString();
}
