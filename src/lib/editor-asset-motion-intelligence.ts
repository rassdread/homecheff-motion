import { computeStudioHandoffScore } from "@/lib/editor-v6-handoff-score";
import { buildMotionReadyExportBundle } from "@/lib/editor-motion-ready-export";
import type { EditorMotionReadinessReport } from "@/types/editor-asset-profile";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export function buildMotionReadinessReport(document: EditorCanvasDocument): EditorMotionReadinessReport {
  const handoff = computeStudioHandoffScore(document);
  const bundle = buildMotionReadyExportBundle(document);
  const hasCutout = bundle.cutouts.some((c) => Boolean(c.cutoutUrl));
  const hasMask = bundle.includesMasks;
  const hasImported = (document.importedLayers?.length ?? 0) > 0;
  const multipleObjects = (document.detectedObjects?.length ?? 0) > 1;

  const checks = [
    { labelKey: "editor.assetIntel.motion.check.backgroundRemoved", ok: hasCutout || hasImported },
    { labelKey: "editor.assetIntel.motion.check.objectIsolated", ok: hasCutout },
    { labelKey: "editor.assetIntel.motion.check.transparentPng", ok: hasCutout },
    { labelKey: "editor.assetIntel.motion.check.resolution", ok: handoff.checks.find((c) => c.id === "export_safe")?.ok ?? false },
    { labelKey: "editor.assetIntel.motion.check.mask", ok: hasMask },
  ];

  const explanations: string[] = [];
  if (!hasCutout) {
    explanations.push("editor.assetIntel.motion.explain.needCutout");
  }
  if (!hasMask) {
    explanations.push("editor.assetIntel.motion.explain.needSelection");
  }
  if (multipleObjects) {
    explanations.push("editor.assetIntel.motion.explain.multipleObjects");
  }
  if (handoff.score >= 85) {
    explanations.push("editor.assetIntel.motion.explain.ready");
  }

  return {
    score: handoff.score,
    labelKey:
      handoff.score >= 85
        ? "editor.assetIntel.motion.label.ready"
        : handoff.score >= 60
          ? "editor.assetIntel.motion.label.almost"
          : "editor.assetIntel.motion.label.needsWork",
    explanations: explanations.slice(0, 3),
    checks,
  };
}
