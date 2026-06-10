import { buildMotionReadyExportBundle } from "@/lib/editor-motion-ready-export";
import { assessPosterUpscaleNeeds } from "@/lib/editor-poster-upscale";
import type { EditorCanvasDocument, EditorStudioHandoffScore } from "@/types/homecheff-visual-editor";

export function computeStudioHandoffScore(document: EditorCanvasDocument): EditorStudioHandoffScore {
  const bundle = buildMotionReadyExportBundle(document);
  const upscale = assessPosterUpscaleNeeds(document, 1920, 1080);

  const checks = [
    {
      id: "objects_isolated",
      ok: bundle.cutouts.length > 0 || (document.importedLayers?.length ?? 0) > 0,
      labelKey: "editor.v6.handoff.check.objectsIsolated",
    },
    {
      id: "masks_available",
      ok: bundle.includesMasks,
      labelKey: "editor.v6.handoff.check.masksAvailable",
    },
    {
      id: "transparent_cutouts",
      ok: bundle.cutouts.some((c) => Boolean(c.cutoutUrl)),
      labelKey: "editor.v6.handoff.check.transparentCutouts",
    },
    {
      id: "export_safe",
      ok: upscale.status === "good" || upscale.status === "acceptable",
      labelKey: "editor.v6.handoff.check.exportSafe",
    },
  ];

  const warnings: Array<{ id: string; labelKey: string }> = [];
  if (!checks.find((c) => c.id === "transparent_cutouts")?.ok) {
    warnings.push({ id: "missing_cutout", labelKey: "editor.v6.handoff.warn.missingCutout" });
  }
  if (upscale.status === "needs_upscale" || upscale.status === "unavailable") {
    warnings.push({ id: "low_resolution", labelKey: "editor.v6.handoff.warn.lowResolution" });
  }
  if (!bundle.includesMasks && bundle.cutouts.length === 0) {
    warnings.push({ id: "background_merged", labelKey: "editor.v6.handoff.warn.backgroundMerged" });
  }

  const passed = checks.filter((c) => c.ok).length;
  const score = Math.round((passed / checks.length) * 100);

  return {
    score,
    labelKey: score >= 85 ? "editor.v6.handoff.label.ready" : "editor.v6.handoff.label.needsWork",
    checks,
    warnings,
  };
}

export function handoffScoreColor(score: number): "emerald" | "amber" | "rose" {
  if (score >= 85) {
    return "emerald";
  }
  if (score >= 60) {
    return "amber";
  }
  return "rose";
}
