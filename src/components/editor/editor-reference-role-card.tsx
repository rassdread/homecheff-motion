"use client";

import { useActiveTranslator } from "@/i18n/client";
import { buildFriendlyFileDisplay } from "@/lib/editor-friendly-file-name";
import { HomeCheffOrbitLoader } from "@/components/editor/homecheff-orbit-loader";
import {
  EDITOR_ANIMAL_TYPES,
  EDITOR_CLOTHING_TYPES,
  EDITOR_FAMILY_REFERENCE_TYPES,
  EDITOR_REFERENCE_VIEWS,
  type EditorReferenceMetadata,
} from "@/types/editor-reference-metadata";
import type {
  EditorReferenceRoleAnalysis,
  EditorReferenceRoleSpec,
} from "@/types/editor-reference-role-flow";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  roleSpec: EditorReferenceRoleSpec;
  instanceIndex: number;
  thumbnailUrl: string;
  documentName: string;
  originalFilename?: string;
  analysis: EditorReferenceRoleAnalysis;
  metadata: EditorReferenceMetadata;
  uploading?: boolean;
  onMetadataChange: (metadata: EditorReferenceMetadata) => void;
  onReplace: () => void;
  onRemove: () => void;
};

function analysisStatusKey(analysis: EditorReferenceRoleAnalysis, uploading?: boolean): string {
  if (uploading || analysis.status === "uploading") {
    return "editor.referenceRole.status.uploading";
  }
  if (analysis.status === "running") {
    return "editor.referenceRole.status.analyzing";
  }
  if (analysis.status === "done") {
    return "editor.referenceRole.status.ready";
  }
  if (analysis.status === "needs_attention") {
    return "editor.referenceRole.status.needsAttention";
  }
  if (analysis.status === "error") {
    return "editor.referenceRole.status.failed";
  }
  return "editor.referenceRole.status.pending";
}

export function EditorReferenceRoleCard({
  roleSpec,
  instanceIndex,
  thumbnailUrl,
  documentName,
  originalFilename,
  analysis,
  metadata,
  uploading,
  onMetadataChange,
  onReplace,
  onRemove,
}: Props) {
  const t = useActiveTranslator();
  const friendly = buildFriendlyFileDisplay({
    name: originalFilename ?? documentName,
    role: roleSpec.role,
  });
  const title =
    instanceIndex > 0 ? `${t(roleSpec.labelKey as never)} ${instanceIndex + 1}` : friendly.title;

  const showMetadataDropdowns =
    roleSpec.role === "outfit" ||
    roleSpec.role === "family" ||
    roleSpec.role === "animal" ||
    roleSpec.role === "person" ||
    roleSpec.role === "character";

  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-zinc-50/90 p-3 ${studioVisual.editorSurface}`}
      data-testid={`reference-instance-${roleSpec.id}-${instanceIndex}`}
    >
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumbnailUrl} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900">{title}</p>
          <p className="text-xs text-zinc-600">{friendly.subtitle}</p>
          <p
            className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${
              analysis.status === "done"
                ? "text-emerald-700"
                : analysis.status === "error"
                  ? "text-amber-700"
                  : "text-sky-700"
            }`}
            data-testid="reference-analysis-status"
          >
            {t(analysisStatusKey(analysis, uploading) as never)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button type="button" onClick={onReplace} className="text-xs font-semibold text-[#0067B1]">
            {t("editor.referenceRole.replace" as never)}
          </button>
          <button type="button" onClick={onRemove} className="text-xs font-semibold text-red-600">
            {t("editor.referenceRole.remove" as never)}
          </button>
        </div>
      </div>

      {(analysis.status === "running" || uploading) && (
        <div className="mt-3 flex justify-center py-2">
          <HomeCheffOrbitLoader state="analyzing" size="sm" />
        </div>
      )}

      {analysis.status === "done" && (analysis.faceDetected || analysis.clothingDetected) ?
        <div className="mt-2 flex flex-wrap gap-1">
          {analysis.faceDetected ?
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
              {t("editor.referenceRole.analysis.face" as never)}
            </span>
          : null}
          {analysis.clothingDetected ?
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
              {t("editor.referenceRole.analysis.clothing" as never)}
            </span>
          : null}
        </div>
      : null}

      {showMetadataDropdowns ?
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="font-semibold text-zinc-700">{t("editor.metadata.view" as never)}</span>
            <select
              value={metadata.view ?? ""}
              onChange={(e) =>
                onMetadataChange({
                  ...metadata,
                  view: (e.target.value || undefined) as EditorReferenceMetadata["view"],
                })
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900"
            >
              <option value="">{t("editor.metadata.optional" as never)}</option>
              {EDITOR_REFERENCE_VIEWS.map((view) => (
                <option key={view} value={view}>
                  {t(`editor.metadata.view.${view}` as never)}
                </option>
              ))}
            </select>
          </label>

          {roleSpec.role === "outfit" ?
            <label className="block text-xs">
              <span className="font-semibold text-zinc-700">{t("editor.metadata.clothingType" as never)}</span>
              <select
                value={metadata.clothingType ?? ""}
                onChange={(e) =>
                  onMetadataChange({
                    ...metadata,
                    clothingType: (e.target.value || undefined) as EditorReferenceMetadata["clothingType"],
                  })
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900"
              >
                <option value="">{t("editor.metadata.optional" as never)}</option>
                {EDITOR_CLOTHING_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`editor.metadata.clothing.${type}` as never)}
                  </option>
                ))}
              </select>
            </label>
          : null}

          {roleSpec.role === "family" || roleSpec.id === "mother" || roleSpec.id === "father" ?
            <label className="block text-xs">
              <span className="font-semibold text-zinc-700">{t("editor.metadata.familyType" as never)}</span>
              <select
                value={metadata.familyType ?? ""}
                onChange={(e) =>
                  onMetadataChange({
                    ...metadata,
                    familyType: (e.target.value || undefined) as EditorReferenceMetadata["familyType"],
                  })
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900"
              >
                <option value="">{t("editor.metadata.optional" as never)}</option>
                {EDITOR_FAMILY_REFERENCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`editor.metadata.family.${type}` as never)}
                  </option>
                ))}
              </select>
            </label>
          : null}

          {roleSpec.role === "animal" ?
            <label className="block text-xs">
              <span className="font-semibold text-zinc-700">{t("editor.metadata.animalType" as never)}</span>
              <select
                value={metadata.animalType ?? ""}
                onChange={(e) =>
                  onMetadataChange({
                    ...metadata,
                    animalType: (e.target.value || undefined) as EditorReferenceMetadata["animalType"],
                  })
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900"
              >
                <option value="">{t("editor.metadata.optional" as never)}</option>
                {EDITOR_ANIMAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`editor.metadata.animal.${type}` as never)}
                  </option>
                ))}
              </select>
            </label>
          : null}

          <label className="block text-xs sm:col-span-2">
            <span className="font-semibold text-zinc-700">{t("editor.metadata.notes" as never)}</span>
            <input
              value={metadata.notes ?? ""}
              onChange={(e) => onMetadataChange({ ...metadata, notes: e.target.value })}
              placeholder={t("editor.metadata.notesPlaceholder" as never)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900"
            />
          </label>
        </div>
      : null}
    </div>
  );
}
